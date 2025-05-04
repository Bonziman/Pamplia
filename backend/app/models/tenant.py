# app/models/tenant.py
# --- MODIFIED ---

from sqlalchemy import Column, Integer, String, Text # Added Text
from sqlalchemy.dialects.postgresql import JSONB # Use JSONB for PostgreSQL JSON
# If not using PostgreSQL, use: from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)

    # --- Core Identifiers ---
    name = Column(String, unique=True, nullable=False) # Confirmed as Business Name
    subdomain = Column(String, unique=True, nullable=False, index=True) # Added index

    # --- Branding & Basic Info ---
    logo_url = Column(String, nullable=True)
    slogan = Column(String, nullable=True)
    website_url = Column(String, nullable=True) # Added

    # --- Contact Information ---
    contact_email = Column(String, nullable=True) # Added
    contact_phone = Column(String, nullable=True) # Added

    # --- Address Information ---
    address_street = Column(String, nullable=True) # Added
    address_city = Column(String, nullable=True) # Added
    address_state = Column(String, nullable=True) # Added
    address_postal_code = Column(String, nullable=True) # Added
    address_country = Column(String, nullable=True) # Added

    # --- Operational Settings ---
    # Use standard TZ database names (e.g., "Africa/Casablanca", "Europe/Paris", "UTC")
    timezone = Column(String, nullable=False, server_default='UTC', default='UTC') # Added
    # Use ISO 4217 currency codes (e.g., "MAD", "USD", "EUR")
    default_currency = Column(String(3), nullable=False, server_default='MAD', default='MAD') # Added, Default MAD

    # --- Policy ---
    cancellation_policy_text = Column(Text, nullable=True) # Added (Using Text for potentially long policy)

    # --- Config Fields (for later use) ---
    business_hours_config = Column(JSONB, nullable=True) # Added (Using JSONB for Postgres efficiency)
    booking_widget_config = Column(JSONB, nullable=True) # Added (Using JSONB for Postgres efficiency)
    reminder_interval_hours = Column(
        Integer, nullable=True, server_default='24', default=24,
        comment="Hours before appointment to send reminder (null=disabled)"
    )

    # --- Relationships (Existing) ---
    users = relationship("User", back_populates="tenant")
    services = relationship("Service", back_populates="tenant")
    appointments = relationship("Appointment", back_populates="tenant")
    clients = relationship("Client", back_populates="tenant", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="tenant", cascade="all, delete-orphan")
    communication_logs = relationship("CommunicationsLog", back_populates="tenant", passive_deletes=True)
    templates = relationship("Template", back_populates="tenant", cascade="all, delete-orphan", passive_deletes=True)
    def __repr__(self):
         return f"<Tenant(id={self.id}, name='{self.name}', subdomain='{self.subdomain}')>"
