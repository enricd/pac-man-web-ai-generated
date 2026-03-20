.PHONY: dev dev-backend dev-frontend test build clean

## Run full-stack locally (backend + frontend with proxy)
dev:
	@echo "Starting backend on :8000 and frontend on :5173..."
	@trap 'kill 0' EXIT; \
		cd backend && uv run fastapi dev app/main.py & \
		sleep 2 && npm run dev & \
		wait

## Run only the backend
dev-backend:
	cd backend && uv run fastapi dev app/main.py

## Run only the frontend (needs backend running separately)
dev-frontend:
	npm run dev

## Run backend tests
test:
	cd backend && uv run pytest -v

## Build frontend for production
build:
	npm run build

## Install all dependencies (frontend + backend)
install:
	npm ci
	cd backend && uv sync --dev

## Clean build artifacts and test databases
clean:
	rm -rf dist backend/data/leaderboard.db backend/.pytest_cache backend/__pycache__
