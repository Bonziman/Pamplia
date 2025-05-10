# app/schemas/communications_log.py
# --- MODIFIED ---

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Literal

# Import the Enums defined in the model file
from app.models.communications_log import (
    CommunicationType,
    CommunicationChannel,
    CommunicationStatus,
    CommunicationDirection # Import Direction
)

# --- Base Schema (Optional but good practice) ---
class CommunicationsLogBase(BaseModel):
    # These might not all belong in a shared base if create schema is very different
    type: CommunicationType
    channel: CommunicationChannel
    direction: Optional[CommunicationDirection] = None # Direction might not always be set in Base
    status: CommunicationStatus
    subject: Optional[str] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None # Timestamp might be set by DB

    # Foreign key IDs
    tenant_id: Optional[int] = None # Usually set by backend context
    client_id: Optional[int] = None
    appointment_id: Optional[int] = None
    user_id: Optional[int] = None

# --- Schema for Output (API Response) ---
class CommunicationsLogOut(BaseModel): # Doesn't need to inherit Base necessarily
    id: int
    tenant_id: int
    client_id: Optional[int]
    appointment_id: Optional[int]
    user_id: Optional[int] # User who logged/triggered
    type: CommunicationType
    channel: CommunicationChannel
    direction: CommunicationDirection # Non-optional in DB now
    status: CommunicationStatus
    timestamp: datetime # Should always have a value
    subject: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    class Config:
        from_attributes = True
        use_enum_values = True # Use string values for enums in output JSON

# --- Schema for Creating a MANUAL Log Entry ---
# Defines fields REQUIRED when a user MANUALLY logs an interaction via API
class ManualLogCreate(BaseModel):
    client_id: int = Field(..., description="ID of the client the communication relates to.")
    # Limit channel choices for manual logging
    channel: Literal[
        "PHONE",
        "EMAIL",
        "SMS",
        "IN_PERSON",
        "VIRTUAL_MEETING",
        "OTHER"
    ] = Field(..., description="Channel used for the manual communication.")
    direction: CommunicationDirection = Field(..., description="Direction of the communication (INBOUND or OUTBOUND).")
    notes: str = Field(..., min_length=1, description="Required details/notes about the communication.")

    # Optional fields for manual logging
    subject: Optional[str] = Field(None, max_length=255, description="Optional subject/summary line.")
    appointment_id: Optional[int] = Field(None, description="Optional ID of related appointment.")
    timestamp: Optional[datetime] = Field(None, description="Optional timestamp (defaults to now if not provided). Allows backdating.")

    # Validation to ensure direction is appropriate for manual logs
    @field_validator('direction')
    @classmethod
    def check_manual_direction(cls, v: CommunicationDirection):
        if v == CommunicationDirection.SYSTEM:
            raise ValueError('Direction cannot be SYSTEM for manual logs. Use INBOUND or OUTBOUND.')
        return v

    # Optional: Validate channel based on type if needed, but here type is derived from channel
    # @validator('channel')
    # ...

    class Config:
        # Example for OpenAPI docs
         json_schema_extra = {
            "example": {
                "client_id": 123,
                "channel": "PHONE",
                "direction": "OUTBOUND",
                "subject": "Call re: Reschedule",
                "notes": "Client called, needs to reschedule appointment #456 to next week due to conflict. Will call back to confirm new time.",
                "appointment_id": 456,
                "timestamp": "2023-10-27T10:30:00Z" # Optional ISO Format
            }
        }

# --- Removed CommunicationsLogCreateManual ---
# We don't need this specific schema anymore as ManualLogCreate covers the use case.
