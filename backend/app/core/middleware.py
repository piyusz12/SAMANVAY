import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.app.core.logging import request_id_ctx_var, logger

class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Generates or extracts X-Request-ID for every request.
    2. Binds request_id to context variable for structured logging.
    3. Measures request execution latency in ms.
    4. Attaches X-Request-ID and X-Response-Time to response headers.
    5. Logs structured request audit line.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        token = request_id_ctx_var.set(req_id)
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            process_time = (time.perf_counter() - start_time) * 1000.0

            response.headers["X-Request-ID"] = req_id
            response.headers["X-Response-Time"] = f"{process_time:.2f}ms"

            # Skip health check noise in access logs
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
