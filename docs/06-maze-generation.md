# 06 — Maze Generation: From Algorithm to 3D Walls

> **Goal**: Understand how the maze is procedurally generated, why it's symmetric, and how a 2D grid becomes a 3D scene.

---

## The Algorithm: Recursive Backtracking

Our maze generator uses **recursive backtracking** (also called "depth-first search maze generation"). If you've used DFS for graph traversal in Python, this is the same idea — but instead of exploring a graph, we're **carving paths** through a wall grid.

### The idea

1. Start with a grid entirely filled with walls
2. Pick a starting cell, mark it as a path
3. Look at unvisited neighbors (2 cells away — so there's a wall between)
4. Pick a random neighbor, knock down the wall between, move there
5. Repeat from the new cell
6. When stuck (no unvisited neighbors), backtrack to the last cell that had options
7. Stop when all reachable cells are visited

```python
# Python equivalent of the core algorithm
def generate_maze(width, height):
    grid = [[WALL] * width for _ in range(height)]
    visited = set()
    stack = [(1, 1)]
    grid[1][1] = PATH
    visited.add((1, 1))

    while stack:
        current = stack[-1]
        neighbors = get_unvisited_neighbors(current, visited, width, height)

        if not neighbors:
            stack.pop()  # Backtrack
            continue

        next_cell = random.choice(neighbors)
        # Knock down wall between current and next
        wall_r = (current[0] + next_cell[0]) // 2
        wall_c = (current[1] + next_cell[1]) // 2
        grid[wall_r][wall_c] = PATH
        grid[next_cell[0]][next_cell[1]] = PATH

        visited.add(next_cell)
        stack.append(next_cell)

    return grid
```

```typescript
// src/systems/mazeGenerator.ts — the actual implementation
function carvePathsLeftHalf(grid: MazeGrid, rng: () => number): void {
  const halfWidth = Math.floor(MAZE_WIDTH / 2);
  const visited = new Set<string>();
  const stack: GridPosition[] = [{ row: 1, col: 1 }];
  grid[1][1] = CellType.PATH;
  visited.add('1,1');

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(current, visited, halfWidth, grid);

    if (neighbors.length === 0) {
      stack.pop();  // Backtrack
      continue;
    }

    const idx = Math.floor(rng() * neighbors.length);
    const next = neighbors[idx];

    // Carve wall between current and next
    const wallRow = current.row + (next.row - current.row) / 2;
    const wallCol = current.col + (next.col - current.col) / 2;
    grid[wallRow][wallCol] = CellType.PATH;
    grid[next.row][next.col] = CellType.PATH;

    visited.add(`${next.row},${next.col}`);
    stack.push(next);
  }

  addExtraPaths(grid, halfWidth, rng);  // Open up the maze more
}
```

### Why "2 cells away"?

We work on a grid where walls and paths occupy cells:

```
W W W W W W W     W = Wall, P = Path
W P P P W W W
W W W P W W W     Starting from (1,1), neighbors are (1,3), (3,1)
W W W P P P W     Not (1,2) — that's the wall between, we knock it down
W W W W W P W
W W W W W W W
```

This gives us guaranteed 1-cell-thick walls between paths.

---

## Symmetry: Left Half → Mirror Right

Classic Pac-Man mazes are **left-right symmetric**. We achieve this by:

1. Generate paths only on the **left half** (columns 0 to `MAZE_WIDTH/2 - 1`)
2. **Mirror** the left half to the right half

```typescript
// src/systems/mazeGenerator.ts
function mirrorLeftToRight(grid: MazeGrid): void {
  const halfWidth = Math.floor(MAZE_WIDTH / 2);
  for (let r = 0; r < MAZE_HEIGHT; r++) {
    for (let c = 0; c < halfWidth; c++) {
      grid[r][MAZE_WIDTH - 1 - c] = grid[r][c];
    }
  }
}
```

Visual example (28-wide maze):
```
Left half (generated)    →    Right half (mirrored)
W P P W W W W W W W W W W W | W W W W W W W W W W W P P W
W P W W P P P W W W W W W W | W W W W W W W P P P W W P W
```

Column `c` maps to column `MAZE_WIDTH - 1 - c`. So column 0 → 27, column 1 → 26, etc.

---

## The Ghost House

The ghost house is a fixed rectangular area carved into the center of the maze:

```typescript
function carveGhostHouse(grid: MazeGrid): void {
  // 6 cells wide, 3 cells tall, centered
  for (let r = GHOST_HOUSE_ROW; r < GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT; r++) {
    for (let c = GHOST_HOUSE_COL; c < GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH; c++) {
      grid[r][c] = CellType.GHOST_HOUSE;
    }
  }
  // Door above the house (center column)
  grid[GHOST_HOUSE_ROW - 1][Math.floor(MAZE_WIDTH / 2)] = CellType.GHOST_DOOR;
}
```

```
. . . . . . . . . . . . . .
. . . . . D . . . . . . . .    D = Ghost Door
. . . . G G G G G G . . . .    G = Ghost House
. . . . G G G G G G . . . .
. . . . G G G G G G . . . .
. . . . . . . . . . . . . .
```

The ghost house is carved **before** the recursive backtracking, and the carving algorithm avoids it (`grid[nr][nc] !== CellType.GHOST_HOUSE`). After mirroring, we ensure it's connected to the surrounding paths.

---

## Making the Maze Playable

Pure recursive backtracking creates a perfect maze (exactly one path between any two points). That's too restrictive for Pac-Man — you need multiple routes and open corridors. We fix this in several ways:

### 1. Extra path carving

After the main algorithm, we randomly remove ~30% of remaining walls that connect two paths:

```typescript
function addExtraPaths(grid: MazeGrid, halfWidth: number, rng: () => number): void {
  for (let r = 1; r < MAZE_HEIGHT - 1; r++) {
    for (let c = 1; c < halfWidth; c++) {
      if (grid[r][c] === CellType.WALL && rng() < 0.3) {
        if (countPathNeighbors(grid, r, c) >= 2) {
          grid[r][c] = CellType.PATH;  // Connect two paths
        }
      }
    }
  }
}
```

This creates loops and multiple routes — essential for Pac-Man gameplay.

### 2. Teleport corridors

At least 2 horizontal rows span the full width, allowing left-right traversal and edge teleportation:

```typescript
function carveTeleportCorridors(grid: MazeGrid): void {
  const corridorRows = [
    Math.floor(MAZE_HEIGHT * 0.3),   // Upper third
    Math.floor(MAZE_HEIGHT * 0.7),   // Lower third
  ];
  for (const row of corridorRows) {
    for (let c = 0; c < MAZE_WIDTH; c++) {
      if (grid[row][c] === CellType.WALL) {
        grid[row][c] = CellType.PATH;
      }
    }
  }
}
```

### 3. Flood-fill validation

After all carving, we verify every path cell is reachable from Pac-Man's spawn:

```typescript
function ensureAllPathsReachable(grid: MazeGrid, start: GridPosition): void {
  // BFS from spawn
  const reachable = new Set<string>();
  const queue = [start];
  // ... standard BFS ...

  // Find any unreachable paths and connect them
  for (let r = 1; r < MAZE_HEIGHT - 1; r++) {
    for (let c = 1; c < MAZE_WIDTH - 1; c++) {
      if (grid[r][c] === CellType.PATH && !reachable.has(`${r},${c}`)) {
        connectToReachable(grid, { row: r, col: c }, reachable);
      }
    }
  }
}
```

```python
# Python equivalent — BFS flood fill
from collections import deque

def flood_fill(grid, start):
    reachable = set()
    queue = deque([start])
    reachable.add(start)

    while queue:
        r, c = queue.popleft()
        for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
            nr, nc = r + dr, c + dc
            if (nr, nc) not in reachable and grid[nr][nc] == PATH:
                reachable.add((nr, nc))
                queue.append((nr, nc))

    return reachable
```

---

## Pellet Placement

After the maze is carved, every `PATH` cell gets a pellet (except Pac-Man's spawn). The four corner-most path cells get **power pellets**:

```typescript
function placePellets(grid: MazeGrid) {
  const corners = [
    { row: 1, col: 1 },
    { row: 1, col: MAZE_WIDTH - 2 },
    { row: MAZE_HEIGHT - 2, col: 1 },
    { row: MAZE_HEIGHT - 2, col: MAZE_WIDTH - 2 },
  ];

  for (let r = 0; r < MAZE_HEIGHT; r++) {
    for (let c = 0; c < MAZE_WIDTH; c++) {
      if (grid[r][c] !== CellType.PATH) continue;
      if (isCorner) powerPellets.push({ row: r, col: c });
      else pellets.push({ row: r, col: c });
    }
  }
}
```

---

## Grid → World: The Coordinate Mapping

The maze exists as a 2D array of integers. The 3D scene needs floating-point XYZ positions. The bridge is `gridToWorld()`:

```typescript
// src/utils/helpers.ts
export function gridToWorld(pos: GridPosition): [number, number] {
  const x = (pos.col - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
  const z = (pos.row - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
  return [x, z];
}
```

Breaking it down:
- `pos.col - MAZE_WIDTH / 2` — centers the maze (column 14 of a 28-wide maze → x=0)
- `+ 0.5` — positions at cell center, not edge
- `* CELL_SIZE` — scales to world units (1 cell = 1 unit)

```
Grid:  col 0  col 1  col 2  ... col 27
       ↓
World: x=-13.5  x=-12.5  x=-11.5  ... x=13.5
```

The Y coordinate is set per object type:
- Floor: y = 0
- Pellets: y = 0.25
- Characters: y = 0.5
- Wall centers: y = WALL_HEIGHT / 2 = 0.75

---

## Seeded Randomness

The maze generator uses a **seeded pseudo-random number generator** so the same seed always produces the same maze:

```typescript
function createRNG(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
```

This is a **linear congruential generator** (LCG) — the simplest PRNG. The same algorithm used in many C standard libraries.

```python
# Python equivalent
import random
rng = random.Random(42)  # Seeded — same sequence every time
rng.random()  # 0.6394...
```

We use this so that even levels can reuse the same maze as the odd level before them — same seed → same maze.

---

## The Full Pipeline

```
generateMaze(seed)
  │
  ├─ createEmptyGrid()          → 31×28 grid of WALL
  ├─ carveGhostHouse()          → GHOST_HOUSE cells + GHOST_DOOR
  ├─ carvePathsLeftHalf()       → Recursive backtracking on left 14 columns
  │   └─ addExtraPaths()        → Random wall removal for open corridors
  ├─ mirrorLeftToRight()        → Copy left half to right half
  ├─ carveTeleportCorridors()   → Full-width paths at rows 9 and 21
  ├─ ensureGhostHouseConnection() → Paths around ghost house
  ├─ carvePacmanSpawn()         → Clear area at bottom center
  ├─ ensureAllPathsReachable()  → BFS + connect isolated areas
  ├─ placePellets()             → Pellet on every PATH cell
  └─ findTeleportPositions()    → PATH cells on left/right edges
  │
  └─ Returns MazeData { grid, pacmanSpawn, ghostSpawns, pellets, ... }
```

---

## Try It Yourself

1. **Visualize the grid**: Add this to any component temporarily:
   ```tsx
   console.log(useGameStore.getState().mazeData.grid.map(
     row => row.map(c => c === 1 ? '.' : c === 0 ? '#' : c === 2 ? 'G' : 'D').join('')
   ).join('\n'));
   ```
   Check the browser console — you'll see an ASCII maze.

2. **Change maze density**: In `addExtraPaths`, change `0.3` to `0.6` (60% wall removal) and see how much more open the maze becomes.

3. **Trace the symmetry**: Look at the console maze output. Verify that the left half mirrors the right half exactly.

4. **Count pellets**: `useGameStore.getState().pelletsRemaining` tells you how many pellets the current maze has. How does this compare to the classic Pac-Man (240 dots + 4 power pellets)?

---

**Next**: [07 — Game Loop and Movement](07-game-loop-and-movement.md) — how characters move smoothly on a grid.
