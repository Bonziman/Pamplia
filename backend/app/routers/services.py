# app/routers/services.py
# --- FULL REPLACEMENT ---

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import exc as SQLAlchemyExceptions
from typing import List, Optional # Import Optional for update schema

from app import models, schemas, database

# --- Import Dependencies and Settings ---
from app.dependencies import get_current_user
from app.config import settings

# --- Import Models and Schemas ---
from app.models.tenant import Tenant as TenantModel
from app.models.service import Service as ServiceModel
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceOut, ServiceUpdate # Ensure ServiceUpdate exists

router = APIRouter(
    prefix="/services",
    tags=["Services"]
)

# --- Helper Function for Permission Checks ---
def check_service_permission(current_user: User, service: ServiceModel, action: str = "access"):
    """Checks if the current user has permission to access/modify a service."""
    if current_user.role == "super_admin":
        print(f"[Permission Check] Super admin ({current_user.email}) granted for {action} on Service ID {service.id}.")
        return # Super admin can do anything

    if current_user.tenant_id != service.tenant_id:
        print(f"[Permission Check Failed] User Tenant ({current_user.tenant_id}) != Service Tenant ({service.tenant_id}) for {action} on Service ID {service.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to {action} this service"
        )
    # Optional: Add role-specific checks within the tenant if needed
    # e.g., if action == 'delete' and current_user.role == 'staff': raise HTTPException(...)
    print(f"[Permission Check] User ({current_user.email}) granted for {action} on Service ID {service.id}.")


# --- Create Service (Authenticated, Tenant-Scoped/Super Admin) ---
@router.post("/", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(
    service_data: ServiceCreate, # Use the updated schema (no tenant_id)
    request: Request,           # Inject Request object
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Create Service] User: {current_user.email}, Role: {current_user.role}, User Tenant: {current_user.tenant_id}")

    # --- 1. Determine Tenant from Subdomain ---
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else ""
    if not effective_hostname:
         print("[Create Service] Rejected: Host header missing")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    hostname_part = effective_hostname.split(':')[0]
    # Use the same robust subdomain check logic as in GET /services/tenant/
    base_domain_config = settings.base_domain
    is_ip_address = all(part.isdigit() for part in hostname_part.split('.'))
    is_base_domain = hostname_part == base_domain_config
    has_subdomain = '.' in hostname_part and not is_base_domain and not is_ip_address

    if not has_subdomain:
        print(f"[Create Service] Rejected: Request not from a valid tenant subdomain: {hostname_part}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Services must be created via a valid tenant portal subdomain."
        )

    subdomain_name = hostname_part.split('.')[0]
    print(f"[Create Service] Attempt on subdomain: {subdomain_name}")

    # Find tenant matching the subdomain
    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        print(f"[Create Service] Rejected: Tenant subdomain not found: {subdomain_name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant portal specified by subdomain not found."
        )
    tenant_id_from_subdomain = tenant.id
    print(f"[Create Service] Found Target Tenant ID: {tenant_id_from_subdomain} for subdomain {subdomain_name}")


    # --- 2. Authorization Checks ---
    # Role Check: Only admin or super_admin can create services
    if current_user.role not in ["admin", "super_admin"]:
        print(f"[Create Service] Rejected: User role '{current_user.role}' not authorized.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized to create services."
        )

    # Tenant Scope Check for Admins: Admin's tenant must match the subdomain's tenant
    if current_user.role == "admin" and current_user.tenant_id != tenant_id_from_subdomain:
        print(f"[Create Service] Rejected: Admin ({current_user.email}, Tenant {current_user.tenant_id}) attempting action on different tenant portal (Subdomain Tenant {tenant_id_from_subdomain}).")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators can only create services for their own tenant portal."
        )
    # Super admin can proceed regardless of their own tenant_id

    print(f"[Create Service] Authorization successful for User {current_user.email} on Tenant {tenant_id_from_subdomain}.")

    # --- 3. Create Service Model instance ---
    # tenant_id is now derived from the subdomain, not service_data
    db_service = ServiceModel(
        name=service_data.name,
        description=service_data.description,
        duration_minutes=service_data.duration_minutes,
        tenant_id=tenant_id_from_subdomain, # Use the ID from the subdomain
        price=service_data.price
    )

    # --- 4. Save to Database ---
    try:
        db.add(db_service)
        db.commit()
        db.refresh(db_service)
        print(f"[Create Service] Successfully created Service ID: {db_service.id} for Tenant ID: {db_service.tenant_id}")
        return db_service
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        print(f"[Create Service] Database Integrity Error: {e}")
        # Could be duplicate name within tenant if you have constraints
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create service due to conflicting data (e.g., duplicate name).")
    except Exception as e:
        db.rollback()
        print(f"[Create Service] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create service.")


