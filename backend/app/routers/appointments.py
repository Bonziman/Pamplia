from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from typing import List

router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)

@router.post("/", response_model=schemas.appointment.AppointmentOut)
def create_appointment(appointment: schemas.appointment.AppointmentCreate, db: Session = Depends(database.get_db)):
    # Create a new appointment
    db_appointment = models.appointment.Appointment(
        client_name=appointment.client_name,
        client_email=appointment.client_email,
        appointment_time=appointment.appointment_time,
        service_id=appointment.service_id,
        tenant_id=appointment.tenant_id  # Assuming tenant_id is passed as part of the request
    )

    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@router.get("/", response_model=List[schemas.appointment.AppointmentOut])
def get_all_appointments(db: Session = Depends(database.get_db)):
    # Fetch all appointments
    return db.query(models.appointment.Appointment).all()

