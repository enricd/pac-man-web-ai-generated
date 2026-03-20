"""Tests for Pydantic validation models (independent of API endpoints)."""

import pytest
from pydantic import ValidationError

from app.models import ScoreSubmission


# --- ScoreSubmission validation ---


def test_valid_submission():
    s = ScoreSubmission(
        username="player1",
        score=5000,
        level_reached=3,
        time_played_seconds=120.0,
    )
    assert s.username == "player1"
    assert s.score == 5000


def test_username_stripped():
    """Leading/trailing whitespace is stripped."""
    s = ScoreSubmission(
        username="  player1  ",
        score=5000,
        level_reached=3,
        time_played_seconds=120.0,
    )
    assert s.username == "player1"


def test_username_empty_after_strip():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="   ",
            score=5000,
            level_reached=3,
            time_played_seconds=120.0,
        )


def test_username_with_unicode():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="plàyér",
            score=5000,
            level_reached=3,
            time_played_seconds=120.0,
        )


def test_username_with_emoji():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="player🎮",
            score=5000,
            level_reached=3,
            time_played_seconds=120.0,
        )


def test_score_boundary_zero():
    s = ScoreSubmission(
        username="player",
        score=0,
        level_reached=1,
        time_played_seconds=60.0,
    )
    assert s.score == 0


def test_score_boundary_max():
    s = ScoreSubmission(
        username="player",
        score=600_000,
        level_reached=1,
        time_played_seconds=60.0,
    )
    assert s.score == 600_000


def test_score_over_max():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="player",
            score=600_001,
            level_reached=1,
            time_played_seconds=60.0,
        )


def test_duration_exactly_at_minimum():
    s = ScoreSubmission(
        username="player",
        score=100,
        level_reached=1,
        time_played_seconds=60.0,
    )
    assert s.time_played_seconds == 60.0


def test_duration_just_below_minimum():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="player",
            score=100,
            level_reached=1,
            time_played_seconds=59.99,
        )


def test_level_boundaries():
    for level in [1, 5, 10]:
        s = ScoreSubmission(
            username="player",
            score=100,
            level_reached=level,
            time_played_seconds=60.0,
        )
        assert s.level_reached == level


def test_level_zero_invalid():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="player",
            score=100,
            level_reached=0,
            time_played_seconds=60.0,
        )


def test_level_eleven_invalid():
    with pytest.raises(ValidationError):
        ScoreSubmission(
            username="player",
            score=100,
            level_reached=11,
            time_played_seconds=60.0,
        )
