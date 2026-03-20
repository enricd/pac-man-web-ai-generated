import { CellType } from '../types/maze';
import type { MazeGrid, MazeData, GridPosition } from '../types/maze';
import {
  MAZE_WIDTH,
  MAZE_HEIGHT,
  GHOST_HOUSE_WIDTH,
  GHOST_HOUSE_HEIGHT,
  GHOST_HOUSE_ROW,
  GHOST_HOUSE_COL,
} from '../utils/constants';

/**
 * Generate a symmetric Pac-Man maze using recursive backtracking on the left half,
 * then mirroring to the right half. Includes ghost house, pellet placement, and
 * teleport corridors.
 */
export function generateMaze(seed?: number): MazeData {
  const rng = createRNG(seed ?? Math.floor(Math.random() * 1000000));
  const grid = createEmptyGrid();

  // Carve ghost house first
  carveGhostHouse(grid);

  // Carve paths using recursive backtracking on left half
  carvePathsLeftHalf(grid, rng);

  // Mirror left half to right
  mirrorLeftToRight(grid);

  // Ensure horizontal teleport corridors (at least 2)
  carveTeleportCorridors(grid);

  // Ensure ghost house is connected
  ensureGhostHouseConnection(grid);

  // Carve Pac-Man spawn area (bottom center)
  const pacmanSpawn = carvePacmanSpawn(grid);

  // Flood-fill validation and fix unreachable areas
  ensureAllPathsReachable(grid, pacmanSpawn);

  // Place pellets and power pellets (70% coverage)
  const { pellets, powerPellets } = placePellets(grid, rng);

  // Find teleport positions
  const { teleportLeft, teleportRight } = findTeleportPositions(grid);

  // Ghost positions
  const ghostDoor: GridPosition = {
    row: GHOST_HOUSE_ROW - 1,
    col: Math.floor(MAZE_WIDTH / 2),
  };
  const ghostSpawns = getGhostSpawns();

  return {
    grid,
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    pacmanSpawn,
    ghostSpawns,
    ghostDoor,
    pellets,
    powerPellets,
    teleportLeft,
    teleportRight,
  };
}

function createRNG(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function createEmptyGrid(): MazeGrid {
  return Array.from({ length: MAZE_HEIGHT }, () =>
    Array.from({ length: MAZE_WIDTH }, () => CellType.WALL)
  );
}

function carveGhostHouse(grid: MazeGrid): void {
  for (let r = GHOST_HOUSE_ROW; r < GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT; r++) {
    for (let c = GHOST_HOUSE_COL; c < GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH; c++) {
      grid[r][c] = CellType.GHOST_HOUSE;
    }
  }
  // Ghost door (centered above ghost house)
  const doorCol = Math.floor(MAZE_WIDTH / 2);
  grid[GHOST_HOUSE_ROW - 1][doorCol] = CellType.GHOST_DOOR;
  // Path above door
  grid[GHOST_HOUSE_ROW - 2][doorCol] = CellType.PATH;
}

function carvePathsLeftHalf(grid: MazeGrid, rng: () => number): void {
  const halfWidth = Math.floor(MAZE_WIDTH / 2);
  // Work on odd rows/cols to create a grid-based maze
  const visited = new Set<string>();

  // Start from (1, 1)
  const stack: GridPosition[] = [{ row: 1, col: 1 }];
  grid[1][1] = CellType.PATH;
  visited.add('1,1');

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(current, visited, halfWidth, grid);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    // Pick random neighbor
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

  // Add extra paths for more open maze (Pac-Man needs lots of corridors)
  addExtraPaths(grid, halfWidth, rng);
}

function getUnvisitedNeighbors(
  pos: GridPosition,
  visited: Set<string>,
  halfWidth: number,
  grid: MazeGrid
): GridPosition[] {
  const neighbors: GridPosition[] = [];
  const dirs = [
    { row: -2, col: 0 },
    { row: 2, col: 0 },
    { row: 0, col: -2 },
    { row: 0, col: 2 },
  ];

  for (const d of dirs) {
    const nr = pos.row + d.row;
    const nc = pos.col + d.col;
    if (
      nr >= 1 &&
      nr < MAZE_HEIGHT - 1 &&
      nc >= 1 &&
      nc < halfWidth &&
      !visited.has(`${nr},${nc}`) &&
      grid[nr][nc] !== CellType.GHOST_HOUSE &&
      grid[nr][nc] !== CellType.GHOST_DOOR
    ) {
      neighbors.push({ row: nr, col: nc });
    }
  }

  return neighbors;
}

function addExtraPaths(grid: MazeGrid, halfWidth: number, rng: () => number): void {
  // Remove ~18% of remaining walls — keeps maze denser with more walls
  for (let r = 1; r < MAZE_HEIGHT - 1; r++) {
    for (let c = 1; c < halfWidth; c++) {
      if (
        grid[r][c] === CellType.WALL &&
        rng() < 0.18 &&
        !isAdjacentToGhostHouse(r, c)
      ) {
        // Only remove if it connects two paths
        const pathNeighbors = countPathNeighbors(grid, r, c);
        if (pathNeighbors >= 2) {
          grid[r][c] = CellType.PATH;
        }
      }
    }
  }
}

function isAdjacentToGhostHouse(row: number, col: number): boolean {
  return (
    row >= GHOST_HOUSE_ROW - 1 &&
    row <= GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT &&
    col >= GHOST_HOUSE_COL - 1 &&
    col <= GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH
  );
}

function countPathNeighbors(grid: MazeGrid, row: number, col: number): number {
  let count = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < MAZE_HEIGHT && nc >= 0 && nc < MAZE_WIDTH) {
      if (grid[nr][nc] === CellType.PATH || grid[nr][nc] === CellType.GHOST_DOOR) {
        count++;
      }
    }
  }
  return count;
}

