# app/models/appointment.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import datetime

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    appointment_time = Column(DateTime, nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))  # Foreign Key to tenants

    tenant = relationship("Tenant", back_populates="appointments")  # Relationship with Tenant
    service = relationship("Service", back_populates="appointments")  # Relationship with Service
