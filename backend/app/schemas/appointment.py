# app/schemas/appointment.py
# --- MODIFIED ---

from pydantic import BaseModel, EmailStr, validator, Field
from datetime import datetime
from typing import Optional, List, TypeVar, Generic

# Enum and Service schema remain needed
from .enums import AppointmentStatus
from .service import ServiceOut
# Import Client schema for output
from .client import ClientOut # Make sure client schema exists




# AppointmentBase no longer needs client name/email
class AppointmentBase(BaseModel):
    appointment_time: datetime
    status: AppointmentStatus = Field(default=AppointmentStatus.PENDING)

    @validator('status', pre=True, always=True)
    def validate_status(cls, v):
        if v is None:
            return AppointmentStatus.PENDING
        if isinstance(v, str):
            try:
                return AppointmentStatus(v.lower())
            except ValueError:
                raise ValueError(f"Invalid status value: '{v}'")
        if isinstance(v, AppointmentStatus):
            return v
        raise TypeError(f"Invalid type for status: {type(v)}")


# AppointmentCreate still takes client info for lookup/creation logic
class AppointmentCreate(BaseModel): # Does not inherit from AppointmentBase anymore
    client_name: str
    client_email: EmailStr
    client_phone: Optional[str] = None # Add phone if using in lookup/create
    appointment_time: datetime
    service_ids: List[int] = Field(..., min_items=1) # Ensure at least one service


# AppointmentOut now includes the nested Client object
class AppointmentOut(AppointmentBase): # Inherits time, status
    id: int
    client: ClientOut # Use the Client schema
    services: List[ServiceOut]
    tenant_id: int # Include tenant_id if useful in frontend

    class Config:
        from_attributes = True # Replaces orm_mode


# AppointmentUpdate only allows updating specific non-relation fields
class AppointmentUpdate(BaseModel):
    appointment_time: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    # Removed client_name, client_email
    # Removed service_id (managing M2M relations via PATCH is complex)

    @validator('status', pre=True)
    def validate_status_update(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
             try:
                return AppointmentStatus(v.lower())
             except ValueError:
                raise ValueError(f"Invalid status value: '{v}'")
        if isinstance(v, AppointmentStatus):
            return v
        raise TypeError(f"Invalid type for status: {type(v)}")

    class Config:
        extra = "forbid"

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(..., description="Total number of items matching the query")
    page: int = Field(..., ge=1, description="Current page number (1-based)")
    limit: int = Field(..., ge=1, description="Number of items per page")
    # Optional: Calculate total pages if needed
    # pages: Optional[int] = Field(None, description="Total number of pages")

# Specific type for appointments (optional but good practice)
class PaginatedAppointmentResponse(PaginatedResponse[AppointmentOut]):
    pass
