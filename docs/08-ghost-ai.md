# 08 — Ghost AI: Four Personalities, One State Machine

> **Goal**: Understand how each ghost thinks, the mode system that governs behavior, and the pathfinding that makes them navigate the maze.

---

## The Design Principle

Ghost AI in Pac-Man is a masterclass in **emergent complexity from simple rules**. Each ghost follows one basic rule for picking a target tile, yet their combined behavior creates unpredictable, exciting gameplay. The original 1980 game used these exact strategies.

**Key constraint**: Ghost AI operates entirely on the 2D grid. They have no concept of 3D — the 3D rendering is purely visual. This is a clean separation: `systems/ghostAI.ts` has zero Three.js imports.

---

## The State Machine: Modes

Each ghost has a **mode** that determines their behavior:

```
                    ┌──────────┐
         ┌─────────│  SCATTER  │←─────────────────┐
         │         └────┬─────┘                    │
         │    7 seconds │                          │ Power pellet
         │              ▼                          │ timer expires
         │         ┌──────────┐     Power     ┌────┴──────┐
         │         │  CHASE   │────pellet────→│ FRIGHTENED │
         │         └────┬─────┘               └────┬──────┘
         │   20 seconds │                          │
         │              ▼                          │ Pac-Man
         └──────────────┘                          │ eats ghost
                                                   ▼
                                              ┌──────────┐
                                              │  EATEN   │
                                              └────┬─────┘
                                                   │ Reaches
                                                   │ ghost house
                                                   ▼
                                              Back to SCATTER/CHASE
```

```python
# Python mental model — a state machine
class GhostMode(Enum):
    SCATTER = "scatter"      # Go to assigned corner
    CHASE = "chase"          # Target Pac-Man (uniquely per ghost)
    FRIGHTENED = "frightened" # Run randomly, can be eaten
    EATEN = "eaten"          # Eyes only, rush back to ghost house
```

### Mode cycling

The game alternates between scatter and chase on a timer:

```
Game start → SCATTER (7s) → CHASE (20s) → SCATTER (7s) → CHASE (20s) → ...
```

```typescript
// In gameStore.ts tick():
const modeDuration = newIsScatter ? SCATTER_DURATION : CHASE_DURATION;
if (newModeTimer >= modeDuration) {
  newIsScatter = !newIsScatter;
  newModeTimer = 0;
  // Update all ghosts
  for (const g of finalGhosts) {
    if (g.mode !== 'frightened' && g.mode !== 'eaten') {
      g.mode = newIsScatter ? 'scatter' : 'chase';
    }
  }
}
```

When a power pellet is eaten, all non-eaten ghosts switch to `frightened` (overriding the scatter/chase cycle). When the power pellet timer expires, they return to the current scatter/chase mode.

---

## The Four Ghosts

Each ghost has a unique **chase targeting strategy**. In scatter mode, they each go to their assigned corner.

### Blinky (Red) — The Direct Chaser

```
Strategy: Target Pac-Man's current tile
Corner: Top-right
```

The simplest and most aggressive. Blinky always heads straight for where Pac-Man is right now.

```typescript
case 'blinky':
  return pacman.gridPos;  // That's it. Direct targeting.
```

```
Pac-Man: P    Blinky: B    Target: T(=P)

. . . . . . .
. . P . . . .    Blinky targets P directly
. . . . . B .    → moves left and up
. . . . . . .
```

### Pinky (Pink) — The Ambusher

```
Strategy: Target 4 tiles AHEAD of Pac-Man's current direction
Corner: Top-left
```

Pinky tries to get in front of Pac-Man, cutting off escape routes.

```typescript
case 'pinky': {
  const offset = directionToOffset(pacman.direction);
  return {
    row: clampRow(pacman.gridPos.row + offset.row * 4),
    col: clampCol(pacman.gridPos.col + offset.col * 4),
  };
}
```

```
Pac-Man moving RIGHT →

. . . . . . . . .
. . P → → → T . .    T is 4 tiles ahead of P
. . . . . . . . .    Pinky aims for T, not P
```

When Blinky chases from behind and Pinky attacks from the front, Pac-Man gets pinched — that's the intended teamwork.

### Inky (Cyan) — The Flanker

```
Strategy: Use Blinky's position to calculate a flanking target
Corner: Bottom-right
```

The most complex strategy. It creates a triangle between Blinky, Pac-Man, and Inky's target:

1. Find the tile 2 ahead of Pac-Man (call it A)
2. Draw a vector from Blinky to A
3. Double that vector to get the target

