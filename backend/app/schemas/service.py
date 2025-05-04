from pydantic import BaseModel
from typing import Optional

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(ServiceBase): # Or inherit ServiceBase if needed
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None

class ServiceOut(ServiceBase):
    id: int
    tenant_id: int

    class Config:
        from_attributes = True


