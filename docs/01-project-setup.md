# 01 — Project Setup: npm, Vite, and the JavaScript Ecosystem

> **Goal**: Understand how a modern JS/TS project is structured, how packages work, and how the dev server gives you instant feedback.

---

## Python Parallel: The Mental Map

If you're coming from Python, here's your Rosetta Stone:

| Python | JavaScript/Node |
|--------|----------------|
| `python` | `node` |
| `pip` / `poetry` | `npm` / `pnpm` / `yarn` |
| `pyproject.toml` / `setup.py` | `package.json` |
| `requirements.txt` / `poetry.lock` | `package-lock.json` |
| `venv/` / `.venv/` | `node_modules/` |
| `python -m module` | `npx module` |
| `uvicorn --reload` | `vite` (dev server with HMR) |
| `pip install requests` | `npm install three` |
| `pip install -D pytest` | `npm install -D eslint` (devDependency) |

The biggest difference: `node_modules/` is **local per project** by default (like a venv that's always active). No activation needed.

---

## package.json — Your pyproject.toml

Open `package.json` in the project root:

```json
{
  "name": "pac-man-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.5.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "three": "^0.183.2",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "vite": "^8.0.0",
    ...
  }
}
```

### Key sections

**`"type": "module"`** — Tells Node to use ES modules (`import`/`export`) instead of the older CommonJS (`require`). This is like Python 3 vs Python 2 for imports.

**`"scripts"`** — Named commands you run with `npm run <name>`. Like Makefile targets or poetry scripts:
- `npm run dev` → starts Vite dev server (like `uvicorn --reload`)
- `npm run build` → type-checks with `tsc`, then bundles with Vite for production
- `npm run lint` → runs ESLint (like `ruff` or `flake8`)

**`"dependencies"`** vs **`"devDependencies"`** — Like the difference between `[project.dependencies]` and `[project.optional-dependencies.dev]` in pyproject.toml. Dependencies ship to production; devDependencies are only needed during development.

**Version ranges**: `^9.5.0` means "9.5.0 or higher, but below 10.0.0". The `^` is the most common range — it allows minor/patch updates but not major ones (which may break things).

---

## npm install — What Actually Happens

When you run `npm install`:

1. Reads `package.json` for desired packages
2. Resolves exact versions (writes `package-lock.json` — like `poetry.lock`)
3. Downloads packages into `node_modules/`
4. `node_modules/` is typically **huge** (ours is ~230 packages). This is normal. Never commit it.

```bash
npm install              # Install everything from package.json
npm install three        # Add a new dependency
npm install -D eslint    # Add a dev dependency
npm ci                   # Clean install from lockfile (for CI/Docker — like pip install -r requirements.txt --no-deps)
```

`npm ci` is used in our `Dockerfile` because it's faster and deterministic — it installs exactly what's in the lockfile, no resolution step.

---

## Vite — The Dev Server and Bundler

**What is it?** Vite (French for "fast") is two things:
1. A **dev server** that serves your code with Hot Module Replacement (HMR)
2. A **bundler** that produces optimized files for production

### Dev Server (HMR)

When you run `npm run dev`, Vite:
- Starts a server at `http://localhost:5173`
- Serves your TypeScript/JSX files directly (no build step!)
- When you save a file, it **hot-replaces** just that module in the browser — no full page reload

This is way faster than anything in the Python world. Save a file → see the change in milliseconds.

### Production Build

`npm run build` creates a `dist/` folder with:
- `index.html` — your single HTML file
- `assets/index-abc123.js` — all your code + dependencies, minified, in one file
- The hash in the filename (`abc123`) enables cache-busting

This is what nginx serves in production.

### vite.config.ts

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Minimal config. The React plugin handles JSX transformation. Vite auto-detects TypeScript.

---

## Project Structure

```
pac-man-web-ai-generated/
├── index.html          ← Entry point (Vite starts here, not main.tsx)
├── package.json        ← Dependencies and scripts
├── tsconfig.json       ← TypeScript config
├── vite.config.ts      ← Vite config
├── src/
│   ├── main.tsx        ← JS entry: creates React root, mounts <App>
│   ├── App.tsx         ← Top-level React component
│   ├── types/          ← TypeScript type definitions
│   ├── stores/         ← Zustand state management
│   ├── hooks/          ← Custom React hooks
│   ├── systems/        ← Pure game logic (no React/Three.js)
│   ├── components/     ← 3D React Three Fiber components
│   ├── ui/             ← 2D HTML overlay components
│   └── utils/          ← Constants and helpers
├── public/             ← Static files (served as-is, not bundled)
└── dist/               ← Production build output (gitignored)
```

### The entry chain

1. **`index.html`** — has `<div id="root">` and `<script src="/src/main.tsx">`
2. **`src/main.tsx`** — calls `createRoot(document.getElementById('root')!).render(<App />)`
3. **`src/App.tsx`** — renders the 3D canvas and UI overlays

This is like a FastAPI app where `main.py` creates the app and mounts routers — except here you're mounting React components into the DOM.

---

## ES Modules: import/export

JavaScript modules work similarly to Python's `import`:

```typescript
// Python:
// from utils.helpers import grid_to_world, lerp_grid
// from types.maze import MazeData

// TypeScript:
import { gridToWorld, lerpGridToWorld } from '../utils/helpers';
import type { MazeData } from '../types/maze';
```

Key differences from Python:
- **Paths are explicit** — `'../utils/helpers'` means "go up one directory, into utils, import from helpers". No `sys.path` magic.
- **`import type`** — TypeScript-only import that is erased at runtime. Tells the bundler "I only need this for type checking, don't include it in the bundle."
- **Named exports** — `export function foo()` / `import { foo }` (like Python's normal imports)
- **Default exports** — `export default App` / `import App from './App'` (one per file, used for components)

---

## tsconfig.json — TypeScript Configuration

We have three tsconfig files:
- `tsconfig.json` — base, references the others
- `tsconfig.app.json` — config for our app code (`src/`)
- `tsconfig.node.json` — config for Node-side files (`vite.config.ts`)

The important setting in `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "strict": true,           // Enable all strict type checks
    "jsx": "react-jsx",       // Enable JSX syntax for React
    "target": "ES2023",       // Output modern JavaScript
    "module": "ESNext",       // Use ES modules
    "noUnusedLocals": true,   // Error on unused variables
    "erasableSyntaxOnly": true // Only TS syntax that can be erased (no enums!)
  }
}
```

**`"erasableSyntaxOnly": true`** is why we use `const CellType = { WALL: 0, ... } as const` instead of `enum CellType { WALL, ... }`. TypeScript enums generate runtime code, which conflicts with this setting. The `as const` pattern is actually preferred in modern TS anyway.

---

## Try It Yourself

1. **Start the dev server**: `npm run dev`, open `http://localhost:5173`
2. **Edit a constant**: Change `WALL_COLOR` in `src/utils/constants.ts` from `'#1a3a5c'` to `'#ff0000'` (bright red). Save. Watch the walls change color instantly (that's HMR).
3. **Check the build**: Run `npm run build`. Look inside `dist/` — there's your production-ready single-page app.
4. **Break something on purpose**: Add `const unused = 5;` to any `.ts` file. Run `npm run build` — TypeScript will complain about the unused variable. This is your safety net.

---

**Next**: [02 — TypeScript Fundamentals](02-typescript-fundamentals.md) — types, interfaces, and generics for Python developers.