```typescript
case 'inky': {
  const ahead: GridPosition = {
    row: pacman.gridPos.row + pacOffset.row * 2,
    col: pacman.gridPos.col + pacOffset.col * 2,
  };
  if (blinky) {
    return {
      row: clampRow(ahead.row + (ahead.row - blinky.gridPos.row)),
      col: clampCol(ahead.col + (ahead.col - blinky.gridPos.col)),
    };
  }
  return ahead;
}
```

```
B = Blinky, P = Pac-Man (moving right), A = 2 ahead, T = Inky's target

. . . . . . . . . . . .
. B . . . . . . . . . .    Vector from B to A, doubled:
. . . . P → A . . . . .    B(1,1) → A(2,6): delta = (1,5)
. . . . . . . . . T . .    Target = A + delta = (3, 11)
```

This creates unpredictable flanking behavior, especially when Blinky is far from Pac-Man.

### Clyde (Orange) — The Shy One

```
Strategy: Chase if far (>8 tiles), scatter if close
Corner: Bottom-left
```

Clyde is the wildcard. When far away, he chases like Blinky. When close, he retreats to his corner. This creates an oscillating behavior — he approaches, gets close, retreats, then approaches again.

```typescript
case 'clyde': {
  const dist = distanceSquared(ghost.gridPos, pacman.gridPos);
  if (dist > 64) {  // 8² = 64 (distance > 8 tiles)
    return pacman.gridPos;       // Chase like Blinky
  }
  return ghost.scatterTarget;     // Retreat to bottom-left corner
}
```

```python
# Python equivalent
def clyde_target(clyde_pos, pacman_pos, scatter_corner):
    if euclidean_distance(clyde_pos, pacman_pos) > 8:
        return pacman_pos      # Chase
    return scatter_corner       # Retreat
```

**Why distance squared?** Computing `sqrt` is expensive. Since we're comparing against a threshold (`8`), we compare `distSq > 8² = 64` instead. Same result, no square root.

---

## Pathfinding: Choosing a Direction

Once a ghost has a target tile, how does it navigate? **It doesn't pathfind** in the traditional sense (no A*, no BFS). Instead, at each intersection, it picks the direction that minimizes straight-line distance to the target:

```typescript
function moveTowardsTarget(ghost, target, grid, canEnterGhostHouse): Direction {
  const pos = ghost.targetGridPos;
  const reverse = oppositeDirection(ghost.direction);

  let bestDir: Direction = 'none';
  let bestDist = Infinity;

  for (const dir of ['up', 'left', 'down', 'right']) {
    if (dir === reverse) continue;  // Can't reverse!

    if (canMoveGhost(pos, dir, grid, canEnterGhostHouse)) {
      const offset = directionToOffset(dir);
      const nextPos = { row: pos.row + offset.row, col: pos.col + offset.col };
      const dist = distanceSquared(nextPos, target);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
  }

  return bestDir;
}
```

### The no-reverse rule

Ghosts **cannot reverse direction** during normal movement. At an intersection with 3 exits, a ghost coming from the south can go east, west, or north — but not back south.

This prevents ghosts from oscillating back and forth and creates the characteristic Pac-Man ghost behavior where they commit to a path and only change at intersections.

```
Ghost moving RIGHT at intersection:
        ↑ (can go)
        │
← ─ ─ ─ ● ─ ─ → (can go, or current direction continues)
        │
        ↓ (can go)

✗ Can NOT go left (reverse)
```

### Priority order

When two directions are equidistant, the priority is: up > left > down > right. This is the original Pac-Man priority and creates subtle behavioral patterns.

---

## Frightened Mode

When a power pellet is eaten, ghosts turn blue and move randomly:

```typescript
function chooseFrightenedDirection(ghost, grid): Direction {
  const reverse = oppositeDirection(ghost.direction);
  const available: Direction[] = [];

  for (const dir of ALL_DIRECTIONS) {
    if (dir === reverse) continue;
    if (canMoveGhost(pos, dir, grid, false)) {
      available.push(dir);
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}
```

Still no reversing. Still picks from available directions. But instead of targeting a specific tile, it's purely random. This makes frightened ghosts unpredictable and fun to chase.

---

## Eaten Mode

When Pac-Man eats a frightened ghost, it enters "eaten" mode — just eyeballs rushing back to the ghost house:

```typescript
if (ghost.mode === 'eaten') {
  return moveTowardsTarget(ghost, getGhostHouseDoor(), grid, true);
  //                                ↑ Target: ghost house door
  //                                                         ↑ CAN enter ghost house
}
```

