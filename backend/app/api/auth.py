from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, Token, UserOut
from backend.app.services.auth_service import verify_password, create_access_token
from backend.app.services.audit_service import log_audit_event
from backend.app.core.rate_limiter import login_rate_limiter
from backend.app.core.security import set_auth_cookies, clear_auth_cookies, generate_csrf_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticates user credentials, applies rate limiting, sets secure HTTP-only cookies,
    and returns JWT bearer token with user profile. Records audit events without sensitive payloads.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{login_data.email.lower()}"

    # 1. Enforce rate limiting
    login_rate_limiter.check_rate_limit(rate_limit_key)

    user = db.query(User).filter(User.email == login_data.email.lower()).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed attempt in rate limiter
        login_rate_limiter.record_failed_attempt(rate_limit_key)

        # Audit log failed login without password or token
        log_audit_event(
            db=db,
            action_type="LOGIN_FAILED",
            description=f"Failed login attempt for email '{login_data.email.lower()}' from IP {client_ip}.",
            actor_name="Unauthenticated",
            actor_role="UNKNOWN",
            actor_bureau="EXTERNAL",
            ip_address=client_ip,
            commit=True
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact AICTE administrator.",
        )

    # 2. Reset rate limiter on successful login
    login_rate_limiter.reset(rate_limit_key)

    # 3. Create access token and anti-CSRF token
    access_token = create_access_token(subject=user.id)
    csrf_token = generate_csrf_token()

    # 4. Set secure HTTP-only auth cookies
    set_auth_cookies(response, access_token=access_token, csrf_token=csrf_token)

    # 5. Audit log successful login without sensitive data
    log_audit_event(
        db=db,
        action_type="LOGIN_SUCCESS",
        description=f"User '{user.email}' logged in successfully.",
        actor_id=user.id,
        actor_name=user.full_name,
        actor_role=user.role,
        actor_bureau=user.bureau,
        ip_address=client_ip,
        commit=True
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logs out user, clears auth cookies, and records audit log."""
    clear_auth_cookies(response)

    client_ip = request.client.host if request.client else "unknown"
    log_audit_event(
        db=db,
        action_type="LOGOUT",
        description=f"User '{current_user.email}' logged out.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        ip_address=client_ip,
        commit=True
    )

    return {"message": "Logged out successfully. Session cookies cleared."}

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user details."""
    return UserOut.model_validate(current_user)
