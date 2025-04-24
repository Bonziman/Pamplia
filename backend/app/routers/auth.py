# app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field # Import Field
from typing import Optional # Import Optional
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.utils.jwt_utils import create_access_token # Assuming verify_token is not needed here
from passlib.context import CryptContext
# Remove the old Token import if it's defined elsewhere and conflicts
# from app.schemas.token import Token # <-- Remove if conflicts with below

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Define Request and Response Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

# Define a NEW response model that includes the optional redirect field
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    redirect_to_subdomain: Optional[str] = None # Add this optional field

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Use the new LoginResponse model in the decorator
@router.post("/login", response_model=LoginResponse)
def login_for_access_token(
    form_data: LoginRequest, # Use the new request model name
    request: Request,
    db: Session = Depends(database.get_db)
):
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else request.client.host # Prefer Host header

    if not effective_hostname:
         raise HTTPException(status_code=400, detail="Could not determine hostname")

    hostname_part = effective_hostname.split(':')[0]
    subdomain_name = hostname_part.split('.')[0]
    is_base_domain_login = '.' not in hostname_part or subdomain_name in ["localhost", "127"] # Check if it's a base domain login

    print(f"Effective hostname: {hostname_part}, Subdomain extracted: {subdomain_name}, Is base domain login: {is_base_domain_login}") # Debug

    # --- Authentication (Common Logic) ---
    user = db.query(models.User).filter(models.User.email == form_data.email).first()

    if not user or not verify_password(form_data.password, user.password):
        print(f"User lookup or password verification failed for email: {form_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # --- Tenant Validation and Response Logic ---
    user_tenant_id = user.tenant_id
    print(f"User '{user.email}' authenticated. User's Tenant ID: {user_tenant_id}") # Debug

    redirect_subdomain = None # Initialize redirect target

    if is_base_domain_login:
        # --- Base Domain Login Flow ---
        print("Processing base domain login.")
        # Find the correct tenant based on the authenticated user's tenant_id
        correct_tenant = db.query(models.Tenant).filter(models.Tenant.id == user_tenant_id).first()

        if not correct_tenant or not correct_tenant.subdomain:
             # This case should ideally not happen if data integrity is maintained
             # (user has a tenant_id, but no matching tenant or tenant has no subdomain)
             print(f"Error: Could not find valid tenant or subdomain name for user's tenant ID: {user_tenant_id}")
             # Return generic error, as this is an internal inconsistency issue
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail="Login configuration error."
             )

        redirect_subdomain = correct_tenant.subdomain
        print(f"User belongs to Tenant ID {user_tenant_id}, redirecting to subdomain: {redirect_subdomain}")

    else:
        # --- Subdomain Login Flow ---
        print(f"Processing subdomain login for: {subdomain_name}")
        # 1. Find the Tenant expected by the subdomain used in the URL
        tenant_from_subdomain = db.query(models.Tenant).filter(models.Tenant.subdomain == subdomain_name).first() # Use subdomain_name column

        if not tenant_from_subdomain:
            print(f"Tenant not found for subdomain: {subdomain_name}")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        tenant_id_from_subdomain = tenant_from_subdomain.id
        print(f"Subdomain '{subdomain_name}' corresponds to Tenant ID: {tenant_id_from_subdomain}")

        # 2. Compare User's Tenant ID with the Subdomain's Tenant ID
        if user_tenant_id != tenant_id_from_subdomain:
            print(f"Tenant ID mismatch: User's Tenant ID ({user_tenant_id}) != Subdomain's Tenant ID ({tenant_id_from_subdomain})")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        print(f"User's tenant ID matches the subdomain's tenant ID.")
        # No redirect needed if login is already via the correct subdomain

    # --- Token Generation (Common Logic) ---
    print(f"Generating token for user '{user.email}' (Tenant ID: {user_tenant_id})")
    access_token = create_access_token(
        data={"sub": user.email, "tenant_id": user.tenant_id, "role": user.role}
    )

    # --- Return Response ---
    # Return the new response model, including the optional redirect subdomain
    return LoginResponse(
        access_token=access_token,
        redirect_to_subdomain=redirect_subdomain # Will be None if not a base domain login
    )
