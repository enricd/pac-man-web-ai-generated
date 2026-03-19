import { create } from 'zustand';
import type { GameState, GamePhase, Direction, GhostState, GhostName } from '../types/game';
import type { MazeData } from '../types/maze';
import { generateMaze } from '../systems/mazeGenerator';
import {
  STARTING_LIVES,
  GHOST_RELEASE_TIMES,
  GHOST_SCATTER_TARGETS,
  GHOST_SPEED,
  GHOST_SPEED_INCREASE_PER_LEVEL,
  GHOST_FRIGHTENED_SPEED,
  GHOST_EATEN_SPEED,
  PACMAN_SPEED,
  SCATTER_DURATION,
  CHASE_DURATION,
  INVISIBLE_WALL_FLASH_INTERVAL,
  INVISIBLE_WALL_FLASH_DURATION,
  MAX_LEVEL,
} from '../utils/constants';
import { updateCharacterMovement } from '../systems/movement';
import { checkCollisions } from '../systems/collision';
import { chooseGhostDirection, isInGhostHouse, getGhostHouseExitDirection } from '../systems/ghostAI';
import { gridEqual } from '../utils/helpers';

interface GameStore extends GameState {
  mazeData: MazeData;
  pelletSet: Set<string>;
  powerPelletSet: Set<string>;
  previousMaze: MazeData | null;

  // Actions
  startGame: () => void;
  setDirection: (dir: Direction) => void;
  tick: (delta: number) => void;
  restartGame: () => void;
  nextLevel: () => void;
}

const GHOST_NAMES: GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'];

function createInitialGhosts(mazeData: MazeData): GhostState[] {
  return GHOST_NAMES.map((name, i) => ({
    name,
    gridPos: { ...mazeData.ghostSpawns[i] },
    targetGridPos: { ...mazeData.ghostSpawns[i] },
    direction: 'none' as Direction,
    nextDirection: 'none' as Direction,
    moveProgress: 0,
    mode: 'scatter' as const,
    scatterTarget: GHOST_SCATTER_TARGETS[name],
    releaseTime: GHOST_RELEASE_TIMES[name],
    frightenedTimer: 0,
  }));
}

function createPelletSets(mazeData: MazeData): { pelletSet: Set<string>; powerPelletSet: Set<string> } {
  const pelletSet = new Set(mazeData.pellets.map(p => `${p.row},${p.col}`));
  const powerPelletSet = new Set(mazeData.powerPellets.map(p => `${p.row},${p.col}`));
  return { pelletSet, powerPelletSet };
}

