# app/schemas/client.py
# --- NEW FILE ---

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date

# Placeholder for Tag schema - define properly later
class TagOut(BaseModel):
    id: int
    tag_name: str
    color_hex: Optional[str] = None
    icon_identifier: Optional[str] = None

    class Config:
        from_attributes = True


class ClientBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None # Use EmailStr for validation
    phone_number: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    birthday: Optional[date] = None
    notes: Optional[str] = None
    # Tags are handled via association, usually not in base create/update directly
    # unless you have specific endpoints for managing tags on a client.


class ClientCreateRequest(ClientBase):
    # Fields inherited from ClientBase are expected in the request body
    # tenant_id is determined from context (subdomain), not provided here.
    # is_confirmed defaults based on creation method (manual vs public).
    pass


class ClientUpdate(BaseModel):
    # Make all base fields optional for PATCH requests
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    birthday: Optional[date] = None
    notes: Optional[str] = None
    is_confirmed: Optional[bool] = None # Allow manual confirmation via PATCH


class ClientOut(ClientBase):
    id: int
    tenant_id: int
    is_confirmed: bool
    is_deleted: bool # Include soft delete status in output
    tags: List[TagOut] = [] # Include associated tags
    created_at: datetime
    updated_at: datetime
    # deleted_at: Optional[datetime] = None # Optionally include deleted_at time

    class Config:
        from_attributes = True # Pydantic V2 / Replaces orm_mode = True
