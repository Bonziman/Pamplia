# app/routers/clients.py
# --- NEW FILE ---

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, exc as SQLAlchemyExceptions, select, update
from typing import List, Optional
from datetime import datetime as dt # Alias to avoid confusion with schema datetime
import logging  # Import logging module

from app import database, models, schemas
from app.dependencies import get_current_user
from app.config import settings
from app.models.client import Client as ClientModel
from app.models.tenant import Tenant as TenantModel
from app.models.user import User
from app.models.tag import Tag as TagModel           # Import the Tag model
from app.schemas.tag import TagOut 
router = APIRouter(
    prefix="/clients",
    tags=["Clients"]
)
from app.models.communications_log import CommunicationsLog as CommunicationsLogModel
from app.schemas.communications_log import CommunicationsLogOut
from app.schemas.pagination import PaginatedResponse
from app.models.appointment import Appointment as AppointmentModel
from app.schemas.appointment import AppointmentOut
from sqlalchemy.orm import selectinload

# Configure logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# --- Helper Function for Client Permissions ---
def check_client_permission(current_user: User, client: ClientModel, action: str = "access"):
    """Checks if the current user has permission to access/modify a client."""
    if current_user.role == "super_admin":
        print(f"[Permission Check] Super admin ({current_user.email}) granted for {action} on Client ID {client.id}.")
        return # Super admin can do anything

    # Staff/Admin must belong to the same tenant as the client
    if current_user.tenant_id != client.tenant_id:
        print(f"[Permission Check Failed] User Tenant ({current_user.tenant_id}) != Client Tenant ({client.tenant_id}) for {action} on Client ID {client.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to {action} this client."
        )

    # Specific role checks for actions like delete
    if action == "delete" and current_user.role not in ["admin", "super_admin"]:
         print(f"[Permission Check Failed] User role '{current_user.role}' cannot {action} Client ID {client.id}")
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete client."
        )

    print(f"[Permission Check] User ({current_user.email}) granted for {action} on Client ID {client.id}.")


# --- Helper Function to get Client (handles 404 and soft delete filtering) ---
def get_client_or_404(
    db: Session,
    client_id: int,
    include_deleted: bool = False
) -> ClientModel:
    """Fetches a client by ID, handling 404 and soft deletion."""
    query = db.query(ClientModel).filter(ClientModel.id == client_id)
    if not include_deleted:
        query = query.filter(ClientModel.is_deleted == False)

    client = query.options(joinedload(ClientModel.tags)).first() # Eager load tags

    if not client:
        detail = "Client not found"
        if not include_deleted:
            detail += " (or has been deleted)."
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return client


