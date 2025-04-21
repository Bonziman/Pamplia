# app/schemas/tenant.py

from pydantic import BaseModel
from typing import Optional

class TenantCreate(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    slogan: Optional[str] = None
    image_url: Optional[str] = None

class TenantOut(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str]
    slogan: Optional[str]
    image_url: Optional[str]

    class Config:
        orm_mode = True
