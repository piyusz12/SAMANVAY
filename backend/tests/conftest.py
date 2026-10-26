import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.config import settings
settings.APP_ENV = "testing"

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.services.seed_service import seed_database
from backend.app.services.auth_service import create_access_token
from backend.app.models.user import User

# In-memory SQLite for high-speed isolated automated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_test_db():
    """Provides a fresh, fully isolated database seeded with synthetic demo data for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db, force=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(db_session):
    user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def officer_token(db_session):
    user = db_session.query(User).filter(User.role == "CASE_OFFICER").first()
    return create_access_token(subject=user.id)
