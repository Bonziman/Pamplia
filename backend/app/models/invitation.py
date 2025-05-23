# app/models/invitation.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
# No direct import of User model needed here if using string for relationship target,
# but direct import is fine too.
# from app.models.user import User
# from app.models.tenant import Tenant
import enum
from datetime import timezone

class InvitationStatusEnum(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    email = Column(String, nullable=False, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    role_to_assign = Column(String, nullable=False, default="staff")

    invitation_token = Column(String, unique=True, index=True, nullable=False)
    token_expiry = Column(DateTime(timezone=True), nullable=False)
    
    status = Column(SQLAlchemyEnum(InvitationStatusEnum, name="invitation_status_enum"), 
                    default=InvitationStatusEnum.PENDING, 
                    nullable=False)

    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # This will be the ID of the user record created *after* the invitation is accepted.
    accepted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True) 

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="invitations")
    invited_by = relationship("User", foreign_keys=[invited_by_user_id]) # User who sent the invite
    
    # User who was created as a result of this invitation being accepted
    accepted_user = relationship("User", foreign_keys=[accepted_by_user_id]) 

    def __repr__(self):
        return f"<Invitation(id={self.id}, email='{self.email}', tenant_id={self.tenant_id}, status='{self.status.value}')>"
