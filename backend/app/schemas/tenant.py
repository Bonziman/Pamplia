# app/schemas/tenant.py
# --- MODIFIED ---

from pydantic import BaseModel, Field, EmailStr, HttpUrl # Added Field, EmailStr, HttpUrl
from typing import Optional, Dict, Any, Union # Added Dict, Any, Union for JSON fields

# --- Base Schema ---
# Defines all fields corresponding to the Tenant model columns
# Useful for inheritance and internal representation
class TenantBase(BaseModel):
    # Core Identifiers
    name: Optional[str] = None # Keep optional for updates
    subdomain: Optional[str] = None # Keep optional for updates

    # Branding & Basic Info
    logo_url: Optional[Union[HttpUrl, str]] = None # Use HttpUrl for validation, allow string
    slogan: Optional[str] = None
    website_url: Optional[Union[HttpUrl, str]] = None # Use HttpUrl for validation

    # Contact Information
    contact_email: Optional[EmailStr] = None # Use EmailStr for validation
    contact_phone: Optional[str] = None # Basic string validation for phone

    # Address Information
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None

    # Operational Settings
    timezone: Optional[str] = Field(None, description="Timezone ID (e.g., 'UTC', 'Africa/Casablanca')") 
    default_currency: Optional[str] = Field(None, max_length=3, description="ISO 4217 currency code (e.g., 'MAD', 'USD')") 

    # Policy
    cancellation_policy_text: Optional[str] = None

    # Config Fields (Allow flexible dictionary structure)
    business_hours_config: Optional[Dict[str, Any]] = None
    booking_widget_config: Optional[Dict[str, Any]] = None
    reminder_interval_hours: Optional[int] = Field(
        None, ge=1, le=168, # Example validation: 1 hour to 1 week (168 hours)
        description="Hours before appointment to send reminder (null or 0 to disable)"
    )

    class Config:
        from_attributes = True 


# --- Schema for Creating a Tenant ---
# Only includes essential fields for creation
class TenantCreate(BaseModel):
    name: str = Field(..., min_length=1)
    subdomain: str = Field(
        ..., 
        min_length=3, 
        max_length=63, 
        pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$', 
        description="Must be URL-friendly, lowercase, and can include hyphens"
    ) # Basic subdomain validation


# --- Schema for Updating a Tenant ---
# All fields are optional for PATCH operations
class TenantUpdate(TenantBase):
    # Inherits all fields from TenantBase, all remain Optional
    pass


# --- Schema for Data in DB (Internal) ---
# Represents the full tenant object as stored in the DB, includes ID
class TenantInDB(TenantBase):
    id: int
    timezone: str = 'UTC'
    default_currency: str = 'MAD'


# --- Schema for Output (API Response) ---
# Defines the data returned by API endpoints like GET /tenants/me
class TenantOut(TenantBase):
    id: int
    name: str # Name should always be present
    subdomain: str # Subdomain should always be present
    timezone: str # Timezone always has a default
    default_currency: str # Currency always has a default
    reminder_interval_hours: Optional[int]
