import type { GridPosition } from '../types/maze';

// Maze dimensions (2 smaller per axis from 21x23)
export const MAZE_WIDTH = 19;
export const MAZE_HEIGHT = 21;
export const CELL_SIZE = 1; // 1 world unit per cell

// Ghost house dimensions (centered in maze)
export const GHOST_HOUSE_WIDTH = 6;
export const GHOST_HOUSE_HEIGHT = 3;
export const GHOST_HOUSE_ROW = Math.floor(MAZE_HEIGHT / 2) - 1;
export const GHOST_HOUSE_COL = Math.floor(MAZE_WIDTH / 2) - Math.floor(GHOST_HOUSE_WIDTH / 2);

// Speeds (cells per second)
export const PACMAN_SPEED = 5.5;
export const GHOST_BASE_SPEED = 3.0; // slower base speed for early levels
export const GHOST_SPEED_INCREASE_PER_LEVEL = 0.25; // ramps up per level
export const GHOST_FRIGHTENED_SPEED = 2.0;
export const GHOST_EATEN_SPEED = 10;

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
export const STARTING_LIVES = 6;
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

// === OFFICE COLOR PALETTE (inspired by real office photo) ===

// Ghost colors (vivid enough to see clearly)
export const GHOST_COLORS: Record<string, string> = {
  blinky: '#E55039',
  pinky: '#F8A5C2',
  inky: '#7ED6DF',
  clyde: '#F7B731',
};
export const GHOST_FRIGHTENED_COLOR = '#778BEB';
export const GHOST_EATEN_COLOR = '#CCCCCC';

// Pac-Man color (bright orange-yellow, high contrast on grey)
export const PACMAN_COLOR = '#FF9F1C';

// Wall/floor colors — bright white walls, darker carpet floor for contrast
export const WALL_COLOR = '#F5F5F5';
export const WALL_TOP_COLOR = '#FFFFFF';
export const FLOOR_COLOR = '#888888';

// Pellets — golden coins
export const PELLET_COLOR = '#efd231';
export const PELLET_EDGE_COLOR = '#eab737';
export const POWER_PELLET_COLOR = '#f53823';

// Office theme extras
export const GHOST_HOUSE_FLOOR_COLOR = '#909090';
export const GHOST_HOUSE_DOOR_COLOR = '#A29BFE';
export const BACKGROUND_COLOR = '#87CEAB';
export const TELEPORTER_COLOR = '#74B9FF';
export const ELEVATOR_COLOR = '#DFE6E9';

// Grass/outdoor colors
export const GRASS_COLOR = '#7CB342';
export const GRASS_DARK_COLOR = '#689F38';
export const PATH_COLOR = '#D7CCC8';
export const TREE_TRUNK_COLOR = '#795548';
export const TREE_LEAVES_COLOR = '#4CAF50';

// Camera (fixed isometric, no movement)
export const CAMERA_POSITION = [2, 10, 10] as const;
export const CAMERA_ZOOM = 56;

// Wall geometry
export const WALL_HEIGHT = 1.0;

// Movement
export const KEY_REPEAT_DELAY = 0.18; // seconds before key-hold starts continuous movement
