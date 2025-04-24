# app/routers/appointments.py
# --- FULL REPLACEMENT ---

from fastapi import APIRouter, Depends, HTTPException, Request, status # Added Request, status
from sqlalchemy.orm import Session
from sqlalchemy import exc as SQLAlchemyExceptions # For catching DB errors
from app import models, schemas, database # Assuming these imports are correct
from typing import List

# --- Import Dependencies and Settings ---
# Assuming get_current_user now correctly reads from cookie and returns models.User
from app.dependencies import get_current_user
from app.config import settings

# Import the Appointment model directly for easier reference
from app.models.appointment import Appointment as AppointmentModel
# Import the AppointmentStatus enum if needed for validation/type hints
from app.schemas.enums import AppointmentStatus # Make sure this path is correct

# Import the User model for type hinting the current_user
from app.models.user import User


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)

# --- Helper Function for Permission Checks ---
def check_appointment_permission(current_user: User, appointment: AppointmentModel, action: str = "access"):
    """Checks if the current user has permission to access/modify an appointment."""
    if current_user.role == "super_admin":
        return # Super admin can do anything
    if current_user.tenant_id != appointment.tenant_id:
        print(f"[Permission Check Failed] User Tenant ({current_user.tenant_id}) != Appointment Tenant ({appointment.tenant_id}) for {action}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # Use 403 for permission denied
            detail=f"Not authorized to {action} this appointment"
        )
    # Add more granular checks here if needed based on role and action (e.g., staff vs admin)

# --- Create Appointment (Public, Subdomain Aware) ---
@router.post("/", response_model=schemas.appointment.AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_data: schemas.appointment.AppointmentCreate, # Renamed for clarity
    request: Request, # Inject Request to get Host header
    db: Session = Depends(database.get_db)
):
    # 1. Determine Tenant from Subdomain
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else "" # Don't fallback to client.host here easily
    if not effective_hostname:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    hostname_part = effective_hostname.split(':')[0]
    subdomain_name = hostname_part.split('.')[0]
    base_domain_config = settings.base_domain

    # Reject if it looks like a base domain request or invalid subdomain format
    if hostname_part == base_domain_config or '.' not in hostname_part or subdomain_name == "127":
         print(f"[Create Appointment] Rejected: Attempt from base domain/IP or invalid format: {hostname_part}")
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointments must be created via a valid tenant portal subdomain."
         )

    print(f"[Create Appointment] Attempt on subdomain: {subdomain_name}")

    # Find tenant matching the subdomain
    tenant = db.query(models.Tenant).filter(models.Tenant.subdomain == subdomain_name).first()
    if not tenant:
        print(f"[Create Appointment] Rejected: Tenant subdomain not found: {subdomain_name}")
        # Return 404 as the "resource" (the tenant portal) doesn't exist
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking portal not found.")
    tenant_id_from_subdomain = tenant.id
    print(f"[Create Appointment] Found Tenant ID: {tenant_id_from_subdomain} for subdomain {subdomain_name}")

    # 2. Validate Service and Tenant Match
    service = db.query(models.Service).filter(models.Service.id == appointment_data.service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Service with ID {appointment_data.service_id} not found")

    if service.tenant_id != tenant_id_from_subdomain:
        print(f"[Create Appointment] Rejected: Service Tenant ({service.tenant_id}) != Subdomain Tenant ({tenant_id_from_subdomain})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected service is not available for this booking portal."
        )
    print(f"[Create Appointment] Service {service.id} validated for Tenant {tenant_id_from_subdomain}")

    # 3. Handle Status (Rely more on Pydantic/Defaults if possible)
    # Assuming AppointmentCreate schema handles enum validation or defaults
    # If status is optional and defaults in model, this conversion might not be needed
    # Or handle it more robustly within the schema validator
    try:
        # Use status directly from validated Pydantic model if it handles enum conversion
        status_enum = appointment_data.status
        # Fallback/default logic if needed (better handled in schema or DB default)
        # status_enum = appointment_data.status if appointment_data.status else AppointmentStatus.PENDING
    except ValueError:
         raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status value provided.")

    # 4. Create Appointment Database Object
    db_appointment = AppointmentModel(
        client_name=appointment_data.client_name,
        client_email=appointment_data.client_email,
        appointment_time=appointment_data.appointment_time,
        service_id=appointment_data.service_id,
        tenant_id=tenant_id_from_subdomain, # Assign tenant from subdomain context
        status=status_enum
        # Add other fields if necessary
    )

    # 5. Save to Database
    try:
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        print(f"[Create Appointment] Successfully created Appointment ID: {db_appointment.id}")
        return db_appointment
    except SQLAlchemyExceptions.IntegrityError as e: # Catch potential DB errors like unique constraints
        db.rollback()
        print(f"[Create Appointment] Database Integrity Error: {e}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create appointment due to conflicting data.")
    except Exception as e: # Catch other potential DB errors
        db.rollback()
        print(f"[Create Appointment] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create appointment.")


# --- Retrieve Appointments (Authenticated, Tenant-Scoped) ---
@router.get("/", response_model=List[schemas.appointment.AppointmentOut])
def get_tenant_appointments(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user), # Require authenticated user
    # Add pagination/filtering params later e.g.: skip: int = 0, limit: int = 100
):
    print(f"[Get Appointments] User: {current_user.email}, Role: {current_user.role}, Tenant: {current_user.tenant_id}")

    query = db.query(AppointmentModel)

    # Apply tenant filtering unless super_admin
    if current_user.role != "super_admin":
        print(f"[Get Appointments] Filtering by Tenant ID: {current_user.tenant_id}")
        query = query.filter(AppointmentModel.tenant_id == current_user.tenant_id)

    # Add ordering, pagination, filtering later
    # query = query.order_by(AppointmentModel.appointment_time.desc()).offset(skip).limit(limit)

    appointments = query.all()
    print(f"[Get Appointments] Found {len(appointments)} appointments.")

    # Use Pydantic's from_orm method if available and needed
    # If AppointmentOut is correctly configured, FastAPI might handle this automatically
    # return [schemas.appointment.AppointmentOut.from_orm(appt) for appt in appointments]
    return appointments # FastAPI should serialize correctly if response_model is set


