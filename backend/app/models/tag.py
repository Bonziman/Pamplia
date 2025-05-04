# app/models/tag.py
# --- NEW FILE ---

from sqlalchemy import (
    Column, Integer, String, ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression

from app.database import Base
# Import Client model for relationship definition
from app.models.client import Client
# Import the association table definition
from .association_tables import client_tags_table

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    tag_name = Column(String, nullable=False)
    # Store color as hex string (e.g., '#RRGGBB')
    color_hex = Column(String(7), nullable=True, server_default='#CCCCCC', default='#CCCCCC')
    # Identifier for an icon (e.g., FontAwesome class name, SVG id)
    icon_identifier = Column(String, nullable=True, server_default='default_tag_icon', default='default_tag_icon')

    # --- Relationships ---
    # Relationship back to Tenant (Many Tags -> 1 Tenant)
    tenant = relationship("Tenant", back_populates="tags")

    # Relationship to Clients (Many Tags -> Many Clients)
    clients = relationship(
        "Client",
        secondary=client_tags_table, # Use the imported association table
        back_populates="tags"       # Matches 'tags' attribute in Client model
    )

    # --- Constraints ---
    __table_args__ = (
        # Tag names should be unique within a specific tenant
        UniqueConstraint('tenant_id', 'tag_name', name='uq_tag_tenant_name'),
        Index("ix_tags_tenant_id_name", "tenant_id", "tag_name"),
    )

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.tag_name}', tenant_id={self.tenant_id}, color='{self.color_hex}')>"


# Ensure the back-populating relationship exists in Tenant model:
# In app/models/tenant.py:
# tags = relationship("Tag", back_populates="tenant", cascade="all, delete-orphan")
