# app/routers/tenants.py
# --- FULL REPLACEMENT with Security & Confirmed Logic ---

from fastapi import APIRouter, Depends, HTTPException, status, Request # Request potentially needed for other endpoints or future logging
from sqlalchemy.orm import Session
from sqlalchemy import exc as SQLAlchemyExceptions, func
from typing import List
from datetime import datetime, timezone, timedelta
import re

# Core App Imports (Adjust paths if necessary)
from app import database, models, schemas
from app.dependencies import get_current_user
from app.models.tenant import Tenant as TenantModel
from app.models.user import User as UserModel
from app.schemas.tenant import TenantCreate, TenantOut, TenantUpdate, TenantStats
from app.models.appointment import Appointment as AppointmentModel
from app.models.client import Client as ClientModel
from app.models.service import Service as ServiceModel
from app.models.association_tables import appointment_services_table
from app.schemas.enums import AppointmentStatus
import logging 

# --- Setup logger ---
logger = logging.getLogger(__name__)

# --- Dependency for Super Admin Check ---
# (Ensure this exists in app/api/deps.py)
def get_current_active_super_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """
    Dependency that ensures the current user is authenticated AND is a super_admin.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if current_user.role != "super_admin":
        logger.warning(f"Permission denied: User {current_user.email} (Role: {current_user.role}) attempted super_admin action.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires super_admin privileges."
        )
    logger.debug(f"Super admin access granted for user: {current_user.email}")
    return current_user

# --- Router Definition ---
router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"]
)

# --- POST /tenants/ (Tenant Creation - Super Admin Only) ---
@router.post(
    "/",
    response_model=TenantOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_active_super_admin)] # Enforce super_admin
)
def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(database.get_db)
    # current_user provided by dependency but not explicitly needed in function signature here
):
    """
    Creates a new tenant. Only accessible by super_admins.
    """
    logger.info(f"Super Admin attempting to create tenant: {tenant_data.name} (Subdomain: {tenant_data.subdomain})")

    # Check if tenant name already exists
    existing_tenant_name = db.query(TenantModel).filter(TenantModel.name == tenant_data.name).first()
    if existing_tenant_name:
        logger.warning(f"Tenant creation failed: Name '{tenant_data.name}' already exists.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant with name '{tenant_data.name}' already exists"
        )

    # Check if subdomain already exists
    existing_tenant_subdomain = db.query(TenantModel).filter(TenantModel.subdomain == tenant_data.subdomain).first()
    if existing_tenant_subdomain:
        logger.warning(f"Tenant creation failed: Subdomain '{tenant_data.subdomain}' already taken.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subdomain '{tenant_data.subdomain}' is already taken"
        )

    # Create tenant instance
    db_tenant = TenantModel(
        name=tenant_data.name,
        subdomain=tenant_data.subdomain,
        # Set other fields from TenantCreate if the schema allows them
        # logo_url=tenant_data.logo_url,
        # slogan=tenant_data.slogan,
        # Remaining fields will use DB defaults or be NULL
    )

    try:
        db.add(db_tenant)
        db.commit()
        db.refresh(db_tenant)
        logger.info(f"Tenant '{db_tenant.name}' created successfully with ID: {db_tenant.id}")
        return db_tenant
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error creating tenant '{tenant_data.name}': {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create tenant due to conflicting data.")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error creating tenant '{tenant_data.name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tenant due to a server error."
        )

# --- GET /tenants/ (List All - Super Admin Only) ---
@router.get(
    "/",
    response_model=List[TenantOut],
    dependencies=[Depends(get_current_active_super_admin)] # Enforce super_admin
)
def get_all_tenants(db: Session = Depends(database.get_db)):
    """
    Retrieves a list of all tenants. Only accessible by super_admins.
    """
    logger.info("Super Admin fetching all tenants.")
    tenants = db.query(TenantModel).all()
    logger.info(f"Found {len(tenants)} tenants.")
    return tenants


# --- GET /tenants/me (Get Own Tenant Details - Any Authenticated User) ---
@router.get(
    "/me",
    response_model=TenantOut
)
def read_tenant_me(
    # db session might not be strictly needed if relationship is loaded, but keep for consistency
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user) # Ensures user is authenticated
):
    """
    Retrieves the details of the tenant associated with the currently
    authenticated user (staff, admin, or super_admin).
    Relies solely on the authenticated user's tenant relationship.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}, Role: {current_user.role}) requesting own tenant details via /me.")

    tenant = current_user.tenant # Access tenant via relationship

    if not tenant:
        logger.error(f"Data Integrity Issue: User {current_user.email} (ID: {current_user.id}) has no associated tenant in DB.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant associated with the current user not found. Please contact support."
        )

    logger.info(f"Returning details for Tenant ID: {tenant.id} (Name: {tenant.name}) for user {current_user.email}.")
    return tenant


