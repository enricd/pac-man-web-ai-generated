# 05 — Zustand: State Management for Games

> **Goal**: Understand why we use Zustand, how it works, and how the entire game state lives in a single store.

---

## The Problem: Sharing State Across Components

Our game has many components that need the same data:
- `PacMan.tsx` needs pacman position → to render it
- `Ghost.tsx` needs ghost positions + modes → to render them
- `HUD.tsx` needs score, lives, level → to display them
- `GameCamera.tsx` needs pacman position → to follow it
- `useGameLoop.ts` needs everything → to run the game tick

### Options for shared state

| Approach | How it works | Downsides |
|----------|-------------|-----------|
| **Props drilling** | Pass data parent→child→grandchild→... | Verbose, fragile, every intermediate component must forward props |
| **React Context** | Provide data at top level, consume anywhere | Re-renders **all** consumers when **any** part of context changes |
| **Redux** | External store with actions/reducers | Heavy boilerplate, ~40 lines to add one field |
| **Zustand** | External store, minimal API | Almost none for our use case |

```python
# Python mental model — Zustand is like a module-level singleton with observers
# Imagine a global game state that notifies specific listeners when fields change

class GameStore:
    score: int = 0
    lives: int = 3
    _listeners: dict[str, list[Callable]] = {}

    def set_score(self, value):
        self.score = value
        self._notify('score')

    def subscribe(self, field, callback):
        self._listeners[field].append(callback)

# Any module can import and use it
from stores import game_store
game_store.subscribe('score', lambda: update_hud())
```

---

## Creating a Store

```typescript
// src/stores/gameStore.ts
import { create } from 'zustand';

interface GameStore extends GameState {
  mazeData: MazeData;
  pelletSet: Set<string>;
  powerPelletSet: Set<string>;

  // Actions (methods that modify state)
  startGame: () => void;
  setDirection: (dir: Direction) => void;
  tick: (delta: number) => void;
  restartGame: () => void;
  nextLevel: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state values
  phase: 'start',
  level: 1,
  score: 0,
  lives: STARTING_LIVES,
  // ... more fields ...

  // Actions
  startGame: () => {
    set({ phase: 'playing' });
  },

  setDirection: (dir: Direction) => {
    set(s => ({
      pacman: { ...s.pacman, nextDirection: dir },
    }));
  },

  tick: (delta: number) => {
    const state = get();
    // ... game logic ...
    set({ score: state.score + points, /* ... */ });
  },
}));
```

### Anatomy of `create()`

```typescript
create<GameStore>((set, get) => ({
  // ↑ The store type    ↑ set: updates state   ↑ get: reads current state
  //                     Returns an object with initial state + actions
}))
```

- **`set(partialState)`** — merges the given object into the current state (like `dict.update()` in Python). Triggers re-renders for subscribed components.
- **`set(state => partialState)`** — function form, receives current state. Use when new state depends on old state.
- **`get()`** — returns the current state snapshot. Doesn't trigger re-renders. Use inside actions and `useFrame`.

### set() — Immutable updates

```typescript
// Simple update — merge directly
set({ phase: 'playing' });

// Update based on current state — use function form
set(s => ({
  score: s.score + PELLET_SCORE,
}));

// Nested update — spread to maintain immutability
set(s => ({
  pacman: {
    ...s.pacman,           // keep all pacman fields
    nextDirection: dir,    // override this one
  },
}));
```

```python
# Python equivalent of the nested update:
new_pacman = dataclasses.replace(state.pacman, next_direction=dir)
# Or: {**state.pacman, "next_direction": dir}
```

**Why immutable?** Zustand (and React) detect changes by reference comparison: `oldPacman !== newPacman`. If you mutate in-place, the reference doesn't change, so React doesn't know to re-render. Creating a new object (`{...old, field: newValue}`) creates a new reference.

---

## Using the Store in Components

### Selectors — Subscribe to specific fields

```tsx
// src/ui/HUD.tsx
export function HUD() {
  const score = useGameStore(s => s.score);     // Only re-renders when score changes
  const lives = useGameStore(s => s.lives);     // Only re-renders when lives changes
  const level = useGameStore(s => s.level);     // Only re-renders when level changes

  return <div>SCORE: {score} | LIVES: {lives} | FLOOR: {level}</div>;
}
```

The function `s => s.score` is a **selector** — it picks which part of the state you want. Zustand only re-renders this component when the **selected value** changes.

This is the key advantage over React Context: if `pelletsRemaining` changes, `HUD` doesn't re-render because it doesn't select `pelletsRemaining`.

```python
# Python mental model — it's like a property with a specific observer
@game_store.observe('score')
def on_score_change(new_score):
    update_hud_score(new_score)
# Changes to 'lives' don't trigger this observer
```

### getState() — Read without subscribing

```tsx
// Inside useFrame (runs 60fps — we don't want re-renders)
useFrame(() => {
  const { pacman } = useGameStore.getState();  // Read-only snapshot, no subscription
  meshRef.current.position.set(...);
});
```

