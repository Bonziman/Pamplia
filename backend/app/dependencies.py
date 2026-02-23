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
    token = request.cookies.get(AUTH_COOKIE_NAME)

    if token is None:
        raise credentials_exception

    try:
        payload = verify_token(token) # verify_token likely raises JWTError on failure
        if payload is None:
             raise credentials_exception

        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == user_email).first()
    if user is None:
        raise credentials_exception

    return user

# This dependency remains unchanged as it depends on the resolved get_current_user
def get_current_tenant_id(user: User = Depends(get_current_user)):
    return user.tenant_id



def resolve_tenant_by_subdomain(subdomain: str, db: Session) -> TenantModel:
    """
    Resolves a Tenant object by subdomain name (passed as a query parameter).
    Raises HTTPException if tenant not found or inactive.
    Used by public endpoints where tenant context comes from the frontend.
    """
    if not subdomain:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subdomain parameter is required.")

    subdomain_clean = subdomain.strip().lower()
    if not subdomain_clean or '.' in subdomain_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subdomain format.")

    tenant = db.query(TenantModel).filter(func.lower(TenantModel.subdomain) == subdomain_clean).first()

    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant portal not found.")

    if not tenant.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant portal is inactive.")

    return tenant


async def get_tenant_from_request_subdomain(
    request: Request, 
    db: Session = Depends(get_db)
) -> TenantModel:
    """
    Resolves a Tenant from a 'subdomain' query parameter.
    Falls back to Host header parsing for backward compatibility.
    """
    # Prefer explicit subdomain query parameter
    subdomain_param = request.query_params.get("subdomain")
    if subdomain_param:
        return resolve_tenant_by_subdomain(subdomain_param, db)

    # Fallback: parse Host header (for direct subdomain access)
    host_header = request.headers.get("Host", "")
    effective_hostname_with_port = host_header

    if not effective_hostname_with_port:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing and no subdomain parameter provided.")

    effective_hostname = effective_hostname_with_port.split(':')[0]
    base_domain_config = settings.base_domain.lower()
    normalized_hostname = effective_hostname.lower()

    is_ip_address = all(part.isdigit() for part in normalized_hostname.split('.'))
    if is_ip_address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Access via IP address is not supported for tenant context.")

    if not normalized_hostname.endswith(f".{base_domain_config}") or normalized_hostname == base_domain_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant portal address. Please provide a subdomain parameter."
        )

    subdomain_name = normalized_hostname.replace(f".{base_domain_config}", "")
    return resolve_tenant_by_subdomain(subdomain_name, db)