# --- Retrieve Services (Authenticated, Tenant-Scoped/Super Admin) ---
@router.get("/", response_model=List[ServiceOut])
def get_services(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    # skip: int = 0, limit: int = 100 # Add pagination later
):
    print(f"[Get Services] User: {current_user.email}, Role: {current_user.role}, Tenant: {current_user.tenant_id}")

    query = db.query(ServiceModel)

    if current_user.role == "super_admin":
        print("[Get Services] Super admin fetching all services.")
        # No tenant filter needed for super_admin
    else:
        # Filter by the user's tenant ID for non-super_admins
        print(f"[Get Services] Filtering by Tenant ID: {current_user.tenant_id}")
        query = query.filter(ServiceModel.tenant_id == current_user.tenant_id)

    # query = query.order_by(ServiceModel.name).offset(skip).limit(limit) # Add later
    services = query.all()
    print(f"[Get Services] Found {len(services)} services.")
    return services


# --- Retrieve Specific Service (Authenticated, Tenant-Scoped/Super Admin) ---
@router.get("/{service_id}", response_model=ServiceOut)
def get_service_by_id(
    service_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Get Service ID: {service_id}] User: {current_user.email}, Role: {current_user.role}")
    service = db.query(ServiceModel).filter(ServiceModel.id == service_id).first()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    check_service_permission(current_user, service, action="view") # Handles tenant check

    print(f"[Get Service ID: {service_id}] Access granted.")
    return service


# --- Update Service (Authenticated, Tenant-Scoped/Super Admin) ---
@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    update_data: ServiceUpdate, # Use the specific update schema
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Update Service ID: {service_id}] User: {current_user.email}, Role: {current_user.role}")
    service = db.query(ServiceModel).filter(ServiceModel.id == service_id).first()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    check_service_permission(current_user, service, action="update") # Handles tenant check

    # Role Check: Only admin or super_admin can update services
    if current_user.role not in ["admin", "super_admin"]:
        print(f"[Update Service ID: {service_id}] Rejected: User role '{current_user.role}' not authorized.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized to update services."
        )

    update_data_dict = update_data.model_dump(exclude_unset=True)
    print(f"[Update Service ID: {service_id}] Applying updates: {update_data_dict}")

    if not update_data_dict:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )

    # Prevent changing tenant_id via update
    if "tenant_id" in update_data_dict:
        print(f"[Update Service ID: {service_id}] Rejected: Attempt to change tenant_id.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change the tenant of a service.")

    for field, value in update_data_dict.items():
        setattr(service, field, value)

    try:
        db.commit()
        db.refresh(service)
        print(f"[Update Service ID: {service_id}] Update successful.")
        return service
    except Exception as e:
        db.rollback()
        print(f"[Update Service ID: {service_id}] Database Error during update: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update service.")


