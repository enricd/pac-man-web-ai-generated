# 11 — Deployment: Docker, nginx, Traefik, and CI/CD

> **Goal**: Understand how a frontend SPA gets from source code to a live URL, using tools you likely already know from backend work — but with frontend-specific twists.

---

## The Deployment Pipeline

```
Developer pushes to main
  ↓
GitHub Actions triggers
  ↓
Build stage: npm ci → npm run build → dist/ folder (static files)
  ↓
Docker image: nginx:alpine serves dist/
  ↓
Push to GHCR (GitHub Container Registry)
  ↓
SSH to Hetzner VPS → docker compose pull → docker compose up
  ↓
Traefik reverse proxy → HTTPS → pacman.enricd.com
```

This is identical to deploying a FastAPI app, except the "app" is just static files served by nginx.

---

## The Build Output

`npm run build` produces:

```
dist/
├── index.html          ← 0.5 KB, references the JS bundle
└── assets/
    └── index-CloYrQ2V.js  ← ~1 MB, ALL code + Three.js + React
```

That's it. The entire game is **two files**. No server runtime, no Python interpreter, no Node.js process — just files that any HTTP server can serve.

```python
# Conceptual Python equivalent:
# It's like pyinstaller bundling everything into a single binary,
# except the "binary" is JavaScript that runs in the browser.
```

The hash in the filename (`CloYrQ2V`) is a **content hash** — if the code changes, the hash changes, and browsers fetch the new version. If nothing changed, browsers use their cache. This is called **cache busting**.

---

## Docker Multi-Stage Build

```dockerfile
# Stage 1: Build the app (large image, has Node.js)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                  # Install deps (deterministic, from lockfile)
COPY . .
RUN npm run build           # TypeScript check + Vite bundle → dist/

# Stage 2: Serve the app (tiny image, just nginx)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Why multi-stage?

| Stage | Image Size | Contents |
|-------|-----------|----------|
| `node:22-alpine` (build) | ~180 MB | Node.js, npm, all devDependencies, source code |
| `nginx:alpine` (final) | ~40 MB | nginx + our dist/ (~1 MB of static files) |

The final image has **no Node.js**, no source code, no `node_modules`. Just nginx serving static files. This is equivalent to building a Go binary in a build stage and copying just the binary to a scratch image.

```python
# Python equivalent of multi-stage:
# Stage 1: pip install -r requirements.txt → build wheel
# Stage 2: python:slim + just the wheel (no compiler, no dev deps)
```

### npm ci vs npm install

`npm ci`:
- Deletes `node_modules/` first (clean slate)
- Installs **exactly** what's in `package-lock.json` (no resolution)
- Fails if `package-lock.json` doesn't match `package.json`
- Faster and deterministic — ideal for CI/Docker

Like `pip install --no-deps -r requirements.txt` with a pinned lockfile.

---

## nginx Configuration

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — the critical part
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively (they have content hashes)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html (it references the latest hashed assets)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### The SPA fallback (`try_files`)

This is the most important line for a Single Page Application:

```nginx
try_files $uri $uri/ /index.html;
```

It means:
1. Try to serve the exact file requested (`$uri`)
2. Try it as a directory (`$uri/`)
3. If neither exists, serve `index.html`

**Why?** In an SPA, there's only one HTML file. The JavaScript handles routing client-side. If a user navigates to `pacman.enricd.com/game` and refreshes, nginx would return 404 (there's no `/game` file). The fallback serves `index.html`, which loads the JS, which renders the correct page.

```python
# FastAPI equivalent — a catch-all route:
@app.get("/{path:path}")
async def spa_fallback(path: str):
    return FileResponse("dist/index.html")
```

### Cache strategy

- **Hashed assets** (`index-CloYrQ2V.js`): Cache forever (`1 year`). The hash guarantees uniqueness — if the content changes, the filename changes.
- **index.html**: Never cache. It's the entry point that references the hashed assets. Must always be fresh so users get the latest version.

This is a standard SPA caching pattern. No equivalent concern in backend apps (where the server always runs the latest code).

---

## compose.yml — Production

```yaml
services:
  web:
    image: ghcr.io/${GITHUB_REPOSITORY}:${TAG:-latest}
    restart: unless-stopped
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pacman.rule=Host(`${APP_DOMAIN}`)"
      - "traefik.http.routers.pacman.entrypoints=websecure"
      - "traefik.http.routers.pacman.tls.certresolver=letsencrypt"
      - "traefik.http.services.pacman.loadbalancer.server.port=80"

