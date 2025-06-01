# app/routers/staff.py
import secrets
from fastapi import APIRouter, HTTPException, Depends, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone as pytimezone # Renamed to avoid conflict

from app import database, models, schemas # Main __init__
from app.models.user import User as UserModel
from app.models.tenant import Tenant as TenantModel
from app.models.invitation import Invitation as InvitationModel, InvitationStatusEnum
from app.schemas.invitation import (
    InvitationCreate, InvitationOut, InvitationAccept, ValidateTokenResponseSchema
)
from app.schemas.user import UserOut # For accept invitation response
from app.dependencies import get_current_user # Assuming this checks for active user by default
# If get_current_user doesn't check is_active, you might need a get_current_active_user
from app.services import email_service # Assuming your email_service is here
from app.utils import permissions # Your permissions helpers
from app.utils.jwt_utils import create_access_token # For login after accepting invite
from app.core.config import settings # For FRONTEND_URL if constructing links
from passlib.context import CryptContext # For hashing password
from app.utils.cookie_utils import get_cookie_domain_attribute
from app.utils.permissions import is_admin, is_super_admin, can_edit_user # Import your permission checks

import logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/staff", # Base prefix for staff related operations
    tags=["Staff & Invitations"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def generate_secure_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)

# --- Invitation Endpoints ---

