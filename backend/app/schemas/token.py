# app/schemas/token.py
from typing import Optional
from pydantic import BaseModel

from app.schemas.user import UserOut

class Login(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    tenant_id: Optional[int] = None
    role: Optional[str] = None


class TokenUserResponse(BaseModel): # For login and invitation acceptance
    access_token: str
    token_type: str
    user: UserOut
