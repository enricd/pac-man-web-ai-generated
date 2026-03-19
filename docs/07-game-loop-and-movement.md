# 07 — Game Loop and Movement: Smooth Grid-Based Motion

> **Goal**: Understand frame-rate independent movement, grid-based mechanics, input buffering, and the lerp interpolation that makes it look smooth.

---

## The Game Loop Pattern

Every game — from Pac-Man to AAA titles — runs a loop:

```
while game_running:
    delta = time_since_last_frame()
    handle_input()
    update_game_state(delta)
    render()
```

```python
# Python (pygame) equivalent
clock = pygame.time.Clock()
while running:
    delta = clock.tick(60) / 1000.0  # seconds since last frame
    handle_events()
    update(delta)
    screen.blit(...)
    pygame.display.flip()
```

In our project, this loop is split across:
- **Input**: `useKeyboard.ts` → event listener → `setDirection()`
- **Update**: `useGameLoop.ts` → `useFrame` → `tick(delta)`
- **Render**: React Three Fiber handles this automatically

```typescript
// src/hooks/useGameLoop.ts
export function useGameLoop(): void {
  const tick = useGameStore(s => s.tick);

  useFrame((_state, delta) => {
    const clampedDelta = Math.min(delta, 0.1);  // Cap at 100ms
    tick(clampedDelta);
  });
}
```

### Why clamp delta?

If the browser tab is unfocused for 5 seconds, `delta` would be 5.0 — characters would teleport across the entire maze. Clamping to 0.1s means at worst we simulate a 10fps frame.

```python
# Same concept in Python
delta = min(clock.tick() / 1000.0, 0.1)  # Never simulate more than 100ms
```

---

## Frame-Rate Independence

**The problem**: if you move 1 pixel per frame, a 120fps computer moves twice as fast as a 60fps one.

**The solution**: multiply by `delta` (time since last frame):

```typescript
// Bad: frame-rate dependent
position += speed;  // At 60fps: 60 units/sec. At 120fps: 120 units/sec.

// Good: frame-rate independent
position += speed * delta;  // Always speed units/sec, regardless of FPS
```

| FPS | delta (seconds) | Movement per frame (speed=5) | Movement per second |
|-----|-----------------|-----------------------------|--------------------|
| 30 | 0.033 | 0.167 | 5.0 |
| 60 | 0.017 | 0.083 | 5.0 |
| 144 | 0.007 | 0.035 | 5.0 |

All reach the same distance per second. This is fundamental to any real-time simulation.

---

## Grid-Based Movement

In classic Pac-Man, characters don't float freely — they snap to grid cells and move between them. This makes collision detection trivial (same cell = collision) and keeps the game deterministic.

### The state model

```typescript
// src/types/game.ts
export interface CharacterState {
  gridPos: GridPosition;        // Cell we're moving FROM
  targetGridPos: GridPosition;  // Cell we're moving TO
  direction: Direction;         // Current movement direction
  nextDirection: Direction;     // Buffered input (see below)
  moveProgress: number;         // 0.0 = at gridPos, 1.0 = at targetGridPos
}
```

```
moveProgress: 0.0         0.5         1.0
              ●───────────◐───────────●
           gridPos                 targetGridPos
              (3,5)                    (3,6)
```

At `moveProgress = 0.0`, the character is at `gridPos`. At `1.0`, they've arrived at `targetGridPos`. Between 0 and 1, they're interpolated.

### The movement function

```typescript
// src/systems/movement.ts
export function updateCharacterMovement(
  state: CharacterState,
  grid: MazeGrid,
  speed: number,
  delta: number,
  allowReverse: boolean = false
): CharacterState {
  let { gridPos, targetGridPos, direction, nextDirection, moveProgress } = state;

  // === Phase 1: At cell center — decide next move ===
  if (moveProgress >= 1 || gridEqual(gridPos, targetGridPos)) {
    gridPos = { ...targetGridPos };  // Snap to target
    moveProgress = 0;

    // Try buffered direction first
    if (nextDirection !== 'none' && canMove(gridPos, nextDirection, grid)) {
      direction = nextDirection;
      nextDirection = 'none';
    }

    // Set new target
    if (direction !== 'none' && canMove(gridPos, direction, grid)) {
      const offset = directionToOffset(direction);
      targetGridPos = {
        row: gridPos.row + offset.row,
        col: gridPos.col + offset.col,
      };
    }
  }

  // === Phase 2: Advance movement ===
  if (!gridEqual(gridPos, targetGridPos)) {
    moveProgress += speed * delta;  // speed cells/second × seconds = cells
    if (moveProgress > 1) moveProgress = 1;
  }

  return { gridPos, targetGridPos, direction, nextDirection, moveProgress };
}
```

