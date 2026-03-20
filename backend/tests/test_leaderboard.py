"""Tests for GET /api/leaderboard — leaderboard retrieval endpoint."""

from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Score

from .conftest import valid_score_payload


def _seed_scores(client: TestClient, scores: list[tuple[str, int, int]]):
    """Helper: submit multiple scores as (username, score, level)."""
    for username, score, level in scores:
        client.post("/api/scores", json=valid_score_payload(
            username=username, score=score, level_reached=level,
        ))


def test_empty_leaderboard(client: TestClient):
    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    assert response.json() == []


def test_leaderboard_returns_scores(client: TestClient):
    _seed_scores(client, [
        ("alice", 3000, 2),
        ("bob", 5000, 4),
    ])
    response = client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_leaderboard_sorted_by_score_descending(client: TestClient):
    _seed_scores(client, [
        ("low", 1000, 1),
        ("high", 9000, 5),
        ("mid", 5000, 3),
    ])
    response = client.get("/api/leaderboard")
    data = response.json()
    scores = [entry["score"] for entry in data]
    assert scores == [9000, 5000, 1000]


def test_leaderboard_tiebreaker_by_created_at(client: TestClient, session: Session):
    """Same score → earlier submission ranks higher. Uses direct DB inserts for precise timestamps."""
    now = datetime.now(timezone.utc)
    earlier = Score(
        username="first", score=5000, level_reached=3,
        time_played_seconds=120.0, ip_address="127.0.0.1",
        created_at=now - timedelta(minutes=5),
    )
    later = Score(
        username="second", score=5000, level_reached=3,
        time_played_seconds=120.0, ip_address="127.0.0.1",
        created_at=now,
    )
    session.add(earlier)
    session.add(later)
    session.commit()

    response = client.get("/api/leaderboard")
    data = response.json()
    assert data[0]["username"] == "first"
    assert data[1]["username"] == "second"


def test_leaderboard_default_limit(client: TestClient):
    """Default limit is 20."""
    _seed_scores(client, [(f"user{i}", i * 100, 1) for i in range(25)])
    response = client.get("/api/leaderboard")
    data = response.json()
    assert len(data) == 20


def test_leaderboard_custom_limit(client: TestClient):
    _seed_scores(client, [(f"user{i}", i * 100, 1) for i in range(10)])
    response = client.get("/api/leaderboard?limit=5")
    data = response.json()
    assert len(data) == 5


def test_leaderboard_limit_max_100(client: TestClient):
    response = client.get("/api/leaderboard?limit=101")
    assert response.status_code == 422


def test_leaderboard_limit_min_1(client: TestClient):
    response = client.get("/api/leaderboard?limit=0")
    assert response.status_code == 422


def test_leaderboard_limit_negative(client: TestClient):
    response = client.get("/api/leaderboard?limit=-5")
    assert response.status_code == 422


def test_leaderboard_response_shape(client: TestClient):
    """Verify each entry has all expected fields."""
    _seed_scores(client, [("alice", 5000, 3)])
    response = client.get("/api/leaderboard")
    entry = response.json()[0]
    assert set(entry.keys()) == {"id", "username", "score", "level_reached", "time_played_seconds", "created_at"}


def test_leaderboard_excludes_ip_address(client: TestClient):
    """IP address should NOT be exposed in the response."""
    _seed_scores(client, [("alice", 5000, 3)])
    response = client.get("/api/leaderboard")
    entry = response.json()[0]
    assert "ip_address" not in entry


def test_leaderboard_only_top_scores_returned(client: TestClient):
    """With limit=3, only the top 3 scores are returned."""
    _seed_scores(client, [
        ("a", 1000, 1),
        ("b", 2000, 1),
        ("c", 3000, 1),
        ("d", 4000, 1),
        ("e", 5000, 1),
    ])
    response = client.get("/api/leaderboard?limit=3")
    data = response.json()
    assert len(data) == 3
    assert data[0]["score"] == 5000
    assert data[1]["score"] == 4000
    assert data[2]["score"] == 3000
