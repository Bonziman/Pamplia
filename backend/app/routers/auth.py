# app/routers/auth.py
# --- FULL REPLACEMENT ---

from fastapi import APIRouter, HTTPException, status, Depends, Response
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app import models, database
from app.utils.jwt_utils import create_access_token
from passlib.context import CryptContext
from app.config import settings
import ipaddress

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Request and Response Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    success: bool = True
    redirect_to_subdomain: Optional[str] = None

class LogoutResponse(BaseModel):
    success: bool = True
    message: str = "Logged out successfully"
    


# --- Helper Functions ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_cookie_domain_attribute(base_domain_setting: str) -> Optional[str]:
    """
    Calculates the appropriate value for the 'domain' attribute in set_cookie.
    Returns None for localhost to use browser default scoping.
    Returns parent domain (e.g., '.yourdomain.com') otherwise.
    """
    if base_domain_setting.lower() == "localhost":
        # For localhost, DO NOT set the domain attribute. Let browser handle it.
        return None
    try:
        ipaddress.ip_address(base_domain_setting)
        # For IP hosts, DO NOT set the domain attribute.
        return None
    except ValueError:
        pass
    if base_domain_setting:
        # Parent domain for production/staging with leading dot
        return f".{base_domain_setting}"
    # Fallback if setting is empty
    return None

# --- Login Endpoint ---
@router.post("/login", response_model=LoginResponse)
def login_for_access_token(
    response: Response,
    form_data: LoginRequest,
    db: Session = Depends(database.get_db)
):
    """
    Authenticate user and resolve their tenant from user data (not Host header).
    Always returns the user's tenant subdomain for frontend redirect.
    """
    # 1. Authenticate credentials
    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password):
        print(f"[Login] Auth failed for email: {form_data.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    print(f"[Login] User '{user.email}' authenticated. Tenant ID: {user.tenant_id}, Role: {user.role}")

    # 2. Look up tenant from user record
    tenant = db.query(models.Tenant).filter(models.Tenant.id == user.tenant_id).first()
    if not tenant or not tenant.subdomain:
        print(f"[Login] Config error: Tenant/subdomain not found for user's tenant ID: {user.tenant_id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login configuration error.")

    if not tenant.is_active and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant is inactive.")

    print(f"[Login] Tenant resolved: '{tenant.subdomain}' (ID: {tenant.id})")

    # 3. Create JWT token
    access_token = create_access_token(
        data={"sub": user.email, "tenant_id": user.tenant_id, "role": user.role}
    )

    # 4. Set auth cookie (scoped to parent domain for cross-subdomain sharing)
    base_domain_config = settings.base_domain
    cookie_domain_value = get_cookie_domain_attribute(base_domain_config)
    print(f"[Login] Setting cookie: Domain={cookie_domain_value}, Secure={settings.environment == 'production'}")

    response.set_cookie(
        key=settings.auth_cookie_name,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.environment == "production",
        path="/",
        domain=cookie_domain_value
    )

    # 5. Always return subdomain so frontend can redirect
    return LoginResponse(
        redirect_to_subdomain=tenant.subdomain
    )

# --- Logout Endpoint ---
@router.post("/logout", response_model=LogoutResponse)
def logout(response: Response):
    base_domain_config = settings.base_domain
    # --- MODIFIED: Use same helper for deletion ---
    cookie_domain_value = get_cookie_domain_attribute(base_domain_config)

    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        domain=cookie_domain_value # <-- Use calculated value (None for localhost)
    )
    return LogoutResponse(message="Successfully logged out")
