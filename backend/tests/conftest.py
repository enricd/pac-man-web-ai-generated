import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app
from app.routes import limiter


@pytest.fixture(name="session")
def session_fixture():
    """In-memory SQLite database for isolated tests."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """TestClient with overridden DB session and rate limiting disabled."""
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    limiter.enabled = False
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    limiter.enabled = True


def valid_score_payload(**overrides) -> dict:
    """Helper to build a valid score submission payload."""
    base = {
        "username": "test_user",
        "score": 5000,
        "level_reached": 3,
        "time_played_seconds": 120.0,
    }
    base.update(overrides)
    return base
