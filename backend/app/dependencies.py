# app/dependencies.py
from fastapi import HTTPException, Depends, Request, status # Add Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func # Keep for now, might remove later if unused elsewhere
from app.utils.jwt_utils import verify_token
from app.models.user import User
from app.database import get_db
from sqlalchemy.orm import Session
from jose import JWTError
from app.config import settings
from app.models.tenant import Tenant as TenantModel

# Define the cookie name (make this consistent)
AUTH_COOKIE_NAME = settings.auth_cookie_name

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



async def get_tenant_from_request_subdomain(
    request: Request, 
    db: Session = Depends(get_db)
) -> TenantModel:
    """
    Resolves a Tenant object based on the subdomain in the request's Host header.
    Raises HTTPException if tenant not found or host is invalid.
    This is for PUBLIC endpoints that need tenant context without user authentication.
    """
    host_header = request.headers.get("Host", "")
    # Try to get hostname from X-Forwarded-Host if behind a proxy, then Host
    # effective_hostname_with_port = request.headers.get("X-Forwarded-Host", host_header).split(',')[0].strip()
    # For localtest.me, Host header is usually sufficient.
    effective_hostname_with_port = host_header

    if not effective_hostname_with_port:
        # Fallback for certain test clients or environments if Host is missing
        # This part might be too specific or insecure for general use, usually Host is present
        # client_host = request.client.host if request.client else ""
        # effective_hostname_with_port = client_host
        # if not effective_hostname_with_port:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing or client host undetermined.")

    effective_hostname = effective_hostname_with_port.split(':')[0]

    base_domain_config = settings.base_domain.lower() # Normalize for comparison
    normalized_hostname = effective_hostname.lower()

    # Check if it's just an IP address
    is_ip_address = all(part.isdigit() for part in normalized_hostname.split('.'))
    if is_ip_address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Access via IP address is not supported for tenant context.")

    # Check for valid subdomain format: e.g., tenant.localtest.me
    # It must end with ".{base_domain_config}" and not be identical to base_domain_config
    if not normalized_hostname.endswith(f".{base_domain_config}") or normalized_hostname == base_domain_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant portal address. Please use your assigned subdomain."
        )

    # Extract subdomain: "tenant" from "tenant.localtest.me"
    subdomain_name = normalized_hostname.replace(f".{base_domain_config}", "")
    
    # Further validation for subdomain_name (e.g., not empty, no extra dots, alphanumeric)
    if not subdomain_name or '.' in subdomain_name or not subdomain_name.isalnum() and '-' not in subdomain_name : # Allow hyphens
        # More specific regex might be better: ^[a-z0-9]+(?:-[a-z0-9]+)*$
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subdomain format.")

    tenant = db.query(TenantModel).filter(func.lower(TenantModel.subdomain) == subdomain_name).first() # Case-insensitive subdomain lookup
    
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant portal not found.")
    
    return tenant