# --- Retrieve Specific Appointment (Authenticated, Tenant-Scoped) ---
@router.get("/{appointment_id}", response_model=schemas.appointment.AppointmentOut)
def get_appointment_by_id(
    appointment_id: int, # Use a more descriptive name
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user) # Require authentication
):
    print(f"[Get Appointment ID: {appointment_id}] User: {current_user.email}, Role: {current_user.role}")
    appointment = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Check permission (Super Admin or matching Tenant ID)
    check_appointment_permission(current_user, appointment, action="view") # Use helper

    print(f"[Get Appointment ID: {appointment_id}] Access granted.")
    return appointment


# --- Update Appointment (Authenticated, Tenant-Scoped) ---
@router.patch("/{appointment_id}", response_model=schemas.appointment.AppointmentOut)
def update_appointment(
    appointment_id: int,
    update_data: schemas.appointment.AppointmentUpdate, # Renamed for clarity
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user) # Require authentication
):
    print(f"[Update Appointment ID: {appointment_id}] User: {current_user.email}, Role: {current_user.role}")
    appointment = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Check permission (Super Admin or matching Tenant ID)
    # We allow staff/admin to update for now, add role checks inside if needed later
    check_appointment_permission(current_user, appointment, action="update")
    print(f"[Update Appointment ID: {appointment_id}] Permission granted.")

    # Apply updates
    update_data_dict = update_data.model_dump(exclude_unset=True)
    print(f"[Update Appointment ID: {appointment_id}] Applying updates: {update_data_dict}")

    for field, value in update_data_dict.items():
        # --- Add Validation/Conversion Here ---
        if field == 'tenant_id' and value != appointment.tenant_id:
             print(f"[Update Appointment ID: {appointment_id}] Rejected: Attempt to change tenant_id.")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the tenant of an appointment.")

        # --- FIX: Handle Enum Conversion for 'status' ---
        if field == 'status':
            if isinstance(value, AppointmentStatus):
                # If value is already an enum instance, get its database value
                db_value = value.value
                print(f"[Update Appointment ID: {appointment_id}] Converting status enum {value} to DB value '{db_value}'")
                value = db_value # Use the string value for setattr
            else:
                # If it's somehow still a string, ensure it's valid (though Pydantic should catch this)
                try:
                    # Attempt conversion to check validity and ensure correct case if needed
                    db_value = AppointmentStatus(str(value).lower()).value
                    print(f"[Update Appointment ID: {appointment_id}] Validating/converting status string '{value}' to DB value '{db_value}'")
                    value = db_value
                except ValueError:
                     raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid status value: {value}")
        # --- End Enum Fix ---

        # Add other field-specific validations if needed

        setattr(appointment, field, value) # Assign the potentially converted value

    # Save changes
    try:
        db.commit()
        db.refresh(appointment)
        print(f"[Update Appointment ID: {appointment_id}] Update successful.")
        return appointment
    except Exception as e: # Catch potential DB errors
        db.rollback()
        print(f"[Update Appointment ID: {appointment_id}] Database Error during update: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update appointment.")


# --- Delete Appointment (Authenticated, Tenant-Scoped, Role-Restricted) ---
@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user) # Require authentication
):
    print(f"[Delete Appointment ID: {appointment_id}] User: {current_user.email}, Role: {current_user.role}")
    appointment = db.query(AppointmentModel).filter(AppointmentModel.id == appointment_id).first()

    if not appointment:
        # Return 204 even if not found for idempotency, or 404 if preferred
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # Check base permission (Super Admin or matching Tenant ID)
    check_appointment_permission(current_user, appointment, action="delete")

    # Check role permission for deletion
    if current_user.role not in ["admin", "super_admin"]:
        print(f"[Delete Appointment ID: {appointment_id}] Rejected: User role '{current_user.role}' not allowed to delete.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User role not authorized to delete appointments.")

    print(f"[Delete Appointment ID: {appointment_id}] Permission granted. Deleting...")
    # Delete from Database
    try:
        db.delete(appointment)
        db.commit()
        print(f"[Delete Appointment ID: {appointment_id}] Deletion successful.")
        # Return No Content
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e: # Catch potential DB errors
        db.rollback()
        print(f"[Delete Appointment ID: {appointment_id}] Database Error during delete: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete appointment.")


# --- Removed /tenant/{tenant_id} endpoint ---
# This is redundant now as GET / provides tenant-scoped results for logged-in users
# Keeping it would expose data unnecessarily if not properly authenticated.
# @router.get("/tenant/{tenant_id}", response_model=List[schemas.appointment.AppointmentOut])
# def get_appointments_by_tenant(tenant_id: int, db: Session = Depends(database.get_db)):
#     # ... (This endpoint should be removed or secured with authentication) ...
