# app/routers/tenants.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, database, schemas
from typing import List

from app.models import Tenant, Appointment, Service


router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"]
)

@router.post("/", response_model=schemas.TenantOut)
def create_tenant(tenant: schemas.TenantCreate, db: Session = Depends(database.get_db)):
    # Check if tenant name already exists
    existing_tenant = db.query(models.Tenant).filter_by(name=tenant.name).first()
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant with name '{tenant.name}' already exists"
        )

    existing_subdomain = db.query(models.Tenant).filter_by(subdomain=tenant.subdomain).first()
    if existing_subdomain:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subdomain '{tenant.subdomain}' is already taken"
        )

    db_tenant = models.tenant.Tenant(
        name=tenant.name,
        subdomain=tenant.subdomain,
        logo_url=tenant.logo_url,
        slogan=tenant.slogan,
    )

    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant
  
@router.get("/", response_model=List[schemas.tenant.TenantOut]) 
def get_all_tenants(db: Session = Depends(database.get_db)):
    return db.query(models.Tenant).all()
