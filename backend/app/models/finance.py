from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class CommissionType(enum.Enum):
    PERCENTAGE = "percentage"
    FLAT = "flat"

class StaffCommission(Base):
    __tablename__ = "staff_commissions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # The staff member
    
    # Configuration
    commission_type = Column(String, default=CommissionType.PERCENTAGE.value)
    value = Column(Float, nullable=False) # e.g., 10.0 for 10% or 50.0 for 50 MAD
    applies_to_services = Column(Boolean, default=True)
    applies_to_products = Column(Boolean, default=True)

    tenant = relationship("Tenant")
    user = relationship("User")

class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False) # e.g., "Gold Tier"
    price = Column(Float, nullable=False)
    billing_period_days = Column(Integer, default=30) # 30 for monthly
    
    # Benefits
    discount_percentage = Column(Float, default=0.0)
    included_credits = Column(Integer, default=0) # e.g., 1 credit per month

    tenant = relationship("Tenant")
    client_subscriptions = relationship("ClientSubscription", back_populates="membership")

class ClientSubscription(Base):
    __tablename__ = "client_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    credits_remaining = Column(Integer, default=0)

    tenant = relationship("Tenant")
    client = relationship("Client")
    membership = relationship("Membership", back_populates="client_subscriptions")