# --- Delete Service (Authenticated, Tenant-Scoped/Super Admin) ---
@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Delete Service ID: {service_id}] User: {current_user.email}, Role: {current_user.role}")
    service = db.query(ServiceModel).filter(ServiceModel.id == service_id).first()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    check_service_permission(current_user, service, action="delete") # Handles tenant check

    # Role Check: Only admin or super_admin can delete services
    if current_user.role not in ["admin", "super_admin"]:
        print(f"[Delete Service ID: {service_id}] Rejected: User role '{current_user.role}' not authorized.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not authorized to delete services."
        )

    # Check for existing appointments using this service (Optional but Recommended)
    # If you want to prevent deletion if appointments exist:
    # appointment_count = db.query(models.appointment.Appointment).join(models.appointment.Appointment.services).filter(ServiceModel.id == service_id).count()
    # if appointment_count > 0:
    #     print(f"[Delete Service ID: {service_id}] Rejected: Service is associated with {appointment_count} appointments.")
    #     raise HTTPException(
    #         status_code=status.HTTP_409_CONFLICT,
    #         detail=f"Cannot delete service as it is linked to existing appointments ({appointment_count})."
    #     )

    print(f"[Delete Service ID: {service_id}] Permission granted. Deleting...")
    try:
        # SQLAlchemy will handle the removal from the association table
        # if the relationship cascade settings are correct (e.g., "all, delete-orphan" on Appointment.services)
        # or if foreign key constraints handle it (ON DELETE CASCADE - less common for M2M).
        # If not, you might need to manually clear associations before deleting.
        # For simplicity, assuming direct delete works or FK handles it.
        db.delete(service)
        db.commit()
        print(f"[Delete Service ID: {service_id}] Deletion successful.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except SQLAlchemyExceptions.IntegrityError as e:
         db.rollback()
         # This might happen if a FK constraint prevents deletion (e.g., linked appointments)
         print(f"[Delete Service ID: {service_id}] Database Integrity Error during delete: {e}")
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not delete service, possibly due to existing references (e.g., appointments).")
    except Exception as e:
        db.rollback()
        print(f"[Delete Service ID: {service_id}] Database Error during delete: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete service.")


# --- Retrieve Services for Public Tenant Portal (Public, Subdomain Aware) ---
@router.get("/tenant/", response_model=List[ServiceOut]) # Added trailing slash for consistency
def get_services_for_request_tenant(
    request: Request, # Inject the request object
    db: Session = Depends(database.get_db)
):
    """
    Retrieves services for the tenant associated with the subdomain
    extracted from the Host header of the incoming request.
    Intended for public booking pages. NO AUTHENTICATION REQUIRED.
    """
    # 1. Determine Tenant from Subdomain (Same logic as POST /appointments/)
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else ""
    if not effective_hostname:
         print("[Get Services /tenant] Rejected: Host header missing")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    hostname_part = effective_hostname.split(':')[0] # Get part before port
    # Handle cases like 'localhost', '127.0.0.1', or just the base domain
    base_domain_config = settings.base_domain
    is_ip_address = all(part.isdigit() for part in hostname_part.split('.')) # Basic IP check
    is_base_domain = hostname_part == base_domain_config
    has_subdomain = '.' in hostname_part and not is_base_domain and not is_ip_address

    if not has_subdomain:
        print(f"[Get Services /tenant] Rejected: Request not from a valid tenant subdomain: {hostname_part}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot determine tenant services. Access via the tenant portal subdomain."
        )

    subdomain_name = hostname_part.split('.')[0]
    print(f"[Get Services /tenant] Attempt on subdomain: {subdomain_name}")

    # 2. Find tenant matching the subdomain
    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        print(f"[Get Services /tenant] Rejected: Tenant subdomain not found: {subdomain_name}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant portal not found.")
    tenant_id_from_subdomain = tenant.id
    print(f"[Get Services /tenant] Found Tenant ID: {tenant_id_from_subdomain} for subdomain {subdomain_name}")

    # 3. Fetch services belonging to that tenant's ID
    services = db.query(ServiceModel).filter(ServiceModel.tenant_id == tenant_id_from_subdomain).all()

    print(f"[Get Services /tenant] Found {len(services)} services for Tenant ID {tenant_id_from_subdomain}")
    return services
