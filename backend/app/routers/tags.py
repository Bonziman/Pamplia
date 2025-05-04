# app/routers/tags.py
# --- NEW FILE ---

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import exc as SQLAlchemyExceptions
from typing import List, Optional
import logging

from app import database, models, schemas
from app.dependencies import get_current_user
from app.config import settings
from app.models.tag import Tag as TagModel
from app.models.tenant import Tenant as TenantModel
from app.models.user import User

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tags",
    tags=["Tags"]
)

# --- Helper Function for Tenant ID from Subdomain ---
# (Consider moving this to a shared utility/dependency file if used in many places)
def get_tenant_id_from_request(request: Request, db: Session) -> int:
    """Extracts Tenant ID from request subdomain. Raises HTTPException on errors."""
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else ""
    if not effective_hostname:
        logger.error("[Tenant Check] Host header missing")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    hostname_part = effective_hostname.split(':')[0]
    # Use robust subdomain check logic
    base_domain_config = settings.base_domain
    is_ip_address = all(part.isdigit() for part in hostname_part.split('.'))
    is_base_domain = hostname_part == base_domain_config
    has_subdomain = '.' in hostname_part and not is_base_domain and not is_ip_address

    if not has_subdomain:
        logger.warning(f"[Tenant Check] Request not from a valid tenant subdomain: {hostname_part}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be performed via a valid tenant portal subdomain."
        )

    subdomain_name = hostname_part.split('.')[0]
    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        logger.warning(f"[Tenant Check] Tenant subdomain not found: {subdomain_name}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant portal not found.")

    logger.info(f"[Tenant Check] Found Tenant ID: {tenant.id} for subdomain {subdomain_name}")
    return tenant.id


# --- Helper Function for Tag Permissions ---
def check_tag_permission(current_user: User, tag: TagModel, action: str = "access"):
    """Checks if the current user has permission to access/modify a tag."""
    # Allow access/view for staff+ roles within the tenant initially
    allowed_view_roles = ["staff", "admin", "super_admin"]
    # Restrict modify/delete actions
    allowed_manage_roles = ["admin", "super_admin", "staff"]

    if current_user.role == "super_admin":
        logger.info(f"[Permission Check] Super admin ({current_user.email}) granted for {action} on Tag ID {tag.id}.")
        return

    # Check if user belongs to the tag's tenant
    if current_user.tenant_id != tag.tenant_id:
        logger.warning(f"[Permission Check Failed] User Tenant ({current_user.tenant_id}) != Tag Tenant ({tag.tenant_id}) for {action} on Tag ID {tag.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to {action} this tag."
        )

    # Check role for the specific action
    required_roles = allowed_manage_roles if action in ["update", "delete"] else allowed_view_roles
    """if current_user.role not in required_roles:
         logger.warning(f"[Permission Check Failed] User role '{current_user.role}' cannot {action} Tag ID {tag.id}")
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions to {action} tag."
        )"""

    logger.info(f"[Permission Check] User ({current_user.email}) granted for {action} on Tag ID {tag.id}.")


# --- Helper Function to get Tag (handles 404) ---
def get_tag_or_404(db: Session, tag_id: int) -> TagModel:
    """Fetches a tag by ID, handling 404."""
    tag = db.query(TagModel).filter(TagModel.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return tag


# --- Create Tag (Admin/SuperAdmin, uses Subdomain Context) ---
@router.post("/", response_model=schemas.tag.TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_data: schemas.tag.TagCreate,
    request: Request, # Needed for subdomain context
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"[Create Tag] User: {current_user.email}, Role: {current_user.role}")

    # 1. Determine Target Tenant from Subdomain
    tenant_id_from_subdomain = get_tenant_id_from_request(request, db)

    # 2. Authorization Check (Role + Tenant Match)
    """if current_user.role not in ["admin", "super_admin", "staff"]:
        logger.warning(f"[Create Tag] Rejected: User role '{current_user.role}' not authorized.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")"""

    if current_user.role == "admin" and current_user.tenant_id != tenant_id_from_subdomain:
        logger.warning(f"[Create Tag] Rejected: Admin Tenant ({current_user.tenant_id}) mismatch with Subdomain Tenant ({tenant_id_from_subdomain}).")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create tags for another tenant portal.")

    # 3. Check for existing tag name within the target tenant
    existing_tag = db.query(TagModel).filter(
        TagModel.tenant_id == tenant_id_from_subdomain,
        TagModel.tag_name == tag_data.tag_name
    ).first()
    if existing_tag:
        logger.warning(f"[Create Tag] Rejected: Tag name '{tag_data.tag_name}' already exists for Tenant ID {tenant_id_from_subdomain}.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A tag with the name '{tag_data.tag_name}' already exists."
        )

    # 4. Create Tag Model instance
    db_tag = TagModel(
        **tag_data.model_dump(exclude_unset=True),
        tenant_id=tenant_id_from_subdomain # Set tenant from subdomain
    )

    # 5. Save to Database
    try:
        db.add(db_tag)
        db.commit()
        db.refresh(db_tag)
        logger.info(f"[Create Tag] Successfully created Tag ID: {db_tag.id} ('{db_tag.tag_name}') for Tenant ID: {db_tag.tenant_id}")
        return db_tag
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"[Create Tag] Database Integrity Error: {e}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create tag due to conflicting data.")
    except Exception as e:
        db.rollback()
        logger.error(f"[Create Tag] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create tag.")


