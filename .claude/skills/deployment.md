# Deployment — Hetzner VPS + Traefik + GitHub Actions

> This skill documents the deployment pattern used across all of the user's projects on their Hetzner VPS.
> Reference repos: `traefik_vps_infra`, `enricd_dot_com`, `erni_llm_prompt_challenge`.

## Architecture Overview

```
Developer pushes to main
  → GitHub Actions triggers
  → Job 1: Build Docker image → push to GHCR
  → Job 2: SCP compose.yml to VPS → SSH pull & restart
  → Traefik auto-discovers container via Docker labels
  → Automatic HTTPS via Let's Encrypt
  → pacman.enricd.com serves the game
```

---

## Traefik Setup (on VPS)

Traefik runs as a separate project (`docker compose -p traefik`) from `traefik_vps_infra/compose.traefik.yml`.

**Key config:**
- Docker provider: reads labels from running containers
- `exposedbydefault=false` — only containers with `traefik.enable=true` are routed
- Network: `traefik-public` (external, pre-created on VPS)
- Entrypoints: `http` (:80), `https` (:443)
- Cert resolver: `le` (Let's Encrypt TLS challenge)
- Middleware: `https-redirect` (HTTP→HTTPS)

**Prerequisites on VPS:**
```bash
docker network create traefik-public
# Traefik must be running: docker compose -p traefik -f compose.traefik.yml up -d
```

---

## Docker Labels Pattern

Every service needs these labels in `compose.yml`:

```yaml
labels:
  - traefik.enable=true
  - traefik.docker.network=traefik-public

  # Backend service port
  - traefik.http.services.${STACK_NAME}-web.loadbalancer.server.port=80

  # HTTP router (redirect to HTTPS)
  - traefik.http.routers.${STACK_NAME}-web-http.rule=Host(`${APP_DOMAIN}`)
  - traefik.http.routers.${STACK_NAME}-web-http.entrypoints=http
  - traefik.http.routers.${STACK_NAME}-web-http.middlewares=https-redirect

  # HTTPS router (TLS via Let's Encrypt)
  - traefik.http.routers.${STACK_NAME}-web-https.rule=Host(`${APP_DOMAIN}`)
  - traefik.http.routers.${STACK_NAME}-web-https.entrypoints=https
  - traefik.http.routers.${STACK_NAME}-web-https.tls=true
  - traefik.http.routers.${STACK_NAME}-web-https.tls.certresolver=le
```

**Naming conventions:**
- Service name: `${STACK_NAME}-web` (or `${STACK_NAME}-api` for APIs)
- HTTP router: `${STACK_NAME}-web-http`
- HTTPS router: `${STACK_NAME}-web-https`
- Entrypoints: `http` and `https` (not `web`/`websecure`)
- Cert resolver: `le` (not `letsencrypt`)

---

## compose.yml (Production)

```yaml
services:
  web:
    image: ghcr.io/${GITHUB_REPOSITORY}:${TAG:-latest}
    restart: always
    labels:
      # ... Traefik labels (see above)
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

**Key details:**
- Image from GHCR (built by GitHub Actions)
- `restart: always` for production
- External `traefik-public` network
- No port mapping (Traefik handles routing)

---

## compose.override.yml (Local Dev)

```yaml
services:
  proxy:
    image: traefik:v3.6
    restart: "no"
    ports:
      - "80:80"
      - "8090:8080"   # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --accesslog=true
      - --log=true
      - --log.level=DEBUG
      - --api=true
      - --api.insecure=true
    labels:
      - traefik.enable=true
      - traefik.http.middlewares.https-redirect.contenttype.autodetect=false
    networks:
      - traefik-public

  web:
    build: .
    restart: "no"
    ports:
      - "3000:80"
    labels: []

networks:
  traefik-public:
    external: false
```

**Key details:**
- Includes local Traefik instance with dashboard at `:8090`
- Builds from Dockerfile locally
- Overrides labels to empty (no Traefik routing needed locally)
- Network is NOT external (created by compose)
- Direct port access on `:3000`

---

## Dockerfile (Multi-Stage for SPA)

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Key details:**
- Build stage: Node.js compiles TypeScript + Vite bundles → `dist/`
- Final stage: Only nginx + static files (~40MB total)
- No Node.js in production image
- `npm ci` for deterministic installs from lockfile

---

## nginx.conf (SPA)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "0" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml;

    # SPA fallback (critical for client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed assets forever (content hash = cache bust)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html (entry point references hashed assets)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

---

## GitHub Actions Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Copy compose file
        uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: compose.yml
          target: ${{ secrets.WORK_DIR }}
      - name: Deploy app
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ${{ secrets.WORK_DIR }}
            docker compose -p ${{ secrets.PROJECT_NAME }} -f compose.yml pull
            docker compose -p ${{ secrets.PROJECT_NAME }} -f compose.yml up -d --remove-orphans
            docker image prune -f
```

**Key details:**
- `docker/setup-buildx-action@v3` — enables BuildKit features (required for GHA cache)
- GHA cache (`cache-from/to: type=gha`) — faster rebuilds. `mode=max` exports ALL layers (not just final stage), maximizing cache hits for multi-stage builds. 10GB limit per repo.
- `context: .` requires `actions/checkout@v4` first (without it, BuildKit fetches repo directly via git context)
- `-p $PROJECT_NAME` — isolates containers in their own project namespace
- `docker image prune -f` — clean up old images
- Only copies `compose.yml` (not .env — .env is managed on VPS)
- `appleboy/scp-action@v1` and `appleboy/ssh-action@v1` (latest stable)

**Required GitHub Secrets:**

| Secret | Purpose | Example |
|--------|---------|---------|
| `SSH_HOST` | VPS IP/hostname | `65.21.x.x` |
| `SSH_USER` | SSH username | `deploy` |
| `SSH_PRIVATE_KEY` | SSH private key | (ed25519 key) |
| `WORK_DIR` | Base directory on VPS | `/opt/app/pacman` |
| `PROJECT_NAME` | Docker compose project name | `pacman` |
| `GITHUB_TOKEN` | Auto-provided by GitHub | (automatic) |

---

## .env.example

```bash
# =============================================================================
# Local Development
# =============================================================================
STACK_NAME=pacman
APP_DOMAIN=localhost
GITHUB_REPOSITORY=enricd/pac-man-web-ai-generated

# =============================================================================
# Production (VPS .env — do not commit)
# =============================================================================
# STACK_NAME=pacman
# APP_DOMAIN=pacman.enricd.com
# GITHUB_REPOSITORY=enricd/pac-man-web-ai-generated
# TAG=latest
```

**Key rule:** `.env` is gitignored. On VPS, copy `.env.example` to `.env` and uncomment production values. CI/CD never overwrites `.env`.

---

## VPS Setup Checklist (one-time)

1. Create deploy user with Docker access
2. `docker network create traefik-public` (if not exists)
3. `docker login ghcr.io` (authenticate to GHCR)
4. Create project directory: `mkdir -p /opt/app/pacman`
5. Create `.env` from `.env.example` with production values
6. Ensure Traefik is running (`docker compose -p traefik` from `traefik_vps_infra`)
7. Set GitHub Secrets in the repo settings
