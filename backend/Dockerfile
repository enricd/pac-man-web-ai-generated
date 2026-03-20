FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# Install dependencies first (layer cache)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

# Copy app code and install project
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

ENV PATH="/app/.venv/bin:$PATH"
ENTRYPOINT []

EXPOSE 8000
CMD ["fastapi", "run", "--host", "0.0.0.0", "--proxy-headers", "app/main.py"]
