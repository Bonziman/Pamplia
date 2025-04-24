# app/dependencies.py
from fastapi import HTTPException, Depends, Request, status # Add Request, status
from fastapi.security import OAuth2PasswordBearer # Keep for now, might remove later if unused elsewhere
from app.utils.jwt_utils import verify_token
from app.models.user import User
from app.database import get_db
from sqlalchemy.orm import Session
from jose import JWTError

# Define the cookie name (make this consistent)
AUTH_COOKIE_NAME = "access_token"

# Updated credentials exception for cookie context
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED, # Use status constants
    detail="Could not validate credentials",
    # No need for WWW-Authenticate header for cookie auth usually
)

# Keep oauth2_scheme if other parts of your app might use it, otherwise remove
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Modified function to get user from cookie
def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(AUTH_COOKIE_NAME) # Read from cookie
    print(f"Cookie '{AUTH_COOKIE_NAME}' value: {token}") # Debug log

    if token is None:
        print("Auth cookie not found.")
        raise credentials_exception

    try:
        payload = verify_token(token) # verify_token likely raises JWTError on failure
        if payload is None: # If verify_token returns None on error instead of raising
             print("Token verification failed (verify_token returned None).")
             raise credentials_exception

        user_email: str = payload.get("sub")
        if user_email is None:
            print("Token payload missing 'sub'.")
            raise credentials_exception

    except JWTError as e:
        print(f"JWTError during token verification: {e}")
        raise credentials_exception

    user = db.query(User).filter(User.email == user_email).first()
    if user is None:
        print(f"User with email '{user_email}' not found in DB.")
        raise credentials_exception

    print(f"Successfully authenticated user: {user.email}")
    return user

# This dependency remains unchanged as it depends on the resolved get_current_user
def get_current_tenant_id(user: User = Depends(get_current_user)):
    return user.tenant_id
