# Vite 8 + React 19 + TypeScript 5.9 — Quick Reference

> **Always verify against latest docs**:
> - `npx ctx7@latest docs /vitejs/vite "<query>"`
> - `npx ctx7@latest docs /facebook/react "<query>"`

## Versions (this project)

- `vite` ^8.0.0
- `@vitejs/plugin-react` ^6.0.0
- `react` ^19.2.4, `react-dom` ^19.2.4
- `typescript` ~5.9.3

---

## Vite Basics

### Commands

```bash
npm run dev       # Dev server with HMR (localhost:5173)
npm run build     # TypeScript check + production bundle → dist/
npm run preview   # Serve production build locally (localhost:4173)
npm run lint      # ESLint
```

### Entry Point

`index.html` at project root is the entry point (not in `public/`). Vite resolves `<script type="module" src="/src/main.tsx">` and builds the module graph from there.

### Config (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,                    // Auto-open browser
    proxy: {                       // Proxy API calls in dev
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',               // Output directory
    sourcemap: false,             // Source maps in production
  },
})
```

### Environment Variables

Only variables prefixed with `VITE_` are exposed to client code:

```bash
# .env
VITE_API_URL=https://api.example.com   # ✓ Available in browser
SECRET_KEY=abc123                       # ✗ NOT exposed
```

```typescript
const url = import.meta.env.VITE_API_URL
const mode = import.meta.env.MODE        // 'development' | 'production'
const dev = import.meta.env.DEV          // true in dev
const prod = import.meta.env.PROD        // true in production
```

### Static Assets

Files in `public/` are served at root and copied as-is to `dist/`.
Files imported in code get content-hashed filenames for cache busting.

```typescript
// Imported asset (hashed in production)
import heroImage from './assets/hero.png'
// → /assets/hero-a1b2c3d4.png in production

// Public asset (no processing)
<img src="/textures/wall.jpg" />
// → /textures/wall.jpg (copied as-is)
```

### TypeScript: Add `vite/client` types

In `tsconfig.json` or `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

This enables `import.meta.env` typing and HMR API types.

### erasableSyntaxOnly

TypeScript 5.9 with `"erasableSyntaxOnly": true` (this project's tsconfig) means:
- **No enums** — use `const` objects with `as const` instead
- **No namespaces** — use modules
- **No parameter properties** — use explicit field declarations

```typescript
// ✗ Enum (not allowed)
enum Direction { UP, DOWN }

// ✓ Const object (allowed)
export const Direction = { UP: 'up', DOWN: 'down' } as const
export type Direction = (typeof Direction)[keyof typeof Direction]
```

---

## React 19 Highlights

### ref as a prop (no more forwardRef)

```tsx
// React 19: ref is a regular prop
function MyInput({ placeholder, ref }: { placeholder: string; ref?: React.Ref<HTMLInputElement> }) {
  return <input placeholder={placeholder} ref={ref} />
}

// Usage
<MyInput ref={myRef} placeholder="Type here" />
```

`forwardRef` still works but is no longer required in React 19.

### Core Hooks

#### useState

```tsx
const [count, setCount] = useState(0)

// Updater function (use when next state depends on previous)
setCount(c => c + 1)

// Object state (always replace, never mutate)
const [user, setUser] = useState({ name: 'Alice', age: 30 })
setUser(prev => ({ ...prev, name: 'Bob' }))

// Lazy initialization (expensive initial value)
const [data, setData] = useState(() => computeExpensiveValue())
```

**Batching**: Multiple `set` calls in the same event handler are batched into one re-render (React 18+).

#### useEffect

```tsx
useEffect(() => {
  // Setup (runs after render)
  const conn = createConnection(roomId)
  conn.connect()

  // Cleanup (runs before re-run or unmount)
  return () => conn.disconnect()
}, [roomId])  // Dependency array: re-run when roomId changes

// Mount only (empty deps)
useEffect(() => { /* once */ }, [])

// Every render (no deps) — rarely needed
useEffect(() => { /* every render */ })
```

**Data fetching with cleanup** (prevent race conditions):

```tsx
useEffect(() => {
  let ignore = false
  async function fetchData() {
    const data = await fetch(`/api/${id}`).then(r => r.json())
    if (!ignore) setData(data)
  }
  fetchData()
  return () => { ignore = true }
}, [id])
```

#### useRef

```tsx
// DOM reference
const inputRef = useRef<HTMLInputElement>(null)
<input ref={inputRef} />
inputRef.current?.focus()

// Mutable value (persists across renders, no re-render on change)
const intervalRef = useRef<number | null>(null)
intervalRef.current = window.setInterval(...)

// In R3F: reference to Three.js objects
const meshRef = useRef<THREE.Mesh>(null!)
<mesh ref={meshRef}>
```

**Key rule**: Changing `.current` does NOT trigger a re-render. Use `useState` for values that should trigger re-render.

#### useMemo

```tsx
// Cache expensive computation
const sorted = useMemo(
  () => items.sort((a, b) => a.price - b.price),
  [items]  // Recompute only when items changes
)

// Cache object/array to prevent child re-renders
const config = useMemo(() => ({ theme: 'dark', size: 'large' }), [])
```

#### useCallback

```tsx
// Cache function reference (same as useMemo(() => fn, deps))
const handleClick = useCallback((id: number) => {
  setSelected(id)
}, [])  // Stable reference, never changes
```

Use when passing callbacks to memoized children or as dependencies of other hooks.

#### useReducer

```tsx
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 }
    case 'reset': return { count: 0 }
    default: throw new Error()
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0 })
dispatch({ type: 'increment' })
```

### React 19 New Hooks

| Hook | Purpose |
|------|---------|
| `useActionState` | Manage form action state (pending, error, result) |
| `useOptimistic` | Optimistic UI updates during async operations |
| `useFormStatus` | Read parent form submission status |
| `use` | Read resources (promises, context) in render |

---

## JSX Rules

```tsx
// Fragments (no wrapper div)
<>{children}</>

// Conditional rendering
{isLoggedIn && <Dashboard />}
{isLoggedIn ? <Dashboard /> : <Login />}

// Lists (always use key)
{items.map(item => <Item key={item.id} item={item} />)}

// Inline styles (object with camelCase)
<div style={{ backgroundColor: 'red', fontSize: '16px' }} />

// className (not class)
<div className="container" />

// Boolean attributes
<input disabled />          // true
<input disabled={false} />  // false

// Spread props
<Component {...props} />
```

---

## Component Patterns

### Props with TypeScript

```tsx
interface CardProps {
  title: string
  children: React.ReactNode
  onClick?: () => void
}

function Card({ title, children, onClick }: CardProps) {
  return (
    <div onClick={onClick}>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
```

### Conditional CSS classes

```tsx
<div className={`base ${isActive ? 'active' : ''}`} />
```

---

## npm / package.json

| Field | Purpose |
|-------|---------|
| `dependencies` | Runtime deps (included in bundle) |
| `devDependencies` | Build-time only (TypeScript, ESLint, Vite) |
| `scripts` | `npm run <name>` commands |
| `"type": "module"` | Use ES modules (import/export) |

| Command | Purpose |
|---------|---------|
| `npm install` | Install all deps |
| `npm ci` | Clean install from lockfile (CI/Docker) |
| `npm run dev` | Run "dev" script |
| `npm run build` | Run "build" script |
| `npx <cmd>` | Run package binary without installing |

### Lockfile

`package-lock.json` pins exact versions. Always commit it. `npm ci` installs exactly from lockfile (deterministic, faster).
