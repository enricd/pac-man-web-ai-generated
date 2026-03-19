# 3D Pac-Man Web Game — Implementation Plan

## Context

Build a 3D Pac-Man web game for a challenge (see `challenge_instructions.md`), going beyond the classic 2D version by rendering the maze as a 3D office building using React Three Fiber. Each level is a floor of the building (10 floors total), connected by an elevator mechanic. The project doubles as a learning exercise for React + TypeScript. Future phase adds multiplayer via FastAPI + WebSockets.

Deployed on Hetzner VPS behind Traefik, following the same CI/CD pattern as `enricd_dot_com` and `erni_llm_prompt_challenge`.

---

## Tech Stack

| Layer | Tool | Version | Why |
|-------|------|---------|-----|
| Build | Vite | 6.x | Fast HMR, zero-config React+TS |
| UI | React + TypeScript | 19.x / 5.7 | Learning target |
| 3D | React Three Fiber + Drei | v9 / v10 | Declarative Three.js in React |
| State | Zustand | v5 | Tiny, R3F-friendly, no context re-renders |
| Serve | nginx:alpine | latest | Matches existing deployment pattern |
| Deploy | Docker + Traefik + GitHub Actions | — | Identical to existing projects |

No backend until Phase 6 (multiplayer). Pure client-side SPA.

---

## Project Structure

```
pac-man-web-ai-generated/
├── CLAUDE.md
├── docs/
│   └── plan.md                    # This file
├── challenge_instructions.md
├── Dockerfile                     # Multi-stage: node build + nginx serve
├── compose.yml                    # Production with Traefik labels
├── compose.override.yml           # Local dev
├── nginx.conf                     # SPA fallback + caching
├── .env.example
├── .github/workflows/deploy.yml
├── .gitignore, .dockerignore
├── index.html
├── package.json
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── vite.config.ts
├── public/
│   └── textures/                  # Wall/floor textures (future)
└── src/
    ├── main.tsx                   # ReactDOM.createRoot
    ├── App.tsx                    # Canvas + UI overlay
    ├── types/
    │   ├── game.ts                # Core type definitions
    │   └── maze.ts                # Maze-related types
    ├── stores/
    │   └── gameStore.ts           # Single Zustand store
    ├── hooks/
    │   ├── useGameLoop.ts         # useFrame game tick
    │   └── useKeyboard.ts         # Arrow key input
    ├── systems/                   # Pure functions (no React/Three.js)
    │   ├── movement.ts            # Grid-based movement logic
    │   ├── collision.ts           # Pellet/ghost collision
    │   ├── ghostAI.ts             # 4 ghost behavior strategies
    │   └── mazeGenerator.ts       # Procedural maze algorithm
    ├── components/
    │   ├── Game.tsx               # Top-level 3D scene orchestrator
    │   ├── maze/
    │   │   ├── Maze.tsx           # Renders maze from grid data
    │   │   ├── Wall.tsx           # Instanced wall segments
    │   │   ├── Floor.tsx          # Floor plane
    │   │   └── GhostHouse.tsx     # Ghost spawn area
    │   ├── characters/
    │   │   ├── PacMan.tsx         # Pac-Man model + chomp animation
    │   │   └── Ghost.tsx          # Ghost model with color variants
    │   ├── items/
    │   │   ├── Pellet.tsx         # Small pellet (instanced)
    │   │   └── PowerPellet.tsx    # Large pulsing pellet
    │   ├── mechanics/
    │   │   ├── Elevator.tsx       # Level transition door
    │   │   └── Teleporter.tsx     # Edge teleport effect
    │   └── camera/
    │       └── GameCamera.tsx     # Camera controller
    ├── ui/                        # HTML overlays (outside Canvas)
    │   ├── HUD.tsx                # Score, lives, level
    │   ├── StartScreen.tsx
    │   ├── GameOverScreen.tsx
    │   └── LevelTransition.tsx
    └── utils/
        ├── constants.ts           # Grid size, speeds, colors
        └── helpers.ts             # gridToWorld conversion
```

---

## Architecture

### Game Loop
- `useFrame` in `Game.tsx` runs every frame (~60fps)
- Calls pure functions from `systems/` with delta for frame-rate independence
- Flow: read input → move Pac-Man → move ghosts → check collisions → update state

