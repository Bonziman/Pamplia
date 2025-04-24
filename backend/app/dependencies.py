# app/dependencies.py
from fastapi import HTTPException, Depends

credentials_exception = HTTPException(
    status_code=401,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)
from fastapi.security import OAuth2PasswordBearer
from app.utils.jwt_utils import verify_token
from app.models.user import User
from app.database import get_db
from sqlalchemy.orm import Session
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = verify_token(token)
        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == user_email).first()
    if user is None:
        raise credentials_exception

    return user

def get_current_tenant_id(user: User = Depends(get_current_user)):
    return user.tenant_id
