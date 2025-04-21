from pydantic import BaseModel
from typing import Optional

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int

class ServiceCreate(ServiceBase):
    tenant_id: int

class ServiceOut(ServiceBase):
    id: int
    tenant_id: int

    class Config:
        orm_mode = True
