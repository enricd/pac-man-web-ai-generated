# Zustand v5 — Quick Reference

> **Always verify against latest docs**: `npx ctx7@latest docs /pmndrs/zustand "<query>"`

## Version (this project)

- `zustand` ^5.0.12

---

## Creating a Store

```typescript
import { create } from 'zustand'

interface BearState {
  bears: number
  increasePopulation: () => void
  removeAllBears: () => void
}

const useBearStore = create<BearState>()((set, get) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}))
```

**TypeScript pattern**: `create<Type>()((set, get) => ({ ... }))` — note the double `()()` for type inference.

**`set` function**: Shallowly merges new state with existing state (top-level only).

**`get` function**: Read current state inside actions. Critical for reading fresh state in `useFrame` or `setTimeout`.

---

## Using in Components (Selectors)

```typescript
// Single value (re-renders only when bears changes)
const bears = useBearStore((state) => state.bears)

// Action (stable reference, never causes re-render)
const increase = useBearStore((state) => state.increasePopulation)

// Multiple values with useShallow (prevents re-render if values haven't changed)
import { useShallow } from 'zustand/shallow'

const { bears, fish } = useBearStore(
  useShallow((state) => ({ bears: state.bears, fish: state.fish }))
)
```

**Default equality**: strict `===`. Object/array selectors re-render every time unless you use `useShallow`.

---

## Outside React (getState / setState / subscribe)

```typescript
// Read
const bears = useBearStore.getState().bears

// Write
useBearStore.setState({ bears: 10 })

// Subscribe to changes
const unsub = useBearStore.subscribe((state) => {
  console.log('State changed:', state.bears)
})
```

**Critical for game loops**: In `useFrame`, use `getState()` instead of selectors to avoid re-renders:

```typescript
useFrame((_, delta) => {
  useBearStore.getState().tick(delta)
})
```

---

## State Update Patterns

```typescript
// Shallow merge (default)
set({ bears: 10 })  // Only updates bears, keeps other fields

// Updater function
set((state) => ({ bears: state.bears + 1 }))

// Replace entire state (second arg = true)
set({ bears: 0 }, true)  // Replaces ALL state

// Nested objects (must spread manually — set only merges top level)
set((state) => ({
  nested: { ...state.nested, count: state.nested.count + 1 }
}))
```

---

## Async Actions

No middleware needed. Just call `set` when ready:

```typescript
const useStore = create<State>()((set, get) => ({
  data: null,
  loading: false,
  fetchData: async () => {
    set({ loading: true })
    const data = await fetch('/api').then(r => r.json())
    set({ data, loading: false })
  },
}))
```

---

## Middleware

### Persist

```typescript
import { persist, createJSONStorage } from 'zustand/middleware'

const useStore = create<State>()(
  persist(
    (set, get) => ({ /* state + actions */ }),
    {
      name: 'storage-key',                              // localStorage key
      storage: createJSONStorage(() => sessionStorage),  // Optional: default is localStorage
      partialize: (state) => ({ bears: state.bears }),   // Only persist specific fields
    }
  )
)
```

### Devtools

```typescript
import { devtools } from 'zustand/middleware'

const useStore = create<State>()(
  devtools(
    (set) => ({
      bears: 0,
      addBear: () => set(
        (s) => ({ bears: s.bears + 1 }),
        undefined,
        'bears/add'  // Action name in devtools
      ),
    }),
    { name: 'MyStore' }
  )
)
```

### Immer (mutable syntax)

```typescript
import { immer } from 'zustand/middleware/immer'

const useStore = create<State>()(
  immer((set) => ({
    nested: { count: 0 },
    increment: () => set((state) => { state.nested.count++ }),  // Mutate directly
  }))
)
```

### Stacking Middleware

```typescript
const useStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({ /* ... */ })),
      { name: 'storage-key' }
    ),
    { name: 'StoreName' }
  )
)
```

Order matters: outermost middleware wraps innermost.

---

## subscribeWithSelector

Subscribe to specific state slices outside React:

```typescript
import { subscribeWithSelector } from 'zustand/middleware'

const useStore = create<State>()(
  subscribeWithSelector((set) => ({ score: 0, level: 1 }))
)

// Subscribe to score changes only
useStore.subscribe(
  (state) => state.score,
  (score, prevScore) => console.log(`Score: ${prevScore} → ${score}`)
)

// Fire immediately on subscribe
useStore.subscribe(
  (state) => state.level,
  (level) => console.log('Level:', level),
  { fireImmediately: true }
)

// Shallow equality for object slices
import { shallow } from 'zustand/shallow'
useStore.subscribe(
  (state) => state.player,
  (player) => console.log('Moved:', player),
  { equalityFn: shallow }
)
```

---

## Slices Pattern

Split large stores into composable slices:

```typescript
import { create, StateCreator } from 'zustand'

interface BearSlice { bears: number; addBear: () => void }
interface FishSlice { fishes: number; addFish: () => void }

const createBearSlice: StateCreator<BearSlice & FishSlice, [], [], BearSlice> = (set) => ({
  bears: 0,
  addBear: () => set((s) => ({ bears: s.bears + 1 })),
})

const createFishSlice: StateCreator<BearSlice & FishSlice, [], [], FishSlice> = (set) => ({
  fishes: 0,
  addFish: () => set((s) => ({ fishes: s.fishes + 1 })),
})

const useStore = create<BearSlice & FishSlice>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}))
```

Apply middleware only on the combined store, not individual slices.

---

## Reset to Initial State

```typescript
const initialState = { bears: 0, fish: 0 }

const useStore = create<State>()((set) => ({
  ...initialState,
  addBear: () => set((s) => ({ bears: s.bears + 1 })),
  reset: () => set(initialState),
}))
```

---

## Vanilla Store (no React)

```typescript
import { createStore } from 'zustand/vanilla'

const store = createStore<State>()((set) => ({ count: 0 }))

store.getState()         // Read
store.setState({ count: 1 })  // Write
store.subscribe(callback)     // Listen
store.getInitialState()       // Initial state for reset
```

Use with React via `useStore` hook from `zustand`:

```typescript
import { useStore } from 'zustand'
const count = useStore(store, (s) => s.count)
```

---

## Zustand + React Three Fiber Pattern

The standard pattern for game state in R3F:

```typescript
// Store with tick action
const useGameStore = create<GameState>()((set, get) => ({
  score: 0,
  tick: (delta: number) => {
    const state = get()
    // Pure game logic here, using delta for frame-rate independence
    set({ /* updated state */ })
  },
}))

// Game loop component (inside Canvas)
function GameLoop() {
  useFrame((_, delta) => {
    useGameStore.getState().tick(Math.min(delta, 0.05))  // Clamp delta
  })
  return null
}

// UI component (outside Canvas, reads via selector)
function HUD() {
  const score = useGameStore((s) => s.score)
  return <div>{score}</div>
}
```

**Why `getState().tick()` instead of a selector?** Using a selector would cause the component to re-render on every state change. `getState()` reads imperatively without subscribing — perfect for 60fps game loops.