# --- PATCH /tenants/me (Update Own Tenant Details - Admin/SuperAdmin Only) ---
@router.patch(
    "/me",
    response_model=TenantOut
)
def update_tenant_me(
    update_data: TenantUpdate, # Use the specific update schema
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user) # Ensures authenticated
):
    """
    Updates the details of the tenant associated with the currently
    authenticated user. Requires 'admin' role for the tenant, or 'super_admin'.
    Staff role is explicitly denied.
    Relies solely on the authenticated user's tenant relationship.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}, Role: {current_user.role}) attempting to update own tenant settings via /me.")

    # --- Permission Check ---
    if current_user.role not in ["admin", "super_admin"]:
         logger.warning(f"Permission denied for user {current_user.email} (Role: {current_user.role}) to update tenant settings via /me. Requires 'admin' or 'super_admin'.")
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="You do not have permission to update tenant settings."
         )

    # --- Get Tenant to Update (Must be the user's own tenant) ---
    tenant_to_update = current_user.tenant

    if not tenant_to_update:
        logger.error(f"User {current_user.email} (Role: {current_user.role}) has no associated tenant to update via /me endpoint.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant associated with the current user not found."
        )

    logger.info(f"User {current_user.email} authorized to update Tenant ID: {tenant_to_update.id} (Name: {tenant_to_update.name}).")

    # --- Apply Updates ---
    update_data_dict = update_data.model_dump(exclude_unset=True)
    if not update_data_dict:
        logger.info(f"No update data provided for Tenant ID: {tenant_to_update.id}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )

    logger.debug(f"Update payload for Tenant ID {tenant_to_update.id}: {update_data_dict}")
    update_occurred = False
    for field, value in update_data_dict.items():
        # Prevent updating critical/immutable fields like subdomain via this endpoint
        if field in ["subdomain", "id", "is_active"]: # 'name' might be updatable depending on policy
             logger.warning(f"Attempted to update restricted field '{field}' for Tenant ID {tenant_to_update.id} via /me endpoint. Skipping.")
             continue

        if hasattr(tenant_to_update, field):
            current_value = getattr(tenant_to_update, field)
            # Check for actual change before setting
            if current_value != value:
                setattr(tenant_to_update, field, value)
                logger.debug(f"Updating field '{field}' for Tenant ID {tenant_to_update.id}.")
                update_occurred = True
            # else: logger.debug(f"Field '{field}' provided but value is unchanged.") # Optional: log unchanged
        else:
             logger.warning(f"Field '{field}' in update payload does not exist on Tenant model.")

    if not update_occurred:
        logger.info(f"No actual changes applied to Tenant ID: {tenant_to_update.id}.")
        return tenant_to_update # Return current data

    # --- Commit and Return ---
    try:
        db.commit()
        db.refresh(tenant_to_update)
        logger.info(f"Tenant ID: {tenant_to_update.id} updated successfully by user {current_user.email}.")
        return tenant_to_update
    except SQLAlchemyExceptions.IntegrityError as e:
         db.rollback()
         logger.error(f"Database integrity error updating Tenant ID {tenant_to_update.id}: {e}", exc_info=True)
         # Provide a slightly more informative error if possible
         detail = f"Could not update tenant settings due to a data conflict (e.g., unique constraint violation)."
         if hasattr(e, 'orig') and hasattr(e.orig, 'pgerror'): # Example for Postgres error detail
             detail += f" DB Error: {e.orig.pgerror}"
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
    except Exception as e:
        db.rollback()
        logger.error(f"Database error updating Tenant ID {tenant_to_update.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant settings due to a server error."
        )

# --- GET /tenants/{tenant_id} (Get Specific Tenant - Super Admin Only) ---
@router.get(
    "/{tenant_id}",
    response_model=TenantOut,
    dependencies=[Depends(get_current_active_super_admin)] # Enforce super_admin
)
def get_specific_tenant(
    tenant_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Retrieves details for a specific tenant by ID. Only accessible by super_admins.
    """
    logger.info(f"Super Admin requesting details for Tenant ID: {tenant_id}")
    tenant = db.query(TenantModel).filter(TenantModel.id == tenant_id).first()
    if not tenant:
        logger.warning(f"Tenant lookup failed for ID: {tenant_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {tenant_id} not found.")
    logger.info(f"Returning details for Tenant ID: {tenant.id} (Name: {tenant.name})")
    return tenant

