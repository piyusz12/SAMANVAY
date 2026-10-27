from typing import Generator, Optional, List, Callable
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, get_db
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.services.auth_service import decode_access_token
from backend.app.services.audit_service import log_audit_event
from backend.app.core.security import AUTH_COOKIE_NAME, validate_csrf_protection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ROLE_ALIASES = {
    "BUREAU_HEAD": "BUREAU_ADMIN",
    "VIEWER": "AUDITOR"
}

def normalize_role(role: str) -> str:
    """Normalizes legacy and prototype role identifiers."""
    return ROLE_ALIASES.get(role, role)

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    header_token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Extracts and authenticates user from Bearer header or secure HTTP-only cookie.
    Enforces expiration, account active check, and CSRF protection when using cookies.
    """
    token: Optional[str] = None
    used_cookie = False

    if isinstance(header_token, str) and header_token.strip():
        token = header_token.strip()
    else:
        auth_hdr = request.headers.get("Authorization")
        if auth_hdr and auth_hdr.lower().startswith("bearer "):
            token = auth_hdr[7:].strip()

    if not token:
        # Fall back to secure HTTP-only cookie
        cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
        if cookie_token:
            token = cookie_token
            used_cookie = True

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate CSRF protection if authenticated via ambient cookie
    if used_cookie:
        validate_csrf_protection(request)

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity.",
        )
    
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token identity.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact AICTE administration.",
        )
    return user

def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db),
    header_token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    Optional authentication dependency: returns User if valid token is provided,
    otherwise returns None without raising 401.
    """
    try:
        return get_current_user(request=request, db=db, header_token=header_token)
    except HTTPException:
        return None


def require_roles(allowed_roles: List[str]):
    """
    Role-based access control dependency.
    Super Administrator always satisfies role checks.
    """
    normalized_allowed = [normalize_role(r) for r in allowed_roles]

    def role_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        user_role = normalize_role(current_user.role)

        if user_role == "SUPER_ADMIN":
            return current_user

        if user_role not in normalized_allowed:
            log_audit_event(
                db=db,
                action_type="AUTHORIZATION_FAILURE",
                description=(
                    f"Access denied for user '{current_user.email}' (Role: {current_user.role}) "
                    f"on {request.method} {request.url.path}. Required: {', '.join(allowed_roles)}."
                ),
                actor_id=current_user.id,
                actor_name=current_user.full_name,
                actor_role=current_user.role,
                actor_bureau=current_user.bureau,
                commit=True
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of the following roles: {', '.join(allowed_roles)}.",
            )
        return current_user
    return role_checker

def require_not_auditor(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Enforces read-only restriction for Auditors on mutating endpoints."""
    user_role = normalize_role(current_user.role)
    if user_role == "AUDITOR":
        log_audit_event(
            db=db,
            action_type="AUTHORIZATION_FAILURE",
            description=f"Read-Only Auditor '{current_user.email}' attempted mutation on {request.method} {request.url.path}.",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_bureau=current_user.bureau,
            commit=True
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action prohibited: Read-Only Auditor accounts cannot mutate complaint cases or records."
        )
    return current_user

def verify_bureau_complaint_access(
    complaint_id: int,
    current_user: User,
    db: Session,
    request: Request,
    is_mutation: bool = False
) -> Complaint:
    """
    Validates bureau-scoped access to a complaint.
    - SUPER_ADMIN: Unrestricted access across all bureaus.
    - AUDITOR: Read-only access across all bureaus, mutations forbidden.
    - BUREAU_ADMIN / BUREAU_OFFICER / CASE_OFFICER: Read and mutation restricted to user's assigned bureau.
    """
    user_role = normalize_role(current_user.role)

    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.is_deleted == False
    ).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint ID {complaint_id} not found."
        )

    # Super Admin has global access
    if user_role == "SUPER_ADMIN":
        return complaint

    # Auditor is strictly read-only
    if user_role == "AUDITOR":
        if is_mutation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Auditors are restricted to read-only oversight and cannot modify case files."
            )
        return complaint

    # Enforce bureau scope on other roles
    if complaint.bureau != current_user.bureau:
        log_audit_event(
            db=db,
            action_type="CROSS_BUREAU_VIOLATION",
            description=(
                f"Cross-bureau violation: User '{current_user.email}' ({current_user.bureau}) "
                f"attempted to access complaint {complaint.complaint_no} belonging to {complaint.bureau}."
            ),
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_bureau=current_user.bureau,
            complaint_id=complaint.id,
            institution_id=complaint.institution_id,
            commit=True
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-bureau access denied: Case {complaint.complaint_no} is managed by {complaint.bureau}. You belong to {current_user.bureau}."
        )

    # For CASE_OFFICER performing mutations: verify direct assignment or unassigned status
    if user_role == "CASE_OFFICER" and is_mutation:
        if complaint.assigned_officer_id and complaint.assigned_officer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Case is assigned to Desk Officer ID {complaint.assigned_officer_id}. Only the assigned officer or Bureau Admin can update it."
            )

    return complaint
