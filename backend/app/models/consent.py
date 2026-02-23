from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ConsentForm(Base):
    __tablename__ = "consent_forms"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # HTML or Markdown content of the waiver
    is_required = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="consent_forms")
    signatures = relationship("ClientSignature", back_populates="form")

class ClientSignature(Base):
    __tablename__ = "client_signatures"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    form_id = Column(Integer, ForeignKey("consent_forms.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True) # Optional link to specific appointment
    
    signature_data = Column(Text, nullable=False) # Base64 SVG or JSON stroke data
    signed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String, nullable=True) # For audit trail

    # Relationships
    tenant = relationship("Tenant")
    client = relationship("Client")
    form = relationship("ConsentForm", back_populates="signatures")
    appointment = relationship("Appointment")
