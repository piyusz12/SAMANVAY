from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, require_roles
from backend.app.models.user import User
from backend.app.models.system_config import SystemConfig
from backend.app.schemas.auth import UserOut
from backend.app.schemas.system_config import SystemConfigOut, SystemConfigUpdate
from backend.app.services.auth_service import get_password_hash
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now

router = APIRouter(prefix="/admin", tags=["Administration & User Management"])

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # SUPER_ADMIN, BUREAU_ADMIN, BUREAU_OFFICER, CASE_OFFICER, AUDITOR
    bureau: str  # REGULATION_BUREAU, PGRC, APPROVAL_BUREAU, etc.
    designation: Optional[str] = None
    phone: Optional[str] = None

class AdminUserUpdateRole(BaseModel):
    role: Optional[str] = None
    bureau: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/users", response_model=List[UserOut])
def list_system_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Lists all registered system users. Restricted strictly to Super Administrator."""
    return db.query(User).order_by(User.id.asc()).all()

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_system_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Creates a new administrative or officer account. Strictly restricted to Super Admin."""
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{payload.email.lower()}' already exists."
        )

    new_user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        bureau=payload.bureau,
        designation=payload.designation,
        phone=payload.phone,
        is_active=True,
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action_type="USER_CREATED",
        description=f"User account '{new_user.email}' created with role '{new_user.role}' in bureau '{new_user.bureau}'.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        commit=True
    )
    return new_user

@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role_or_bureau(
    user_id: int,
    payload: AdminUserUpdateRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Updates user role, bureau affiliation, or active state. Prevents self-modification."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-modification prohibited: Administrators cannot alter their own role or active status."
        )

    old_role = user.role
    old_bureau = user.bureau

    if payload.role:
        user.role = payload.role
    if payload.bureau:
        user.bureau = payload.bureau
    if payload.is_active is not None:
        user.is_active = payload.is_active

    user.updated_at = utc_now()
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action_type="USER_ROLE_UPDATED",
        description=f"User '{user.email}' updated. Role: {old_role} -> {user.role}, Bureau: {old_bureau} -> {user.bureau}.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        commit=True
    )
    return user

@router.get("/configs", response_model=List[SystemConfigOut])
def list_system_configurations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Lists all regulatory system configurations. Restricted strictly to Super Admin."""
    return db.query(SystemConfig).order_by(SystemConfig.category.asc()).all()

@router.patch("/configs/{config_key}", response_model=SystemConfigOut)
def update_system_configuration(
    config_key: str,
    payload: SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    """Updates regulatory system configuration value. Restricted strictly to Super Admin."""
    cfg = db.query(SystemConfig).filter(SystemConfig.config_key == config_key).first()
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Config key '{config_key}' not found.")

    old_val = cfg.config_value
    cfg.config_value = payload.config_value
    if payload.description:
        cfg.description = payload.description
    cfg.updated_by_id = current_user.id
    cfg.updated_at = utc_now()
    db.commit()
    db.refresh(cfg)

    log_audit_event(
        db=db,
        action_type="CONFIG_UPDATED",
        description=f"System configuration '{config_key}' updated from '{old_val}' to '{cfg.config_value}'.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        commit=True
    )
    return cfg
