# app/models/appointment.py
# --- MODIFIED ---

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey,
    Enum as SQLAlchemyEnum, Index # Added Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.sql import func # For func.now() if needed elsewhere

from app.database import Base
from app.schemas.enums import AppointmentStatus
from .association_tables import appointment_services_table
# Import Client model for relationship definition
from app.models.client import Client


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_time = Column(DateTime(timezone=True), nullable=False, index=True) # Consider timezone=True
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    # --- Client Relationship ---
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True) # Changed from name/email
    client = relationship("Client", back_populates="appointments")
    # --- Removed client_name, client_email columns ---

    status = Column(
        PG_ENUM(
            AppointmentStatus,
            name='appointmentstatus',
            create_type=False,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        default=AppointmentStatus.PENDING,
        server_default=AppointmentStatus.PENDING.value,
        index=True # Index status for filtering
    )

    # Relationship back to Tenant
    tenant = relationship("Tenant", back_populates="appointments")

    # Relationship to Services (Many-to-Many)
    services = relationship(
        "Service",
        secondary=appointment_services_table,
        back_populates="appointments"
    )

    # --- Indexes ---

    def __repr__(self):
        return f"<Appointment(id={self.id}, client_id={self.client_id}, tenant_id={self.tenant_id}, time='{self.appointment_time}', status='{self.status.value}')>"

