import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.app.core.logging import request_id_ctx_var, logger
from backend.app.core.rate_limiter import global_api_rate_limiter
from backend.app.config import settings

class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Core security and observability middleware that:
    1. Generates or propagates X-Request-ID for every request.
    2. Binds request_id to context variable for structured log correlation.
    3. Enforces in-memory sliding window rate limiting per client IP.
    4. Attaches hardened defense-in-depth HTTP security headers:
       - Content-Security-Policy (CSP)
       - Permissions-Policy
       - Cross-Origin-Opener-Policy (COOP)
       - Cross-Origin-Resource-Policy (CORP)
       - Strict-Transport-Security (HSTS in production)
       - X-Content-Type-Options: nosniff
       - X-Frame-Options: DENY
       - X-XSS-Protection: 1; mode=block
       - Referrer-Policy: strict-origin-when-cross-origin
    5. Measures and logs request latency.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        token = request_id_ctx_var.set(req_id)
        start_time = time.perf_counter()

        # Enforce rate limiting on non-health endpoints (exempting test runner)
        client_ip = request.client.host if request.client else "unknown"
        is_test_env = settings.APP_ENV in ("test", "testing") or client_ip in ("testclient", "testserver")
        if not is_test_env and not request.url.path.endswith("/health") and not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi"):
            try:
                global_api_rate_limiter.check(client_ip)
            except Exception as rate_exc:
                request_id_ctx_var.reset(token)
                raise rate_exc

        try:
            response = await call_next(request)
            process_time = (time.perf_counter() - start_time) * 1000.0

            # Observability headers
            response.headers["X-Request-ID"] = req_id
            response.headers["X-Response-Time"] = f"{process_time:.2f}ms"

            # Defense-in-depth security headers
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
            response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
            response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

            # Content Security Policy (modern strict policy)
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self' data:; "
                "connect-src 'self' ws: wss:; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "frame-ancestors 'none'; "
                "form-action 'self';"
            )

            # Strict Transport Security in production
            if settings.APP_ENV == "production":
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

            # Access logging (skipping high-frequency health probes)
            if not request.url.path.endswith("/health"):
                logger.info(
                    f"{request.method} {request.url.path} -> {response.status_code} ({process_time:.2f}ms)"
                )

            return response
        except Exception as exc:
            process_time = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"{request.method} {request.url.path} FAILED after {process_time:.2f}ms: {exc}")
            raise exc
        finally:
            request_id_ctx_var.reset(token)
