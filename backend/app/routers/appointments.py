# app/routers/appointments.py
# --- FULL REPLACEMENT ---

from fastapi import APIRouter, Depends, HTTPException, Request, status, Response, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exc as SQLAlchemyExceptions, func, case
from typing import List, Optional
from datetime import datetime as dt, timedelta, timezone
import logging

from app import database, models, schemas # Ensure schemas is imported
from app.dependencies import get_current_user
from app.config import settings
from app.models.appointment import Appointment as AppointmentModel
from app.models.service import Service as ServiceModel
from app.models.tenant import Tenant as TenantModel
from app.models.user import User
from app.models.client import Client as ClientModel
from app.schemas.enums import AppointmentStatus

# Import Schemas used in this router
from app.schemas.appointment import ( # Explicitly import schemas used here
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
    PaginatedAppointmentResponse # Import the specific paginated response type
)

# Communicaions logging imports
from app.services.communication_service import create_communication_log # Import the utility
from app.models.communications_log import CommunicationDirection, CommunicationStatus, CommunicationType, CommunicationChannel # Import enums 

# Notifications logic imports
from app.services.notification_service import send_appointment_notification # Import the notification service
from app.models.template import TemplateEventTrigger # Import the trigger enum

# --- Setup logger ---
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)

# --- Helper Function for Permission Checks ---
def check_appointment_permission(current_user: User, appointment: AppointmentModel, action: str = "access"):
    """Checks if the current user has permission to access/modify an appointment."""
    if current_user.role == "super_admin":
        logger.debug(f"[Permission Check] Super admin ({current_user.email}) granted for {action} on Appt ID {appointment.id}.")
        return # Super admin can do anything

    if current_user.tenant_id != appointment.tenant_id:
        logger.warning(f"[Permission Check Failed] User Tenant ({current_user.tenant_id}) != Appointment Tenant ({appointment.tenant_id}) for {action} on Appt ID {appointment.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to {action} this appointment"
        )
    # Optional: Add role-specific checks within the tenant if needed
    if action == "delete" and current_user.role not in ["admin", "super_admin"]:
         logger.warning(f"[Permission Check Failed] User role '{current_user.role}' cannot delete Appt ID {appointment.id}")
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

    logger.debug(f"[Permission Check] User ({current_user.email}) granted for {action} on Appt ID {appointment.id}.")


# --- Placeholder Notification Function ---
def notify_deleted_user_active(client_id: int, tenant_id: int):
    logger.info(f"Placeholder: Notify tenant {tenant_id} that deleted client {client_id} became active again.")
    # Add to Celery/RQ task queue here later



