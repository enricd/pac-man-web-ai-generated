export const CellType = {
  WALL: 0,
  PATH: 1,
  GHOST_HOUSE: 2,
  GHOST_DOOR: 3,
} as const;

export type CellType = (typeof CellType)[keyof typeof CellType];

export type MazeGrid = CellType[][];

export interface MazeData {
  grid: MazeGrid;
  width: number;
  height: number;
  pacmanSpawn: GridPosition;
  ghostSpawns: GridPosition[];
  ghostDoor: GridPosition;
  pellets: GridPosition[];
  powerPellets: GridPosition[];
  teleportLeft: GridPosition[];
  teleportRight: GridPosition[];
}

export interface GridPosition {
  row: number;
  col: number;
}
