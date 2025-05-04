# app/schemas/communications_log.py
# --- NEW FILE ---

from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional

# Import the Enums defined in the model file
from app.models.communications_log import (
    CommunicationType,
    CommunicationChannel,
    CommunicationStatus
)

# --- Base Schema (Optional but good practice) ---
# Defines common fields
class CommunicationsLogBase(BaseModel):
    type: CommunicationType
    channel: CommunicationChannel
    status: CommunicationStatus
    details: Optional[str] = None
    timestamp: datetime # Use datetime directly

    # Foreign key IDs are often useful in responses
    tenant_id: int
    client_id: Optional[int] = None
    appointment_id: Optional[int] = None
    user_id: Optional[int] = None # User who triggered (if applicable)


# --- Schema for Output (API Response) ---
# Used when returning log data from the API
class CommunicationsLogOut(CommunicationsLogBase):
    id: int # Include the log entry's own ID

    class Config:
        from_attributes = True # Enable ORM mode for FastAPI

# --- Schema for Creating (Manual Log - FUTURE USE) ---
# Defines fields needed when a user MANUALLY logs an interaction
class CommunicationsLogCreateManual(BaseModel):
    client_id: int # Manual log is usually tied to a client
    type: CommunicationType = Field(..., description="Must be a manual type like MANUAL_EMAIL or MANUAL_SMS")
    channel: CommunicationChannel = Field(..., description="Channel used for manual communication")
    details: str = Field(..., min_length=1, description="Summary or details of the manual communication")
    # Optional: appointment_id if related to a specific appointment
    appointment_id: Optional[int] = None
    # status: Optional[CommunicationStatus] = CommunicationStatus.SENT # Default to SENT? Or SIMULATED? Or require input?

    # Simple validation example
    @validator('type')
    def check_manual_type(cls, v):
      if v not in [CommunicationType.MANUAL_EMAIL, CommunicationType.MANUAL_SMS]:
        raise ValueError('Type must be MANUAL_EMAIL or MANUAL_SMS for manual logging')
      return v
