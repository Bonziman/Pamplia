# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr 
    password: str = Field(..., exclude=True)  # This will exclude password from the base schema
    role: Optional[str] = "admin"  # Default to 'admin' for the first user.

class UserCreate(UserBase):
    tenant_id: int  # The tenant_id will be passed to associate the user.

    class Config:
        orm_mode = True

class UserOut(UserBase):
    id: int
    email: EmailStr
    role: Optional[str] = None
    name: str

    class Config:
        orm_mode = True
        
    # Override the default `__init__` to exclude password in the response
    def __init__(self, **kwargs):
        kwargs.pop("password", None)  # Ensure password is not included in the response
        super().__init__(**kwargs)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None  # Or you can use an Enum for roles if needed

    class Config:
        orm_mode = True
