# app/schemas/invitation.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
# Import the enum from models to be used in Pydantic schema
from app.models.invitation import InvitationStatusEnum 

class InvitationBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role_to_assign: str = Field("staff", description="Role to assign to the invited user, defaults to 'staff'")

class InvitationCreate(InvitationBase):
    # tenant_id will be derived from the inviting admin's context
    pass

class InvitationAccept(BaseModel):
    token: str
    password: str = Field(min_length=8) # Add password validation
    # first_name and last_name might be optional if already provided in invite,
    # but good to allow override/confirmation here.
    first_name: str = Field(min_length=1) 
    last_name: str = Field(min_length=1)

class InvitationOut(InvitationBase):
    id: int
    tenant_id: int
    status: InvitationStatusEnum # Use the enum here
    token_expiry: datetime
    invited_by_user_id: int
    accepted_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True # Ensures enum values (strings) are used in serialization

class ValidateTokenResponseSchema(BaseModel):
    valid: bool
    # These fields are populated if valid = True
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None # Role assigned in the invitation (e.g., "staff", "admin")
    
    # These fields are populated if valid = False
    error_code: Optional[str] = None # E.g., "EXPIRED", "NOT_FOUND", "ALREADY_ACCEPTED", "CANCELLED", "INVALID_STATUS"
    message: Optional[str] = None    # Human-readable error message to display on the frontend