# --- Create Appointment (Public, Subdomain Aware, Handles Client Logic, Sends Notifications) ---
@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment( # <--- Make endpoint async
    appointment_data: AppointmentCreate,
    request: Request,
    db: Session = Depends(database.get_db)
    # No current_user needed for public creation
):
    logger.info(f"[Create Appointment] Received request.")

    # 1. Determine Tenant from Subdomain (Robust Check)
    # (Using the robust subdomain extraction logic)
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header.split(':')[0] if host_header else ""
    if not effective_hostname:
         logger.error("[Create Appointment] Host header missing")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    base_domain_config = settings.base_domain
    is_ip_address = all(part.isdigit() for part in effective_hostname.split('.'))
    # Adjusted check for has_subdomain
    has_subdomain_format = effective_hostname.endswith(f".{base_domain_config}") and effective_hostname != base_domain_config

    if not has_subdomain_format or is_ip_address:
        logger.warning(f"[Create Appointment] Rejected: Request host '{effective_hostname}' is not a valid tenant subdomain.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointments must be created via a valid tenant portal subdomain.")

    subdomain_name = effective_hostname.replace(f".{base_domain_config}", "")
    if not subdomain_name or '.' in subdomain_name:
         logger.warning(f"[Create Appointment] Rejected: Invalid subdomain '{subdomain_name}' from host '{effective_hostname}'.")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tenant portal subdomain format.")

    logger.info(f"[Create Appointment] Attempt on subdomain: {subdomain_name}")
    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        logger.warning(f"[Create Appointment] Tenant subdomain not found: {subdomain_name}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking portal not found.")
    tenant_id_from_subdomain = tenant.id
    logger.info(f"[Create Appointment] Target Tenant ID: {tenant_id_from_subdomain} for subdomain {subdomain_name}")

    # --- Client Lookup / Create / Reactivate Logic ---
    # (Same logic as before to find or create/update 'target_client')
    client_id = None
    target_client = None
    if not appointment_data.client_email:
         logger.error("[Create Appointment] Client email is required.")
         raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Client email is required.")

    lookup_email = appointment_data.client_email.lower()
    # Use joinedload to potentially avoid separate queries later if client details are needed
    existing_client = db.query(ClientModel).options(joinedload(ClientModel.tenant)).filter(
        ClientModel.tenant_id == tenant_id_from_subdomain,
        ClientModel.email == lookup_email
    ).first()
    now_utc = dt.now(timezone.utc)

    if existing_client:
        logger.info(f"[Create Appointment] Found client ID: {existing_client.id}")
        client_id = existing_client.id
        target_client = existing_client # Keep track of the client object
        # --- Logic for active/inactive/unconfirmed client updates ---
        # (Keep your existing logic here for scenarios B & C)
        if not existing_client.is_deleted:
            if not existing_client.is_confirmed: # Update details only if not confirmed
                logger.info("[Create Appointment] Updating details for unconfirmed existing client.")
                first_name, last_name = (appointment_data.client_name.split(" ", 1) + [None])[:2]
                if first_name and existing_client.first_name != first_name: existing_client.first_name = first_name
                if last_name and existing_client.last_name != last_name: existing_client.last_name = last_name
                if appointment_data.client_phone and existing_client.phone_number != appointment_data.client_phone: existing_client.phone_number = appointment_data.client_phone
                # Mark for potential commit later
            else: logger.info("[Create Appointment] Confirmed client exists, skipping detail update.")
        else: # Reactivate deleted client
            logger.info("[Create Appointment] Reactivating deleted client ID: {existing_client.id}")
            existing_client.is_deleted = False
            existing_client.deleted_at = None
            # Update details only if they were unconfirmed *before* deletion
            if not existing_client.is_confirmed:
                logger.info("[Create Appointment] Updating details for reactivated unconfirmed client.")
                first_name, last_name = (appointment_data.client_name.split(" ", 1) + [None])[:2]
                if first_name and existing_client.first_name != first_name: existing_client.first_name = first_name
                if last_name and existing_client.last_name != last_name: existing_client.last_name = last_name
                if appointment_data.client_phone and existing_client.phone_number != appointment_data.client_phone: existing_client.phone_number = appointment_data.client_phone
            existing_client.updated_at = now_utc # Ensure updated_at is touched
            # notify_deleted_user_active(client_id, tenant_id_from_subdomain) # Make sure this is defined/async if needed

    else: # Create New Client
        logger.info(f"[Create Appointment] Creating new client for email {lookup_email}")
        first_name, last_name = (appointment_data.client_name.split(" ", 1) + [None])[:2]
        new_client = ClientModel(
            tenant_id=tenant_id_from_subdomain, first_name=first_name, last_name=last_name,
            email=lookup_email, phone_number=appointment_data.client_phone,
            is_confirmed=False, is_deleted=False, created_at=now_utc, updated_at=now_utc,
            tenant=tenant # Associate tenant object directly if possible
        )
        db.add(new_client)
        # Flush to get the ID without full commit yet, makes transaction more atomic
        try:
            db.flush()
            db.refresh(new_client)
            client_id = new_client.id
            target_client = new_client
            logger.info(f"[Create Appointment] New client flushed with ID: {client_id}")
        except SQLAlchemyExceptions.IntegrityError as ie:
            db.rollback() # Rollback the flush attempt
            logger.error(f"[Create Appointment] Integrity error creating client (flush stage): {ie}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Client email may already exist for this tenant.")
        except Exception as e:
             db.rollback()
             logger.error(f"[Create Appointment] Error flushing new client: {e}", exc_info=True)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not process client creation.")


    if not client_id or not target_client: # Should not happen if flush succeeded
        logger.error("[Create Appointment] Fatal: Failed to determine client ID after processing.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process client information.")

    # 3. Validate Service IDs
    if not appointment_data.service_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one service ID must be provided.")
    services = db.query(ServiceModel).filter(
        ServiceModel.id.in_(appointment_data.service_ids),
        ServiceModel.tenant_id == tenant_id_from_subdomain # Ensure services belong to the tenant
    ).all()
    if len(services) != len(set(appointment_data.service_ids)):
        # Find missing/invalid IDs
        found_ids = {s.id for s in services}
        missing_ids = set(appointment_data.service_ids) - found_ids
        logger.warning(f"[Create Appointment] Invalid/missing service IDs requested: {missing_ids}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid or unavailable service IDs provided: {list(missing_ids)}")

    total_duration = sum(service.duration_minutes for service in services if service.duration_minutes is not None)
    
    # 4. Create Appointment Object
    db_appointment = AppointmentModel(
        client_id=client_id,
        appointment_time=appointment_data.appointment_time, # Ensure timezone info is handled correctly if coming from frontend
        end_datetime_utc=appointment_data.appointment_time + timedelta(minutes=total_duration) if appointment_data.appointment_time else None,
        tenant_id=tenant_id_from_subdomain,
        status=AppointmentStatus.PENDING,
        # Associate related objects directly for easier access later
        client=target_client,
        tenant=tenant,
    )
    db_appointment.services.extend(services) # Associate services

    # 5. Add Appointment to Session
    db.add(db_appointment)

    # 6. Attempt to Commit Main Transaction (Client updates/create + Appointment create)
    try:
        db.commit()
        db.refresh(db_appointment)
        # Refresh relationships needed for notification context and response
        # These might not be strictly necessary if accessed via db_appointment.client etc.
        # but can prevent detached instance errors depending on session state.
        db.refresh(target_client)
        db.refresh(db_appointment, attribute_names=['services'])

        logger.info(f"[Create Appointment] Successfully committed Appt ID: {db_appointment.id} for Client ID: {client_id}")

    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"[Create Appointment] Database Integrity Error saving appointment: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create appointment due to conflicting data.")
    except Exception as e:
        db.rollback()
        logger.error(f"[Create Appointment] Unknown Database Error saving appointment: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create appointment.")

    # --- 7. Send Notifications (AFTER successful commit of appointment) ---
    notification_error = None
    try:
        # Send notification to the client
        logger.info(f"Attempting to send client booking notification for Appt ID {db_appointment.id}...")
        await send_appointment_notification( # <--- Use await
            db=db,
            appointment=db_appointment, # Pass the committed & refreshed appointment object
            event_trigger=TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT
        )

        # Send notification to the admin/tenant contact
        logger.info(f"Attempting to send admin booking notification for Appt ID {db_appointment.id}...")
        await send_appointment_notification( # <--- Use await
            db=db,
            appointment=db_appointment,
            event_trigger=TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN
            # recipient_override=tenant.contact_email (handled inside service)
        )

        # --- 8. Commit Communication Logs ---
        # The notification service adds logs to session, commit them now.
        try:
            db.commit()
            logger.info(f"[Create Appointment] Communication logs committed for Appt ID: {db_appointment.id}")
        except Exception as log_commit_e:
             db.rollback() # Rollback log commit only
             # Log this error but don't fail the main appointment creation return
             logger.error(f"[Create Appointment] Failed to commit communication logs: {log_commit_e}", exc_info=True)
             notification_error = "Failed to record notification status." # Store error message

    except Exception as notify_e:
        db.rollback() # Rollback potential log additions from failed notification calls
        # Log the notification error, but the appointment IS created.
        # Decide how critical notification failure is. Maybe return success but log error?
        logger.error(f"[Create Appointment] Failed to send notifications for Appt ID {db_appointment.id}: {notify_e}", exc_info=True)
        notification_error = "Appointment created, but failed to send notifications." # Store error message

    # --- 9. Return Response ---
    # Even if notifications failed, the appointment itself was created successfully.
    # We might want to add the notification_error to the response later if needed.
    if notification_error:
        logger.warning(f"[Create Appointment] Returning success for Appt ID {db_appointment.id} despite notification error: {notification_error}")
        # Optionally add warning to response headers or a non-standard field if schema allows?

    return db_appointment # Return the created appointment details

