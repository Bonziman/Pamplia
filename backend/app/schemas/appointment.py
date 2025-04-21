from pydantic import BaseModel, EmailStr
from datetime import datetime

class AppointmentBase(BaseModel):
    client_name: str
    client_email: EmailStr
    appointment_time: datetime

class AppointmentCreate(AppointmentBase):
    service_id: int

class AppointmentOut(AppointmentBase):
    id: int
    service_id: int

    class Config:
        orm_mode = True
