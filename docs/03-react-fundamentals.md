# 03 — React Fundamentals for Backend Developers

> **Goal**: Understand React's component model, hooks, and rendering — the mental shift from server-side to client-side UI.

---

## The Core Idea

In backend/server-side rendering, you generate HTML once per request:

```python
# FastAPI — generates HTML on the server, sends it to the browser
@app.get("/game")
def game_page():
    return HTMLResponse(f"<h1>Score: {score}</h1>")
```

React flips this: your code runs **in the browser** and **re-runs parts of itself** whenever data changes:

```tsx
// React — runs in the browser, updates the DOM when score changes
function HUD() {
  const score = useGameStore(s => s.score);
  return <div>Score: {score}</div>;
}
```

When `score` changes from 100 to 110, React **only updates that `<div>`** — it doesn't rebuild the entire page. This is called **reconciliation**.

---

## Components — Functions That Return UI

A React component is just a function that returns JSX:

```tsx
// src/ui/HUD.tsx — a simple component
export function HUD() {
  const score = useGameStore(s => s.score);
  const lives = useGameStore(s => s.lives);
  const level = useGameStore(s => s.level);

  return (
    <div style={{ color: '#fff', fontSize: '14px' }}>
      <div>SCORE: {score}</div>
      <div>FLOOR {level} / 10</div>
      <div>{'♥'.repeat(lives)}</div>
    </div>
  );
}
```

### JSX — HTML in Your JavaScript

JSX looks like HTML but it's actually JavaScript:

```tsx
// This JSX:
<div className="hud">Score: {score}</div>

// Compiles to:
React.createElement('div', { className: 'hud' }, 'Score: ', score);
```

Key differences from HTML:
- **`className`** instead of `class` (because `class` is a JS reserved word)
- **`{expressions}`** — curly braces embed JavaScript: `{score}`, `{lives > 0 ? 'alive' : 'dead'}`
- **`style={{ color: 'red' }}`** — style is an object, not a string. The outer `{}` is JSX expression, the inner `{}` is a JS object.
- **Self-closing tags** — `<img />`, `<mesh />` (required in JSX, optional in HTML)

### Component Composition — Like Lego

Components nest inside each other:

```tsx
// src/App.tsx
function App() {
  return (
    <div>
      <Canvas>        {/* 3D canvas */}
        <Game />      {/* Contains maze, characters, etc. */}
      </Canvas>
      <HUD />         {/* Score overlay */}
      <StartScreen /> {/* Start screen overlay */}
    </div>
  );
}
```

```tsx
// src/components/Game.tsx — composes more components
export function Game() {
  return (
    <>
      <Maze />
      <PacMan />
      <Ghost index={0} name="blinky" />
      <Ghost index={1} name="pinky" />
      <Pellet />
    </>
  );
}
```

**`<>...</>`** is a Fragment — groups elements without adding an extra DOM node. Like returning multiple things without a wrapper div.

---

## Props — Function Arguments

Props are how you pass data to child components:

```tsx
// Parent passes props
<Ghost index={0} name="blinky" />
<Ghost index={1} name="pinky" />

// Child receives them
interface GhostProps {
  index: number;
  name: GhostName;
}

export function Ghost({ index, name }: GhostProps) {
  // index = 0, name = "blinky" for the first Ghost
  return <mesh>...</mesh>;
}
```

```python
# Python equivalent — it's just function arguments
def ghost(index: int, name: GhostName):
    return render_mesh(...)

ghost(index=0, name="blinky")
ghost(index=1, name="pinky")
```

