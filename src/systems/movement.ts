import type { CharacterState, Direction } from '../types/game';
import type { MazeGrid, GridPosition } from '../types/maze';
import { CellType } from '../types/maze';
import { directionToOffset, gridEqual } from '../utils/helpers';
import { MAZE_WIDTH, MAZE_HEIGHT } from '../utils/constants';

/**
 * Update a character's position based on their current direction and speed.
 * Returns a new state (does not mutate).
 */
export function updateCharacterMovement(
  state: CharacterState,
  grid: MazeGrid,
  speed: number,
  delta: number,
  allowReverse: boolean = false,
  allowGhostHouse: boolean = false
): CharacterState {
  let { gridPos, targetGridPos, direction, nextDirection, moveProgress } = state;

  // If at a cell center (moveProgress >= 1 or at same position)
  if (moveProgress >= 1 || gridEqual(gridPos, targetGridPos)) {
    // Snap to target
    gridPos = { ...targetGridPos };
    moveProgress = 0;

    // Try next direction first
    if (nextDirection !== 'none' && canMove(gridPos, nextDirection, grid, allowGhostHouse)) {
      direction = nextDirection;
      nextDirection = 'none';
    } else if (nextDirection === 'none' && allowReverse) {
      // Player released key — stop at this cell (only for Pac-Man, not ghosts)
      direction = 'none';
    }

    // Try current direction
    if (direction !== 'none' && canMove(gridPos, direction, grid, allowGhostHouse)) {
      const offset = directionToOffset(direction);
      targetGridPos = {
        row: gridPos.row + offset.row,
        col: gridPos.col + offset.col,
      };
      // Handle teleportation (wrap around)
      targetGridPos = wrapPosition(targetGridPos);
    } else {
      // Can't move, stay put
      targetGridPos = { ...gridPos };
      direction = 'none';
    }
  } else {
    // Mid-movement: check if next direction is a reverse (instant)
    if (allowReverse && nextDirection !== 'none' && isReverse(direction, nextDirection)) {
      const temp = gridPos;
      gridPos = targetGridPos;
      targetGridPos = temp;
      moveProgress = 1 - moveProgress;
      direction = nextDirection;
      nextDirection = 'none';
    }
  }

  // Advance movement
  if (!gridEqual(gridPos, targetGridPos)) {
    moveProgress += speed * delta;
    if (moveProgress > 1) moveProgress = 1;
  }

  return { gridPos, targetGridPos, direction, nextDirection, moveProgress };
}

export function canMove(
  pos: GridPosition,
  dir: Direction,
  grid: MazeGrid,
  allowGhostHouse: boolean = false
): boolean {
  if (dir === 'none') return false;
  const offset = directionToOffset(dir);
  let nr = pos.row + offset.row;
  let nc = pos.col + offset.col;

  // Wrap for teleportation
  if (nc < 0) nc = MAZE_WIDTH - 1;
  if (nc >= MAZE_WIDTH) nc = 0;
  if (nr < 0 || nr >= MAZE_HEIGHT) return false;

  const cell = grid[nr][nc];
  if (cell === CellType.PATH) return true;
  if (cell === CellType.GHOST_DOOR) return true;
  if (cell === CellType.GHOST_HOUSE && allowGhostHouse) return true;

  return false;
}

function wrapPosition(pos: GridPosition): GridPosition {
  let { row, col } = pos;
  if (col < 0) col = MAZE_WIDTH - 1;
  if (col >= MAZE_WIDTH) col = 0;
  return { row, col };
}

function isReverse(current: Direction, next: Direction): boolean {
  return (
    (current === 'up' && next === 'down') ||
    (current === 'down' && next === 'up') ||
    (current === 'left' && next === 'right') ||
    (current === 'right' && next === 'left')
  );
}
