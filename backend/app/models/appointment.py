# app/models/appointment.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import datetime
import enum
from sqlalchemy import Enum as SQLAlchemyEnum
from app.schemas.enums import AppointmentStatus

    
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    appointment_time = Column(DateTime, nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    status = Column(SQLAlchemyEnum(AppointmentStatus, values_callable=lambda x: [e.value for e in x]), default=AppointmentStatus.PENDING.value)
    tenant = relationship("Tenant", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