# --- NEW Paginated Appointments Endpoint ---
@router.get("/paginated", response_model=PaginatedAppointmentResponse)
def get_paginated_appointments( # Renamed function for clarity
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    client_id: Optional[int] = Query(None, description="Filter appointments by specific client ID"),
    status: Optional[str] = Query(None, description="Filter by status (e.g., pending, confirmed, upcoming, past)")
):
    logger.info(f"[Get Paginated Appts] User: {current_user.email}, Page: {page}, Limit: {limit}, ClientID: {client_id}, Status: {status}")

    # Base query - Eager load necessary relationships for AppointmentOut
    base_query = db.query(AppointmentModel).options(
        joinedload(AppointmentModel.client).load_only( # Load only needed client fields
             ClientModel.id, ClientModel.first_name, ClientModel.last_name, ClientModel.email, ClientModel.phone_number, ClientModel.is_confirmed, ClientModel.tenant_id # Ensure tenant_id is loaded if needed by ClientOut
             # Avoid loading client's tags or notes here unless ClientOut needs them
        ),
        joinedload(AppointmentModel.services) # Load full services
    )

    # Apply tenant scoping
    if current_user.role != "super_admin":
        base_query = base_query.filter(AppointmentModel.tenant_id == current_user.tenant_id)

    # Apply client_id filter with security check
    if client_id is not None:
        client_check = db.query(ClientModel.id).filter(ClientModel.id == client_id)
        if current_user.role != "super_admin":
             client_check = client_check.filter(ClientModel.tenant_id == current_user.tenant_id)
        if not db.query(client_check.exists()).scalar():
             logger.warning(f"User {current_user.email} requested client {client_id} outside scope.")
             # Return empty paginated response for security
             return PaginatedAppointmentResponse(items=[], total=0, page=page, limit=limit)
        base_query = base_query.filter(AppointmentModel.client_id == client_id)

    # Apply status filter
    if status:
        status_lower = status.lower()
        logger.info(f"[Get Paginated Appts] Filtering by Status: {status_lower}")
        now_utc = dt.now(timezone.utc)
        if status_lower == "upcoming":
            base_query = base_query.filter(AppointmentModel.appointment_time >= now_utc, AppointmentModel.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]))
        elif status_lower == "past":
            base_query = base_query.filter(AppointmentModel.appointment_time < now_utc)
        else:
            try: status_enum = AppointmentStatus(status_lower); base_query = base_query.filter(AppointmentModel.status == status_enum)
            except ValueError: raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid status filter: '{status}'.")

    # Pagination: Get total count
    try:
        count_query = base_query.statement.with_only_columns(func.count(AppointmentModel.id)).order_by(None)
        total_count = db.execute(count_query).scalar_one()
    except Exception as e: logger.error(f"Error counting appointments: {e}"); total_count = 0
    logger.info(f"[Get Paginated Appts] Total matching count: {total_count}")

    # Pagination: Fetch items for the page
    offset = (page - 1) * limit
    appointments = base_query.order_by(AppointmentModel.appointment_time.desc()).offset(offset).limit(limit).all()
    logger.info(f"[Get Paginated Appts] Found {len(appointments)} appointments for page {page}.")

    # Construct and return response
    return PaginatedAppointmentResponse(items=appointments, total=total_count, page=page, limit=limit)