function mirrorLeftToRight(grid: MazeGrid): void {
  const halfWidth = Math.floor(MAZE_WIDTH / 2);
  for (let r = 0; r < MAZE_HEIGHT; r++) {
    for (let c = 0; c < halfWidth; c++) {
      grid[r][MAZE_WIDTH - 1 - c] = grid[r][c];
    }
  }
}

function carveTeleportCorridors(grid: MazeGrid): void {
  // Ensure at least 2 horizontal corridors spanning the full width
  const corridorRows = [
    Math.floor(MAZE_HEIGHT * 0.3),
    Math.floor(MAZE_HEIGHT * 0.7),
  ];

  for (const row of corridorRows) {
    // Skip if too close to ghost house
    if (row >= GHOST_HOUSE_ROW - 1 && row <= GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT) {
      continue;
    }
    for (let c = 0; c < MAZE_WIDTH; c++) {
      if (grid[row][c] === CellType.WALL) {
        grid[row][c] = CellType.PATH;
      }
    }
  }
}

function ensureGhostHouseConnection(grid: MazeGrid): void {
  const doorCol = Math.floor(MAZE_WIDTH / 2);
  // Ensure path from door upward
  for (let r = GHOST_HOUSE_ROW - 2; r >= GHOST_HOUSE_ROW - 3 && r >= 0; r--) {
    if (grid[r][doorCol] === CellType.WALL) {
      grid[r][doorCol] = CellType.PATH;
    }
  }
  // Ensure paths on sides of ghost house
  for (let r = GHOST_HOUSE_ROW; r < GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT; r++) {
    if (GHOST_HOUSE_COL - 1 >= 0) {
      grid[r][GHOST_HOUSE_COL - 1] = CellType.PATH;
    }
    if (GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH < MAZE_WIDTH) {
      grid[r][GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH] = CellType.PATH;
    }
  }
}

function carvePacmanSpawn(grid: MazeGrid): GridPosition {
  const row = MAZE_HEIGHT - 3;
  const col = Math.floor(MAZE_WIDTH / 2);
  grid[row][col] = CellType.PATH;
  // Ensure some space around spawn
  if (grid[row][col - 1] === CellType.WALL) grid[row][col - 1] = CellType.PATH;
  if (grid[row][col + 1] === CellType.WALL) grid[row][col + 1] = CellType.PATH;
  if (grid[row - 1][col] === CellType.WALL) grid[row - 1][col] = CellType.PATH;
  return { row, col };
}

