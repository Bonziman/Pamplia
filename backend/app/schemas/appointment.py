from pydantic import BaseModel, EmailStr, validator, Field
from datetime import datetime
from enum import Enum
from typing import Optional, List
from .enums import AppointmentStatus
from .service import ServiceOut

class AppointmentBase(BaseModel):
    client_name: str
    client_email: EmailStr
    appointment_time: datetime
    status: AppointmentStatus = Field(default=AppointmentStatus.PENDING) 
    
    @validator('status', pre=True, always=True)
    def validate_status(cls, v):
        if v is None:
            return AppointmentStatus.PENDING
        if isinstance(v, str):
            return AppointmentStatus(v.lower())
        return v


class AppointmentCreate(AppointmentBase):
    service_ids: List[int]

class AppointmentOut(AppointmentBase):
    id: int
    services: List[ServiceOut]

    class Config:
        orm_mode = True
        from_attributes = True

class AppointmentUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    appointment_time: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    service_id: Optional[int] = None


    @validator('status', pre=True)
    def validate_status(cls, v):
        if isinstance(v, str):
            return AppointmentStatus(v.lower())
        return v
    
    class Config:
        extra = "forbid"