const initialMaze = generateMaze();
const initialPellets = createPelletSets(initialMaze);

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  phase: 'start' as GamePhase,
  level: 1,
  score: 0,
  lives: STARTING_LIVES,
  pacman: {
    gridPos: { ...initialMaze.pacmanSpawn },
    targetGridPos: { ...initialMaze.pacmanSpawn },
    direction: 'none',
    nextDirection: 'none',
    moveProgress: 0,
  },
  ghosts: createInitialGhosts(initialMaze),
  pelletsRemaining: initialMaze.pellets.length + initialMaze.powerPellets.length,
  powerPelletActive: false,
  powerPelletTimer: 0,
  modeTimer: 0,
  isScatterMode: true,
  elapsedTime: 0,
  invisibleWallFlashTimer: 0,
  invisibleWallsVisible: true,
  mazeData: initialMaze,
  pelletSet: initialPellets.pelletSet,
  powerPelletSet: initialPellets.powerPelletSet,
  previousMaze: null,

  startGame: () => {
    set({ phase: 'playing' });
  },

  setDirection: (dir: Direction) => {
    const state = get();
    if (state.phase !== 'playing') return;
    set(s => ({
      pacman: {
        ...s.pacman,
        nextDirection: dir,
      },
    }));
  },

  tick: (delta: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const { mazeData, pacman, ghosts, pelletSet, powerPelletSet } = state;
    const grid = mazeData.grid;
    const levelMultiplier = 1 + (state.level - 1) * GHOST_SPEED_INCREASE_PER_LEVEL;

    // Update Pac-Man movement
    const newPacman = updateCharacterMovement(
      pacman,
      grid,
      PACMAN_SPEED,
      delta,
      true // Pac-Man can reverse
    );

    // Update ghost movement
    const newGhosts = ghosts.map((ghost, i) => {
      const elapsed = state.elapsedTime + delta;

      // Ghost still in house, waiting for release
      if (isInGhostHouse(ghost.gridPos) && elapsed < ghost.releaseTime) {
        return { ...ghost };
      }

      // Ghost exiting house
      if (isInGhostHouse(ghost.gridPos)) {
        const exitDir = getGhostHouseExitDirection(ghost.gridPos);
        const exitGhost = { ...ghost, nextDirection: exitDir };
        const speed = GHOST_SPEED * levelMultiplier;
        return updateCharacterMovement(exitGhost, grid, speed, delta) as GhostState;
      }

      // Choose direction at cell centers
      let updatedGhost = { ...ghost };
      if (ghost.moveProgress >= 1 || gridEqual(ghost.gridPos, ghost.targetGridPos)) {
        const blinky = i === 0 ? null : ghosts[0];
        const chosenDir = chooseGhostDirection(ghost, newPacman, blinky, grid);
        updatedGhost.nextDirection = chosenDir;
      }

      // Determine speed
      let speed = GHOST_SPEED * levelMultiplier;
      if (ghost.mode === 'frightened') speed = GHOST_FRIGHTENED_SPEED;
      if (ghost.mode === 'eaten') speed = GHOST_EATEN_SPEED;

      const moved = updateCharacterMovement(updatedGhost, grid, speed, delta);
      return {
        ...updatedGhost,
        ...moved,
      } as GhostState;
    });

    // Check collisions
    const pacmanPos = newPacman.moveProgress >= 0.5 ? newPacman.targetGridPos : newPacman.gridPos;
    const collisionResult = checkCollisions(
      pacmanPos,
      newGhosts,
      pelletSet,
      powerPelletSet,
      state
    );

    // Apply pellet removals
    const newPelletSet = new Set(pelletSet);
    const newPowerPelletSet = new Set(powerPelletSet);
    for (const p of collisionResult.pelletsToRemove) {
      newPelletSet.delete(`${p.row},${p.col}`);
    }
    for (const p of collisionResult.powerPelletsToRemove) {
      newPowerPelletSet.delete(`${p.row},${p.col}`);
    }

    // Apply ghost mode updates
    const finalGhosts = newGhosts.map((g, i) => {
      const update = collisionResult.ghostUpdates.find(u => u.index === i);
      if (update) {
        return { ...g, mode: update.mode } as GhostState;
      }
      return g;
    });

    // Handle death
    if (collisionResult.livesLost) {
      const newLives = state.lives - 1;
      if (newLives <= 0) {
        set({ phase: 'gameOver', lives: 0 });
        return;
      }
      // Reset positions, keep score and pellets
      set({
        lives: newLives,
        phase: 'dying',
        pacman: {
          gridPos: { ...mazeData.pacmanSpawn },
          targetGridPos: { ...mazeData.pacmanSpawn },
          direction: 'none',
          nextDirection: 'none',
          moveProgress: 0,
        },
        ghosts: createInitialGhosts(mazeData),
        powerPelletActive: false,
        powerPelletTimer: 0,
        elapsedTime: 0,
        modeTimer: 0,
        isScatterMode: true,
      });
      // Resume after brief pause
      setTimeout(() => {
        const s = get();
        if (s.phase === 'dying') set({ phase: 'playing' });
      }, 1500);
      return;
    }

    // Update timers
    let newElapsed = state.elapsedTime + delta;
    let newModeTimer = state.modeTimer + delta;
    let newIsScatter = state.isScatterMode;
    let newPowerActive = collisionResult.powerPelletActive;
    let newPowerTimer = collisionResult.powerPelletTimer;

    // Power pellet timer
    if (newPowerActive) {
      newPowerTimer -= delta;
      if (newPowerTimer <= 0) {
        newPowerActive = false;
        newPowerTimer = 0;
        // Revert frightened ghosts to current mode
        for (const g of finalGhosts) {
          if (g.mode === 'frightened') {
            g.mode = newIsScatter ? 'scatter' : 'chase';
          }
        }
      }
    }

    // Mode cycling (scatter/chase)
    const modeDuration = newIsScatter ? SCATTER_DURATION : CHASE_DURATION;
    if (newModeTimer >= modeDuration) {
      newIsScatter = !newIsScatter;
      newModeTimer = 0;
      // Update non-frightened, non-eaten ghosts
      for (const g of finalGhosts) {
        if (g.mode !== 'frightened' && g.mode !== 'eaten') {
          g.mode = newIsScatter ? 'scatter' : 'chase';
        }
      }
    }

    // Eaten ghosts that reached ghost house — respawn
    for (const g of finalGhosts) {
      if (g.mode === 'eaten' && isInGhostHouse(g.gridPos)) {
        g.mode = newIsScatter ? 'scatter' : 'chase';
      }
    }

    // Invisible wall flash timer (even levels)
    let invisibleWallFlashTimer = state.invisibleWallFlashTimer + delta;
    let invisibleWallsVisible = state.invisibleWallsVisible;
    if (state.level % 2 === 0) {
      if (invisibleWallFlashTimer >= INVISIBLE_WALL_FLASH_INTERVAL) {
        invisibleWallsVisible = true;
        if (invisibleWallFlashTimer >= INVISIBLE_WALL_FLASH_INTERVAL + INVISIBLE_WALL_FLASH_DURATION) {
          invisibleWallsVisible = false;
          invisibleWallFlashTimer = 0;
        }
      } else {
        invisibleWallsVisible = false;
      }
    }

    // Check level complete
    const totalPellets = newPelletSet.size + newPowerPelletSet.size;
    if (totalPellets === 0) {
      set({ phase: 'levelTransition' });
      setTimeout(() => get().nextLevel(), 2000);
      return;
    }

    set({
      pacman: newPacman,
      ghosts: finalGhosts,
      score: state.score + collisionResult.score,
      pelletsRemaining: totalPellets,
      pelletSet: newPelletSet,
      powerPelletSet: newPowerPelletSet,
      powerPelletActive: newPowerActive,
      powerPelletTimer: newPowerTimer,
      modeTimer: newModeTimer,
      isScatterMode: newIsScatter,
      elapsedTime: newElapsed,
      invisibleWallFlashTimer,
      invisibleWallsVisible,
    });
  },

  nextLevel: () => {
    const state = get();
    const newLevel = state.level + 1;

    if (newLevel > MAX_LEVEL) {
      set({ phase: 'gameOver' }); // Win!
      return;
    }

    // Odd levels: new maze. Even levels: reuse previous maze
    let newMaze: MazeData;
    let previousMaze = state.previousMaze;
    if (newLevel % 2 === 1) {
      newMaze = generateMaze();
      previousMaze = newMaze;
    } else {
      // Even level: reuse the previous odd level's maze
      newMaze = previousMaze ?? generateMaze();
    }

    const pellets = createPelletSets(newMaze);

    set({
      phase: 'playing',
      level: newLevel,
      mazeData: newMaze,
      previousMaze,
      pacman: {
        gridPos: { ...newMaze.pacmanSpawn },
        targetGridPos: { ...newMaze.pacmanSpawn },
        direction: 'none',
        nextDirection: 'none',
        moveProgress: 0,
      },
      ghosts: createInitialGhosts(newMaze),
      pelletsRemaining: newMaze.pellets.length + newMaze.powerPellets.length,
      pelletSet: pellets.pelletSet,
      powerPelletSet: pellets.powerPelletSet,
      powerPelletActive: false,
      powerPelletTimer: 0,
      modeTimer: 0,
      isScatterMode: true,
      elapsedTime: 0,
      invisibleWallFlashTimer: 0,
      invisibleWallsVisible: true,
    });
  },

  restartGame: () => {
    const newMaze = generateMaze();
    const pellets = createPelletSets(newMaze);

    set({
      phase: 'start',
      level: 1,
      score: 0,
      lives: STARTING_LIVES,
      mazeData: newMaze,
      previousMaze: null,
      pacman: {
        gridPos: { ...newMaze.pacmanSpawn },
        targetGridPos: { ...newMaze.pacmanSpawn },
        direction: 'none',
        nextDirection: 'none',
        moveProgress: 0,
      },
      ghosts: createInitialGhosts(newMaze),
      pelletsRemaining: newMaze.pellets.length + newMaze.powerPellets.length,
      pelletSet: pellets.pelletSet,
      powerPelletSet: pellets.powerPelletSet,
      powerPelletActive: false,
      powerPelletTimer: 0,
      modeTimer: 0,
      isScatterMode: true,
      elapsedTime: 0,
      invisibleWallFlashTimer: 0,
      invisibleWallsVisible: true,
    });
  },
}));