function ensureAllPathsReachable(grid: MazeGrid, start: GridPosition): void {
  // BFS from Pac-Man spawn, find all reachable paths
  const reachable = new Set<string>();
  const queue: GridPosition[] = [start];
  reachable.add(`${start.row},${start.col}`);

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 && nr < MAZE_HEIGHT && nc >= 0 && nc < MAZE_WIDTH &&
        !reachable.has(key) &&
        (grid[nr][nc] === CellType.PATH || grid[nr][nc] === CellType.GHOST_DOOR)
      ) {
        reachable.add(key);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  // Find unreachable PATH cells and connect them
  for (let r = 1; r < MAZE_HEIGHT - 1; r++) {
    for (let c = 1; c < MAZE_WIDTH - 1; c++) {
      if (grid[r][c] === CellType.PATH && !reachable.has(`${r},${c}`)) {
        // Try to connect to a reachable cell by carving towards it
        connectToReachable(grid, { row: r, col: c }, reachable);
      }
    }
  }
}

function connectToReachable(
  grid: MazeGrid,
  start: GridPosition,
  reachable: Set<string>
): void {
  // BFS through walls to find nearest reachable path
  const visited = new Set<string>();
  const queue: { pos: GridPosition; path: GridPosition[] }[] = [
    { pos: start, path: [start] },
  ];
  visited.add(`${start.row},${start.col}`);

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      const key = `${nr},${nc}`;
      if (nr <= 0 || nr >= MAZE_HEIGHT - 1 || nc <= 0 || nc >= MAZE_WIDTH - 1) continue;
      if (visited.has(key)) continue;
      visited.add(key);

      if (reachable.has(key)) {
        // Found connection — carve all cells in path
        for (const p of path) {
          grid[p.row][p.col] = CellType.PATH;
          reachable.add(`${p.row},${p.col}`);
        }
        return;
      }

      if (grid[nr][nc] !== CellType.GHOST_HOUSE) {
        queue.push({ pos: { row: nr, col: nc }, path: [...path, { row: nr, col: nc }] });
      }
    }
  }
}

function placePellets(grid: MazeGrid, rng: () => number): {
  pellets: GridPosition[];
  powerPellets: GridPosition[];
} {
  const pellets: GridPosition[] = [];
  const powerPellets: GridPosition[] = [];

  // Power pellets in corners (always placed)
  const corners: GridPosition[] = [
    { row: 1, col: 1 },
    { row: 1, col: MAZE_WIDTH - 2 },
    { row: MAZE_HEIGHT - 2, col: 1 },
    { row: MAZE_HEIGHT - 2, col: MAZE_WIDTH - 2 },
  ];

  for (let r = 0; r < MAZE_HEIGHT; r++) {
    for (let c = 0; c < MAZE_WIDTH; c++) {
      if (grid[r][c] !== CellType.PATH) continue;
      // Skip Pac-Man spawn area
      if (r === MAZE_HEIGHT - 3 && c === Math.floor(MAZE_WIDTH / 2)) continue;

      const isCorner = corners.some(p => p.row === r && p.col === c);
      if (isCorner) {
        powerPellets.push({ row: r, col: c });
      } else {
        // Only place pellets on 70% of path cells
        if (rng() < 0.7) {
          pellets.push({ row: r, col: c });
        }
      }
    }
  }

  // Ensure corners are paths for power pellets
  for (const corner of corners) {
    if (grid[corner.row][corner.col] !== CellType.PATH) {
      grid[corner.row][corner.col] = CellType.PATH;
      powerPellets.push(corner);
    }
  }

  return { pellets, powerPellets };
}

function findTeleportPositions(grid: MazeGrid): {
  teleportLeft: GridPosition[];
  teleportRight: GridPosition[];
} {
  const teleportLeft: GridPosition[] = [];
  const teleportRight: GridPosition[] = [];

  for (let r = 0; r < MAZE_HEIGHT; r++) {
    if (grid[r][0] === CellType.PATH) {
      teleportLeft.push({ row: r, col: 0 });
    }
    if (grid[r][MAZE_WIDTH - 1] === CellType.PATH) {
      teleportRight.push({ row: r, col: MAZE_WIDTH - 1 });
    }
  }

  return { teleportLeft, teleportRight };
}

function getGhostSpawns(): GridPosition[] {
  const centerCol = Math.floor(MAZE_WIDTH / 2);
  const row = GHOST_HOUSE_ROW + 1;
  return [
    { row, col: centerCol },         // Blinky (starts at door, actually)
    { row, col: centerCol - 1 },     // Pinky
    { row, col: centerCol + 1 },     // Inky
    { row, col: centerCol },         // Clyde (shares with Blinky initially)
  ];
}
