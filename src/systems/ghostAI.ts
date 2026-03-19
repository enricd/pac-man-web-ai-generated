import type { Direction, GhostState, CharacterState, GhostName } from '../types/game';
import type { MazeGrid, GridPosition } from '../types/maze';
import { CellType } from '../types/maze';
import { directionToOffset, oppositeDirection, distanceSquared } from '../utils/helpers';
import { MAZE_WIDTH, MAZE_HEIGHT, GHOST_HOUSE_ROW, GHOST_HOUSE_COL, GHOST_HOUSE_WIDTH, GHOST_HOUSE_HEIGHT } from '../utils/constants';

const ALL_DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];

/**
 * Choose the next direction for a ghost based on its AI behavior.
 * All ghost AI operates on the 2D grid — no 3D awareness needed.
 */
export function chooseGhostDirection(
  ghost: GhostState,
  pacman: CharacterState,
  blinky: GhostState | null,
  grid: MazeGrid
): Direction {
  if (ghost.mode === 'eaten') {
    return moveTowardsTarget(ghost, getGhostHouseDoor(), grid, true);
  }

  if (ghost.mode === 'frightened') {
    return chooseFrightenedDirection(ghost, grid);
  }

  const target = getTargetTile(ghost, pacman, blinky);
  return moveTowardsTarget(ghost, target, grid, false);
}

function getTargetTile(
  ghost: GhostState,
  pacman: CharacterState,
  blinky: GhostState | null
): GridPosition {
  if (ghost.mode === 'scatter') {
    return ghost.scatterTarget;
  }

  // Chase mode — each ghost has unique targeting
  switch (ghost.name) {
    case 'blinky':
      // Targets Pac-Man's current tile
      return pacman.gridPos;

    case 'pinky': {
      // Targets 4 tiles ahead of Pac-Man
      const offset = directionToOffset(pacman.direction);
      return {
        row: clampRow(pacman.gridPos.row + offset.row * 4),
        col: clampCol(pacman.gridPos.col + offset.col * 4),
      };
    }

    case 'inky': {
      // Flanking: double the vector from Blinky to 2 tiles ahead of Pac-Man
      const pacOffset = directionToOffset(pacman.direction);
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

    case 'clyde': {
      // Chase if far (>8 tiles), scatter if close
      const dist = distanceSquared(ghost.gridPos, pacman.gridPos);
      if (dist > 64) { // 8^2
        return pacman.gridPos;
      }
      return ghost.scatterTarget;
    }

    default:
      return pacman.gridPos;
  }
}

function moveTowardsTarget(
  ghost: GhostState,
  target: GridPosition,
  grid: MazeGrid,
  canEnterGhostHouse: boolean
): Direction {
  const pos = ghost.targetGridPos; // Use target pos (where ghost is heading)
  const currentDir = ghost.direction;
  const reverse = oppositeDirection(currentDir);

  let bestDir: Direction = 'none';
  let bestDist = Infinity;

  for (const dir of ALL_DIRECTIONS) {
    // Ghosts cannot reverse direction (unless mode change)
    if (dir === reverse) continue;

    if (canMoveGhost(pos, dir, grid, canEnterGhostHouse)) {
      const offset = directionToOffset(dir);
      const nextPos = {
        row: pos.row + offset.row,
        col: pos.col + offset.col,
      };
      const dist = distanceSquared(nextPos, target);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
  }

  // If no valid direction (shouldn't happen), allow reverse
  if (bestDir === 'none') {
    if (canMoveGhost(pos, reverse, grid, canEnterGhostHouse)) {
      return reverse;
    }
  }

  return bestDir;
}

function chooseFrightenedDirection(ghost: GhostState, grid: MazeGrid): Direction {
  const pos = ghost.targetGridPos;
  const reverse = oppositeDirection(ghost.direction);
  const available: Direction[] = [];

  for (const dir of ALL_DIRECTIONS) {
    if (dir === reverse) continue;
    if (canMoveGhost(pos, dir, grid, false)) {
      available.push(dir);
    }
  }

  if (available.length === 0) {
    return reverse;
  }

  // Pseudo-random choice
  return available[Math.floor(Math.random() * available.length)];
}

function canMoveGhost(
  pos: GridPosition,
  dir: Direction,
  grid: MazeGrid,
  canEnterGhostHouse: boolean
): boolean {
  if (dir === 'none') return false;
  const offset = directionToOffset(dir);
  let nr = pos.row + offset.row;
  let nc = pos.col + offset.col;

  if (nc < 0) nc = MAZE_WIDTH - 1;
  if (nc >= MAZE_WIDTH) nc = 0;
  if (nr < 0 || nr >= MAZE_HEIGHT) return false;

  const cell = grid[nr][nc];
  if (cell === CellType.PATH) return true;
  if (cell === CellType.GHOST_DOOR) return true;
  if (cell === CellType.GHOST_HOUSE && canEnterGhostHouse) return true;

  return false;
}

function getGhostHouseDoor(): GridPosition {
  return {
    row: GHOST_HOUSE_ROW - 1,
    col: Math.floor(MAZE_WIDTH / 2),
  };
}

/** Check if a ghost is inside the ghost house. */
export function isInGhostHouse(pos: GridPosition): boolean {
  return (
    pos.row >= GHOST_HOUSE_ROW &&
    pos.row < GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT &&
    pos.col >= GHOST_HOUSE_COL &&
    pos.col < GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH
  );
}

/** Get direction to exit ghost house (move up to door). */
export function getGhostHouseExitDirection(pos: GridPosition): Direction {
  const doorCol = Math.floor(MAZE_WIDTH / 2);
  if (pos.col < doorCol) return 'right';
  if (pos.col > doorCol) return 'left';
  return 'up';
}

function clampRow(r: number): number {
  return Math.max(0, Math.min(MAZE_HEIGHT - 1, r));
}

function clampCol(c: number): number {
  return Math.max(0, Math.min(MAZE_WIDTH - 1, c));
}

// Suppress unused warning — GhostName is used via the ghost.name field
void (undefined as unknown as GhostName);