The key insight: **decisions happen at cell centers** (moveProgress reaches 1.0), **movement is continuous** (moveProgress interpolates between cells).

---

## Input Buffering (nextDirection)

Without buffering, you'd have to press the arrow key at the exact frame when Pac-Man reaches a cell center. That's ~17ms at 60fps — impossible to time consistently.

**The solution**: `nextDirection` stores your most recent key press. When Pac-Man reaches the next cell center, it checks `nextDirection` first:

```
Frame 1: User presses LEFT → nextDirection = 'left'
Frame 2: Pac-Man still moving right (moveProgress = 0.7)
Frame 3: Pac-Man still moving right (moveProgress = 0.9)
Frame 4: Pac-Man reaches cell center (moveProgress >= 1.0)
         → Check nextDirection: 'left'
         → Can move left? Yes → direction = 'left', nextDirection = 'none'
         → New target: one cell to the left
```

```typescript
// src/hooks/useKeyboard.ts
const handleKeyDown = (e: KeyboardEvent) => {
  const dir = KEY_MAP[e.key];
  if (dir) {
    setDirection(dir);  // → store.pacman.nextDirection = dir
  }
};
```

```typescript
// In movement update (at cell center):
if (nextDirection !== 'none' && canMove(gridPos, nextDirection, grid)) {
  direction = nextDirection;    // Apply buffered direction
  nextDirection = 'none';       // Clear buffer
}
```

This is why Pac-Man feels responsive — you can press the key slightly early and the turn happens at the right moment.

### Pac-Man can reverse instantly