`getState()` is called **outside of React's rendering** — it just reads the current value. Used in:
- `useFrame` callbacks (60fps — can't afford re-renders)
- Action implementations (`tick`, `nextLevel`)
- Event handlers

| Method | Re-renders component? | When to use |
|--------|----------------------|-------------|
| `useGameStore(s => s.score)` | Yes, when `score` changes | In component body (for display) |
| `useGameStore.getState()` | No | In useFrame, actions, event handlers |

---

## Our Store Structure

The entire game state lives in one store:

```typescript
interface GameStore extends GameState {
  // === Data ===
  phase: GamePhase;            // 'start' | 'playing' | 'dying' | 'levelTransition' | 'gameOver'
  level: number;               // Current floor (1-10)
  score: number;
  lives: number;
  pacman: CharacterState;      // Position, direction, movement progress
  ghosts: GhostState[];        // Array of 4 ghosts
  pelletsRemaining: number;
  powerPelletActive: boolean;
  powerPelletTimer: number;
  modeTimer: number;           // Scatter/chase mode timer
  isScatterMode: boolean;
  elapsedTime: number;         // Time since level start

  // === Derived data (not in GameState interface) ===
  mazeData: MazeData;          // Current maze grid + metadata
  pelletSet: Set<string>;      // Quick lookup: "row,col" → is pellet here?
  powerPelletSet: Set<string>;

  // === Actions ===
  startGame: () => void;
  setDirection: (dir: Direction) => void;
  tick: (delta: number) => void;
  restartGame: () => void;
  nextLevel: () => void;
}
```

### Why one store, not many?

In a game, everything is interconnected:
- Ghost collision depends on pacman position + ghost positions + ghost mode + power pellet status
- Scoring depends on what was collected + ghost eat combos
- Level transition depends on pellet count + level number

Splitting this into multiple stores would require constant cross-store reads. One store keeps it simple.

```python
# This is like having one Game class with all state, not 5 microservices
class Game:
    pacman: PacMan
    ghosts: list[Ghost]
    maze: Maze
    score: int
    # ... everything in one place
```

---

## The tick() Action — The Heart of the Game

Every frame (~60fps), `tick(delta)` is called. It's the entire game loop:

```typescript
tick: (delta: number) => {
  const state = get();
  if (state.phase !== 'playing') return;  // Only tick during gameplay

  // 1. Move Pac-Man
  const newPacman = updateCharacterMovement(pacman, grid, PACMAN_SPEED, delta, true);

  // 2. Move ghosts (AI chooses direction, then movement system moves them)
  const newGhosts = ghosts.map((ghost, i) => {
    const chosenDir = chooseGhostDirection(ghost, newPacman, blinky, grid);
    return updateCharacterMovement({ ...ghost, nextDirection: chosenDir }, grid, speed, delta);
  });

  // 3. Check collisions (pellets, power pellets, ghosts)
  const collisionResult = checkCollisions(pacmanPos, newGhosts, pelletSet, powerPelletSet, state);

  // 4. Handle death or level complete
  if (collisionResult.livesLost) { /* reset positions or game over */ }
  if (totalPellets === 0) { /* transition to next level */ }

  // 5. Update timers (power pellet, mode cycling, invisible walls)

  // 6. Apply all changes at once
  set({
    pacman: newPacman,
    ghosts: finalGhosts,
    score: state.score + collisionResult.score,
    pelletsRemaining: totalPellets,
    // ... all other updated fields
  });
},
```

Notice how `tick()` calls pure functions from `systems/` — it's an orchestrator. The actual logic lives in `movement.ts`, `collision.ts`, `ghostAI.ts`. This separation means:
- Systems are testable without React/Three.js
- The store is readable (high-level flow, not implementation details)

```python
# Python equivalent — a game loop that delegates to systems
def tick(self, delta: float):
    new_pacman = movement.update(self.pacman, self.grid, PACMAN_SPEED, delta)
    new_ghosts = [ghost_ai.update(g, new_pacman, self.grid) for g in self.ghosts]
    collisions = collision.check(new_pacman, new_ghosts, self.pellets)
    self.apply_state(new_pacman, new_ghosts, collisions)
```

---

## State Flow Diagram

```
User presses Arrow Key
  ↓
useKeyboard → setDirection('left')
  ↓
Store: pacman.nextDirection = 'left'
  ↓
Next frame: useGameLoop → tick(delta)
  ↓
tick() calls updateCharacterMovement()
  ↓
Store: pacman.gridPos updated, pacman.moveProgress updated
  ↓
PacMan.tsx: useFrame reads getState(), updates mesh position
  ↓
Screen updates at 60fps
```

Two parallel paths:
1. **React path**: selector triggers re-render → component returns new JSX → React diffs and patches DOM (for HUD, screens)
2. **Imperative path**: `useFrame` reads `getState()` → directly mutates mesh.position (for 3D objects, 60fps)

---

## Comparison to Python State Patterns

| Pattern | Python Equivalent | Zustand Equivalent |
|---------|-------------------|-------------------|
| Global state | Module-level variable | `useGameStore.getState()` |
| Observable state | Property with setter that notifies | `set()` + selector subscriptions |
| Immutable update | `dataclasses.replace(obj, field=val)` | `{ ...obj, field: val }` |
| Computed value | `@property` | Selector: `s => s.pelletSet.size` |
| Action | Method on a class | Function in the store |

---

## Try It Yourself

1. **Read `src/stores/gameStore.ts`** — follow the `tick()` function. What happens first: Pac-Man movement or ghost movement? Why does it matter?

2. **Add a selector**: In `HUD.tsx`, add a display for `powerPelletActive`. Show "POWER!" when a power pellet is active.

3. **Trace a state change**: Start from `useKeyboard.ts` → `setDirection` → `tick` → `updateCharacterMovement` → `set()`. How many files does a single arrow key press touch?

4. **Experiment**: In the browser console, try `useGameStore.getState().score` (you may need to expose it on `window` first). Then call `useGameStore.setState({ score: 99999 })`. Watch the HUD update instantly.

---

**Next**: [06 — Maze Generation](06-maze-generation.md) — recursive backtracking, symmetry, and turning a 2D grid into 3D walls.