# --- Original List Endpoint (Kept for Calendar or simplified views if needed) ---
# Consider if this is still required or if all list views should use /paginated
@router.get("/", response_model=List[AppointmentOut])
def get_appointments_list_simple( # Renamed to avoid conflict if keeping both
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"[Get Simple Appointments List] User: {current_user.email}")
    query = db.query(AppointmentModel).options(
        joinedload(AppointmentModel.client),
        joinedload(AppointmentModel.services)
    )
    if current_user.role != "super_admin":
        query = query.filter(AppointmentModel.tenant_id == current_user.tenant_id)

    # Maybe filter only upcoming/active by default here? Or limit the count?
    appointments = query.order_by(AppointmentModel.appointment_time.desc()).limit(200).all() # Example limit
    logger.info(f"[Get Simple Appointments List] Found {len(appointments)} appointments.")
    return appointments


# --- Retrieve Specific Appointment ---
@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment_by_id(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"User '{current_user.email}' requesting Appt ID: {appointment_id}")
    query = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id)
    # Eager load for the response model
    appointment = query.options(
        joinedload(AppointmentModel.client), # Ensure client is loaded
        joinedload(AppointmentModel.services) # Ensure services are loaded
    ).first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    check_appointment_permission(current_user, appointment, action="view")
    logger.info(f"Access granted for User '{current_user.email}' to Appt ID: {appointment_id}")
    return appointment