# --- Create Client (Manual by Staff/Admin/SuperAdmin via Dashboard) ---
@router.post("/", response_model=schemas.client.ClientOut, status_code=status.HTTP_201_CREATED)
def create_client_manual(
    client_data: schemas.client.ClientCreateRequest, # Use the request schema
    request: Request, # Inject request for subdomain context
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[Create Client Manual] User: {current_user.email}, Role: {current_user.role}")

    # 1. Determine Target Tenant from Subdomain
    host_header = request.headers.get("Host", "")
    # (Include the robust subdomain extraction logic used elsewhere)
    # ... (subdomain extraction and tenant lookup) ...
    effective_hostname = host_header.split(':')[0]  # Extract hostname from Host header
    hostname_part = effective_hostname.split('.')[0] # Simplified here, use full logic
    subdomain_name = hostname_part.split('.')[0] # Simplified here, use full logic

    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        print(f"[Create Client Manual] Rejected: Tenant subdomain '{subdomain_name}' not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant portal not found.")
    tenant_id_from_subdomain = tenant.id
    print(f"[Create Client Manual] Target Tenant ID from subdomain: {tenant_id_from_subdomain}")

    # 2. Authorization Check
    if current_user.role not in ["staff", "admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

    if current_user.role in ["staff", "admin"] and current_user.tenant_id != tenant_id_from_subdomain:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create clients for another tenant portal.")

    # 3. Check for existing email within the target tenant (if email provided)
    if client_data.email:
        existing_client = db.query(ClientModel).filter(
            ClientModel.tenant_id == tenant_id_from_subdomain,
            ClientModel.email == client_data.email,
            ClientModel.is_deleted == False # Only check against active clients
        ).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An active client with email '{client_data.email}' already exists for this tenant."
            )

    # 4. Create Client Model instance
    db_client = ClientModel(
        **client_data.model_dump(exclude_unset=True), # Populate from schema
        tenant_id=tenant_id_from_subdomain, # Set tenant from subdomain
        is_confirmed=True, # Manually created clients are confirmed
        is_deleted=False # Ensure not deleted
        # confirmation_token/expiry can be left null
    )

    # 5. Save to Database
    try:
        db.add(db_client)
        db.commit()
        db.refresh(db_client)
        db.refresh(db_client, attribute_names=['tags']) # Refresh M2M if needed, though none added yet
        print(f"[Create Client Manual] Successfully created Client ID: {db_client.id} for Tenant ID: {db_client.tenant_id}")
        return db_client
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        print(f"[Create Client Manual] Database Integrity Error: {e}")
        # Could be the unique email constraint or other DB issue
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create client due to conflicting data (e.g., email already exists).")
    except Exception as e:
        db.rollback()
        print(f"[Create Client Manual] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create client.")


# --- List Clients (Tenant-Scoped for Staff/Admin, All for SuperAdmin) ---
@router.get("/", response_model=List[schemas.client.ClientOut])
def get_clients(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_deleted: bool = Query(False, description="Include soft-deleted clients in the results")
):
    print(f"[Get Clients] User: {current_user.email}, Role: {current_user.role}, Include Deleted: {include_deleted}")

    query = db.query(ClientModel)

    # Filter by deletion status unless requested otherwise
    if not include_deleted:
        query = query.filter(ClientModel.is_deleted == False)

    # Apply tenant scoping
    if current_user.role != "super_admin":
        print(f"[Get Clients] Filtering by Tenant ID: {current_user.tenant_id}")
        query = query.filter(ClientModel.tenant_id == current_user.tenant_id)

    # Eager load tags for efficiency in the list
    clients = query.options(joinedload(ClientModel.tags)).order_by(ClientModel.last_name, ClientModel.first_name).offset(skip).limit(limit).all()

    print(f"[Get Clients] Found {len(clients)} clients.")
    return clients


# --- Get Specific Client ---
@router.get("/{client_id}", response_model=schemas.client.ClientOut)
def get_client(
    client_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    include_deleted: bool = Query(False, description="Allow fetching a soft-deleted client")
):
    print(f"[Get Client ID: {client_id}] User: {current_user.email}, Include Deleted: {include_deleted}")

    query = db.query(ClientModel).filter(ClientModel.id == client_id)
    
    # Include deleted clients if requested
    if not include_deleted:
        query = query.filter(ClientModel.is_deleted == False)
        
    client = query.options(joinedload(ClientModel.tags)).first()   # Eager load tags
    
    if not client:
        detail = "Client not found"
        if not include_deleted:
            detail += " (or has been deleted)."
        logger.warning(f"Client ID {client_id} not found or inaccessible (Include Deleted: {include_deleted}).")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    
    check_client_permission(current_user, client, action="view")

    logger.info(f"Access granted for User '{current_user.email}' to Client ID: {client_id}")
    return client


# --- Update Client ---
@router.patch("/{client_id}", response_model=schemas.client.ClientOut)
def update_client(
    client_id: int,
    client_update: schemas.client.ClientUpdate,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Update Client ID: {client_id}] User: {current_user.email}")

    # Fetch only active clients for update
    client = get_client_or_404(db, client_id, include_deleted=False)
    check_client_permission(current_user, client, action="update")

    update_data = client_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    print(f"[Update Client ID: {client_id}] Applying updates: {update_data}")

    # Check for email conflict if email is being changed
    if "email" in update_data and update_data["email"] != client.email:
        existing_client = db.query(ClientModel).filter(
            ClientModel.tenant_id == client.tenant_id,
            ClientModel.email == update_data["email"],
            ClientModel.id != client.id, # Exclude the current client
            ClientModel.is_deleted == False
        ).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another active client with email '{update_data['email']}' already exists for this tenant."
            )

    # Apply updates
    for field, value in update_data.items():
        setattr(client, field, value)

    # Explicitly set updated_at (though onupdate should handle it)
    client.updated_at = dt.utcnow()

    try:
        db.commit()
        db.refresh(client)
        db.refresh(client, attribute_names=['tags']) # Refresh tags if needed
        print(f"[Update Client ID: {client_id}] Update successful.")
        return client
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        print(f"[Update Client ID: {client_id}] Database Integrity Error: {e}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not update client due to conflicting data.")
    except Exception as e:
        db.rollback()
        print(f"[Update Client ID: {client_id}] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update client.")


