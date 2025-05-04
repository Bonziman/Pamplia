# app/schemas/template.py
# --- NEW FILE ---

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Import Enums from the model file
from app.models.template import TemplateEventTrigger, TemplateType

# --- Base Schema ---
class TemplateBase(BaseModel):
    name: str = Field(..., min_length=3, description="User-friendly name for the template")
    type: TemplateType = Field(TemplateType.EMAIL, description="Type of template (currently only EMAIL)")
    event_trigger: TemplateEventTrigger = Field(..., description="Event that triggers this template")
    email_subject: Optional[str] = Field(None, description="Subject line for email templates")
    email_body: str = Field(..., min_length=10, description="Body content (HTML or plain text with placeholders)")
    is_active: bool = True # Default to active when creating/updating

    class Config:
        from_attributes = True
        use_enum_values = True # Ensure enum values (strings) are used in serialization


# --- Schema for Creating a Template ---
class TemplateCreate(TemplateBase):
    # All fields inherited from Base are required or have defaults
    pass


# --- Schema for Updating a Template ---
# All fields are optional for PATCH requests
class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3)
    # type: Optional[TemplateType] = None # Type usually shouldn't change
    # event_trigger: Optional[TemplateEventTrigger] = None # Trigger usually shouldn't change
    email_subject: Optional[str] = None
    email_body: Optional[str] = Field(None, min_length=10)
    is_active: Optional[bool] = None


# --- Schema for Output (API Response) ---
class TemplateOut(TemplateBase):
    id: int
    tenant_id: int
    is_default_template: bool # Include read-only status
    created_at: datetime
    updated_at: datetime

    # Override is_active to ensure it's always returned
    is_active: bool

    class Config:
        from_attributes = True
        use_enum_values = True # Use string values for enums in output JSON
