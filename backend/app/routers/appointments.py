# app/routers/appointments.py
# --- FULL REPLACEMENT ---

from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from sqlalchemy.orm import Session, joinedload # Import joinedload for eager loading
from sqlalchemy import exc as SQLAlchemyExceptions
from app import models, schemas, database
from typing import List

# --- Import Dependencies and Settings ---
from app.dependencies import get_current_user
from app.config import settings

# --- Import Models and Schemas ---
from app.models.appointment import Appointment as AppointmentModel
from app.models.service import Service as ServiceModel
from app.models.tenant import Tenant as TenantModel
from app.models.user import User
from app.schemas.enums import AppointmentStatus
# Assuming appointment schemas are in schemas.appointment
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate

router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)

# --- Helper Function for Permission Checks (Modified) ---
def check_appointment_permission(current_user: User, appointment: AppointmentModel, action: str = "access"):
    """Checks if the current user has permission to access/modify an appointment."""
    if current_user.role == "super_admin":
        print(f"[Permission Check] Super admin ({current_user.email}) granted for {action} on Appt ID {appointment.id}.")
        return # Super admin can do anything

    if current_user.tenant_id != appointment.tenant_id:
        print(f"[Permission Check Failed] User Tenant ({current_user.tenant_id}) != Appointment Tenant ({appointment.tenant_id}) for {action} on Appt ID {appointment.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to {action} this appointment"
        )
    # Optional: Add role-specific checks within the tenant if needed
    # e.g., if action == 'delete' and current_user.role == 'staff': raise HTTPException(...)
    print(f"[Permission Check] User ({current_user.email}) granted for {action} on Appt ID {appointment.id}.")


# --- Create Appointment (Public, Subdomain Aware, Multiple Services) ---
@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_data: AppointmentCreate, # Use the schema with service_ids: List[int]
    request: Request,
    db: Session = Depends(database.get_db)
):
    # 1. Determine Tenant from Subdomain
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else ""
    if not effective_hostname:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    hostname_part = effective_hostname.split(':')[0]
    subdomain_name = hostname_part.split('.')[0]
    base_domain_config = settings.base_domain

    if hostname_part == base_domain_config or '.' not in hostname_part or subdomain_name == "127":
         print(f"[Create Appointment] Rejected: Attempt from base domain/IP: {hostname_part}")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointments must be created via a valid tenant portal subdomain.")

    print(f"[Create Appointment] Attempt on subdomain: {subdomain_name}")
    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        print(f"[Create Appointment] Rejected: Tenant subdomain not found: {subdomain_name}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking portal not found.")
    tenant_id_from_subdomain = tenant.id
    print(f"[Create Appointment] Found Tenant ID: {tenant_id_from_subdomain} for subdomain {subdomain_name}")

    # 2. Validate Service IDs and Tenant Match
    if not appointment_data.service_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one service ID must be provided.")

    # Fetch all requested services at once
    services = db.query(ServiceModel).filter(ServiceModel.id.in_(appointment_data.service_ids)).all()

    # Check if all requested services were found
    found_service_ids = {s.id for s in services}
    missing_service_ids = set(appointment_data.service_ids) - found_service_ids
    if missing_service_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Service IDs not found: {list(missing_service_ids)}")

    # Check if all found services belong to the correct tenant
    for service in services:
        if service.tenant_id != tenant_id_from_subdomain:
            print(f"[Create Appointment] Rejected: Service ID {service.id} (Tenant {service.tenant_id}) does not match Subdomain Tenant ({tenant_id_from_subdomain})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Service '{service.name}' is not available for this booking portal."
            )
    print(f"[Create Appointment] All services {appointment_data.service_ids} validated for Tenant {tenant_id_from_subdomain}")

    # 3. Status is handled by Pydantic schema default/validation now

    # 4. Create Appointment Database Object (without services initially)
    db_appointment = AppointmentModel(
        client_name=appointment_data.client_name,
        client_email=appointment_data.client_email,
        appointment_time=appointment_data.appointment_time,
        # client_phone=appointment_data.client_phone, # Add if you added phone to schema/model
        tenant_id=tenant_id_from_subdomain,
        status=appointment_data.status # Get validated/defaulted status from schema
    )

    # 5. Associate Services (IMPORTANT: Append Service *objects*, not just IDs)
    db_appointment.services.extend(services)

    # 6. Save to Database
    try:
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        # Eager load services for the response model
        db.refresh(db_appointment, attribute_names=['services'])
        # Or use options:
        # db_appointment = db.query(AppointmentModel).options(joinedload(AppointmentModel.services)).filter(AppointmentModel.id == db_appointment.id).one()

        print(f"[Create Appointment] Successfully created Appointment ID: {db_appointment.id} with Services: {[s.id for s in db_appointment.services]}")
        return db_appointment
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        print(f"[Create Appointment] Database Integrity Error: {e}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create appointment due to conflicting data.")
    except Exception as e:
        db.rollback()
        print(f"[Create Appointment] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create appointment.")