# --- Delete Client (Soft Delete) ---
@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"[Delete Client ID: {client_id}] User: {current_user.email}")

    # Fetch only active clients for deletion
    client = get_client_or_404(db, client_id, include_deleted=False)
    # Check permission, including role check (admin/super_admin only)
    check_client_permission(current_user, client, action="delete")

    # Perform soft delete
    client.is_deleted = True
    client.deleted_at = dt.utcnow() # Use timezone aware if possible dt.now(timezone.utc)
    client.email = f"deleted_{client.id}_{client.email}" # Optional: Obfuscate/ensure email uniqueness after delete
    client.confirmation_token = None # Clear token on delete
    client.token_expiry = None

    try:
        db.commit()
        print(f"[Delete Client ID: {client_id}] Soft delete successful.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        print(f"[Delete Client ID: {client_id}] Database Error during delete: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete client.")

# --- Associate Tag with Client ---
@router.post(
    "/{client_id}/tags/{tag_id}",
    response_model=schemas.client.ClientOut, # Return the updated client
    status_code=status.HTTP_200_OK,          # Use 200 OK for successful association update
    summary="Assign a Tag to a Client"
)
def assign_tag_to_client(
    client_id: int,
    tag_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assigns an existing tag to a specific client.
    Requires staff, admin, or super_admin role.
    Both client and tag must belong to the user's tenant (unless super_admin).
    """
    logger.info(f"[Assign Tag] User: {current_user.email} attempting to add Tag ID {tag_id} to Client ID {client_id}")

    # 1. Fetch Client (ensure active)
    client = get_client_or_404(db, client_id, include_deleted=False)

    # 2. Authorization Check (Client Access)
    # Allow staff+ to modify client tags within their tenant
    if current_user.role not in ["staff", "admin", "super_admin"]:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to modify client tags.")
    if current_user.role != "super_admin" and current_user.tenant_id != client.tenant_id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify tags for clients of another tenant.")

    # 3. Fetch Tag
    tag = db.query(TagModel).filter(TagModel.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

    # 4. Verify Tag belongs to the same Tenant as the Client
    if tag.tenant_id != client.tenant_id:
        logger.warning(f"[Assign Tag] Tenant mismatch: Client Tenant {client.tenant_id} != Tag Tenant {tag.tenant_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag does not belong to the same tenant as the client."
        )

    # 5. Check if association already exists
    if tag in client.tags:
        logger.info(f"[Assign Tag] Tag ID {tag_id} already assigned to Client ID {client_id}. No action needed.")
        # Return current client state, no need to commit
        # Ensure tags are loaded for the response model
        db.refresh(client, attribute_names=['tags'])
        return client

    # 6. Add association
    try:
        client.tags.append(tag)
        db.commit()
        db.refresh(client)
        db.refresh(client, attribute_names=['tags']) # Ensure relationship is loaded for response
        logger.info(f"[Assign Tag] Successfully assigned Tag ID {tag_id} to Client ID {client_id}")
        return client
    except Exception as e:
        db.rollback()
        logger.error(f"[Assign Tag] Error assigning tag: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not assign tag to client.")


# --- Disassociate Tag from Client ---
@router.delete(
    "/{client_id}/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a Tag from a Client"
)
def remove_tag_from_client(
    client_id: int,
    tag_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Removes an existing tag association from a specific client.
    Requires staff, admin, or super_admin role.
    Client must belong to the user's tenant (unless super_admin).
    """
    logger.info(f"[Remove Tag] User: {current_user.email} attempting to remove Tag ID {tag_id} from Client ID {client_id}")

    # 1. Fetch Client (ensure active) - Eager load tags to check association
    client = db.query(ClientModel).options(joinedload(ClientModel.tags)).filter(
        ClientModel.id == client_id,
        ClientModel.is_deleted == False
    ).first()
    if not client:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found or has been deleted.")

    # 2. Authorization Check (Client Access)
    # Allow staff+ to modify client tags within their tenant
    if current_user.role not in ["staff", "admin", "super_admin"]:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to modify client tags.")
    if current_user.role != "super_admin" and current_user.tenant_id != client.tenant_id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify tags for clients of another tenant.")

    # 3. Fetch Tag (Optional but good practice to ensure tag exists before trying remove)
    tag = db.query(TagModel).filter(TagModel.id == tag_id).first()
    if not tag:
        # Even if tag doesn't exist, the association can't exist. Return success? Or 404?
        # Let's assume if the tag doesn't exist, the association definitely doesn't.
        # But the check below is more direct.
        pass # Continue to check the actual association

    # 4. Check if association exists and remove
    tag_to_remove = next((t for t in client.tags if t.id == tag_id), None)

    if tag_to_remove is None:
        logger.warning(f"[Remove Tag] Tag ID {tag_id} not found on Client ID {client_id}.")
        # If the goal is removal, and it's already not there, is it an error?
        # Returning 404 implies the *association* wasn't found, which is accurate.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag association not found for this client.")

    try:
        client.tags.remove(tag_to_remove)
        db.commit()
        logger.info(f"[Remove Tag] Successfully removed Tag ID {tag_id} from Client ID {client_id}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        logger.error(f"[Remove Tag] Error removing tag: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not remove tag from client.")


@router.get(
    "/{client_id}/appointments/",
    response_model=List[AppointmentOut], # Return a list of appointments
    summary="List Appointments for a Specific Client"
)
def list_client_appointments(
    client_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user) # Requires authentication
):
    """
    Retrieves a list of all appointments associated with a specific client.
    Ensures the client belongs to the current user's tenant (unless super_admin).
    Used for populating dropdowns or lists where client context is primary.
    Note: Does not include pagination by default, adjust if needed for large histories.
    """
    logger.info(f"User {current_user.email} requesting appointments for Client ID: {client_id}")

    # 1. Fetch Client and check permissions (ensure active client)
    # We don't need include_deleted=True here usually
    client = get_client_or_404(db, client_id, include_deleted=False)
    check_client_permission(current_user, client, action="view appointments for") # Use specific action string

    # 2. Query appointments for this client
    # Eagerly load necessary relationships for the AppointmentOut schema
    query = db.query(AppointmentModel).filter(
        AppointmentModel.client_id == client_id
    ).options(
        selectinload(AppointmentModel.services), # Load services efficiently
        # Client is already loaded via get_client_or_404 or implicitly through relationship
        # selectinload(AppointmentModel.client).selectinload(ClientModel.tags) # If you need client tags in ApptOut
    ).order_by(
        desc(AppointmentModel.appointment_time) # Order by most recent first
    )

    # Consider adding pagination here if a client could have thousands of appointments
    # query = query.offset(skip).limit(limit)

    appointments = query.all()

    logger.info(f"Found {len(appointments)} appointments for Client ID: {client_id}")

    # The AppointmentOut schema will handle serialization
    return appointments


@router.get(
    "/{client_id}/communications/",
    response_model=PaginatedResponse[CommunicationsLogOut] # Use generic pagination schema
)
def list_client_communications(
    client_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(6, ge=1, le=50, description="Items per page"), # Default to 6 per requirement
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user) # All roles can view
):
    """
    Retrieves a paginated list of communication logs for a specific client,
    ensuring the client belongs to the user's tenant.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")

    tenant_id = current_user.tenant_id
    logger.info(f"User {current_user.email} listing communications for Client ID: {client_id} (Tenant: {tenant_id}), Page: {page}, Limit: {limit}")


    client = db.query(ClientModel).filter(
        ClientModel.id == client_id,
        ClientModel.tenant_id == tenant_id
    ).first()
    if not client:
        logger.warning(f"Communications list rejected: Client ID {client_id} not found or doesn't belong to Tenant ID {tenant_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found or access denied.")

    offset = (page - 1) * limit
    base_query = db.query(CommunicationsLogModel).filter(
        CommunicationsLogModel.client_id == client_id,
        CommunicationsLogModel.tenant_id == tenant_id
    )

    try:
        total_count = base_query.count() # Get total count before pagination
        logs = base_query.order_by(
            desc(CommunicationsLogModel.timestamp) # Order by most recent first
        ).offset(offset).limit(limit).all()

        logger.info(f"Found {len(logs)} communication logs (Total: {total_count}) for Client ID: {client_id} on page {page}.")

        return PaginatedResponse(
            total=total_count,
            page=page,
            limit=limit,
            items=logs # Pydantic will convert model instances using CommunicationsLogOut schema
        )
    except Exception as e:
         logger.error(f"Error querying communications for Client ID {client_id}: {e}", exc_info=True)
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve communication logs.")
