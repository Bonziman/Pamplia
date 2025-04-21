# app/schemas/tenant.py

from pydantic import BaseModel
from typing import Optional


class TenantCreate(BaseModel):
    name: str
    subdomain: str
    logo_url: Optional[str] = None
    slogan: Optional[str] = None
    
    

class TenantOut(BaseModel):
    id: int
    name: str
    subdomain: str
    logo_url: Optional[str]
    slogan: Optional[str]
    

    class Config:
        orm_mode = True