# --- Retrieve Appointments (Authenticated, Tenant-Scoped) ---
@router.get("/", response_model=List[AppointmentOut])
def get_tenant_appointments(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    # skip: int = 0, limit: int = 100 # Add pagination later
):
    print(f"[Get Appointments] User: {current_user.email}, Role: {current_user.role}, Tenant: {current_user.tenant_id}")

    # Eager load services to prevent N+1 queries when serializing
    query = db.query(AppointmentModel).options(joinedload(AppointmentModel.services))

    if current_user.role != "super_admin":
        print(f"[Get Appointments] Filtering by Tenant ID: {current_user.tenant_id}")
        query = query.filter(AppointmentModel.tenant_id == current_user.tenant_id)

    # query = query.order_by(AppointmentModel.appointment_time.desc()).offset(skip).limit(limit) # Add later
    appointments = query.all()
    print(f"[Get Appointments] Found {len(appointments)} appointments.")
    return appointments


# --- Retrieve Specific Appointment (Authenticated, Tenant-Scoped) ---
@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment_by_id(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Get Appointment ID: {appointment_id}] User: {current_user.email}, Role: {current_user.role}")
    # Eager load services for the response model
    appointment = db.query(AppointmentModel)\
        .options(joinedload(AppointmentModel.services))\
        .filter(AppointmentModel.id == appointment_id)\
        .first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    check_appointment_permission(current_user, appointment, action="view")

    print(f"[Get Appointment ID: {appointment_id}] Access granted.")
    return appointment


# --- Update Appointment (Authenticated, Tenant-Scoped) ---
# NOTE: Updating the list of services in a PATCH is complex.
# This implementation only handles updating non-relationship fields defined in AppointmentUpdate schema.
# To update services, you might need a separate endpoint or more complex logic here.
@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    update_data: AppointmentUpdate, # Schema with optional fields (no service_ids list)
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Update Appointment ID: {appointment_id}] User: {current_user.email}, Role: {current_user.role}")
    # Eager load services if needed for response model, even if not updating them here
    appointment = db.query(AppointmentModel)\
        .options(joinedload(AppointmentModel.services))\
        .filter(AppointmentModel.id == appointment_id)\
        .first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    check_appointment_permission(current_user, appointment, action="update")
    print(f"[Update Appointment ID: {appointment_id}] Permission granted.")

    update_data_dict = update_data.model_dump(exclude_unset=True)
    print(f"[Update Appointment ID: {appointment_id}] Applying updates: {update_data_dict}")

    # --- IMPORTANT: Service Update Logic NOT Included ---
    # If update_data included 'service_ids', you would need logic here to:
    # 1. Fetch the new Service objects.
    # 2. Validate they belong to the correct tenant.
    # 3. Clear the existing appointment.services list (appointment.services.clear()).
    # 4. Extend the list with the new Service objects (appointment.services.extend(new_services)).
    # This AppointmentUpdate schema *doesn't* have service_ids, so we skip this.
    if "service_ids" in update_data_dict:
         print(f"[Update Appointment ID: {appointment_id}] Rejected: Updating service list via PATCH not implemented.")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Updating services list via this endpoint is not supported.")
    # ---

    for field, value in update_data_dict.items():
        if field == 'tenant_id': # Should not happen if schema excludes it
             print(f"[Update Appointment ID: {appointment_id}] Rejected: Attempt to change tenant_id.")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the tenant of an appointment.")

        # Handle status enum value correctly for DB
        if field == 'status' and isinstance(value, AppointmentStatus):
            db_value = value.value
            print(f"[Update Appointment ID: {appointment_id}] Converting status enum {value} to DB value '{db_value}'")
            setattr(appointment, field, db_value) # Use string value
        else:
             setattr(appointment, field, value) # Assign other values directly

    try:
        db.commit()
        db.refresh(appointment)
        # Must explicitly refresh M2M relationships if needed after commit
        # db.refresh(appointment, attribute_names=['services'])
        print(f"[Update Appointment ID: {appointment_id}] Update successful.")
        return appointment
    except Exception as e:
        db.rollback()
        print(f"[Update Appointment ID: {appointment_id}] Database Error during update: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update appointment.")


# --- Delete Appointment (Authenticated, Tenant-Scoped, Role-Restricted) ---
@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Delete Appointment ID: {appointment_id}] User: {current_user.email}, Role: {current_user.role}")
    # No need to load services just to delete
    appointment = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    check_appointment_permission(current_user, appointment, action="delete")

    if current_user.role not in ["admin", "super_admin"]:
        print(f"[Delete Appointment ID: {appointment_id}] Rejected: User role '{current_user.role}' not allowed.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not authorized to delete appointments.")

    print(f"[Delete Appointment ID: {appointment_id}] Permission granted. Deleting...")
    try:
        # Deleting the appointment should automatically cascade deletes
        # in the appointment_services association table if FKs are set up correctly.
        db.delete(appointment)
        db.commit()
        print(f"[Delete Appointment ID: {appointment_id}] Deletion successful.")
        # Use Response directly for 204
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        print(f"[Delete Appointment ID: {appointment_id}] Database Error during delete: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete appointment.")