### Maze (2D Grid → 3D Walls)
- Recursive backtracking on LEFT HALF, mirror to RIGHT for symmetry
- Fixed ghost house at center, 2+ horizontal corridors for teleport
- Flood-fill validation ensures all paths are reachable
- Grid cell → world unit via `gridToWorld()` helper
- Walls rendered as `InstancedMesh` (one draw call for all ~400 wall segments)

### Movement
- Grid-based: characters occupy integer grid positions
- Smooth interpolation via `lerp` between cells
- Direction changes only at cell centers (buffered input via `nextDirection`)

### Ghost AI (pure 2D logic, 3D is just rendering)
| Ghost | Color | Behavior |
|-------|-------|----------|
| Blinky | Red | Targets Pac-Man's current tile |
| Pinky | Pink | Targets 4 tiles ahead of Pac-Man |
| Inky | Cyan | Flanking (uses Blinky + Pac-Man positions) |
| Clyde | Orange | Chases if far, retreats if close (<8 tiles) |

Modes cycle: Scatter (7s) → Chase (20s) → repeat. Power pellet triggers Frightened mode.

### Camera (Isometric top-down)
- Fixed ~60° angle from above, loosely follows Pac-Man with damping
- Shows enough maze for gameplay while maintaining 3D feel
- No camera toggle needed — isometric only

### Levels / Elevator
- 10 floors (0-9), new maze each odd level
- Even levels: same maze with invisible walls (flash 100ms every 15s)
- Elevator door opens when all pellets eaten, animation plays, next level loads
- Difficulty increases per level (ghost speed +5%, shorter power pellet)

---

## Implementation Phases

### Phase 0: Project Setup — DONE
- [x] `npm create vite@latest . -- --template react-ts`
- [x] Install deps: `@react-three/fiber`, `@react-three/drei`, `zustand`, `three`, `@types/three`
- [x] Basic `App.tsx` with `<Canvas>` + 3D scene
- [x] Deployment files: `Dockerfile`, `compose.yml`, `nginx.conf`, `.github/workflows/deploy.yml`
- [x] `CLAUDE.md` with architecture rules
- [x] `npm run build` passes cleanly

### Phase 1: 3D Maze + Character Movement — DONE
- [x] Types (`types/maze.ts`, `types/game.ts`), constants (`utils/constants.ts`), helpers (`utils/helpers.ts`)
- [x] `systems/mazeGenerator.ts` (recursive backtracking + symmetry + ghost house + teleport corridors + flood-fill validation)
- [x] Maze components: `Wall.tsx` (InstancedMesh), `Floor.tsx`, `GhostHouse.tsx`, `Maze.tsx`
- [x] `PacMan.tsx` (sphere + chomp animation + direction rotation)
- [x] `hooks/useKeyboard.ts` (arrow keys + WASD), `systems/movement.ts` (grid lerp + direction buffering + teleport wrapping)
- [x] Zustand store (`stores/gameStore.ts`) with full game loop
- [x] `GameCamera.tsx` (isometric follow with damping)

### Phase 2: Pellets + Score + Game Mechanics — DONE
- [x] Pellet placement during maze generation (4 power pellets in corners)
- [x] `Pellet.tsx` (InstancedMesh), `PowerPellet.tsx` (pulsing animation)
- [x] `systems/collision.ts` (pellet pickup, power pellet, ghost eat/death)
- [x] `ui/HUD.tsx` (score, lives, floor level)
- [x] Game over detection + spacebar restart
- [x] `StartScreen.tsx`, `GameOverScreen.tsx`

### Phase 3: Ghost AI — DONE
- [x] `Ghost.tsx` (4 color variants, mode-based color changes, capsule geometry)
- [x] `systems/ghostAI.ts` (Blinky/Pinky/Inky/Clyde strategies, scatter/chase/frightened/eaten modes)
- [x] Ghost-Pac-Man collision (lose life vs eat ghost during frightened)
- [x] Ghost house release timing (staggered 0/3/6/9s)
- [x] Ghost house exit logic
- [x] Mode cycling: Scatter (7s) → Chase (20s) → repeat

### Phase 4: Level Progression + Elevator — DONE
- [x] Level transition when all pellets eaten
- [x] `Elevator.tsx` (door opening/spinning animation)
- [x] `LevelTransition.tsx` (floor transition overlay)
- [x] New maze generation per odd level, reuse maze on even levels
- [x] Difficulty scaling: ghost speed +5%/level, power pellet duration decreases
- [x] Max 10 levels, win condition

