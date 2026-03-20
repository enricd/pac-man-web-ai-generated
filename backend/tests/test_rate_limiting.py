"""Tests for rate limiting on POST /api/scores."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app
from app.routes import limiter

from .conftest import valid_score_payload


@pytest.fixture(name="rate_limited_client")
def rate_limited_client_fixture():
    """Client with rate limiting ENABLED and fresh in-memory DB."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        def get_session_override():
            return session

        app.dependency_overrides[get_session] = get_session_override
        limiter.enabled = True
        limiter.reset()
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()
        limiter.enabled = True


def test_rate_limit_allows_up_to_5(rate_limited_client: TestClient):
    """First 5 submissions should succeed."""
    for i in range(5):
        response = rate_limited_client.post(
            "/api/scores",
            json=valid_score_payload(score=1000 * (i + 1)),
        )
        assert response.status_code == 201, f"Request {i+1} failed with {response.status_code}"


def test_rate_limit_blocks_6th(rate_limited_client: TestClient):
    """6th submission within the hour should be rate limited."""
    for i in range(5):
        rate_limited_client.post(
            "/api/scores",
            json=valid_score_payload(score=1000 * (i + 1)),
        )

    response = rate_limited_client.post(
        "/api/scores",
        json=valid_score_payload(score=6000),
    )
    assert response.status_code == 429
    assert "Too many submissions" in response.json()["detail"]


def test_rate_limit_does_not_affect_leaderboard(rate_limited_client: TestClient):
    """GET /api/leaderboard should not be rate limited."""
    for _ in range(20):
        response = rate_limited_client.get("/api/leaderboard")
        assert response.status_code == 200


def test_rate_limit_does_not_affect_health(rate_limited_client: TestClient):
    """GET /api/health should not be rate limited."""
    for _ in range(20):
        response = rate_limited_client.get("/api/health")
        assert response.status_code == 200