@router.post("/invitations", response_model=schemas.invitation.InvitationOut, status_code=status.HTTP_201_CREATED)
async def invite_staff_member( # Made async to use await for email
    invitation_data: schemas.invitation.InvitationCreate,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Allows a Tenant Admin or Super Admin to invite a new staff member to their tenant.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Current user not associated with a tenant.")

    # Permission check: Only admin/super_admin of the tenant can invite
    if not (permissions.is_admin(current_user) or permissions.is_super_admin(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to invite staff.")

    target_tenant_id = current_user.tenant_id # Admin invites to their own tenant

    # 1. Check if email already exists as an active user globally
    existing_active_user = db.query(UserModel).filter(
        UserModel.email == invitation_data.email,
        UserModel.is_active == True
    ).first()
    if existing_active_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active user with email '{invitation_data.email}' already exists."
        )

    # 2. Check for an existing PENDING invitation for this email in THIS tenant
    existing_pending_invite = db.query(InvitationModel).filter(
        InvitationModel.email == invitation_data.email,
        InvitationModel.tenant_id == target_tenant_id,
        InvitationModel.status == InvitationStatusEnum.PENDING
    ).first()

    if existing_pending_invite:
        if existing_pending_invite.token_expiry > datetime.now(pytimezone.utc):
            # Invitation exists and is not expired - resend logic could be triggered by a different endpoint
            # For this endpoint, inform that it's pending.
            logger.info(f"Invitation for {invitation_data.email} to tenant {target_tenant_id} is already pending.")
            # Optionally, could update names if provided and different, then resend
            # For now, just return the existing one with a 200 status.
            # Or raise 409 as "already invited and pending"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An invitation for '{invitation_data.email}' is already pending for this tenant. It can be resent if needed."
            )
        else:
            # Expired pending invite: update it with new token and expiry
            logger.info(f"Updating expired pending invitation for {invitation_data.email} to tenant {target_tenant_id}.")
            existing_pending_invite.invitation_token = generate_secure_token()
            existing_pending_invite.token_expiry = datetime.now(pytimezone.utc) + timedelta(hours=settings.invitation_expiry_hours or 48) # Use config or default
            existing_pending_invite.status = InvitationStatusEnum.PENDING # Ensure it's pending
            existing_pending_invite.first_name = invitation_data.first_name
            existing_pending_invite.last_name = invitation_data.last_name
            existing_pending_invite.role_to_assign = invitation_data.role_to_assign # Allow role update on resend
            db_invitation = existing_pending_invite
            status_to_return = status.HTTP_200_OK # Indicate update/resend
    else:
        # No active user, no pending invite for this tenant, or expired invite handled above. Create new.
        db_invitation = InvitationModel(
            email=invitation_data.email,
            first_name=invitation_data.first_name,
            last_name=invitation_data.last_name,
            role_to_assign=invitation_data.role_to_assign,
            tenant_id=target_tenant_id,
            invited_by_user_id=current_user.id,
            invitation_token=generate_secure_token(),
            token_expiry=datetime.now(pytimezone.utc) + timedelta(hours=settings.invitation_expiry_hours or 48) # Use config
        )
        db.add(db_invitation)
        status_to_return = status.HTTP_201_CREATED

    # 3. Send invitation email
    # Construct activation link (ensure FRONTEND_URL is in your settings)
    # Example: FRONTEND_URL = "http://localhost:3000" or "https://tenant.pamplia.com"
    # The frontend route for accepting invitations needs to be defined, e.g., /accept-invitation
    tenant_subdomain = current_user.tenant.subdomain if hasattr(current_user.tenant, 'subdomain') else None
    activation_link = f"http://{tenant_subdomain}.{settings.frontend_url.rstrip('/')}/accept-invitation?token={db_invitation.invitation_token}"
    
    email_subject = f"You're invited to join {current_user.tenant.name} on Pamplia" # Tenant name from relationship
    # Create a simple HTML body or use a template rendering engine
    html_body = f"""
    <p>Hello {invitation_data.first_name or invitation_data.email},</p>
    <p>You have been invited by {current_user.name} to join the team for <strong>{current_user.tenant.name}</strong> on Pamplia as a {db_invitation.role_to_assign}.</p>
    <p>Please click the link below to accept your invitation and set up your account. This link will expire in {settings.invitation_expiry_hours or 48} hours.</p>
    <p>
        <a href="{activation_link}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">
            Activate
        </a>
    </p>
    <p>If you did not expect this invitation, please ignore this email.</p>
    <p>Thanks,<br>The Pamplia Team</p>
    """
    
    # Fetch tenant for reply-to (already available via current_user.tenant)
    email_sent = await email_service.send_email(
        to_email=db_invitation.email,
        subject=email_subject,
        html_body=html_body,
        tenant=current_user.tenant, # Pass the tenant object
        # reply_to_email=current_user.tenant.contact_email # Or let send_email handle defaults
    )

    if not email_sent:
        # If email fails, should we roll back the invitation creation?
        # For now, let's assume the invitation is created, but admin might need to resend.
        # Or, raise an error if email is critical for the flow to proceed.
        # For a robust system, if email fails, the invite might be marked as "pending_email_send_failed"
        # Or raise 500:
        # db.rollback() # If you want to undo invite creation on email failure
        logger.error(f"Failed to send invitation email to {db_invitation.email} for tenant {target_tenant_id}. Invitation created but email failed.")
        # Raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invitation created, but failed to send email.")
        # For now, proceed with invite creation, admin can resend.

    try:
        db.commit()
        db.refresh(db_invitation)
        router.status_code = status_to_return # Set status code for response here if needed for FastAPI test client
        return db_invitation
    except Exception as e:
        db.rollback()
        logger.error(f"Database error after creating/updating invitation for {invitation_data.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save invitation.")


@router.post("/invitations/accept", response_model=schemas.token.TokenUserResponse) # Using TokenUserResponse from auth schemas
async def accept_staff_invitation(
    invitation_accept_data: schemas.invitation.InvitationAccept,
    response: Response, # FastAPI Response object injected
    db: Session = Depends(database.get_db)
):
    token_from_payload = invitation_accept_data.token
    logger.info(f"Accepting invitation with token from payload: {token_from_payload[:10]}...")
    
    invitation = db.query(InvitationModel).filter(InvitationModel.invitation_token == token_from_payload).first()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation token not found or invalid.")
    if invitation.status != InvitationStatusEnum.PENDING:
        detail_msg = "Invitation is not currently valid or has already been processed."
        if invitation.status == InvitationStatusEnum.ACCEPTED: detail_msg = "This invitation has already been accepted."
        elif invitation.status == InvitationStatusEnum.EXPIRED: detail_msg = "This invitation link has expired."
        elif invitation.status == InvitationStatusEnum.CANCELLED: detail_msg = "This invitation has been cancelled."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail_msg)
    if invitation.token_expiry < datetime.now(pytimezone.utc):
        if invitation.status == InvitationStatusEnum.PENDING: # Mark as expired
            invitation.status = InvitationStatusEnum.EXPIRED
            db.commit()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation token has expired.")

    existing_user = db.query(UserModel).filter(UserModel.email == invitation.email, UserModel.is_active == True).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active user with this email already exists.")

    user_full_name = f"{invitation_accept_data.first_name} {invitation_accept_data.last_name}".strip()
    
    # Ensure your User model has first_name and last_name if you plan to set them separately
    # Otherwise, just use the `name` field.
    new_user_data = {
        "email": invitation.email,
        "name": user_full_name or invitation.email.split('@')[0],
        "password": hash_password(invitation_accept_data.password),
        "tenant_id": invitation.tenant_id,
        "role": invitation.role_to_assign,
        "is_active": True,
        "activated_at": datetime.now(pytimezone.utc),
        "created_by_user_id": invitation.invited_by_user_id,
        # Add first_name and last_name if your UserModel supports them directly
        # "first_name": invitation_accept_data.first_name,
        # "last_name": invitation_accept_data.last_name,
    }
    # Filter out None values if UserModel fields are not nullable for these
    # new_user_data = {k: v for k, v in new_user_data.items() if v is not None or k in ['is_active', 'tenant_id', 'email', 'name', 'password', 'role']}


    new_user = UserModel(**new_user_data)
    logger.info(f"Attempting to create new user: {new_user.email} for tenant {invitation.tenant_id}")
    
    try:
        db.add(new_user)
        db.flush() 
        logger.info(f"New user ID {new_user.id} generated for {new_user.email}")

        invitation.status = InvitationStatusEnum.ACCEPTED
        invitation.accepted_by_user_id = new_user.id
        # Consider clearing token for security after successful use
        # invitation.invitation_token = None 
        # invitation.token_expiry = None   

        db.commit()
        db.refresh(new_user)
        
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": new_user.email, "user_id": new_user.id, "tenant_id": new_user.tenant_id, "role": new_user.role},
            expires_delta=access_token_expires
        )
        
        # --- REPLICATED COOKIE LOGIC FROM AUTH/LOGIN ---
        cookie_key_to_set = settings.auth_cookie_name
        # Use your get_cookie_domain_attribute function
        cookie_domain_to_set = get_cookie_domain_attribute(settings.base_domain) 
        
        logger.info(
            f"Attempting to set cookie (staff accept): key='{cookie_key_to_set}', "
            f"domain='{cookie_domain_to_set}', secure={settings.environment == 'production'}, "
            f"max_age={int(access_token_expires.total_seconds())}, samesite='Lax'"
        )

        response.set_cookie(
            key=cookie_key_to_set,
            value=access_token,
            httponly=True,
            max_age=int(access_token_expires.total_seconds()), 
            path="/",
            samesite="Lax", # Capitalized "Lax"
            secure=settings.environment == "production",
            domain=cookie_domain_to_set # Value from your helper function
        )
        logger.info(f"Cookie '{cookie_key_to_set}' instruction prepared for response for user {new_user.email}.")
        
        user_out_data = UserOut.model_validate(new_user)

        return schemas.token.TokenUserResponse( # Ensure this matches schemas.auth.TokenUserResponse
            access_token=access_token, 
            token_type="bearer",
            user=user_out_data
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error during final stage of accepting invitation for token {token_from_payload[:10]}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not process invitation acceptance.")
    
@router.get("/invitations", response_model=schemas.pagination.PaginatedResponse[InvitationOut]) # Assuming you have a PaginatedResponse schema
def list_tenant_invitations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[InvitationStatusEnum] = Query(None, alias="status"),
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")
    if not (permissions.is_admin(current_user) or permissions.is_super_admin(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view invitations.")

    tenant_id = current_user.tenant_id
    query = db.query(InvitationModel).filter(InvitationModel.tenant_id == tenant_id)
    count_query = db.query(func.count(InvitationModel.id)).filter(InvitationModel.tenant_id == tenant_id)

    if status_filter:
        query = query.filter(InvitationModel.status == status_filter)
        count_query = count_query.filter(InvitationModel.status == status_filter)

    total_items = count_query.scalar() or 0
    
    invitations = query.order_by(InvitationModel.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # Ensure schemas.pagination.PaginatedResponse is defined like:
    # class PaginatedResponse(GenericModel, Generic[T]):
    #    total: int
    #    page: int
    #    limit: int
    #    items: List[T]
    return schemas.pagination.PaginatedResponse(
        total=total_items,
        page=page,
        limit=limit,
        items=invitations
    )


@router.post("/invitations/{invitation_id}/resend", response_model=InvitationOut)
async def resend_staff_invitation( # Made async for email
    invitation_id: int,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")
    if not (permissions.is_admin(current_user) or permissions.is_super_admin(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    invitation = db.query(InvitationModel).filter(
        InvitationModel.id == invitation_id,
        InvitationModel.tenant_id == current_user.tenant_id
    ).first()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found or access denied.")
    if invitation.status != InvitationStatusEnum.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is not in a pending state to be resent.")

    # Generate new token and expiry
    invitation.invitation_token = generate_secure_token()
    invitation.token_expiry = datetime.now(pytimezone.utc) + timedelta(hours=settings.invitation_expiry_hours or 48)
    
    # Resend email
    activation_link = f"{settings.frontend_url.rstrip('/')}/accept-invitation?token={invitation.invitation_token}"
    email_subject = f"Reminder: You're invited to join {current_user.tenant.name} on Pamplia"
    html_body = f"""
    <p>Hello {invitation.first_name or invitation.email},</p>
    <p>This is a reminder for your invitation to join <strong>{current_user.tenant.name}</strong> on Pamplia as a {invitation.role_to_assign}.</p>
    <p>Please click the button below to accept. This new link will expire in {settings.invitation_expiry_hours or 48} hours.</p>
    <p>
        <a href="{activation_link}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">
            Activate
        </a>
    </p>
    """
    email_sent = await email_service.send_email(
        to_email=invitation.email,
        subject=email_subject,
        html_body=html_body,
        tenant=current_user.tenant
    )
    if not email_sent:
        logger.error(f"Failed to resend invitation email for ID {invitation_id}.")
        # Don't rollback token changes, admin can try again.
        # Or, raise an error indicating email failure.
        # For now, we proceed as token is updated.

    try:
        db.commit()
        db.refresh(invitation)
        return invitation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not resend invitation.")


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_staff_invitation(
    invitation_id: int,
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")
    if not (permissions.is_admin(current_user) or permissions.is_super_admin(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    invitation = db.query(InvitationModel).filter(
        InvitationModel.id == invitation_id,
        InvitationModel.tenant_id == current_user.tenant_id
    ).first()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found or access denied.")
    if invitation.status != InvitationStatusEnum.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending invitations can be cancelled.")

    invitation.status = InvitationStatusEnum.CANCELLED
    invitation.token_expiry = datetime.now(pytimezone.utc) # Reset expiry
    try:
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e)


# --- Staff User Management (subset of user management, focused on staff context) ---

# PATCH to activate/deactivate a staff member. More general updates go through /users/{user_id}
@router.patch("/{staff_user_id}/status", response_model=UserOut)
def update_staff_status(
    staff_user_id: int,
    status_update: schemas.user.UserStatusUpdate, # New schema: { is_active: bool }
    db: Session = Depends(database.get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not associated with a tenant.")

    target_staff_user = db.query(UserModel).filter(UserModel.id == staff_user_id).first()
    if not target_staff_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found.")

    # Permission: Admin can manage staff in their tenant. SuperAdmin can manage any.
    if not permissions.can_edit_user(current_user, target_staff_user):
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to manage this staff member's status.")
    
    if target_staff_user.role not in ["staff"]: # Ensure only 'staff' role users are managed here, not other admins
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This endpoint is for managing staff role users only.")
    
    if current_user.id == target_staff_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own active status via this endpoint.")

    target_staff_user.is_active = status_update.is_active
    target_staff_user.updated_at = datetime.now(pytimezone.utc)
    
    try:
        db.commit()
        db.refresh(target_staff_user)
        return target_staff_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating staff status for user ID {staff_user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update staff status.")

# --- Validate token endpoint ---
@router.get("/invitations/validate-token", response_model=ValidateTokenResponseSchema)
def validate_invitation_token_endpoint( # Public endpoint, no current_user dependency
    token: str = Query(...),
    db: Session = Depends(database.get_db)
):
    """
    Validates an invitation token.
    This is a public endpoint called by the frontend before showing the accept invitation form.
    """
    logger.info(f"Validating invitation token: {token[:10]}...") # Log partial token for security

    invitation = db.query(InvitationModel).filter(InvitationModel.invitation_token == token).first()

    if not invitation:
        logger.warning(f"Validation failed: Token not found - {token[:10]}...")
        return ValidateTokenResponseSchema(valid=False, error_code="NOT_FOUND", message="Invitation token not found or invalid.")
    
    if invitation.status == InvitationStatusEnum.ACCEPTED:
        logger.warning(f"Validation failed: Token already accepted - {token[:10]}...")
        return ValidateTokenResponseSchema(valid=False, error_code="ALREADY_ACCEPTED", message="This invitation has already been accepted.")
    
    if invitation.status == InvitationStatusEnum.CANCELLED:
        logger.warning(f"Validation failed: Token cancelled - {token[:10]}...")
        return ValidateTokenResponseSchema(valid=False, error_code="CANCELLED", message="This invitation has been cancelled by the administrator.")
    
    if invitation.token_expiry < datetime.now(pytimezone.utc):
        logger.warning(f"Validation failed: Token expired - {token[:10]}...")
        # Optionally update status in DB if not already EXPIRED
        if invitation.status == InvitationStatusEnum.PENDING:
            invitation.status = InvitationStatusEnum.EXPIRED
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error updating expired token status for token {token[:10]}: {e}")
                # Proceed to return expired error anyway
        return ValidateTokenResponseSchema(valid=False, error_code="EXPIRED", message="This invitation link has expired.")

    if invitation.status != InvitationStatusEnum.PENDING: # Should be caught by above, but as a fallback
        logger.warning(f"Validation failed: Token status not pending ({invitation.status.value}) - {token[:10]}...")
        return ValidateTokenResponseSchema(valid=False, error_code="INVALID_STATUS", message="This invitation is not currently active.")

    logger.info(f"Validation successful for token: {token[:10]}..., Email: {invitation.email}")
    return ValidateTokenResponseSchema(
        valid=True,
        email=invitation.email,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        role=invitation.role_to_assign
    )
