# app/routers/tenants.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, schemas
from typing import List

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"]
)

@router.post("/", response_model=schemas.tenant.TenantOut)
def create_tenant(tenant: schemas.tenant.TenantCreate, db: Session = Depends(database.get_db)):
    db_tenant = models.Tenant(**tenant.dict())
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

@router.get("/", response_model=List[schemas.tenant.TenantOut]) 
def get_all_tenants(db: Session = Depends(database.get_db)):
    return db.query(models.Tenant).all()
