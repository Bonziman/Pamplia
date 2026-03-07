# app/main.py
from fastapi import FastAPI, Request, Depends # Add Request, Depends
import re
from fastapi.responses import RedirectResponse # Add RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware # Optional for Prod
from fastapi.middleware.trustedhost import TrustedHostMiddleware # Optional for Prod
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response as StarletteResponse # For middleware typing

from app.routers import tenants, appointments, services, auth, users, tags, clients, dashboard, templates, communications, staff, availability
from app.database import Base, engine, get_db # Import get_db
from app.models import tenant, user, service, appointment, finance # Import models
from sqlalchemy.orm import Session

# Import dependencies and utils needed for middleware
from app.utils.jwt_utils import verify_token
from app.config import settings
from jose import JWTError


Base.metadata.create_all(bind=engine)
app = FastAPI()

# --- CORS Configuration ---
# Be more specific for production
origins_dev = [
    "http://localtest.me",
    "http://localtest.me:3000", # Default React port
    # You might need to list specific subdomains or use regex if ports vary widely
    "http://exampletenant.localtest.me:3000",
    "http://exampletenant2.localtest.me:3000",
    "http://string.localtest.me:3000",
    
    
    "https://localtest.me",
    "https://localtest.me:3000", # Default React port
    # You might need to list specific subdomains or use regex if ports vary widely
    "https://exampletenant.localtest.me:3000",
    "https://exampletenant2.localtest.me:3000",
    "https://string.localtest.me:3000",
    "http://localtest.me:8086",
    "https://localtest.me:8086",
    "http://main.localtest.me:8086",
    "https://main.localtest.me:8086",
    "http://141.253.120.119:3000",
    "http://141.253.120.119:25565",
    "http://localhost:8086",
    "http://127.0.0.1:8086",
    "http://141.253.120.119:8086",
    "https://141.253.120.119:8086",
    # Production domain
    "https://pamplia.store",
    "http://pamplia.store",
]
origins_prod = [
    f"https://{settings.base_domain}",
]

origins = origins_dev if settings.environment != "production" else origins_prod

# Always use regex to match any subdomain of base_domain
escaped_base_domain = re.escape(settings.base_domain)
if settings.environment != "production":
    origin_regex = rf"^https?://([a-z0-9-]+\.)?{escaped_base_domain}(:(3000|8086))?$"
else:
    origin_regex = rf"^https?://([a-z0-9-]+\.)?{escaped_base_domain}$"

print(f"Configuring CORS for origins: {origins}") # Add log to verify

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Use the calculated origins list
    allow_origin_regex=origin_regex,
    allow_credentials=True,    # Essential for cookies
    allow_methods=["*"],       # Allow common methods
    allow_headers=["*"],       # Allow common headers, including Content-Type etc.
)

# --- Optional Prod Middlewares ---
# if settings.environment == "production":
#     app.add_middleware(HTTPSRedirectMiddleware)
#     app.add_middleware(TrustedHostMiddleware, allowed_hosts=[settings.base_domain, f"*.{settings.base_domain}"])


# --- Base Domain Redirect Middleware ---
class RedirectBaseDomainMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> StarletteResponse:
        hostname = request.headers.get("Host", "").split(':')[0]
        base_domain = settings.base_domain

        # Only act if it's the base domain AND not an API path (usually starting /api, /auth, /docs etc)
        # Adjust path exclusions as needed for your API structure
        is_base_and_not_api = (hostname == base_domain) and not any(
            request.url.path.startswith(p) for p in ["/api", "/auth", "/docs", "/openapi.json", "/redoc"]
        ) # Avoid redirecting API calls or docs

        if is_base_and_not_api:
            token = request.cookies.get(settings.auth_cookie_name) # Read from cookie
            if token:
                try:
                    payload = verify_token(token)
                    if payload: # Token is valid
                        user_email = payload.get("sub")
                        tenant_id = payload.get("tenant_id")
                        if user_email and tenant_id:
                            # Need DB access inside middleware - slightly complex pattern
                            # Option 1: Pass DB session (can be tricky with async middleware)
                            # Option 2: Make dependency callable (cleaner)
                            async with request.scope["dependency_cache"]["get_db"]() as db: # Use dependency cache if possible
                                tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
                                if tenant and tenant.subdomain:
                                    protocol = "https" if settings.environment == "production" else "http"
                                    frontend_port = request.url.port # Keep original port if specified
                                    port_str = f":{frontend_port}" if frontend_port else ""
                                    redirect_url = f"{protocol}://{tenant.subdomain}.{base_domain}{port_str}{request.url.path}" # Append original path
                                    if request.url.query:
                                        redirect_url += f"?{request.url.query}" # Append query params
                                    return RedirectResponse(url=redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
                except Exception:
                    pass
                    # Let request proceed if error occurs during check

        # If not redirecting, proceed to the next middleware/route
        response = await call_next(request)
        return response

# Add the custom middleware
# Note: Using dependency cache might require specific setup or alternatives
# For simplicity if cache doesn't work, remove DB lookup here and rely on frontend state?
# Or accept that middleware might not redirect immediately if DB session is hard.
# Let's try with dependency_cache first. Check FastAPI docs for current best practice.
# If it causes issues, we might need to remove the redirect logic from middleware
# and handle it purely on the frontend based on context state.
# app.add_middleware(RedirectBaseDomainMiddleware)
# Commenting out middleware for now due to potential DB session complexity in async context
# We will rely on frontend check in Login.tsx for redirect

# --- Include Routers ---
# Ensure the auth router (containing /logout) is included
app.include_router(auth)
app.include_router(users)
app.include_router(tenants)
app.include_router(appointments)
app.include_router(services)
app.include_router(tags)
app.include_router(clients)
app.include_router(dashboard)
app.include_router(templates)
app.include_router(communications)
app.include_router(staff)
app.include_router(availability)  # Ensure availability router is included

@app.get("/")
def root():
    return {"message": "API is up and running"}