One special rule: Pac-Man can reverse direction mid-cell (ghosts can't):

```typescript
// Mid-movement reversal (only for Pac-Man, allowReverse = true)
if (allowReverse && nextDirection !== 'none' && isReverse(direction, nextDirection)) {
  const temp = gridPos;
  gridPos = targetGridPos;
  targetGridPos = temp;
  moveProgress = 1 - moveProgress;  // Reverse progress
  direction = nextDirection;
}
```

If Pac-Man is 70% of the way right, pressing left swaps gridPos/targetGridPos and sets progress to 30% (going back). This makes Pac-Man feel instantly responsive to direction changes.

---

## Lerp: Smooth Visual Interpolation

The game logic operates on discrete grid cells, but the 3D rendering needs smooth floating-point positions. **Lerp** (linear interpolation) bridges the gap:

```typescript
// src/utils/helpers.ts
export function lerpGridToWorld(
  from: GridPosition,
  to: GridPosition,
  t: number  // 0.0 to 1.0
): [number, number] {
  const [x1, z1] = gridToWorld(from);
  const [x2, z2] = gridToWorld(to);
  return [
    x1 + (x2 - x1) * t,   // Interpolated X
    z1 + (z2 - z1) * t,    // Interpolated Z
  ];
}
```

```python
# Python equivalent
def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation: a when t=0, b when t=1, midpoint when t=0.5"""
    return a + (b - a) * t
```

Visual example:
```
t=0.0: Pac-Man at gridPos → world (2.0, 5.0)
t=0.3: Pac-Man at lerp    → world (2.3, 5.0)   (moving right)
t=0.7: Pac-Man at lerp    → world (2.7, 5.0)
t=1.0: Pac-Man at target  → world (3.0, 5.0)
```

### Where lerp is used

```tsx
// src/components/characters/PacMan.tsx
useFrame(() => {
  const { pacman } = useGameStore.getState();
  const [x, z] = lerpGridToWorld(
    pacman.gridPos,
    pacman.targetGridPos,
    pacman.moveProgress
  );
  meshRef.current.position.set(x, 0.5, z);
});
```

Every frame, Pac-Man's mesh is repositioned based on the current `moveProgress`. Since `moveProgress` increases smoothly (by `speed * delta`), the visual movement is smooth.

---

## Wall Collision

Before moving, we check if the target cell is walkable:

```typescript
export function canMove(pos: GridPosition, dir: Direction, grid: MazeGrid): boolean {
  const offset = directionToOffset(dir);
  let nr = pos.row + offset.row;
  let nc = pos.col + offset.col;

  // Teleport wrapping
  if (nc < 0) nc = MAZE_WIDTH - 1;
  if (nc >= MAZE_WIDTH) nc = 0;
  if (nr < 0 || nr >= MAZE_HEIGHT) return false;

  const cell = grid[nr][nc];
  return cell === CellType.PATH || cell === CellType.GHOST_DOOR;
}
```

Simple! Check the grid cell in the desired direction. If it's a wall or ghost house (for Pac-Man), you can't move there. The grid makes this O(1).

```python
# Python equivalent
def can_move(pos, direction, grid):
    dr, dc = DIRECTION_OFFSETS[direction]
    nr, nc = pos.row + dr, pos.col + dc
    nc = nc % MAZE_WIDTH  # Wrap for teleport
    return grid[nr][nc] in (PATH, GHOST_DOOR)
```

---

## Teleportation

When Pac-Man reaches column 0 moving left, `wrapPosition()` sends them to column `MAZE_WIDTH - 1`:

```typescript
function wrapPosition(pos: GridPosition): GridPosition {
  let { row, col } = pos;
  if (col < 0) col = MAZE_WIDTH - 1;
  if (col >= MAZE_WIDTH) col = 0;
  return { row, col };
}
```

And `canMove` handles the same wrapping for collision checks, so moving left from column 0 checks column 27 for a wall.

---

## Ghost Movement vs Pac-Man Movement

Both use the same `updateCharacterMovement` function, but with different parameters:

| Parameter | Pac-Man | Ghost |
|-----------|---------|-------|
| `speed` | `PACMAN_SPEED` (5.5) | `GHOST_SPEED × levelMultiplier` |
| `allowReverse` | `true` | `false` (ghosts can't reverse) |
| `direction chosen by` | Player (keyboard) | AI (`chooseGhostDirection`) |

Ghosts choose their direction at each cell center (see doc 08), then the movement system handles the smooth interpolation identically.

---

## Camera Follow

The camera uses the same lerp concept but with **exponential smoothing** (damping):

```typescript
// src/components/camera/GameCamera.tsx
camera.position.x += (targetX - camera.position.x) * CAMERA_DAMPING;
```

Instead of snapping to the target, the camera moves a fraction (`CAMERA_DAMPING = 0.05` = 5%) of the remaining distance each frame. This creates a smooth, slightly-lagging follow:

```
Frame 1: camera=0, target=10 → move 5% of 10 → camera=0.5
Frame 2: camera=0.5, target=10 → move 5% of 9.5 → camera=0.975
Frame 3: camera=0.975, target=10 → move 5% of 9.025 → camera=1.426
...
Frame 60: camera ≈ 9.5 (95% there after ~1 second)
```

This is also called an **exponential moving average** or **low-pass filter** — the same math used in signal processing and financial indicators.

---

## Timing Summary

```
Speed: 5.5 cells/second
Cell size: 1 world unit
Time to cross one cell: 1/5.5 = 0.182 seconds = 182ms

At 60fps:
- Frames per cell: ~11 frames
- moveProgress increment per frame: 5.5 × 0.017 ≈ 0.092

Decision points: ~5.5 per second (each cell center)
```

---

## Try It Yourself

1. **Slow down Pac-Man**: Change `PACMAN_SPEED` to `2` in `constants.ts`. Feel how the input buffering still works — press a direction early and it applies at the next cell center.

2. **Disable input buffering**: In `movement.ts`, comment out the `nextDirection` check. Now you must press the key at exactly the right moment. Notice how much worse it feels.

3. **Visualize movement progress**: Log `pacman.moveProgress` inside `tick()`. Watch it go 0→1→0→1 as Pac-Man crosses cells.

4. **Break the speed**: Set `PACMAN_SPEED` to `50`. What happens? Does the game still work? (Hint: `moveProgress` might jump past 1.0 in one frame, which is clamped.)

---

**Next**: [08 — Ghost AI](08-ghost-ai.md) — how each ghost thinks differently.
