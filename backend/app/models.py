import re
from datetime import datetime, timezone

from pydantic import BaseModel, field_validator
from sqlmodel import Field, SQLModel

from .config import settings


class Score(SQLModel, table=True):
    __tablename__ = "scores"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=settings.MAX_USERNAME_LENGTH, index=True)
    score: int = Field(ge=0, le=settings.MAX_SCORE)
    level_reached: int = Field(ge=1, le=settings.MAX_LEVEL)
    time_played_seconds: float = Field(ge=settings.MIN_GAME_DURATION)
    ip_address: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]+$")


class ScoreSubmission(BaseModel):
    username: str
    score: int
    level_reached: int
    time_played_seconds: float

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not 1 <= len(v) <= settings.MAX_USERNAME_LENGTH:
            raise ValueError(f"Username must be 1-{settings.MAX_USERNAME_LENGTH} characters")
        if not USERNAME_PATTERN.match(v):
            raise ValueError("Username must contain only letters, numbers, and underscores")
        return v

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: int) -> int:
        if not 0 <= v <= settings.MAX_SCORE:
            raise ValueError(f"Score must be between 0 and {settings.MAX_SCORE}")
        return v

    @field_validator("level_reached")
    @classmethod
    def validate_level(cls, v: int) -> int:
        if not 1 <= v <= settings.MAX_LEVEL:
            raise ValueError(f"Level must be between 1 and {settings.MAX_LEVEL}")
        return v

    @field_validator("time_played_seconds")
    @classmethod
    def validate_duration(cls, v: float) -> float:
        if v < settings.MIN_GAME_DURATION:
            raise ValueError(f"Game duration must be at least {settings.MIN_GAME_DURATION} seconds")
        return v


class ScoreResponse(BaseModel):
    id: int
    username: str
    score: int
    level_reached: int
    time_played_seconds: float
    created_at: datetime

    model_config = {"from_attributes": True}