networks:
  traefik-public:
    external: true
```

If you've deployed with Traefik before, this is standard:
- Container joins the `traefik-public` network
- Traefik reads the labels to configure routing
- `Host(pacman.enricd.com)` → route to this container's port 80
- `websecure` + `letsencrypt` → automatic HTTPS certificate

### compose.override.yml — Local dev

```yaml
services:
  web:
    build: .
    ports:
      - "3000:80"
    networks: []
    labels: []
```

Overrides production config for local use: builds from Dockerfile instead of pulling an image, exposes port 3000, no Traefik.

```bash
# Local:
docker compose up --build    # Builds + runs on localhost:3000

# Production (on VPS):
docker compose up -d         # Pulls image from GHCR, uses Traefik labels
```

---

## GitHub Actions — CI/CD

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: |
            ghcr.io/${{ env.IMAGE_NAME }}:latest
            ghcr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy:
    needs: build-and-push
    steps:
      - name: SCP compose file to server
        uses: appleboy/scp-action@v0.1.7
        # Copies compose.yml to VPS
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          script: |
            cd ${{ secrets.WORK_DIR }}/${{ secrets.PROJECT_NAME }}
            docker compose pull
            docker compose up -d --remove-orphans
```

Two jobs:
1. **build-and-push**: Build Docker image, push to GitHub Container Registry
2. **deploy**: SSH to VPS, pull new image, restart container

### Required secrets

| Secret | Purpose |
|--------|---------|
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH username |
| `SSH_PRIVATE_KEY` | SSH key for authentication |
| `WORK_DIR` | Base directory on VPS (e.g., `/opt/apps`) |
| `PROJECT_NAME` | Directory name (e.g., `pacman`) |
| `GITHUB_TOKEN` | Auto-provided, for GHCR access |

---

## Environment Variables

```bash
# .env.example
STACK_NAME=pacman
APP_DOMAIN=pacman.enricd.com
GITHUB_REPOSITORY=enricd/pac-man-web-ai-generated
TAG=latest
```

On the VPS, copy `.env.example` to `.env` and docker compose reads it. This pattern keeps secrets out of version control and lets the same compose.yml work across environments.

```python
# Python equivalent — same pattern
# .env.example → .env (gitignored)
# FastAPI: from dotenv import load_dotenv; load_dotenv()
```

---

## Frontend vs Backend Deployment: Key Differences

| Aspect | Backend (FastAPI) | Frontend (React SPA) |
|--------|-------------------|---------------------|
| Runtime | Python process running continuously | No process — just static files |
| Server | Uvicorn/Gunicorn | nginx (just serves files) |
| CPU usage | Handles requests, runs logic | Zero (browser does all the work) |
| Scaling | More replicas = more capacity | CDN caching = essentially infinite |
| Startup | Seconds (Python interpreter) | Instant (nginx reads files) |
| Memory | Depends on app | ~10 MB (nginx overhead only) |
| Updates | Restart process | Replace files, nginx serves new ones |

The frontend is the easiest thing to deploy — it's just files. The complexity is in the build step (TypeScript + bundling), not in serving.

---

## Local Development Workflow

```bash
# Day-to-day development (no Docker):
npm run dev              # Vite dev server with HMR on localhost:5173

# Test production build locally:
npm run build            # Build to dist/
npm run preview          # Serve dist/ on localhost:4173

# Test Docker build locally:
docker compose up --build  # Build + serve on localhost:3000

# Deploy:
git push origin main     # Triggers GitHub Actions → VPS
```

---

## Try It Yourself

1. **Build and inspect**: Run `npm run build`, then `ls -la dist/`. Note the file sizes. The entire game is ~1 MB.

2. **Test the Docker build**: `docker compose up --build`. Open `localhost:3000`. This is exactly what production serves.

3. **Check nginx**: Inside the container, `docker compose exec web cat /etc/nginx/conf.d/default.conf` to see the nginx config.

4. **Break the SPA fallback**: Remove the `try_files` line from `nginx.conf`, rebuild. Navigate to any URL other than `/` and see the 404. Then add it back.

---

## Summary

The full path from code to live game:

```
Edit code → npm run dev (instant feedback)
         → git push
         → GitHub Actions builds Docker image
         → Image pushed to GHCR
         → VPS pulls image, restarts container
         → Traefik routes pacman.enricd.com → nginx → dist/index.html
         → Browser loads JS → React renders 3D game
```

All automated. Push to main = deploy to production.
