# app/models/association_tables.py
# --- MODIFIED ---

from sqlalchemy import Table, Column, Integer, ForeignKey
from app.database import Base # Corrected import path assuming database.py is at app level

# Existing M2M table for Appointments <-> Services
appointment_services_table = Table(
    "appointment_services",
    Base.metadata,
    Column("appointment_id", Integer, ForeignKey("appointments.id", ondelete="CASCADE"), primary_key=True), # Consider ON DELETE CASCADE
    Column("service_id", Integer, ForeignKey("services.id", ondelete="CASCADE"), primary_key=True)      # Consider ON DELETE CASCADE
)

# --- NEW M2M table for Clients <-> Tags ---
client_tags_table = Table(
    "client_tags",
    Base.metadata,
    Column("client_id", Integer, ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True), # CASCADE delete if client is hard-deleted
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)          # CASCADE delete if tag is deleted
)
