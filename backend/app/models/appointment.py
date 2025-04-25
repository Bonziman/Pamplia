# app/models/appointment.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import datetime
import enum
from sqlalchemy import Enum as SQLAlchemyEnum
from app.schemas.enums import AppointmentStatus
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from .association_tables import appointment_services_table

    
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    appointment_time = Column(DateTime, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    status = Column(
        PG_ENUM(
            AppointmentStatus,
            name='appointmentstatus',  # The exact name of the type in PostgreSQL
            create_type=False,        # We already created/altered it
            values_callable=lambda obj: [e.value for e in obj] # Optional: Helps Alembic sometimes
        ),
        nullable=False,
        default=AppointmentStatus.PENDING, # Use Enum member for Python default
        # Use the string VALUE for server default, matching DB enum values
        server_default=AppointmentStatus.PENDING.value
    )
    tenant = relationship("Tenant", back_populates="appointments")
    services = relationship(
        "Service",
        secondary=appointment_services_table, # Use the association table object
        back_populates="appointments"
    )