### Phase 5: Polish — DONE (code written, needs playtesting)
- [x] Invisible wall logic on even levels (walls hidden, flash 100ms every 15s)
- [x] `Teleporter.tsx` (edge glow visual effect)
- [x] Lighting: ambient + directional + Pac-Man point light
- [x] `StartScreen.tsx` with blinking prompt
- [ ] **Playtesting & bug fixes** — verify all mechanics work correctly in-browser
- [ ] Office theme refinement (wall colors/textures per floor)
- [ ] Sound effects (optional)

### Phase 6: Multiplayer (Future — TODO)
- [ ] FastAPI backend with WebSocket endpoint
- [ ] Server-authoritative game state
- [ ] Add API service to `compose.yml`
- [ ] Traefik routes `/ws/*` to FastAPI
- [ ] Multiple Pac-Man players in same maze

---

## Deployment

### Dockerfile (multi-stage)
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
```

### compose.yml
Same pattern as `enricd_dot_com/compose.yml`:
- Image from `ghcr.io/${GITHUB_REPOSITORY}:${TAG}`
- Traefik labels for HTTPS routing on `${APP_DOMAIN}`
- `traefik-public` external network

### GitHub Actions
Same as `enricd_dot_com/.github/workflows/deploy.yml`:
- `build-and-push` job → GHCR
- `deploy` job → SCP compose.yml + SSH pull & up

### .env.example
```
STACK_NAME=pacman
APP_DOMAIN=pacman.enricd.com
GITHUB_REPOSITORY=enricd/pac-man-web-ai-generated
TAG=latest
```

### Required GitHub Secrets
`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `WORK_DIR`, `PROJECT_NAME`

---

## Tutorial Documentation

Each doc teaches the concepts needed for that phase of the game. Written for a backend/Python developer refreshing frontend skills. Uses real code from this project, draws Python parallels, and builds progressively.

| # | Doc | Covers | Status |
|---|-----|--------|--------|
| 01 | `01-project-setup.md` | npm vs pip, package.json, Vite, modules, HMR, project structure | DONE |
| 02 | `02-typescript-fundamentals.md` | TS for Python devs: types, interfaces, generics, `as const`, unions, utility types | DONE |
| 03 | `03-react-fundamentals.md` | Components, JSX, props, useState, useEffect, useRef, hooks rules, re-rendering | DONE |
| 04 | `04-react-three-fiber-basics.md` | 3D concepts, Canvas, meshes, geometries, materials, useFrame, InstancedMesh, lights | DONE |
| 05 | `05-zustand-state-management.md` | Why Zustand, stores, selectors, subscriptions, vs Redux/Context, vs Python patterns | DONE |
| 06 | `06-maze-generation.md` | Recursive backtracking, symmetry, flood-fill, grid→world, the algorithm step by step | DONE |
| 07 | `07-game-loop-and-movement.md` | useFrame, delta time, grid-based movement, lerp, input buffering, frame independence | DONE |
| 08 | `08-ghost-ai.md` | State machines, targeting strategies, BFS, mode cycling, the 4 ghost personalities | DONE |
| 09 | `09-pellets-scoring-collisions.md` | Collision detection, Set-based lookups, scoring, power pellet state, game phases | DONE |
| 10 | `10-level-progression.md` | Level transitions, difficulty scaling, invisible walls, elevator mechanic | DONE |
| 11 | `11-deployment.md` | Docker multi-stage, nginx SPA config, Traefik, GitHub Actions CI/CD, env vars | DONE |

---

## Verification Checklist

- [x] **Phase 0**: `npm run build` passes; dev server starts
- [ ] **Phase 1**: Arrow keys move Pac-Man through a 3D maze; camera follows
- [ ] **Phase 2**: Pellets disappear on contact; score increases in HUD; game over works
- [ ] **Phase 3**: 4 colored ghosts chase with distinct behaviors; power pellet makes them edible
- [ ] **Phase 4**: Completing a level opens elevator; next floor loads with new maze
- [ ] **Phase 5**: Even levels have invisible walls that flash; teleport works at edges
- [ ] **Deployment**: Push to main → GitHub Actions builds & deploys → `pacman.enricd.com` serves the game
