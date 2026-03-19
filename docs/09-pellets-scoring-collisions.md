# 09 — Pellets, Scoring, and Collisions

> **Goal**: Understand how collectibles work, how collisions are detected on a grid, and how game state transitions (power pellets, death, level complete) are handled.

---

## Grid-Based Collision: Why It's So Simple

In many games, collision detection involves bounding boxes, circle overlap tests, or complex physics. In grid-based games like Pac-Man, it's trivial: **two things collide when they occupy the same cell**.

```typescript
// src/utils/helpers.ts
export function gridEqual(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col;
}
```

```python
# Python equivalent
def collides(a: GridPosition, b: GridPosition) -> bool:
    return a.row == b.row and a.col == b.col
```

That's it. No floating-point imprecision, no edge cases, no broad-phase/narrow-phase. The grid makes everything discrete.

---

## Pellet Tracking with Sets

We store pellet positions as strings in a `Set` for O(1) lookup:

```typescript
// In gameStore.ts
pelletSet: new Set(mazeData.pellets.map(p => `${p.row},${p.col}`))
// e.g., Set { "1,3", "1,5", "2,1", "2,3", ... }
```

```python
# Python equivalent
pellet_set = {f"{p.row},{p.col}" for p in maze_data.pellets}
# e.g., {"1,3", "1,5", "2,1", "2,3", ...}
```

### Why strings, not objects?

JavaScript Sets use **reference equality** for objects. Two objects with the same values are different references:

```typescript
const a = { row: 1, col: 3 };
const b = { row: 1, col: 3 };
a === b  // false! Different objects in memory

const set = new Set();
set.add(a);
set.has(b);  // false — b is a different reference
```

By converting to strings (`"1,3"`), we get value-based comparison:

```typescript
const set = new Set<string>();
set.add("1,3");
set.has("1,3");  // true — same string value
```

```python
# Python doesn't have this problem — tuples are hashable by value
pellets = {(1, 3), (1, 5), (2, 1)}
(1, 3) in pellets  # True — value comparison
```

This is a common JavaScript pattern when you need value-based Set/Map lookups for composite keys.

---

## The Collision System

```typescript
// src/systems/collision.ts
export function checkCollisions(
  pacmanPos: GridPosition,
  ghosts: GhostState[],
  pellets: Set<string>,
  powerPellets: Set<string>,
  currentState: Pick<GameState, 'powerPelletActive' | 'powerPelletTimer' | 'level'>
): CollisionResult {
```

This is a **pure function** — takes the current state, returns what happened. No mutation.

### Pellet collision

```typescript
const posKey = `${pacmanPos.row},${pacmanPos.col}`;

// Regular pellet?
if (pellets.has(posKey)) {
  result.score += PELLET_SCORE;            // +10 points
  result.pelletsToRemove.push({ ...pacmanPos });
  result.pelletsRemaining--;
}

// Power pellet?
if (powerPellets.has(posKey)) {
  result.score += POWER_PELLET_SCORE;      // +50 points
  result.powerPelletsToRemove.push({ ...pacmanPos });
  result.powerPelletActive = true;
  result.powerPelletTimer = duration;       // Start countdown

  // All ghosts become frightened
  ghosts.forEach((ghost, i) => {
    if (ghost.mode !== 'eaten') {
      result.ghostUpdates.push({ index: i, mode: 'frightened' });
    }
  });
}
```

### Ghost collision

```typescript
for (let i = 0; i < ghosts.length; i++) {
  const ghost = ghosts[i];
  // Check both current and target position (handles mid-cell crossing)
  if (!gridEqual(pacmanPos, ghost.gridPos) && !gridEqual(pacmanPos, ghost.targetGridPos)) {
    continue;
  }

  if (ghost.mode === 'frightened') {
    // Pac-Man eats ghost — escalating score
    const eatScore = GHOST_EAT_SCORES[result.ghostsEaten];  // 200, 400, 800, 1600
    result.score += eatScore;
    result.ghostsEaten++;
    result.ghostUpdates.push({ index: i, mode: 'eaten' });
  } else if (ghost.mode !== 'eaten') {
    // Ghost kills Pac-Man
    result.livesLost = true;
    break;
  }
  // 'eaten' ghosts (just eyes) don't collide
}
```

