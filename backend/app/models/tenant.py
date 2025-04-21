# app/models/tenant.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    subdomain = Column(String, unique=True, nullable=False)
    logo_url = Column(String, nullable=True)
    slogan = Column(String, nullable=True)
    
    users = relationship("User", back_populates="tenant")
    services = relationship("Service", back_populates="tenant")
    appointments = relationship("Appointment", back_populates="tenant")  # Fixed this line
