import secrets
from typing import Optional
from fastapi import Request, Response, HTTPException, status
from backend.app.config import settings

CSRF_COOKIE_NAME = "csrf_token"
AUTH_COOKIE_NAME = "access_token"

def generate_csrf_token() -> str:
    """Generates a cryptographically strong random token for CSRF protection."""
    return secrets.token_urlsafe(32)

def set_auth_cookies(
    response: Response,
    access_token: str,
    csrf_token: Optional[str] = None
) -> None:
    """Sets secure HTTP-only access token and anti-CSRF cookies."""
    is_prod = (settings.APP_ENV == "production")
    max_age_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # HTTP-only session cookie for JWT access token
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=access_token,
        max_age=max_age_seconds,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path="/"
    )

    # Non-HttpOnly cookie for CSRF token so browser JS can attach it as X-CSRF-Token header
    if csrf_token:
        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=csrf_token,
            max_age=max_age_seconds,
            httponly=False,
            samesite="lax",
            secure=is_prod,
            path="/"
        )

def clear_auth_cookies(response: Response) -> None:
    """Clears authentication and CSRF cookies on logout."""
    is_prod = (settings.APP_ENV == "production")
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/", httponly=True, samesite="lax", secure=is_prod)
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/", httponly=False, samesite="lax", secure=is_prod)

def validate_csrf_protection(request: Request) -> None:
    """
    Validates Double Submit CSRF token when request relies on cookie-based authentication.
    Requests using Authorization: Bearer headers are exempt because browsers do not auto-attach them.
    """
    # Only enforce for mutating HTTP methods
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return

    # Check if request is authenticated via cookie
    auth_cookie = request.cookies.get(AUTH_COOKIE_NAME)
    auth_header = request.headers.get("Authorization")

    # If Bearer header is explicitly provided, it is not vulnerable to ambient browser CSRF
    if auth_header and auth_header.startswith("Bearer "):
        return

    # If authenticated via cookie, require matching X-CSRF-Token header
    if auth_cookie:
        cookie_csrf = request.cookies.get(CSRF_COOKIE_NAME)
        header_csrf = request.headers.get("X-CSRF-Token")

        if not cookie_csrf or not header_csrf or not secrets.compare_digest(cookie_csrf, header_csrf):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF verification failed. Missing or invalid X-CSRF-Token header."
            )