Props flow **one way**: parent → child. A child can never modify its props (they're like `const` arguments).

---

## Hooks — React's Superpower

Hooks are special functions (always start with `use`) that give components **state**, **side effects**, and **access to React's internals**. They must be called at the top level of a component — never inside conditions or loops.

### useState — Component-Local State

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  //      ↑ current value   ↑ function to update it
  //                              ↑ initial value

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

When `setCount` is called, React **re-renders** the component — calls the function again with the new state. This is the core mechanism.

```python
# Rough Python mental model (not actual code):
count = 0

def counter():
    global count
    render(f"Count: {count}")
    on_click(lambda: set_count(count + 1))  # triggers re-render

def set_count(new_value):
    count = new_value
    counter()  # re-render
```

**We don't use `useState` much in this project** — our game state lives in Zustand instead (see doc 05). But it's essential to understand because it's the foundation of React's reactivity.

### useRef — A Persistent Box

`useRef` creates a mutable reference that **persists across re-renders** but **doesn't trigger re-renders** when changed:

```tsx
// src/components/characters/PacMan.tsx
const meshRef = useRef<Mesh>(null);
const mouthRef = useRef(0);

useFrame((_state, delta) => {
  if (!meshRef.current) return;
  meshRef.current.position.set(x, 0.5, z);  // Direct mutation!
  mouthRef.current += delta * 12;            // No re-render triggered
});

return <mesh ref={meshRef}>...</mesh>;
```

Think of `useRef` as a Python instance variable (`self.mesh`) — it holds a value that survives between function calls, but changing it doesn't notify anyone.

**Why not `useState`?** Because we update mesh positions ~60 times per second. If each update triggered a React re-render, performance would be terrible. `useRef` lets us mutate the 3D object directly without React knowing.

| | `useState` | `useRef` |
|---|---|---|
| Triggers re-render? | Yes | No |
| Persists across renders? | Yes | Yes |
| When to use | Data that affects what you *display* | Mutable data, DOM/mesh references |
| Python analogy | Property with `__set__` that triggers UI update | Instance variable (`self.x`) |

### useEffect — Side Effects (Lifecycle)

`useEffect` runs code **after** the component renders. It's for things like event listeners, timers, or API calls:

```tsx
// src/hooks/useKeyboard.ts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const dir = KEY_MAP[e.key];
    if (dir) setDirection(dir);
  };

  window.addEventListener('keydown', handleKeyDown);

  // Cleanup function — runs when component unmounts (or before re-running the effect)
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [setDirection, startGame, restartGame, phase]);
//  ↑ dependency array — effect re-runs when these values change
```

```python
# Python mental model — like a context manager
class KeyboardHandler:
    def __enter__(self):
        # Setup: add event listener
        register_handler(self.handle_keydown)
        return self

    def __exit__(self, *args):
        # Cleanup: remove event listener
        unregister_handler(self.handle_keydown)
```

**The dependency array** `[setDirection, phase, ...]` tells React: "re-run this effect only when one of these values changes." It's like a cache key.

- `[]` → run once on mount, cleanup on unmount
- `[x, y]` → run when `x` or `y` changes
- Omitted → run after every render (usually a bug)

### useMemo — Cached Computation

```tsx
// src/components/maze/Wall.tsx
const wallPositions = useMemo(() => {
  const positions: [number, number][] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === CellType.WALL) {
        positions.push(gridToWorld({ row: r, col: c }));
      }
    }
  }
  return positions;
}, [grid]);  // Only recompute when grid changes
```

```python
# Python equivalent — @functools.lru_cache or manual caching
@lru_cache
def compute_wall_positions(grid):
    return [grid_to_world(r, c) for r, c in walls(grid)]
```

Without `useMemo`, this computation would run on every render (~60 fps). With it, it only runs when `grid` actually changes (on level transitions).

---

## Re-Rendering — When Does React Run Your Code Again?

This is the most important concept in React. Your component function gets called again when:

1. **Its state changes** (via `useState` setter or Zustand subscription)
2. **Its parent re-renders** (unless memoized)
3. **A context it consumes changes** (not used in our project)

```
User presses arrow key
  → useKeyboard calls setDirection('left')
  → Zustand store updates pacman.nextDirection
  → Components subscribed to that value re-render
  → React diffs the old and new JSX
  → Only changed DOM nodes are updated
```

**Performance tip**: This is why our 3D components use `useRef` + `useFrame` instead of state. We update mesh positions imperatively (outside React's knowledge) to avoid 60fps re-renders.

---

## Custom Hooks — Reusable Logic

A custom hook is just a function that uses other hooks:

```tsx
// src/hooks/useKeyboard.ts
export function useKeyboard(): void {
  const setDirection = useGameStore(s => s.setDirection);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ...
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDirection, phase]);
}
```

```tsx
// Used in App.tsx — just call it
function App() {
  useKeyboard();  // Sets up keyboard handling
  // ...
}
```

```python
# Python equivalent — a mixin or a decorator that adds behavior
class KeyboardMixin:
    def setup_keyboard(self):
        self.listener = register_handler(self.on_keydown)

    def teardown_keyboard(self):
        unregister_handler(self.listener)
```

Custom hooks let you extract and reuse stateful logic without changing your component hierarchy. `useKeyboard`, `useGameLoop`, and store selectors from `useGameStore` are all hooks in our project.

---

## JSX Patterns in This Project

### Conditional rendering

```tsx
// src/App.tsx
{phase === 'start' && <StartScreen />}
{phase === 'gameOver' && <GameOverScreen />}
```

`&&` short-circuits: if the left side is falsy, React renders nothing. Like Python's `"text" if condition else ""` but more idiomatic in JSX.

### Lists / mapping

```tsx
// src/components/Game.tsx
{GHOST_NAMES.map((name, i) => (
  <Ghost key={name} index={i} name={name} />
))}
```

**`key`** is required when rendering lists — it tells React which items changed, were added, or removed. Use a stable identifier (not array index if items can reorder). Like Python's `for name in ghost_names:` but producing UI elements.

### Inline styles

```tsx
<div style={{
  position: 'absolute',
  top: 0,
  color: '#fff',
  fontSize: '14px',      // camelCase, not kebab-case
  pointerEvents: 'none', // CSS property names are camelCase
}}>
```

In this project, UI components use inline styles for simplicity. In larger apps, you'd use CSS modules, Tailwind, or styled-components.

---

## The Component Tree

```
App
├── Canvas (R3F)
│   └── Game
│       ├── ambientLight
│       ├── directionalLight
│       ├── GameCamera
│       ├── Maze
│       │   ├── Floor
│       │   ├── Wall (InstancedMesh)
│       │   └── GhostHouse
│       ├── Pellet (InstancedMesh)
│       ├── PowerPellet
│       ├── PacMan
│       ├── Ghost × 4
│       ├── Elevator
│       └── Teleporter
├── HUD
├── StartScreen (conditional)
├── GameOverScreen (conditional)
└── LevelTransition (conditional)
```

Everything inside `<Canvas>` is 3D (React Three Fiber). Everything outside is normal HTML/CSS.

---

## Try It Yourself

1. **Read `src/App.tsx`** — identify each component. Which are inside `<Canvas>` (3D) and which are outside (HTML)?

2. **Read `src/hooks/useKeyboard.ts`** — trace the flow: key press → `setDirection` → store update → what re-renders?

3. **Add a component**: Create a simple `src/ui/DebugInfo.tsx` that shows `phase` and `pelletsRemaining` from the store. Add it to `App.tsx`. Watch it update as you play.

```tsx
// Quick starter:
import { useGameStore } from '../stores/gameStore';

export function DebugInfo() {
  const phase = useGameStore(s => s.phase);
  const pellets = useGameStore(s => s.pelletsRemaining);
  return (
    <div style={{ position: 'absolute', bottom: 10, left: 10, color: '#0f0', fontSize: 12 }}>
      Phase: {phase} | Pellets: {pellets}
    </div>
  );
}
```

---

**Next**: [04 — React Three Fiber Basics](04-react-three-fiber-basics.md) — 3D in React, the Canvas, meshes, and the render loop.
