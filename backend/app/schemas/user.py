from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    tenant_id: int

class UserOut(UserBase):
    id: int
    tenant_id: int

    class Config:
        orm_mode = True
