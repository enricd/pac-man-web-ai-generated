import type { GridPosition } from '../types/maze';
import type { Direction } from '../types/game';
import { CELL_SIZE, MAZE_WIDTH, MAZE_HEIGHT } from './constants';

/** Convert grid position to 3D world position (x, z). Y is up. */
export function gridToWorld(pos: GridPosition): [number, number] {
  const x = (pos.col - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
  const z = (pos.row - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
  return [x, z];
}

/** Lerp between two grid positions, returning world [x, z]. */
export function lerpGridToWorld(
  from: GridPosition,
  to: GridPosition,
  t: number
): [number, number] {
  const [x1, z1] = gridToWorld(from);
  const [x2, z2] = gridToWorld(to);
  return [x1 + (x2 - x1) * t, z1 + (z2 - z1) * t];
}

/** Get the grid offset for a direction. */
export function directionToOffset(dir: Direction): GridPosition {
  switch (dir) {
    case 'up': return { row: -1, col: 0 };
    case 'down': return { row: 1, col: 0 };
    case 'left': return { row: 0, col: -1 };
    case 'right': return { row: 0, col: 1 };
    case 'none': return { row: 0, col: 0 };
  }
}

/** Get the opposite direction. */
export function oppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
    case 'none': return 'none';
  }
}

/** Manhattan distance between two grid positions. */
export function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Euclidean distance squared (avoid sqrt for comparisons). */
export function distanceSquared(a: GridPosition, b: GridPosition): number {
  const dr = a.row - b.row;
  const dc = a.col - b.col;
  return dr * dr + dc * dc;
}

/** Check if two grid positions are equal. */
export function gridEqual(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col;
}
