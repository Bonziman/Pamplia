# app/models/user.py
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.orm import validates
import re
from datetime import timezone 

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    role = Column(String, default="staff")  # default role is admin for first user
    
    is_active = Column(Boolean, default=True, nullable=False, server_default='true')
    activated_at = Column(DateTime(timezone=True), nullable=True)
    # Stores the ID of the admin who invited this user, or who created them directly if applicable
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    
    
    # --- Relationships ---
    tenant = relationship("Tenant", back_populates="users")
    communication_logs = relationship("CommunicationsLog", back_populates="user")
    # invited_by = relationship("User", remote_side=[id], foreign_keys=[created_by_user_id]) --- TBD later since it will make things more complex
    
    @validates('email')
    def validate_email(self, key, email):
        valid = re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)
        if valid:
            return email
        else:
            raise ValueError("Invalid email format")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}', tenant_id={self.tenant_id}, is_active={self.is_active})>"