---

## The CollisionResult Pattern

Instead of modifying state directly, `checkCollisions` returns a result object describing what happened:

```typescript
export interface CollisionResult {
  score: number;                   // Points earned this frame
  pelletsRemaining: number;        // Updated count
  powerPelletActive: boolean;      // Power pellet activated?
  powerPelletTimer: number;        // Remaining duration
  ghostsEaten: number;             // How many ghosts eaten (for score escalation)
  livesLost: boolean;              // Did Pac-Man die?
  pelletsToRemove: GridPosition[]; // Which pellets to remove from Set
  powerPelletsToRemove: GridPosition[];
  ghostUpdates: { index: number; mode: GhostState['mode'] }[];
}
```

The store's `tick()` then applies these results:

```typescript
// Apply pellet removals
for (const p of collisionResult.pelletsToRemove) {
  newPelletSet.delete(`${p.row},${p.col}`);
}

// Apply ghost mode changes
const finalGhosts = newGhosts.map((g, i) => {
  const update = collisionResult.ghostUpdates.find(u => u.index === i);
  if (update) return { ...g, mode: update.mode };
  return g;
});

// Apply score
set({ score: state.score + collisionResult.score, ... });
```

```python
# Python equivalent — Command pattern / event system
@dataclass
class CollisionResult:
    score: int = 0
    pellets_to_remove: list[GridPosition] = field(default_factory=list)
    ghost_updates: list[tuple[int, GhostMode]] = field(default_factory=list)
    lives_lost: bool = False

def check_collisions(pacman_pos, ghosts, pellets) -> CollisionResult:
    result = CollisionResult()
    # ... fill result ...
    return result

# Apply result separately
for pos in result.pellets_to_remove:
    pellet_set.discard(f"{pos.row},{pos.col}")
```

This pattern (compute → result → apply) keeps the collision system pure and testable.

---

## Scoring System

| Event | Points | Notes |
|-------|--------|-------|
| Regular pellet | 10 | ~300 per maze |
| Power pellet | 50 | 4 per maze |
| Eat ghost (1st) | 200 | During single power pellet |
| Eat ghost (2nd) | 400 | |
| Eat ghost (3rd) | 800 | |
| Eat ghost (4th) | 1600 | |

Ghost eating scores **escalate** — eating all 4 ghosts during one power pellet is worth 200+400+800+1600 = 3000 points. This rewards aggressive play.

```typescript
// src/utils/constants.ts
export const GHOST_EAT_SCORES = [200, 400, 800, 1600];

// In collision.ts
const eatScore = GHOST_EAT_SCORES[Math.min(result.ghostsEaten, GHOST_EAT_SCORES.length - 1)];
```

---

## Power Pellet State Machine

The power pellet triggers a temporary state change:

```
Eat power pellet
  → powerPelletActive = true
  → powerPelletTimer = 8s (decreases per level)
  → All non-eaten ghosts → frightened mode
  → Timer counts down each frame
  → Timer reaches 0:
      → powerPelletActive = false
      → Frightened ghosts → back to scatter/chase
```

```typescript
// In tick():
if (newPowerActive) {
  newPowerTimer -= delta;
  if (newPowerTimer <= 0) {
    newPowerActive = false;
    // Revert frightened ghosts
    for (const g of finalGhosts) {
      if (g.mode === 'frightened') {
        g.mode = newIsScatter ? 'scatter' : 'chase';
      }
    }
  }
}
```

### Difficulty scaling

Power pellet duration decreases per level:

```typescript
const duration = Math.max(
  POWER_PELLET_MIN_DURATION,           // Never less than 3s
  POWER_PELLET_DURATION -              // Base: 8s
    currentState.level * POWER_PELLET_DURATION_DECREASE  // -0.5s per level
);
// Level 1: 7.5s, Level 5: 5.5s, Level 10: 3s (clamped)
```

