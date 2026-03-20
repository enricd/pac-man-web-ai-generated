from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from sqlmodel import Session, select

from .config import settings
from .database import get_session
from .models import Score, ScoreResponse, ScoreSubmission

router = APIRouter(prefix="/api")


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _key_func(request: Request) -> str:
    return get_client_ip(request)


limiter = Limiter(key_func=_key_func)


@router.post("/scores", response_model=ScoreResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_SUBMISSIONS)
def submit_score(
    request: Request,
    submission: ScoreSubmission,
    session: Session = Depends(get_session),
) -> Score:
    score = Score(
        username=submission.username,
        score=submission.score,
        level_reached=submission.level_reached,
        time_played_seconds=submission.time_played_seconds,
        ip_address=get_client_ip(request),
    )
    session.add(score)
    session.commit()
    session.refresh(score)
    return score


@router.get("/leaderboard", response_model=list[ScoreResponse])
def get_leaderboard(
    limit: int = Query(
        default=settings.LEADERBOARD_DEFAULT_SIZE,
        ge=1,
        le=100,
    ),
    session: Session = Depends(get_session),
) -> list[Score]:
    statement = (
        select(Score)
        .order_by(Score.score.desc(), Score.created_at.asc())
        .limit(limit)
    )
    return list(session.exec(statement).all())


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
