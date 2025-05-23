# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime # Import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr 
    # password field is complex. For UserOut, we don't want it.
    # For UserCreate, it's required.
    role: Optional[str] = "staff" # Default role to staff

class UserCreate(UserBase): # Used by POST /users/ (direct admin creation)
    password: str = Field(min_length=8) # Exclude from UserBase if it's not always there
    tenant_id: int

    class Config:
        from_attributes = True

# Schema for User coming out of the API
class UserOut(BaseModel): # Don't inherit from UserBase if UserBase includes password
    id: int
    name: str
    email: EmailStr
    role: str # Role is not optional for an existing user
    tenant_id: int
    is_active: bool
    activated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None # <--- Changed to Optional
    updated_at: Optional[datetime] = None
    # created_by_user_id: Optional[int] = None # Optional to include this

    class Config:
        from_attributes = True

# Schema for updating a user
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    # Password updates should likely be a separate, dedicated endpoint for security.
    # password: Optional[str] = Field(None, min_length=8) 
    role: Optional[str] = None # Admin might change staff role, but carefully.
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True

class UserStatusUpdate(BaseModel):
    is_active: bool
