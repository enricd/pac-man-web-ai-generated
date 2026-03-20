# 12 — Leaderboard Backend & Frontend Integration

> **What you'll learn**: localStorage, the Fetch API, async/await in JavaScript, useEffect for data fetching, FastAPI basics, reverse proxy path routing, rate limiting, and anti-cheat trust boundaries.

---

## Overview

Until now, the game was a pure client-side SPA — scores vanished on page refresh. This chapter adds:

1. A **FastAPI + SQLite backend** (`backend/`) serving a leaderboard API
2. A **frontend API client** (`src/api/leaderboard.ts`) using `fetch()`
3. **Username input** with `localStorage` persistence
4. **Leaderboard UI** on both Start Screen and Game Over Screen
5. **Deployment** with path-based routing via Traefik

---

## Concepts

### localStorage — A Persistent Dict in the Browser

**Python parallel**: Imagine a `dict` that survives process restarts, saved to a file automatically.

```typescript
// Save
localStorage.setItem('pacman_username', 'Enric');

// Load
const name = localStorage.getItem('pacman_username'); // 'Enric' or null

// Remove
localStorage.removeItem('pacman_username');
```

**Key facts:**
- Stores strings only (use `JSON.stringify`/`JSON.parse` for objects)
- Per-origin (same domain + port) — no cross-site access
- Persists across tabs, page reloads, browser restarts
- ~5MB limit per origin
- Synchronous API (unlike cookies, no server-side access)

**In this project**: `src/ui/StartScreen.tsx` reads/writes the username:
```typescript
// On mount
const saved = localStorage.getItem('pacman_username');

// On change
localStorage.setItem('pacman_username', cleaned);
```

### The Fetch API — Python's `requests` for the Browser

**Python parallel**: `requests.get()` / `requests.post()`, but built into the browser.

```typescript
// GET
const res = await fetch('/api/leaderboard?limit=20');
const data = await res.json(); // like res.json() in Python requests

// POST
const res = await fetch('/api/scores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'Enric', score: 5000 }),
});
```

