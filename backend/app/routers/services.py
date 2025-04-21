from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas, database

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

@router.get("/tenant/{tenant_id}", response_model=List[schemas.service.ServiceOut])
def get_services_by_tenant(tenant_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.service.Service).filter(models.service.Service.tenant_id == tenant_id).all()
