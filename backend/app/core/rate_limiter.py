import time
from typing import Dict, List, Tuple
from collections import defaultdict
from fastapi import HTTPException, status

class LoginRateLimiter:
    """
    In-memory sliding window rate limiter for login attempts.
    Tracks failed attempts by IP and email to mitigate brute-force attacks.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60, lockout_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        # key -> list of failed attempt timestamps
        self.failed_attempts: Dict[str, List[float]] = defaultdict(list)
        # key -> lockout expiry timestamp
        self.lockouts: Dict[str, float] = {}

    def _cleanup_old_attempts(self, key: str, now: float):
        cutoff = now - self.window_seconds
        self.failed_attempts[key] = [t for t in self.failed_attempts[key] if t > cutoff]

    def check_rate_limit(self, key: str) -> None:
        """Checks if key is currently locked out. Raises HTTP 429 if limit exceeded."""
        now = time.time()
        
        # Check active lockout
        if key in self.lockouts:
            if now < self.lockouts[key]:
                remaining = int(self.lockouts[key] - now) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed login attempts. Account temporarily locked for security. Please try again in {remaining} seconds.",
                    headers={"Retry-After": str(remaining)}
                )
            else:
                del self.lockouts[key]

        self._cleanup_old_attempts(key, now)

        if len(self.failed_attempts[key]) >= self.max_attempts:
            self.lockouts[key] = now + self.lockout_seconds
            self.failed_attempts[key].clear()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum login attempts exceeded ({self.max_attempts} attempts). Locked out for {self.lockout_seconds} seconds.",
                headers={"Retry-After": str(self.lockout_seconds)}
            )

    def record_failed_attempt(self, key: str) -> None:
        """Records a failed authentication attempt."""
        now = time.time()
        self.failed_attempts[key].append(now)
        self.check_rate_limit(key)

    def reset(self, key: str) -> None:
        """Resets failed attempt counters on successful login."""
        self.failed_attempts.pop(key, None)
        self.lockouts.pop(key, None)

    def reset_all(self) -> None:
        """Resets all tracking state (used in testing and maintenance)."""
        self.failed_attempts.clear()
        self.lockouts.clear()

class ApiRateLimiter:
    """
    Sliding window rate limiter for general API traffic and sensitive endpoints.
    Protects against DoS, automated scraping, and bulk export abuse.
    """
    def __init__(self, max_requests: int = 150, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        
        if len(self.requests[key]) >= self.max_requests:
            remaining = int(self.window_seconds - (now - self.requests[key][0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"API rate limit exceeded ({self.max_requests} requests per {self.window_seconds}s). Please slow down.",
                headers={"Retry-After": str(max(remaining, 1))}
            )
        self.requests[key].append(now)

    def reset_all(self) -> None:
        self.requests.clear()

# Global singletons
login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60, lockout_seconds=60)
global_api_rate_limiter = ApiRateLimiter(max_requests=250, window_seconds=60)
sensitive_export_rate_limiter = ApiRateLimiter(max_requests=30, window_seconds=60)
