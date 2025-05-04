# app/schemas/tag.py
# --- NEW FILE ---

from pydantic import BaseModel, Field, validator
from typing import Optional
import re

# Basic validation for hex color codes
HEX_COLOR_REGEX = r'^#[0-9a-fA-F]{6}$'

class TagBase(BaseModel):
    tag_name: str = Field(..., min_length=1, max_length=50) # Add length constraints
    color_hex: Optional[str] = Field(default='#CCCCCC', pattern=HEX_COLOR_REGEX)
    icon_identifier: Optional[str] = Field(default='default_tag_icon', max_length=50)

    @validator('color_hex', pre=True, always=True)
    def validate_color_hex(cls, v):
        if v is None:
            return '#CCCCCC' # Ensure default if None is passed
        import re
        if not isinstance(v, str) or not re.match(HEX_COLOR_REGEX, v):
            raise ValueError('Invalid hex color format. Must be #RRGGBB')
        return v.upper() # Store consistently


class TagCreate(TagBase):
    # tenant_id will be determined from context (subdomain + user) in the router
    pass


class TagUpdate(BaseModel):
    # Only allow updating these fields via PATCH
    tag_name: Optional[str] = Field(None, min_length=1, max_length=50)
    color_hex: Optional[str] = Field(None, pattern=HEX_COLOR_REGEX)
    icon_identifier: Optional[str] = Field(None, max_length=50)

    @validator('color_hex', pre=True, always=True)
    def validate_update_color_hex(cls, v):
        if v is None:
            return None # Allow clearing back to default implicitly handled by DB/model? Or require explicit default? None is fine for PATCH.
        if not isinstance(v, str) or not re.match(HEX_COLOR_REGEX, v):
            raise ValueError('Invalid hex color format. Must be #RRGGBB')
class TagOut(TagBase):
    id: int
    tenant_id: int

    class Config:
        from_attributes = True # Pydantic V2
