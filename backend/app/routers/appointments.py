# app/routers/appointments.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from typing import List
from app.models import appointment as appointment_model
from app.schemas.enums import AppointmentStatus


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

    # Ensure the status is passed as the correct enum value
    # status = appointment.status if isinstance(appointment.status, models.AppointmentStatus) else models.AppointmentStatus.PENDING
    # Ensure the status is passed as the correct enum value (lowercase)
    status_enum = (
        appointment.status
        if isinstance(appointment.status, AppointmentStatus)
        else AppointmentStatus(appointment.status.lower())
    )
    print("✅ status_enum AFTER coercion:", status_enum, type(status_enum))
    # Create the appointment
    db_appointment = appointment_model.Appointment(
        client_name=appointment.client_name,
        client_email=appointment.client_email,
        appointment_time=appointment.appointment_time,
        service_id=appointment.service_id,
        tenant_id=service.tenant_id,  # Assign tenant_id from the service
        status=status_enum  # Pass the status as an AppointmentStatus enum (lowercase)
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment


# Retrieve all appointments
@router.get("/", response_model=List[schemas.appointment.AppointmentOut])
def get_all_appointments(db: Session = Depends(database.get_db)):
    appointments = db.query(models.Appointment).all()
    return [schemas.appointment.AppointmentOut.from_orm(appointment) for appointment in appointments]


# Retrieve a specific appointment by ID
@router.get("/{id}", response_model=schemas.appointment.AppointmentOut)
def get_appointment_by_id(id: int, db: Session = Depends(database.get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment
  
@router.get("/tenant/{tenant_id}", response_model=List[schemas.appointment.AppointmentOut])
def get_appointments_by_tenant(tenant_id: int, db: Session = Depends(database.get_db)):
    appointments = db.query(models.Appointment).filter(models.Appointment.tenant_id == tenant_id).all()
    if not appointments:
        raise HTTPException(status_code=404, detail="Appointments not found for this tenant")
    return [schemas.appointment.AppointmentOut.from_orm(appointment) for appointment in appointments]


@router.patch("/update/{id}", response_model=schemas.appointment.AppointmentOut)
def update_appointment(id: int, update: schemas.appointment.AppointmentUpdate, db: Session = Depends(database.get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == id).first()
    
    # Check if the appointment exists
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(appointment, field, value)
    

    db.commit()
    db.refresh(appointment)
    return appointment
