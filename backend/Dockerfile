# =====================================================================
# SAMANVAY — Production Backend Dockerfile (SIH PS 26264)
# Multi-stage, non-root, hardened container image
# =====================================================================

# Stage 1: Build stage with compilation tools
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -r requirements.txt


# Stage 2: Minimal hardened production runtime
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime dependencies (libpq for postgresql, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged application user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -d /app appuser

# Install pre-built python wheels from builder stage
COPY --from=builder /build/wheels /wheels
COPY --from=builder /build/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir /wheels/* && \
    rm -rf /wheels

# Copy application source code and infrastructure scripts
COPY backend /app/backend
COPY infrastructure /app/infrastructure
COPY storage /app/storage

# Create storage and runtime mount points with correct non-root permissions
RUN mkdir -p /app/storage/evidence /app/storage/quarantine /app/storage/backups /app/backend/uploads /app/runtime && \
    chmod +x /app/backend/docker-entrypoint.sh && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    APP_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/v1/health/live || exit 1

ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
