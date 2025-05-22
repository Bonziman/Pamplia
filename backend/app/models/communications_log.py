# app/models/communications_log.py
# --- NEW FILE ---

from sqlalchemy import (
    Column, Integer, DateTime, ForeignKey, Text, Index, func, String
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM # Assuming PostgreSQL
from enum import Enum as PyEnum

from app.database import Base
# Import related models for ForeignKeys
# from app.models.tenant import Tenant
# from app.models.client import Client
# from app.models.appointment import Appointment

# --- Enums for Type and Channel ---
# Define these outside the model for potential use in schemas etc.
class CommunicationType(PyEnum):
    CONFIRMATION = "CONFIRMATION"       # Initial booking confirmation
    REMINDER = "REMINDER"               # Upcoming appointment reminder
    CANCELLATION = "CANCELLATION"       # Appointment cancelled
    UPDATE = "UPDATE"                   # Appointment details changed (e.g., time)
    MANUAL_EMAIL = "MANUAL_EMAIL"       # Email sent manually by staff
    MANUAL_SMS = "MANUAL_SMS"           # SMS sent manually by staff
    SYSTEM_ALERT = "SYSTEM_ALERT"       # Internal system notifications
    MANUAL_PHONE = "MANUAL_PHONE"         # Phone call logged manually
    MANUAL_IN_PERSON = "MANUAL_IN_PERSON" # In-person interaction logged manually
    MANUAL_VIRTUAL_MEETING = "MANUAL_VIRTUAL_MEETING" # Virtual meeting logged manually
    MANUAL_OTHER = "OTHER"                    # Other types of communication
    # Add more types as needed

class CommunicationChannel(PyEnum):
    EMAIL = "EMAIL"
    SMS = "SMS"
    SYSTEM = "SYSTEM" # For internal logs or future in-app notifications
    IN_PERSON = "IN_PERSON" # For manual logs
    PHONE = "PHONE"
    VIRTUAL_MEETING = "VIRTUAL_MEETING" # For manual logs
    OTHER = "OTHER" # For manual logs

class CommunicationStatus(PyEnum):
    SIMULATED = "simulated" # Initial status before actual sending is implemented
    SENT = "sent"           # Successfully sent via provider
    FAILED = "failed"         # Attempted sending but failed
    DELIVERED = "delivered"   # Delivery confirmation received (requires webhook)
    OPENED = "opened"         # Email opened confirmation (requires webhook/tracking)
    CLICKED = "clicked"       # Link clicked confirmation (requires webhook/tracking)
    LOGGED = "logged"         # Manually logged by staff

class CommunicationDirection(PyEnum):
    OUTBOUND = "OUTBOUND"
    INBOUND = "INBOUND"
    SYSTEM = "SYSTEM"   # Internal system messages or logs
    

# --- Model Definition ---
class CommunicationsLog(Base):
    __tablename__ = "communications_log"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign Keys to link the log
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True) # Keep log if client deleted? Use SET NULL
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True) # Keep log if appt deleted? Use SET NULL
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) # Optional: Who triggered a manual send?

    # Log details
    type = Column(
        PG_ENUM(
            CommunicationType, name='communicationtype', create_type=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False, index=True
    )
    channel = Column(
        PG_ENUM(
            CommunicationChannel, name='communicationchannel', create_type=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False, index=True
    )
    direction = Column(
        PG_ENUM(CommunicationDirection, name='communicationdirection', create_type=True), # Create this DB type
        nullable=False, # Make non-nullable now
        server_default=CommunicationDirection.SYSTEM.value, # Default to SYSTEM
        default=CommunicationDirection.SYSTEM,
        index=True
    )
    status = Column(
        PG_ENUM(
            CommunicationStatus, name='communicationstatus', create_type=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False, index=True, server_default=CommunicationStatus.SIMULATED.value, default=CommunicationStatus.SIMULATED
    )

    # Timestamp of when the log entry was created (approximates sending time initially)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    subject = Column(String(255), nullable=True, comment="Optional subject/summary line")
    notes = Column(Text, nullable=True, comment="Main content/notes of the communication")
    

    # --- Relationships (Optional but useful) ---
    tenant = relationship("Tenant", back_populates="communication_logs")
    client = relationship("Client") # No back_populates needed unless Client tracks logs
    appointment = relationship("Appointment") # No back_populates needed unless Appointment tracks logs
    user = relationship("User", back_populates="communication_logs")

    # --- Indexes ---
    __table_args__ = (
        Index("ix_comm_log_tenant_type_channel", "tenant_id", "type", "channel"),
        Index("ix_comm_log_timestamp", "timestamp"), # Useful for time-based queries
         Index("ix_comm_log_tenant_direction", "tenant_id", "direction"), # For filtering by direction
    )

    def __repr__(self):
        return (f"<CommunicationsLog(id={self.id}, tenant={self.tenant_id}, client={self.client_id}, "
                f"appt={self.appointment_id}, user={self.user_id}, type='{self.type.value}', "
                f"channel='{self.channel.value}', dir='{self.direction.value}', " # No longer nullable
                f"status='{self.status.value}')>")