Eaten ghosts:
- Target the ghost house door
- Move at `GHOST_EATEN_SPEED` (10 cells/sec, much faster than normal)
- Can enter the ghost house (normal ghosts can't re-enter)
- Respawn when they reach the ghost house interior

---

## Ghost House Release

Ghosts start inside the ghost house and are released on a stagger:

| Ghost | Release Time |
|-------|-------------|
| Blinky | 0s (immediately) |
| Pinky | 3s |
| Inky | 6s |
| Clyde | 9s |

```typescript
// In tick():
if (isInGhostHouse(ghost.gridPos) && elapsed < ghost.releaseTime) {
  return { ...ghost };  // Stay put, don't move
}

// Once released, move toward the door
if (isInGhostHouse(ghost.gridPos)) {
  const exitDir = getGhostHouseExitDirection(ghost.gridPos);
  // Move up and out through the door
}
```

---

## Scatter Targets (Corners)

During scatter mode, each ghost targets a corner of the maze:

```
Pinky (top-left)                    Blinky (top-right)
    ●─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─●
    │                              │
    │     ┌──────────────┐        │
    │     │  Ghost House │        │
    │     └──────────────┘        │
    │                              │
    ●─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─●
Clyde (bottom-left)              Inky (bottom-right)
```

```typescript
export const GHOST_SCATTER_TARGETS: Record<string, GridPosition> = {
  blinky: { row: 0, col: MAZE_WIDTH - 1 },        // Top-right
  pinky: { row: 0, col: 0 },                       // Top-left
  inky: { row: MAZE_HEIGHT - 1, col: MAZE_WIDTH - 1 }, // Bottom-right
  clyde: { row: MAZE_HEIGHT - 1, col: 0 },         // Bottom-left
};
```

Since ghosts can't reach the actual corner (it's a wall), they orbit near it. This creates the characteristic "ghosts circling in their corners" behavior during scatter mode.

---

## Pure Functions: No Side Effects

Notice that `chooseGhostDirection()` is a **pure function** — it takes inputs and returns a direction. It doesn't modify any state:

```typescript
export function chooseGhostDirection(
  ghost: GhostState,         // Current ghost state (read-only)
  pacman: CharacterState,    // Pac-Man state (read-only)
  blinky: GhostState | null, // Blinky for Inky's calculation
  grid: MazeGrid             // Maze for collision checks
): Direction {               // Returns a direction — that's it
```

```python
# Python equivalent — pure function
def choose_ghost_direction(
    ghost: GhostState,
    pacman: CharacterState,
    blinky: Optional[GhostState],
    grid: MazeGrid
) -> Direction:
    # No side effects, no mutation, just returns a value
    ...
```

This makes the AI:
- **Testable** — pass in mock state, assert the returned direction
- **Debuggable** — log inputs and outputs at any point
- **Composable** — the store calls this function and applies the result separately

---

## How It All Fits Together (in tick)

```typescript
// In gameStore.ts tick():
const newGhosts = ghosts.map((ghost, i) => {
  // 1. Still in ghost house? Wait.
  if (isInGhostHouse(ghost.gridPos) && elapsed < ghost.releaseTime) {
    return { ...ghost };
  }

  // 2. Exiting ghost house? Move toward door.
  if (isInGhostHouse(ghost.gridPos)) {
    const exitDir = getGhostHouseExitDirection(ghost.gridPos);
    return updateCharacterMovement({ ...ghost, nextDirection: exitDir }, grid, speed, delta);
  }

  // 3. At cell center? AI chooses new direction.
  if (ghost.moveProgress >= 1) {
    const chosenDir = chooseGhostDirection(ghost, newPacman, blinky, grid);
    ghost.nextDirection = chosenDir;
  }

  // 4. Move toward target (same movement system as Pac-Man)
  return updateCharacterMovement(ghost, grid, speed, delta);
});
```

---

## Try It Yourself

1. **Watch scatter mode**: At game start, ghosts scatter for 7 seconds. Watch them head to their corners. Then chase mode kicks in and they converge on Pac-Man.

2. **Test Clyde's oscillation**: Get near Clyde (orange). Watch him approach, then suddenly retreat when within 8 tiles. Move away and he chases again.

3. **Modify a ghost's behavior**: In `ghostAI.ts`, change Blinky to target 8 tiles ahead (like an extreme Pinky). See how the game feels different.

4. **Log targeting**: Add `console.log(ghost.name, target)` inside `getTargetTile()` to see where each ghost is aiming in real-time.

---

**Next**: [09 — Pellets, Scoring, and Collisions](09-pellets-scoring-collisions.md) — how we detect and respond to in-game events.