# --- Update Appointment ---
@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    update_data: AppointmentUpdate, # Use updated schema
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user) # Assuming User model is imported
):
    """
    Updates an existing appointment. Allows updating status, time, etc.
    Logs communication events for status changes like cancellation or confirmation.
    Requires authenticated user with appropriate permissions.
    """
    logger.info(f"[Update Appt ID: {appointment_id}] User: {current_user.email} attempting update.")

    # 1. Fetch the appointment
    appointment = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id).first()
    if not appointment:
        logger.warning(f"[Update Appt ID: {appointment_id}] Not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # 2. Check Permissions (ensure check_appointment_permission exists and works)
    try:
        check_appointment_permission(current_user, appointment, action="update")
        logger.debug(f"[Update Appt ID: {appointment_id}] Permission check passed for user {current_user.email}.")
    except HTTPException as e:
         logger.warning(f"[Update Appt ID: {appointment_id}] Permission denied for user {current_user.email}: {e.detail}")
         raise e # Re-raise the permission error

    # 3. Prepare and Validate Update Data
    update_data_dict = update_data.model_dump(exclude_unset=True)
    logger.info(f"[Update Appt ID: {appointment_id}] Applying updates: {update_data_dict}")
    if not update_data_dict:
        # Although technically not an error, good practice to prevent unnecessary DB access
        logger.info(f"[Update Appt ID: {appointment_id}] No update data provided.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    # 4. Apply Updates and Track Changes
    original_status = appointment.status # Store status *before* potential update
    update_occurred = False
    status_changed = False # Flag to track if status specifically changed
    new_status_value = None # Store the new status if changed

    for field, value in update_data_dict.items():
        # Check if the field exists on the model and if the value actually changes
        if hasattr(appointment, field) and getattr(appointment, field) != value:
            if field == 'status' and value is not None:
                 # Ensure the value is the correct Enum type if the model uses it
                if isinstance(value, AppointmentStatus):
                    setattr(appointment, field, value)
                    update_occurred = True
                    status_changed = True # Mark status as changed
                    new_status_value = value # Store the new status enum value
                    logger.debug(f"[Update Appt ID: {appointment_id}] Status changed to {value.value}")
                else:
                     # This case should ideally be caught by Pydantic validation
                    logger.error(f"[Update Appt ID: {appointment_id}] Invalid type for status update: {type(value)}. Expected AppointmentStatus enum.")
                    # Raise error as data is invalid
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status value type provided.")

            elif field == 'appointment_time' and value is not None:
                # Add validation if needed (e.g., time not in past, within business hours?)
                setattr(appointment, field, value)
                update_occurred = True
                logger.debug(f"[Update Appt ID: {appointment_id}] Appointment time updated.")

            # Add elif blocks here for other fields you allow updating via AppointmentUpdate schema
            # elif field == 'some_other_field' and value is not None:
            #     setattr(appointment, field, value)
            #     update_occurred = True
            #     logger.debug(f"[Update Appt ID: {appointment_id}] {field} updated.")

        elif hasattr(appointment, field) and getattr(appointment, field) == value:
             logger.debug(f"[Update Appt ID: {appointment_id}] Field '{field}' requested update but value is the same.")


    if not update_occurred:
         logger.info(f"[Update Appt ID: {appointment_id}] No actual changes applied to the appointment.")
         # Still need to load relations for response model consistency, even if no changes
         try:
             # Refresh to ensure relationships are loaded, especially if eager loading isn't default
             db.refresh(appointment)
             # Explicitly refreshing relationships can help if they weren't loaded initially
             if not hasattr(appointment, 'client') or not appointment.client:
                 db.refresh(appointment, attribute_names=['client'])
             if not hasattr(appointment, 'services') or not appointment.services:
                 db.refresh(appointment, attribute_names=['services'])
             logger.debug(f"[Update Appt ID: {appointment_id}] Refreshed relationships for response.")
         except Exception as refresh_err:
             logger.error(f"[Update Appt ID: {appointment_id}] Error refreshing relationships even with no update: {refresh_err}", exc_info=True)
             # Decide if this is critical enough to raise 500 or just log and return potentially incomplete data
         return appointment # Return the unchanged appointment

    # Optional: Set updated_at timestamp if your model has this field
    # if hasattr(appointment, 'updated_at'):
    #    appointment.updated_at = dt.now(timezone.utc)

    # 5. Commit Appointment Changes
    try:
        db.commit()
        db.refresh(appointment) # Refresh after commit to get final state
        # Ensure relationships are loaded for the response
        if not hasattr(appointment, 'client') or not appointment.client:
             db.refresh(appointment, attribute_names=['client'])
        if not hasattr(appointment, 'services') or not appointment.services:
            db.refresh(appointment, attribute_names=['services'])
        logger.info(f"[Update Appt ID: {appointment_id}] Appointment update committed successfully.")
    except SQLAlchemyExceptions.IntegrityError as e:
         db.rollback()
         logger.error(f"[Update Appt ID: {appointment_id}] Database Integrity Error during update commit: {e}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not update appointment due to data conflict.")
    except Exception as e:
        db.rollback()
        logger.error(f"[Update Appt ID: {appointment_id}] Unknown Database Error during update commit: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update appointment.")

    # 6. Log Communication Based on Status Change (AFTER successful commit)
    log_details = None
    log_type = None

    if status_changed:
        # Determine log type based on the NEW status
        if new_status_value == AppointmentStatus.CANCELLED:
            log_type = CommunicationType.CANCELLATION
            log_details = f"Simulated cancellation notice for Appt ID: {appointment.id}"
        elif new_status_value == AppointmentStatus.CONFIRMED and original_status != AppointmentStatus.CONFIRMED:
            # Log confirmation only if it wasn't already confirmed
            log_type = CommunicationType.CONFIRMATION
            log_details = f"Simulated confirmation notice (status change) for Appt ID: {appointment.id}"
        # --- Add more conditions as needed ---
        # elif new_status_value == AppointmentStatus.COMPLETED: # Example
        #     log_type = CommunicationType.SYSTEM_ALERT # Maybe log completion internally?
        #     log_details = f"Appointment marked as completed: Appt ID {appointment.id}"
        # elif update_occurred and not status_changed: # Log if time etc changed?
        #      log_type = CommunicationType.UPDATE
        #      log_details = f"Simulated update notice for Appt ID: {appointment.id}"

        if log_type and appointment.client_id: # Only log if we have a type and client ID
            # Use the utility function to create the log entry object
            log_entry_created = create_communication_log(
                db=db, # Pass the session
                tenant_id=appointment.tenant_id,
                client_id=appointment.client_id,
                appointment_id=appointment.id,
                # user_id=current_user.id, # Pass current_user.id if logging the trigger user
                type=log_type,
                channel=CommunicationChannel.EMAIL, # Default to EMAIL for now
                # status defaults to SIMULATED
                notes=log_details,
                direction=CommunicationDirection.SYSTEM, # Default to SYSTEM
                status=CommunicationStatus.SIMULATED # Default to SIMULATED
            )

            if log_entry_created:
                # Commit the log entry in a separate transaction block
                try:
                    db.commit()
                    logger.info(f"[Update Appt ID: {appointment.id}] Communication log for status change ({log_type.value}) committed.")
                except Exception as log_commit_e:
                    # Log error but don't fail the main request because of logging failure
                    logger.error(f"[Update Appt ID: {appointment.id}] Failed to commit communication log: {log_commit_e}", exc_info=True)
                    db.rollback() # Rollback the failed log commit
            else:
                 logger.error(f"[Update Appt ID: {appointment.id}] Failed to prepare communication log entry.")
        elif status_changed:
             logger.warning(f"[Update Appt ID: {appointment.id}] Status changed to {new_status_value.value}, but no specific communication log type defined for it or client_id missing.")


    # 7. Return the updated appointment data
    return appointment

# --- Delete Appointment ---
@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"[Delete Appt ID: {appointment_id}] User: {current_user.email}")
    appointment = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    check_appointment_permission(current_user, appointment, action="delete") # Includes role check

    logger.info(f"[Delete Appt ID: {appointment_id}] Permission granted. Deleting...")
    try:
        db.delete(appointment)
        db.commit()
        logger.info(f"[Delete Appt ID: {appointment_id}] Deletion successful.")
        # Return Response for 204
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        logger.error(f"[Delete Appt ID: {appointment_id}] Database Error during delete: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete appointment.")
