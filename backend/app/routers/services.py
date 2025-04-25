from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database
from app.models.tenant import Tenant as TenantModel
from app.models.service import Service as ServiceModel

router = APIRouter(
    prefix="/services",
    tags=["Services"]
)

@router.post("/", response_model=schemas.service.ServiceOut)
def create_service(service: schemas.service.ServiceCreate, db: Session = Depends(database.get_db)):
    # Optional: verify tenant exists
    tenant = db.query(models.tenant.Tenant).filter(models.tenant.Tenant.id == service.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    db_service = models.service.Service(
        name=service.name,
        description=service.description,
        duration_minutes=service.duration_minutes,
        tenant_id=service.tenant_id
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@router.get("/", response_model=List[schemas.service.ServiceOut])
def get_all_services(db: Session = Depends(database.get_db)):
    return db.query(models.service.Service).all()

@router.get("/tenant", response_model=List[schemas.service.ServiceOut])
def get_services_for_request_tenant(
    request: Request, # Inject the request object
    db: Session = Depends(database.get_db)
):
    """
    Retrieves services for the tenant associated with the subdomain
    extracted from the Host header of the incoming request.
    Intended for public booking pages.
    """
    # 1. Determine Tenant from Subdomain (Same logic as POST /appointments/)
    host_header = request.headers.get("Host", "")
    effective_hostname = host_header if host_header else ""
    if not effective_hostname:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Host header missing")

    hostname_part = effective_hostname.split(':')[0]
    subdomain_name = hostname_part.split('.')[0]
    from app.config import settings  # Import settings from your configuration module
    base_domain_config = settings.base_domain

    # Reject if it looks like a base domain request or invalid format
    if hostname_part == base_domain_config or '.' not in hostname_part or subdomain_name == "127":
         print(f"[Get Services /tenant] Rejected: Attempt from base domain/IP: {hostname_part}")
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot determine tenant services from base domain request."
         )

    print(f"[Get Services /tenant] Attempt on subdomain: {subdomain_name}")

    # Find tenant matching the subdomain
    tenant = db.query(TenantModel).filter(TenantModel.subdomain == subdomain_name).first()
    if not tenant:
        print(f"[Get Services /tenant] Rejected: Tenant subdomain not found: {subdomain_name}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant portal not found.")
    tenant_id_from_subdomain = tenant.id
    print(f"[Get Services /tenant] Found Tenant ID: {tenant_id_from_subdomain} for subdomain {subdomain_name}")

    # 2. Fetch services belonging to that tenant's ID
    services = db.query(ServiceModel).filter(ServiceModel.tenant_id == tenant_id_from_subdomain).all()

    print(f"[Get Services /tenant] Found {len(services)} services for Tenant ID {tenant_id_from_subdomain}")
    return services