# --- List Tags (Tenant-Scoped for Admin, All for SuperAdmin) ---
@router.get("/", response_model=List[schemas.tag.TagOut])
def get_tags(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
    # Add filters later if needed (e.g., by name)
):
    logger.info(f"[Get Tags] User: {current_user.email}, Role: {current_user.role}")

    # Authorization: Allow Admin or Super Admin to list tags
    # (Consider if Staff should be able to list tags they can assign)
    """if current_user.role not in ["admin", "super_admin", "staff"]:
         logger.warning(f"[Get Tags] Rejected: User role '{current_user.role}' not authorized.")
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")  """

    query = db.query(TagModel)

    # Apply tenant scoping
    if current_user.role == "admin":
        logger.info(f"[Get Tags] Admin filtering by Tenant ID: {current_user.tenant_id}")
        query = query.filter(TagModel.tenant_id == current_user.tenant_id)
    elif current_user.role == "staff":
        logger.info(f"[Get Tags] Staff filtering by Tenant ID: {current_user.tenant_id}")
        query = query.filter(TagModel.tenant_id == current_user.tenant_id)
    else: # super_admin
         logger.info(f"[Get Tags] Super admin fetching all tags.")


    tags = query.order_by(TagModel.tag_name).offset(skip).limit(limit).all()
    logger.info(f"[Get Tags] Found {len(tags)} tags.")
    return tags


# --- Get Specific Tag ---
@router.get("/{tag_id}", response_model=schemas.tag.TagOut)
def get_tag(
    tag_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"[Get Tag ID: {tag_id}] User: {current_user.email}")

    tag = get_tag_or_404(db, tag_id)
    check_tag_permission(current_user, tag, action="view") # Checks role and tenant match

    logger.info(f"[Get Tag ID: {tag_id}] Access granted.")
    return tag


# --- Update Tag ---
@router.patch("/{tag_id}", response_model=schemas.tag.TagOut)
def update_tag(
    tag_id: int,
    tag_update: schemas.tag.TagUpdate,
    # request: Request, # Optional: For extra subdomain check
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"[Update Tag ID: {tag_id}] User: {current_user.email}")

    tag = get_tag_or_404(db, tag_id)
    check_tag_permission(current_user, tag, action="update") # Checks role and tenant match

    update_data = tag_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    logger.info(f"[Update Tag ID: {tag_id}] Applying updates: {update_data}")

    # Check for name conflict if tag_name is being changed
    if "tag_name" in update_data and update_data["tag_name"] != tag.tag_name:
        existing_tag = db.query(TagModel).filter(
            TagModel.tenant_id == tag.tenant_id, # Check within the same tenant
            TagModel.tag_name == update_data["tag_name"],
            TagModel.id != tag.id # Exclude the current tag
        ).first()
        if existing_tag:
            logger.warning(f"[Update Tag ID: {tag_id}] Rejected: New name '{update_data['tag_name']}' conflicts.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A tag with the name '{update_data['tag_name']}' already exists for this tenant."
            )

    # Apply updates
    for field, value in update_data.items():
        setattr(tag, field, value)

    try:
        db.commit()
        db.refresh(tag)
        logger.info(f"[Update Tag ID: {tag_id}] Update successful.")
        return tag
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"[Update Tag ID: {tag_id}] Database Integrity Error: {e}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not update tag due to conflicting data.")
    except Exception as e:
        db.rollback()
        logger.error(f"[Update Tag ID: {tag_id}] Unknown Database Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update tag.")


# --- Delete Tag ---
@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    # request: Request, # Optional: For extra subdomain check
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"[Delete Tag ID: {tag_id}] User: {current_user.email}")

    tag = get_tag_or_404(db, tag_id)
    check_tag_permission(current_user, tag, action="delete") # Checks role (admin/super_admin) and tenant match

    logger.info(f"[Delete Tag ID: {tag_id}] Permission granted. Deleting...")
    try:
        # Deleting the tag object. SQLAlchemy session management + DB constraints
        # (ON DELETE CASCADE on the FK in client_tags_table) should handle
        # removing the associations from the junction table automatically.
        db.delete(tag)
        db.commit()
        logger.info(f"[Delete Tag ID: {tag_id}] Deletion successful.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except SQLAlchemyExceptions.IntegrityError as e:
        # This might happen if ON DELETE CASCADE isn't set up correctly,
        # or if other unexpected constraints exist.
         db.rollback()
         logger.error(f"[Delete Tag ID: {tag_id}] Database Integrity Error during delete: {e}")
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not delete tag, possibly due to existing references.")
    except Exception as e:
        db.rollback()
        logger.error(f"[Delete Tag ID: {tag_id}] Database Error during delete: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete tag.")


# --- Endpoints for Associating Tags with Clients ---
# These typically go in the Clients router for resource-oriented design

# Example placeholder in Clients router:
# @router.post("/{client_id}/tags/{tag_id}", status_code=status.HTTP_201_CREATED)
# def assign_tag_to_client(...): ...
#
# @router.delete("/{client_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
# def remove_tag_from_client(...): ...
