# FastAPI + SQLModel + SlowAPI + Pydantic-Settings + uv

> Backend skill file for the leaderboard API.
> Lookup: `npx ctx7@latest docs /websites/fastapi_tiangolo "<query>"`
> Lookup: `npx ctx7@latest docs /websites/sqlmodel_tiangolo "<query>"`
> Lookup: `npx ctx7@latest docs /laurents/slowapi "<query>"`
> Lookup: `npx ctx7@latest docs /pydantic/pydantic-settings "<query>"`
> Lookup: `npx ctx7@latest docs /llmstxt/astral_sh_uv_llms_txt "<query>"`
> Lookup: `npx ctx7@latest docs /astral-sh/uv-docker-example "<query>"`

## Versions (as of 2026-03-20)
- FastAPI ≥0.115 (use `fastapi[standard]` for uvicorn etc.)
- SQLModel ≥0.0.22
- SlowAPI ≥0.1.9
- pydantic-settings ≥2.7
- uv (latest, Rust-based Python package manager)
- Python 3.12+

---

## FastAPI

### App + Lifespan (recommended over on_startup/on_shutdown)
```python
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # startup
    create_db_and_tables()
    yield
    # shutdown (cleanup here)

app = FastAPI(title="My API", lifespan=lifespan)
```

### POST Endpoint with Response Model
```python
from fastapi import Depends

@app.post("/items/", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate, session: Session = Depends(get_session)):
    ...
```

### GET with Query Params
```python
from fastapi import Query

@app.get("/items/", response_model=list[ItemResponse])
def list_items(limit: int = Query(default=20, ge=1, le=100)):
    ...
```

### Dependencies (Depends)
```python
from fastapi import Depends

def get_session():
    with Session(engine) as session:
        yield session

# Use: session: Session = Depends(get_session)
```

### Exception Handlers
```python
@app.exception_handler(SomeException)
async def handler(request: Request, exc: SomeException) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": "..."})
```

### APIRouter
```python
from fastapi import APIRouter
router = APIRouter(prefix="/api")

@router.get("/health")
def health(): ...

app.include_router(router)
```

---

## SQLModel

### Table Model
```python
from sqlmodel import Field, SQLModel

class Hero(SQLModel, table=True):
    __tablename__ = "heroes"  # optional, defaults to class name lowercase
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, index=True)
    age: int | None = Field(default=None, index=True)
```

### Engine + Session (SQLite)
```python
from sqlmodel import create_engine, Session, SQLModel

engine = create_engine(
    "sqlite:///data/app.db",
    connect_args={"check_same_thread": False},  # required for SQLite + threads
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
```

### Queries
```python
from sqlmodel import select

# Select with ordering and limit
statement = select(Hero).order_by(Hero.age.desc()).limit(10)
results = session.exec(statement).all()

# Insert
session.add(hero)
session.commit()
session.refresh(hero)  # get auto-generated fields like id
```

### Separate Pydantic Schemas (not table models)
Use plain `pydantic.BaseModel` for request/response schemas, not SQLModel table=True.
SQLModel table models double as Pydantic models but response schemas should exclude internal fields.
```python
from pydantic import BaseModel

class HeroCreate(BaseModel):
    name: str
    age: int | None = None

class HeroResponse(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}  # allows ORM → dict conversion
```

### FastAPI Integration Pattern
```python
@app.post("/heroes/", response_model=HeroResponse, status_code=201)
def create_hero(hero: HeroCreate, session: Session = Depends(get_session)):
    db_hero = Hero.model_validate(hero)  # or Hero(**hero.model_dump())
    session.add(db_hero)
    session.commit()
    session.refresh(db_hero)
    return db_hero
```

---

## SlowAPI (Rate Limiting)

### Setup
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### Decorator on Route
**IMPORTANT**: Route decorator MUST be above the limiter decorator.
```python
@app.get("/home")       # ← route decorator first
@limiter.limit("5/minute")  # ← limiter decorator second
async def home(request: Request):  # ← request param required
    return {"msg": "ok"}
```

### Custom Key Function (e.g. X-Forwarded-For)
```python
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

limiter = Limiter(key_func=get_client_ip)
```

### Rate String Format
- `"5/minute"`, `"10/hour"`, `"100/day"`, `"1/second"`
- Multiple: stack decorators `@limiter.limit("10/minute")` + `@limiter.limit("100/hour")`

### With APIRouter
The limiter works the same with APIRouter — just ensure `app.state.limiter = limiter`
is set on the main FastAPI app, and the Request parameter is present.

---

## Pydantic-Settings

### BaseSettings
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///data/app.db"
    MAX_SCORE: int = 600_000
    RATE_LIMIT: str = "5/hour"

    model_config = SettingsConfigDict(env_prefix="")  # no prefix by default

settings = Settings()  # reads from env vars automatically
```

- Fields are populated from environment variables (case-insensitive match)
- `env_prefix` adds a prefix to env var names
- Supports `.env` files via `model_config = SettingsConfigDict(env_file=".env")`
- Nested models: use `env_nested_delimiter="__"` for `FOO__BAR=value`

---

## uv (Python Package Manager)

### Project Setup
```bash
uv init          # creates pyproject.toml
uv add fastapi   # adds dependency
uv lock          # generates uv.lock
uv sync          # installs from lockfile
uv run python app.py  # runs in project venv
uv run fastapi run app/main.py  # runs FastAPI
```

### Key Flags
- `--frozen` — use lockfile without checking if up-to-date
- `--locked` — error if lockfile not up-to-date (CI)
- `--no-dev` — skip dev dependencies

### Dockerfile Pattern (Recommended)
```dockerfile
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# Layer cache: deps first, then app code
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH"
ENTRYPOINT []
CMD ["fastapi", "run", "--host", "0.0.0.0", "app/main.py"]
```

### Multistage (smaller image)
Build in uv image, copy .venv to slim runtime image.

### Simple Alternative (no cache mounts)
```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app/ app/
CMD ["uv", "run", "fastapi", "run", "app/main.py", "--proxy-headers"]
```
