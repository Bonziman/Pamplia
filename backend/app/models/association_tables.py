
from sqlalchemy import Table, Column, Integer, ForeignKey
from ..database import Base # Or use metadata directly

appointment_services_table = Table(
    "appointment_services", # Table name
    Base.metadata,
    Column("appointment_id", Integer, ForeignKey("appointments.id"), primary_key=True),
    Column("service_id", Integer, ForeignKey("services.id"), primary_key=True)
)