---

## Game Phase Transitions

The game has several phases, transitioned by collision/pellet events:

```
START ──(key press)──→ PLAYING ──(all pellets)──→ LEVEL_TRANSITION ──(2s)──→ PLAYING (next level)
  ↑                      │
  │                      │ (ghost collision)
  │                      ▼
  │                    DYING ──(1.5s)──→ PLAYING (if lives > 0)
  │                      │
  │                      │ (lives = 0)
  │                      ▼
  └──(spacebar)──── GAME_OVER
```

### Death handling

```typescript
if (collisionResult.livesLost) {
  const newLives = state.lives - 1;
  if (newLives <= 0) {
    set({ phase: 'gameOver', lives: 0 });
    return;
  }
  // Reset positions but keep score and pellets
  set({
    lives: newLives,
    phase: 'dying',
    pacman: { ...initialPosition },
    ghosts: createInitialGhosts(mazeData),
    // score and pelletSet are NOT reset
  });
  // Resume after brief pause
  setTimeout(() => {
    if (get().phase === 'dying') set({ phase: 'playing' });
  }, 1500);
}
```

Key detail: on death, positions reset but **score and pellets persist**. You continue from where you left off (minus one life).

### Level complete

```typescript
const totalPellets = newPelletSet.size + newPowerPelletSet.size;
if (totalPellets === 0) {
  set({ phase: 'levelTransition' });
  setTimeout(() => get().nextLevel(), 2000);  // 2s transition
}
```

---

## Rendering Pellets Efficiently

### Regular pellets — InstancedMesh

Like walls, we use `InstancedMesh` for regular pellets (hundreds of them):

```tsx
// src/components/items/Pellet.tsx
export function Pellet() {
  const meshRef = useRef<InstancedMesh>(null);
  const pelletSet = useGameStore(s => s.pelletSet);

  // Recompute positions when pelletSet changes (pellet eaten)
  const positions = useMemo(() => {
    const pos: [number, number][] = [];
    for (const key of pelletSet) {
      const [row, col] = key.split(',').map(Number);
      pos.push(gridToWorld({ row, col }));
    }
    return pos;
  }, [pelletSet]);

  // ... set instance matrices ...
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color={PELLET_COLOR} emissive={PELLET_COLOR} />
    </instancedMesh>
  );
}
```

When a pellet is eaten, `pelletSet` changes → `useMemo` recomputes → `InstancedMesh` re-renders with one fewer instance.

### Power pellets — Individual meshes

Only 4 power pellets exist, so individual meshes with per-pellet animation are fine:

```tsx
function PowerPelletSingle({ row, col }) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    // Pulsing scale animation
    const scale = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[x, 0.35, z]}>
      <sphereGeometry args={[0.2, 12, 12]} />
      <meshStandardMaterial color={POWER_PELLET_COLOR} emissive={...} />
    </mesh>
  );
}
```

---

## Pick<T, K> — TypeScript Utility Type

The collision function uses `Pick` to request only the state fields it needs:

```typescript
currentState: Pick<GameState, 'powerPelletActive' | 'powerPelletTimer' | 'level'>
```

```python
# Python equivalent — TypedDict with only specific fields
class CollisionContext(TypedDict):
    power_pellet_active: bool
    power_pellet_timer: float
    level: int
```

`Pick` creates a new type with only the specified properties from the original. This is good documentation — it tells you exactly what the function depends on.

---

## Try It Yourself

1. **Change pellet score**: Set `PELLET_SCORE` to `100` in constants. Watch your score skyrocket.

2. **Infinite power pellet**: Set `POWER_PELLET_DURATION` to `999`. The ghosts stay frightened (blue) almost forever.

3. **Log collisions**: Add `console.log('collision!', collisionResult)` in `tick()` after `checkCollisions()`. Watch what events fire as you play.

4. **Inspect the Set**: In the browser console, check `useGameStore.getState().pelletSet.size` to see how many pellets remain.

---

**Next**: [10 — Level Progression](10-level-progression.md) — floors, difficulty scaling, and invisible walls.
