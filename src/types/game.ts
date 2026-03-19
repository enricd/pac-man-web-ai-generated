import type { GridPosition } from './maze';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export type GhostMode = 'scatter' | 'chase' | 'frightened' | 'eaten';

export type GamePhase = 'start' | 'playing' | 'dying' | 'levelTransition' | 'gameOver';

export interface CharacterState {
  gridPos: GridPosition;
  targetGridPos: GridPosition;
  direction: Direction;
  nextDirection: Direction;
  moveProgress: number; // 0..1 lerp between gridPos and targetGridPos
}

export interface GhostState extends CharacterState {
  name: GhostName;
  mode: GhostMode;
  scatterTarget: GridPosition;
  releaseTime: number; // seconds after level start
  frightenedTimer: number;
}

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export interface GameState {
  phase: GamePhase;
  level: number;
  score: number;
  lives: number;
  pacman: CharacterState;
  ghosts: GhostState[];
  pelletsRemaining: number;
  powerPelletActive: boolean;
  powerPelletTimer: number;
  modeTimer: number;
  isScatterMode: boolean;
  elapsedTime: number;
  invisibleWallFlashTimer: number;
  invisibleWallsVisible: boolean;
}
