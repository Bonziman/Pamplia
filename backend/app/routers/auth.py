# app/routers/auth.py
# --- FULL REPLACEMENT ---

from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app import models, database
from app.utils.jwt_utils import create_access_token
from passlib.context import CryptContext
from app.config import settings
from app.config import settings
from app.schemas.user import UserOut

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
    elif base_domain_setting:
        # Parent domain for production/staging with leading dot
        return f".{base_domain_setting}"
    else:
        # Fallback if setting is empty
        return None

# --- Login Endpoint ---
@router.post("/login", response_model=LoginResponse)
def login_for_access_token(
    response: Response,
    form_data: LoginRequest,
    request: Request,
    db: Session = Depends(database.get_db)
):
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else request.client.host
    if not effective_hostname:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not determine hostname")

    hostname_part = effective_hostname.split(':')[0]
    subdomain_name = hostname_part.split('.')[0]
    base_domain_config = settings.base_domain
    is_base_domain_login = hostname_part == base_domain_config or subdomain_name == "127"

    print(f"[Login] Hostname: {hostname_part}, Subdomain: {subdomain_name}, Base Login: {is_base_domain_login}, Base Config: {base_domain_config}")

    user = db.query(models.User).filter(models.User.email == form_data.email).first()
    if not user or not verify_password(form_data.password, user.password):
        print(f"[Login] Auth failed for email: {form_data.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_tenant_id = user.tenant_id
    print(f"[Login] User '{user.email}' authenticated. Tenant ID: {user_tenant_id}")

    redirect_subdomain_target = None

    if is_base_domain_login:
        print("[Login] Processing base domain login.")
        correct_tenant = db.query(models.Tenant).filter(models.Tenant.id == user_tenant_id).first()
        if not correct_tenant or not correct_tenant.subdomain:
             print(f"[Login] Config error: Tenant/subdomain not found for user's tenant ID: {user_tenant_id}")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login configuration error.")
        redirect_subdomain_target = correct_tenant.subdomain
        print(f"[Login] Redirect needed to subdomain: {redirect_subdomain_target}")
    else:
        print(f"[Login] Processing subdomain login: {subdomain_name}")
        tenant_from_subdomain = db.query(models.Tenant).filter(models.Tenant.subdomain == subdomain_name).first()
        if not tenant_from_subdomain:
            print(f"[Login] Tenant not found for subdomain: {subdomain_name}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if user_tenant_id != tenant_from_subdomain.id:
            print(f"[Login] Tenant ID mismatch: User ({user_tenant_id}) != Subdomain ({tenant_from_subdomain.id})")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        print(f"[Login] Tenant ID matches subdomain.")

    access_token = create_access_token(
        data={"sub": user.email, "tenant_id": user.tenant_id, "role": user.role}
    )

    # --- MODIFIED: Get domain attribute value (will be None for localhost) ---
    cookie_domain_value = get_cookie_domain_attribute(base_domain_config)
    print(f"[Login] Setting cookie: Name={settings.auth_cookie_name}, Domain={cookie_domain_value}, Secure={settings.environment == 'production'}")

    # --- MODIFIED: Pass calculated domain value to set_cookie ---
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=settings.environment == "production",
        path="/",
        domain=cookie_domain_value # <-- Pass the calculated value (None for localhost)
    )

    return LoginResponse(
        redirect_to_subdomain=redirect_subdomain_target
    )

# --- Logout Endpoint ---
@router.post("/logout", response_model=LogoutResponse)
def logout(response: Response):
    base_domain_config = settings.base_domain
    # --- MODIFIED: Use same helper for deletion ---
    cookie_domain_value = get_cookie_domain_attribute(base_domain_config)

    print(f"[Logout] Deleting cookie: Name={settings.auth_cookie_name}, Domain={cookie_domain_value}")

    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        domain=cookie_domain_value # <-- Use calculated value (None for localhost)
    )
    return LogoutResponse(message="Successfully logged out")
