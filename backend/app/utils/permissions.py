# app/utils/permissions.py
from fastapi import HTTPException
from app.models.user import User

def is_super_admin(user: User) -> bool:
    return user.role == "super_admin"

def is_admin(user: User) -> bool:
    return user.role == "admin"

def is_staff(user: User) -> bool:
    return user.role == "staff"

def can_edit_user(current_user: User, target_user: User) -> bool:
    # Super admin can edit anyone
    if is_super_admin(current_user):
        return True
    # Admins can edit their own profile or users from same tenant
    if is_admin(current_user) and current_user.tenant_id == target_user.tenant_id:
        return current_user.id == target_user.id or target_user.role != "admin"
    # Staff can edit only themselves
    if is_staff(current_user):
        return current_user.id == target_user.id
    return False
