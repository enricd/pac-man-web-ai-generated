from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///data/leaderboard.db"
    MAX_SCORE: int = 600_000
    MIN_GAME_DURATION: float = 60.0
    MAX_LEVEL: int = 10
    MAX_USERNAME_LENGTH: int = 16
    LEADERBOARD_DEFAULT_SIZE: int = 20
    RATE_LIMIT_SUBMISSIONS: str = "5/hour"

    model_config = {"env_prefix": ""}


settings = Settings()