**Key differences from Python `requests`:**
- `fetch` does NOT throw on HTTP errors (4xx, 5xx) — check `res.ok`
- Returns a `Promise` (like Python's `asyncio.Future`)
- `res.json()` is also async (returns a Promise)
- No need for a library — it's built into every browser

**In this project**: `src/api/leaderboard.ts` wraps fetch in two functions:
```typescript
export async function submitScore(submission: ScoreSubmission): Promise<ScoreResponse | null> {
  try {
    const res = await fetch('/api/scores', { ... });
    if (!res.ok) return null;  // don't crash on errors
    return await res.json();
  } catch {
    return null;  // network errors — never block game flow
  }
}
```

### async/await in JavaScript

**Python parallel**: Identical syntax! JS borrowed it from Python (via C#).

```typescript
// JavaScript                          // Python
async function getData() {             // async def get_data():
  const res = await fetch('/api');     //     res = await httpx.get('/api')
  return await res.json();             //     return res.json()
}
```

**Key difference**: In Python, you need an event loop (`asyncio.run()`). In JavaScript, the event loop is always running — the browser provides it.

### useEffect for Data Fetching

**Python parallel**: Think of `useEffect` like registering a callback that runs after the component renders. The dependency array (`[]`) means "run once on mount" — like Python's `__init__`.

```typescript
useEffect(() => {
  // This runs ONCE when the component mounts (empty dependency array)
  fetchLeaderboard().then(data => {
    setScores(data);      // triggers a re-render with the new data
    setLoading(false);
  });
}, []); // ← empty array = run once
```

**In this project**: Both `StartScreen.tsx` and `GameOverScreen.tsx` fetch the leaderboard on mount.

### FastAPI Basics (for Frontend Devs)

FastAPI is a Python web framework — you already know this! Here's how the leaderboard API is structured:

```
backend/
  app/
    main.py       # FastAPI app, lifespan, exception handlers
    config.py     # Pydantic BaseSettings (env vars → typed config)
    models.py     # SQLModel table + Pydantic request/response schemas
    database.py   # SQLite engine + session dependency
    routes.py     # POST /api/scores, GET /api/leaderboard, GET /api/health
```

**Key patterns used:**

1. **Lifespan** (replaces `@app.on_event("startup")`):
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()  # startup
    yield
    # shutdown cleanup would go here
```

2. **Dependency injection** for database sessions:
```python
def get_session():
    with Session(engine) as session:
        yield session  # FastAPI manages the lifecycle

@router.post("/scores")
def submit_score(session: Session = Depends(get_session)):
    ...
```

3. **SQLModel** — combines SQLAlchemy (DB) + Pydantic (validation):
```python
class Score(SQLModel, table=True):  # ← this is both a DB table AND a Pydantic model
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=16, index=True)
    score: int = Field(ge=0, le=600_000)
```

### Reverse Proxy Path Routing

**How requests reach the right container:**

```
Browser → pacman.enricd.com/api/leaderboard
       → Traefik (reverse proxy)
       → Checks routing rules:
           /api/* → FastAPI container (port 8000)
           /*     → nginx container (port 80, static files)
```

This is configured via Traefik labels in `compose.yml`:
```yaml
# Frontend: everything EXCEPT /api
web:
  labels:
    - traefik.http.routers.pacman-web-https.rule=Host(`pacman.enricd.com`) && !PathPrefix(`/api`)

# Backend: only /api paths
api:
  labels:
    - traefik.http.routers.pacman-api-https.rule=Host(`pacman.enricd.com`) && PathPrefix(`/api`)
```

**Why path-based routing?** Same origin = no CORS needed. The browser sees everything as coming from `pacman.enricd.com`.

### Rate Limiting

Two layers of rate limiting protect the API:

1. **Traefik** (infrastructure level): 100 requests/min average, 50 burst — protects against DoS
2. **SlowAPI** (application level): 5 score submissions/hour per IP — prevents spam

```python
# SlowAPI decorator on the route
@router.post("/scores")
@limiter.limit("5/hour")  # per IP address
def submit_score(request: Request, ...):
    ...
```

### Anti-Cheat: Trust Boundaries

**The fundamental problem**: In a client-side game, the player controls the client. Any "security" measure that relies on the JS bundle is breakable — the attacker can read the source code.

**What we DO:**
- **Max score cap** (600,000) — reject obviously impossible scores
- **Minimum duration** (60 seconds) — reject instant completions
- **Rate limiting** — prevent flooding
- **Input validation** — prevent injection attacks
- **IP logging** — forensics if needed

**What we DON'T do (and why):**
- **HMAC score signing**: The signing key would be in the JS bundle. Anyone can read it. Security theater.
- **Token/nonce systems**: Same problem — the secret is in the client.
- **Game replay validation**: Massive complexity for a fun office game. Not worth it.

**The pragmatic take**: This is a fun office game, not a competitive esports platform. The anti-cheat measures catch casual tampering. Determined cheaters will always win against a client-side game — and that's okay.

---

## Testing the Backend

### Why Test?

**Python parallel**: You already know this — `pytest` is the standard. The only new concept is how FastAPI tests work.

### Test Architecture

```
backend/tests/
  conftest.py          # Shared fixtures (in-memory DB, test client)
  test_health.py       # Health endpoint
  test_submit_score.py # POST /api/scores — all validation paths
  test_leaderboard.py  # GET /api/leaderboard — sorting, limits, shape
  test_models.py       # Pydantic model validation (no HTTP)
  test_rate_limiting.py # SlowAPI rate limiter behavior
```

### Key Pattern: In-Memory SQLite + Dependency Override

The test setup follows the official SQLModel + FastAPI testing pattern:

```python
# conftest.py
@pytest.fixture(name="session")
def session_fixture():
    # In-memory SQLite — fresh DB for every test
    engine = create_engine(
        "sqlite://",  # ← no file, lives in memory
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # ← reuses the same connection
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    # Override the real DB session with our test session
    app.dependency_overrides[get_session] = lambda: session
    limiter.enabled = False  # disable rate limiting for most tests
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    limiter.enabled = True
```

**Why `StaticPool`?** SQLite in-memory databases are per-connection. `StaticPool` ensures the test session and the API endpoint share the same connection (and thus the same database).

**Why disable rate limiting?** Most tests need to submit multiple scores without hitting the 5/hour limit. Rate limiting has its own dedicated test file with a separate fixture.

### What's Tested (65 tests)

| Category | Examples | Count |
|----------|----------|-------|
| **Happy path** | Valid score submission, min/max boundary values | 5 |
| **Username validation** | Empty, whitespace, special chars (`@#$!`), unicode, emoji, too long | 16 |
| **Score validation** | Negative, exceeds max (600,001) | 2 |
| **Level validation** | Zero, exceeds max (11) | 2 |
| **Duration validation** | Zero, negative, below minimum (59.9s) | 3 |
| **Missing fields** | Each required field omitted | 4 |
| **Type errors** | String where number expected, empty body, no body | 3 |
| **Leaderboard** | Empty, sorted, tiebreaker, default/custom limits, bounds, response shape, IP exclusion | 13 |
| **Pydantic models** | Direct model validation without HTTP (boundaries, stripping, unicode) | 13 |
| **Rate limiting** | Allows 5, blocks 6th, doesn't affect GET endpoints | 4 |

### Running Tests

```bash
cd backend

# Run all tests
uv run pytest

# Verbose output (see each test name)
uv run pytest -v

# Run a specific file
uv run pytest tests/test_submit_score.py

# Run a specific test
uv run pytest tests/test_submit_score.py::test_reject_empty_username
```

---

## Files Changed

| File | What changed |
|------|-------------|
| `src/stores/gameStore.ts` | Added `username`, `gameStartTime`, `setUsername()`, score auto-submission on game over |
| `src/hooks/useKeyboard.ts` | Game won't start without a username |
| `src/ui/StartScreen.tsx` | Username input with localStorage, leaderboard display |
| `src/ui/GameOverScreen.tsx` | Leaderboard display with player highlighting |
| `compose.yml` | Added `api` service with Traefik routing |
| `.github/workflows/deploy.yml` | Matrix build for frontend + backend Docker images |

## New Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app with lifespan and rate limit error handler |
| `backend/app/config.py` | Pydantic BaseSettings for all config values |
| `backend/app/models.py` | SQLModel `Score` table + Pydantic request/response schemas |
| `backend/app/database.py` | SQLite engine + session dependency |
| `backend/app/routes.py` | API endpoints: POST /api/scores, GET /api/leaderboard, GET /api/health |
| `backend/pyproject.toml` | Python project config with dependencies |
| `backend/Dockerfile` | uv-based Docker image for the API |
| `src/api/leaderboard.ts` | Frontend API client (submitScore, fetchLeaderboard) |
| `src/ui/Leaderboard.tsx` | Reusable leaderboard table component |
| `backend/tests/conftest.py` | Shared test fixtures (in-memory DB, test client) |
| `backend/tests/test_health.py` | Health endpoint test |
| `backend/tests/test_submit_score.py` | Score submission validation tests (30 tests) |
| `backend/tests/test_leaderboard.py` | Leaderboard retrieval tests (13 tests) |
| `backend/tests/test_models.py` | Pydantic model validation tests (13 tests) |
| `backend/tests/test_rate_limiting.py` | Rate limiting behavior tests (4 tests) |
| `.claude/skills/fastapi-backend.md` | Skill file with verified API references |

---

## Try It Yourself

1. **Test localStorage**: Open browser DevTools → Application → Local Storage → your origin. Set `pacman_username` to something and reload — the input should pre-fill.

2. **Test the API locally**: Start the backend with `cd backend && uv run fastapi dev app/main.py` and visit `http://localhost:8000/docs` — FastAPI's auto-generated Swagger UI lets you try every endpoint.

3. **Test validation**: Try submitting a score with `time_played_seconds: 10` via the Swagger UI — you'll get a 422 with a clear error message.

4. **Break the anti-cheat**: Open DevTools, go to Console, and try `fetch('/api/scores', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username:'hacker', score:500000, level_reached:10, time_played_seconds:61}) })`. It'll work! This is why client-side games can't be fully secured.
