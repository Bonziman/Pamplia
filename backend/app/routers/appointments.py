# app/routers/appointments.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from typing import List

router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)

# Create an appointment
@router.post("/", response_model=schemas.appointment.AppointmentOut)
def create_appointment(
    appointment: schemas.appointment.AppointmentCreate, 
    db: Session = Depends(database.get_db)
):
    # Check if the service exists
    service = db.query(models.Service).filter(models.Service.id == appointment.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Create the appointment
    db_appointment = models.Appointment(
        client_name=appointment.client_name,
        client_email=appointment.client_email,
        appointment_time=appointment.appointment_time,
        service_id=appointment.service_id,
        tenant_id=service.tenant_id  # Assign tenant_id from the service
    )

    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

# Retrieve all appointments
@router.get("/", response_model=List[schemas.appointment.AppointmentOut])
def get_all_appointments(db: Session = Depends(database.get_db)):
    return db.query(models.Appointment).all()

# Retrieve a specific appointment by ID
@router.get("/{id}", response_model=schemas.appointment.AppointmentOut)
def get_appointment_by_id(id: int, db: Session = Depends(database.get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment
  
@router.get("/tenant/{tenant_id}", response_model=List[schemas.appointment.AppointmentOut])
def get_appointments_by_tenant(
    tenant_id: int, db: Session = Depends(database.get_db)
):
    # Query appointments by tenant_id
    appointments = db.query(models.Appointment).filter(models.Appointment.tenant_id == tenant_id).all()
    
    if not appointments:
        raise HTTPException(status_code=404, detail="Appointments not found for this tenant")
    
    return appointments
