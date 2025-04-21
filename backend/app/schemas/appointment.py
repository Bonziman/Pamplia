# app/schemas/appointment.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class AppointmentBase(BaseModel):
    client_name: str
    client_email: EmailStr
    appointment_time: datetime

class AppointmentCreate(AppointmentBase):
    service_id: int  # Needed for creating an appointment

class AppointmentOut(AppointmentBase):
    id: int
    service_id: int  # Added service_id to the output model

    class Config:
        orm_mode = True  # Tells Pydantic to work with SQLAlchemy models
