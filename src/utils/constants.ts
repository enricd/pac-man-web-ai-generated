import type { GridPosition } from '../types/maze';

// Maze dimensions
export const MAZE_WIDTH = 28;
export const MAZE_HEIGHT = 31;
export const CELL_SIZE = 1; // 1 world unit per cell

// Ghost house dimensions (centered in maze)
export const GHOST_HOUSE_WIDTH = 6;
export const GHOST_HOUSE_HEIGHT = 3;
export const GHOST_HOUSE_ROW = Math.floor(MAZE_HEIGHT / 2) - 1;
export const GHOST_HOUSE_COL = Math.floor(MAZE_WIDTH / 2) - Math.floor(GHOST_HOUSE_WIDTH / 2);

// Speeds (cells per second)
export const PACMAN_SPEED = 5.5;
export const GHOST_SPEED = 5.0;
export const GHOST_FRIGHTENED_SPEED = 2.5;
export const GHOST_EATEN_SPEED = 10;

// Speed increase per level (multiplier)
export const GHOST_SPEED_INCREASE_PER_LEVEL = 0.05;

// Timers (seconds)
export const SCATTER_DURATION = 7;
export const CHASE_DURATION = 20;
export const POWER_PELLET_DURATION = 8;
export const POWER_PELLET_DURATION_DECREASE = 0.5; // per level
export const POWER_PELLET_MIN_DURATION = 3;

// Invisible walls (even levels)
export const INVISIBLE_WALL_FLASH_INTERVAL = 15;
export const INVISIBLE_WALL_FLASH_DURATION = 0.1;

// Scoring
export const PELLET_SCORE = 10;
export const POWER_PELLET_SCORE = 50;
export const GHOST_EAT_SCORES = [200, 400, 800, 1600];

// Lives
export const STARTING_LIVES = 3;
export const MAX_LEVEL = 10;

// Ghost release times (seconds after level start)
export const GHOST_RELEASE_TIMES: Record<string, number> = {
  blinky: 0,
  pinky: 3,
  inky: 6,
  clyde: 9,
};

// Ghost scatter targets (corners of the maze)
export const GHOST_SCATTER_TARGETS: Record<string, GridPosition> = {
  blinky: { row: 0, col: MAZE_WIDTH - 1 },
  pinky: { row: 0, col: 0 },
  inky: { row: MAZE_HEIGHT - 1, col: MAZE_WIDTH - 1 },
  clyde: { row: MAZE_HEIGHT - 1, col: 0 },
};

// Ghost colors
export const GHOST_COLORS: Record<string, string> = {
  blinky: '#FF0000',
  pinky: '#FFB8FF',
  inky: '#00FFFF',
  clyde: '#FFB851',
};
export const GHOST_FRIGHTENED_COLOR = '#2121FF';
export const GHOST_EATEN_COLOR = '#FFFFFF';

// Pac-Man color
export const PACMAN_COLOR = '#FFFF00';

// Wall/floor colors
export const WALL_COLOR = '#1a3a5c';
export const FLOOR_COLOR = '#2a2a2a';
export const PELLET_COLOR = '#FFFF99';
export const POWER_PELLET_COLOR = '#FFFF00';

// Camera
export const CAMERA_HEIGHT = 22;
export const CAMERA_ANGLE = 60; // degrees from horizontal
export const CAMERA_DAMPING = 0.05;

// Wall geometry
export const WALL_HEIGHT = 1.5;
