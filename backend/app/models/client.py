# app/models/client.py
# --- NEW FILE ---

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text,
    ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression # For server_default='false'

from app.database import Base
from app.models.tenant import Tenant # Assuming Tenant model exists
# We'll need Appointment and Tag models later for relationships
# from app.models.appointment import Appointment
# from app.models.tag import Tag
# from app.models.association_tables import client_tags # Assuming M2M table defined

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    phone_number = Column(String, nullable=True, index=True) # No unique constraint

    address_street = Column(String, nullable=True)
    address_city = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)

    birthday = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    is_confirmed = Column(Boolean, nullable=False, server_default=expression.false(), default=False)
    confirmation_token = Column(String, unique=True, nullable=True, index=True) # Needs to be globally unique for lookup
    token_expiry = Column(DateTime(timezone=True), nullable=True)

    is_deleted = Column(Boolean, nullable=False, server_default=expression.false(), default=False, index=True) # Index essential for filtering
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # --- Relationships ---
    tenant = relationship("Tenant", back_populates="clients")

    # Define relationship to Appointments (1 Client -> Many Appointments)
    appointments = relationship("Appointment", back_populates="client")
    

    # Define relationship to Tags (Many Clients -> Many Tags)
    # Assuming 'client_tags' association table is defined elsewhere (e.g., models/association_tables.py)
    # and Tag model exists with a 'clients' back-populates attribute.
    tags = relationship("Tag", secondary="client_tags", back_populates="clients")
    

    # --- Constraints ---
    __table_args__ = (
        # Email should be unique *within* a specific tenant, allows null
        UniqueConstraint('tenant_id', 'email', name='uq_client_tenant_email'),
        # Add indexes for columns frequently used in WHERE clauses
        Index("ix_clients_tenant_id_email", "tenant_id", "email"),
        Index("ix_clients_tenant_id_is_deleted", "tenant_id", "is_deleted"),
    )


    def __repr__(self):
        return (f"<Client(id={self.id}, email='{self.email}', tenant_id={self.tenant_id}, "
                f"is_confirmed={self.is_confirmed}, is_deleted={self.is_deleted})>")
