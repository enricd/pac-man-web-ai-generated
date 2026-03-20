"""Tests for POST /api/scores — score submission endpoint."""

import pytest
from fastapi.testclient import TestClient

from .conftest import valid_score_payload


# --- Happy path ---


def test_submit_valid_score(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload())
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "test_user"
    assert data["score"] == 5000
    assert data["level_reached"] == 3
    assert data["time_played_seconds"] == 120.0
    assert data["id"] is not None
    assert "created_at" in data


def test_submit_score_minimum_valid_values(client: TestClient):
    """Edge case: all fields at their minimum valid values."""
    response = client.post("/api/scores", json=valid_score_payload(
        username="a",
        score=0,
        level_reached=1,
        time_played_seconds=60.0,
    ))
    assert response.status_code == 201


def test_submit_score_maximum_valid_values(client: TestClient):
    """Edge case: all fields at their maximum valid values."""
    response = client.post("/api/scores", json=valid_score_payload(
        username="a" * 16,
        score=600_000,
        level_reached=10,
        time_played_seconds=99999.0,
    ))
    assert response.status_code == 201


def test_submit_score_underscore_username(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(
        username="cool_player_1",
    ))
    assert response.status_code == 201
    assert response.json()["username"] == "cool_player_1"


def test_submit_multiple_scores(client: TestClient):
    """Multiple submissions are allowed (different entries)."""
    for i in range(3):
        response = client.post("/api/scores", json=valid_score_payload(score=1000 * (i + 1)))
        assert response.status_code == 201
    # Verify all 3 exist
    lb = client.get("/api/leaderboard")
    assert len(lb.json()) == 3


# --- Username validation ---


def test_reject_empty_username(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(username=""))
    assert response.status_code == 422


def test_reject_whitespace_only_username(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(username="   "))
    assert response.status_code == 422


def test_reject_special_chars_in_username(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(username="bad!user"))
    assert response.status_code == 422


def test_reject_spaces_in_username(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(username="bad user"))
    assert response.status_code == 422


def test_reject_username_too_long(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(username="a" * 17))
    assert response.status_code == 422


@pytest.mark.parametrize("char", ["@", "#", "$", "%", "!", "-", ".", " ", "/", "<", ">"])
def test_reject_various_special_chars(client: TestClient, char: str):
    response = client.post("/api/scores", json=valid_score_payload(username=f"user{char}name"))
    assert response.status_code == 422


# --- Score validation ---


def test_reject_negative_score(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(score=-1))
    assert response.status_code == 422


def test_reject_score_exceeding_max(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(score=600_001))
    assert response.status_code == 422


# --- Level validation ---


def test_reject_level_zero(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(level_reached=0))
    assert response.status_code == 422


def test_reject_level_exceeding_max(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(level_reached=11))
    assert response.status_code == 422


# --- Duration validation ---


def test_reject_duration_too_short(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(time_played_seconds=59.9))
    assert response.status_code == 422


def test_reject_zero_duration(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(time_played_seconds=0))
    assert response.status_code == 422


def test_reject_negative_duration(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(time_played_seconds=-10))
    assert response.status_code == 422


# --- Missing fields ---


def test_reject_missing_username(client: TestClient):
    payload = valid_score_payload()
    del payload["username"]
    response = client.post("/api/scores", json=payload)
    assert response.status_code == 422


def test_reject_missing_score(client: TestClient):
    payload = valid_score_payload()
    del payload["score"]
    response = client.post("/api/scores", json=payload)
    assert response.status_code == 422


def test_reject_missing_level(client: TestClient):
    payload = valid_score_payload()
    del payload["level_reached"]
    response = client.post("/api/scores", json=payload)
    assert response.status_code == 422


def test_reject_missing_duration(client: TestClient):
    payload = valid_score_payload()
    del payload["time_played_seconds"]
    response = client.post("/api/scores", json=payload)
    assert response.status_code == 422


# --- Type validation ---


def test_reject_string_score(client: TestClient):
    response = client.post("/api/scores", json=valid_score_payload(score="not_a_number"))
    assert response.status_code == 422


def test_reject_empty_body(client: TestClient):
    response = client.post("/api/scores", json={})
    assert response.status_code == 422


def test_reject_no_body(client: TestClient):
    response = client.post("/api/scores")
    assert response.status_code == 422
