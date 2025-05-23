# app/routers/users.py
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.models.user import User
from passlib.context import CryptContext
from app.dependencies import get_current_user, get_current_tenant_id
from app.utils.permissions import can_edit_user, is_super_admin, is_admin, is_staff
from typing import List, Optional
from app.schemas.pagination import PaginatedResponse # Ensure this is imported
from app.schemas.user import UserOut # For type hint in PaginatedResponse

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# Set up bcrypt hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ITEMS_PER_PAGE = 10  # Default items per page

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

@router.post("/", response_model=schemas.user.UserOut)
def create_user(
    user: schemas.user.UserCreate,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    if not (current_user.role in ["admin", "super_admin"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_user.role == "admin" and current_user.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="Admin can only create users for their own tenant")

    tenant = db.query(models.Tenant).filter(models.Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        tenant_id=user.tenant_id,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/update/{user_id}", response_model=schemas.user.UserOut)
def update_user(
    user_id: int,
    update_data: schemas.user.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not can_edit_user(current_user, user):
        raise HTTPException(status_code=403, detail="You are not allowed to update this user")

    # Prevent updating tenant_id
    if "tenant_id" in update_data.model_dump():
        raise HTTPException(status_code=400, detail="Cannot update tenant_id")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user

@router.get("/profile", response_model=schemas.user.UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user  # The `current_user` will be automatically mapped to UserOut schema

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Block staff from deleting anyone
    if is_staff(current_user):
        raise HTTPException(status_code=403, detail="Staff cannot delete users")

    # Admins can only delete staff from their own tenant
    if is_admin(current_user):
        if current_user.tenant_id != target_user.tenant_id:
            raise HTTPException(status_code=403, detail="You can only delete users from your own tenant")
        if target_user.role == "admin":
            raise HTTPException(status_code=403, detail="Admins cannot delete other admins")

    # Super admin can delete anyone
    db.delete(target_user)
    db.commit()
    return {"detail": "User deleted successfully"}

@router.get("/", response_model=PaginatedResponse[UserOut]) # UPDATED response_model
def get_all_users_paginated( # Renamed for clarity, or keep original name
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(ITEMS_PER_PAGE, ge=1, le=100), # Use constant or default
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    tenant_id_filter: Optional[int] = Query(None, alias="tenantId") # For SuperAdmin
):
    query = db.query(User)
    count_query = db.query(func.count(User.id))

    if is_super_admin(current_user):
        if tenant_id_filter is not None:
            query = query.filter(User.tenant_id == tenant_id_filter)
            count_query = count_query.filter(User.tenant_id == tenant_id_filter)
        # If no tenant_id_filter, super_admin sees all (no additional filter on tenant)
    elif is_admin(current_user):
        if not current_user.tenant_id:
             raise HTTPException(status_code=403, detail="Admin user not associated with a tenant.")
        query = query.filter(User.tenant_id == current_user.tenant_id)
        count_query = count_query.filter(User.tenant_id == current_user.tenant_id)
    else: # Staff users should not typically list all users, this endpoint is for admin/super_admin
        raise HTTPException(status_code=403, detail="Not authorized to list users.")

    if role:
        query = query.filter(User.role == role)
        count_query = count_query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
        count_query = count_query.filter(User.is_active == is_active)

    total_items = count_query.scalar() or 0
    
    users = query.order_by(User.name).offset((page - 1) * limit).limit(limit).all()
    
    return PaginatedResponse(
        total=total_items,
        page=page,
        limit=limit,
        items=users
    )