@router.patch(
    "/{tenant_id}",
    response_model=TenantOut,
    dependencies=[Depends(get_current_active_super_admin)]
)
def update_tenant_by_id(
    tenant_id: int,
    update_data: TenantUpdate,
    db: Session = Depends(database.get_db)
):
    """
    Updates details for a specific tenant by ID. Super admin only.
    """
    tenant = db.query(TenantModel).filter(TenantModel.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {tenant_id} not found.")

    update_data_dict = update_data.model_dump(exclude_unset=True)
    if not update_data_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    if "name" in update_data_dict:
        existing_name = db.query(TenantModel).filter(
            TenantModel.name == update_data_dict["name"],
            TenantModel.id != tenant_id
        ).first()
        if existing_name:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant name already exists.")

    if "subdomain" in update_data_dict:
        if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', update_data_dict["subdomain"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subdomain format.")
        existing_subdomain = db.query(TenantModel).filter(
            TenantModel.subdomain == update_data_dict["subdomain"],
            TenantModel.id != tenant_id
        ).first()
        if existing_subdomain:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subdomain is already taken.")

    for field, value in update_data_dict.items():
        if hasattr(tenant, field):
            setattr(tenant, field, value)

    try:
        db.commit()
        db.refresh(tenant)
        return tenant
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error updating Tenant ID {tenant_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not update tenant due to conflicting data.")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error updating Tenant ID {tenant_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update tenant due to a server error.")


@router.get(
    "/{tenant_id}/stats",
    response_model=TenantStats,
    dependencies=[Depends(get_current_active_super_admin)]
)
def get_tenant_stats(
    tenant_id: int,
    db: Session = Depends(database.get_db)
):
    tenant = db.query(TenantModel).filter(TenantModel.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant with ID {tenant_id} not found.")

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    revenue_total_query = db.query(func.sum(ServiceModel.price)).join(
        appointment_services_table, ServiceModel.id == appointment_services_table.c.service_id
    ).join(
        AppointmentModel, AppointmentModel.id == appointment_services_table.c.appointment_id
    ).filter(
        AppointmentModel.tenant_id == tenant_id,
        AppointmentModel.status == AppointmentStatus.DONE
    )

    revenue_last_30_days_query = db.query(func.sum(ServiceModel.price)).join(
        appointment_services_table, ServiceModel.id == appointment_services_table.c.service_id
    ).join(
        AppointmentModel, AppointmentModel.id == appointment_services_table.c.appointment_id
    ).filter(
        AppointmentModel.tenant_id == tenant_id,
        AppointmentModel.status == AppointmentStatus.DONE,
        AppointmentModel.appointment_time >= thirty_days_ago
    )

    appointments_total = db.query(func.count(AppointmentModel.id)).filter(AppointmentModel.tenant_id == tenant_id).scalar() or 0
    clients_total = db.query(func.count(ClientModel.id)).filter(ClientModel.tenant_id == tenant_id).scalar() or 0
    services_total = db.query(func.count(ServiceModel.id)).filter(ServiceModel.tenant_id == tenant_id).scalar() or 0
    users_total = db.query(func.count(UserModel.id)).filter(UserModel.tenant_id == tenant_id).scalar() or 0
    admins_total = db.query(func.count(UserModel.id)).filter(UserModel.tenant_id == tenant_id, UserModel.role == "admin").scalar() or 0
    staff_total = db.query(func.count(UserModel.id)).filter(UserModel.tenant_id == tenant_id, UserModel.role == "staff").scalar() or 0

    last_appointment_at = db.query(func.max(AppointmentModel.appointment_time)).filter(
        AppointmentModel.tenant_id == tenant_id
    ).scalar()

    return TenantStats(
        tenant_id=tenant_id,
        revenue_total=float(revenue_total_query.scalar() or 0.0),
        revenue_last_30_days=float(revenue_last_30_days_query.scalar() or 0.0),
        appointments_total=appointments_total,
        clients_total=clients_total,
        services_total=services_total,
        users_total=users_total,
        admins_total=admins_total,
        staff_total=staff_total,
        last_appointment_at=last_appointment_at.isoformat() if last_appointment_at else None
    )
