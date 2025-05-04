# app/routers/templates.py
# --- NEW FILE ---

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import exc as SQLAlchemyExceptions
from typing import List

# Core App Imports (Adjust paths if necessary)
from app import database, models, schemas
from app.dependencies import get_current_user
from app.models.tenant import Tenant as TenantModel # Needed for context/permissions
from app.models.user import User as UserModel
from app.models.template import Template as TemplateModel # The main model for this router
from app.schemas.template import TemplateCreate, TemplateOut, TemplateUpdate # Schemas

import logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/templates",
    tags=["Templates"]
)

# --- Dependency for Admin/SuperAdmin Check ---
# (Could be moved to app/api/deps.py)
def get_current_active_admin_or_super(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """
    Dependency ensuring user is authenticated and has 'admin' or 'super_admin' role.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if current_user.role not in ["admin", "super_admin"]:
        logger.warning(f"Permission denied: User {current_user.email} (Role: {current_user.role}) attempted template management.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires admin or super_admin privileges."
        )
    logger.debug(f"Admin/SuperAdmin access granted for template management: {current_user.email}")
    return current_user

# --- GET /templates/ (List Templates for Tenant) ---
@router.get(
    "/",
    response_model=List[TemplateOut]
    # Apply dependency to ensure only authorized users can list
    # dependencies=[Depends(get_current_active_admin_or_super)] # Or just get_current_user if staff can view? Let's restrict for now.
)
def list_templates(
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_active_admin_or_super) # Get authorized user
):
    """
    Retrieves a list of all templates for the current user's tenant.
    Accessible only by admins and super_admins of the tenant.
    """
    if not current_user.tenant_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a tenant.")

    logger.info(f"User {current_user.email} listing templates for Tenant ID: {current_user.tenant_id}")
    templates = db.query(TemplateModel).filter(TemplateModel.tenant_id == current_user.tenant_id).order_by(TemplateModel.event_trigger, TemplateModel.name).all()
    logger.info(f"Found {len(templates)} templates for Tenant ID: {current_user.tenant_id}")
    return templates

# --- POST /templates/ (Create New Template for Tenant) ---
@router.post(
    "/",
    response_model=TemplateOut,
    status_code=status.HTTP_201_CREATED
)
def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_active_admin_or_super) # Ensure creator is admin/super
):
    """
    Creates a new template for the current user's tenant.
    Prevents creating duplicates for the same tenant/trigger/type.
    """
    if not current_user.tenant_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a tenant.")

    tenant_id = current_user.tenant_id

    # Check for existing template with the same unique combination
    existing_template = db.query(TemplateModel).filter(
        TemplateModel.tenant_id == tenant_id,
        TemplateModel.event_trigger == template_data.event_trigger,
        TemplateModel.type == template_data.type
        # Maybe filter by is_active=True if you only allow one active one? The DB constraint handles this.
    ).first()

    if existing_template:
        logger.warning(f"Template creation failed: Template for trigger '{template_data.event_trigger.value}' and type '{template_data.type.value}' already exists for Tenant ID: {tenant_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An '{template_data.type.value}' template for the trigger '{template_data.event_trigger.value}' already exists for this tenant."
        )

    # Create the new template instance
    db_template = TemplateModel(
        **template_data.model_dump(), # Unpack validated data from schema
        tenant_id=tenant_id,
        is_default_template=False # User-created templates are not defaults
    )

    try:
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        logger.info(f"Template '{db_template.name}' (ID: {db_template.id}) created successfully for Tenant ID: {tenant_id}")
        return db_template
    except SQLAlchemyExceptions.IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error creating template '{template_data.name}' for Tenant ID {tenant_id}: {e}", exc_info=True)
        # Could be the unique constraint uq_template_tenant_trigger_type
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Could not create template due to conflicting data (trigger/type combo likely exists). Error: {e.orig}")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error creating template '{template_data.name}' for Tenant ID {tenant_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template due to a server error."
        )

# --- GET /templates/{template_id} (Get Specific Template) ---
@router.get("/{template_id}", response_model=TemplateOut)
def read_template(
    template_id: int,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_active_admin_or_super) # Permission check
):
    """
    Retrieves details for a specific template by ID.
    Ensures the template belongs to the current user's tenant.
    """
    if not current_user.tenant_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a tenant.")

    logger.info(f"User {current_user.email} requesting template ID: {template_id} for Tenant ID: {current_user.tenant_id}")

    template = db.query(TemplateModel).filter(
        TemplateModel.id == template_id,
        TemplateModel.tenant_id == current_user.tenant_id # Crucial tenant scope check
    ).first()

    if not template:
        logger.warning(f"Template ID: {template_id} not found or not accessible for Tenant ID: {current_user.tenant_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found or access denied.")

    logger.info(f"Returning template ID: {template_id} (Name: {template.name})")
    return template

# --- PATCH /templates/{template_id} (Update Specific Template) ---
@router.patch("/{template_id}", response_model=TemplateOut)
def update_template(
    template_id: int,
    update_data: TemplateUpdate,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_active_admin_or_super) # Permission check
):
    """
    Updates an existing template by ID.
    Ensures the template belongs to the current user's tenant.
    """
    if not current_user.tenant_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a tenant.")

    logger.info(f"User {current_user.email} attempting to update template ID: {template_id} for Tenant ID: {current_user.tenant_id}")

    # Fetch the template ensuring it belongs to the user's tenant
    template = db.query(TemplateModel).filter(
        TemplateModel.id == template_id,
        TemplateModel.tenant_id == current_user.tenant_id
    ).first()

    if not template:
        logger.warning(f"Template ID: {template_id} not found or not accessible for Tenant ID: {current_user.tenant_id} for update.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found or access denied.")

    # Prevent updating system default templates directly? (Optional check)
    # if template.is_default_template and current_user.role != 'super_admin':
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify system default templates.")

    update_data_dict = update_data.model_dump(exclude_unset=True)
    if not update_data_dict:
        logger.info(f"No update data provided for template ID: {template_id}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    logger.debug(f"Update payload for Template ID {template_id}: {update_data_dict}")
    update_occurred = False
    for field, value in update_data_dict.items():
        if hasattr(template, field) and getattr(template, field) != value:
            setattr(template, field, value)
            update_occurred = True
            logger.debug(f"Updating field '{field}' for Template ID {template_id}.")

    if not update_occurred:
        logger.info(f"No actual changes applied to Template ID: {template_id}")
        return template # Return existing data

    # Update timestamp if model has onupdate=func.now() automatically, otherwise set manually
    # template.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(template)
        logger.info(f"Template ID: {template_id} updated successfully by user {current_user.email}.")
        return template
    except Exception as e:
        db.rollback()
        logger.error(f"Database error updating Template ID {template_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template due to a server error."
        )


# --- DELETE /templates/{template_id} (Delete Specific Template) ---
@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_active_admin_or_super) # Permission check
):
    """
    Deletes a template by ID.
    Ensures the template belongs to the current user's tenant.
    """
    if not current_user.tenant_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with a tenant.")

    logger.info(f"User {current_user.email} attempting to delete template ID: {template_id} for Tenant ID: {current_user.tenant_id}")

    # Fetch the template ensuring it belongs to the user's tenant
    template = db.query(TemplateModel).filter(
        TemplateModel.id == template_id,
        TemplateModel.tenant_id == current_user.tenant_id
    ).first()

    if not template:
        logger.warning(f"Template ID: {template_id} not found or not accessible for Tenant ID: {current_user.tenant_id} for delete.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found or access denied.")

    # Prevent deleting system default templates? (Optional check)
    # if template.is_default_template and current_user.role != 'super_admin':
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete system default templates.")

    try:
        db.delete(template)
        db.commit()
        logger.info(f"Template ID: {template_id} deleted successfully by user {current_user.email}.")
        # Return None for 204 response
        return None # FastAPI handles the 204 status code
    except Exception as e:
        db.rollback()
        logger.error(f"Database error deleting Template ID {template_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template due to a server error."
        )
