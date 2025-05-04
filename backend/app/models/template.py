# app/models/template.py
# --- NEW FILE ---

from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, UniqueConstraint, Index,
    DateTime, func, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from enum import Enum as PyEnum

from app.database import Base
from app.models.tenant import Tenant # Import for relationship

# --- Enums ---
# Define specific event triggers for easier template selection
class TemplateEventTrigger(PyEnum):
    APPOINTMENT_BOOKED_CLIENT = "APPOINTMENT_BOOKED_CLIENT"
    APPOINTMENT_BOOKED_ADMIN = "APPOINTMENT_BOOKED_ADMIN"
    APPOINTMENT_REMINDER_CLIENT = "APPOINTMENT_REMINDER_CLIENT"
    APPOINTMENT_CANCELLED_CLIENT = "APPOINTMENT_CANCELLED_CLIENT"
    APPOINTMENT_CANCELLED_ADMIN = "APPOINTMENT_CANCELLED_ADMIN"
    APPOINTMENT_UPDATED_CLIENT = "APPOINTMENT_UPDATED_CLIENT"
    APPOINTMENT_UPDATED_ADMIN = "APPOINTMENT_UPDATED_ADMIN"
    CLIENT_CONFIRMATION = "CLIENT_CONFIRMATION"
    # Add more triggers as needed (e.g., password reset - though usually system-wide)

class TemplateType(PyEnum):
    EMAIL = "EMAIL"
    # SMS = "sms" # Add later if needed

# --- Model Definition ---
class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String, nullable=False, comment="User-friendly name for the template (e.g., 'Client Booking Confirmation')")
    type = Column(
        PG_ENUM(TemplateType, name='templatetype', create_type=False), # Assuming type exists if DB reused
        nullable=False, default=TemplateType.EMAIL, server_default=TemplateType.EMAIL.value
    )
    event_trigger = Column(
        PG_ENUM(TemplateEventTrigger, name='templateeventtrigger', create_type=False),
        nullable=False, index=True,
        comment="The specific event that this template is used for"
    )

    # Email specific fields
    email_subject = Column(String, nullable=True, comment="Subject line for email templates (can contain placeholders)")
    email_body = Column(Text, nullable=False, comment="Body content for the template (HTML or plain text, with placeholders)")

    # SMS specific fields (Add later)
    # sms_body = Column(Text, nullable=True)

    # Optional: Mark system defaults vs tenant customizations
    is_default_template = Column(Boolean, nullable=False, default=False, server_default='false', comment="Is this a system default or tenant created?")
    is_active = Column(Boolean, nullable=False, default=True, server_default='true', comment="Allows tenants to disable a specific notification")


    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # --- Relationships ---
    tenant = relationship("Tenant") # Define back_populates in Tenant if needed (optional)

     # --- Constraints ---
    __table_args__ = (
        # A tenant should only have one active template per trigger/type combination
        UniqueConstraint('tenant_id', 'event_trigger', 'type', name='uq_template_tenant_trigger_type'),
        Index("ix_templates_tenant_id_trigger_type", "tenant_id", "event_trigger", "type"),
    )

    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}', tenant_id={self.tenant_id}, trigger='{self.event_trigger.value}')>"
