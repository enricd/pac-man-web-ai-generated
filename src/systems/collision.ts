import type { GameState, GhostState } from '../types/game';
import type { GridPosition } from '../types/maze';
import { gridEqual } from '../utils/helpers';
import {
  PELLET_SCORE,
  POWER_PELLET_SCORE,
  GHOST_EAT_SCORES,
  POWER_PELLET_DURATION,
  POWER_PELLET_DURATION_DECREASE,
  POWER_PELLET_MIN_DURATION,
} from '../utils/constants';

export interface CollisionResult {
  score: number;
  pelletsRemaining: number;
  powerPelletActive: boolean;
  powerPelletTimer: number;
  ghostsEaten: number;
  livesLost: boolean;
  pelletsToRemove: GridPosition[];
  powerPelletsToRemove: GridPosition[];
  ghostUpdates: { index: number; mode: GhostState['mode'] }[];
}

export function checkCollisions(
  pacmanPos: GridPosition,
  ghosts: GhostState[],
  pellets: Set<string>,
  powerPellets: Set<string>,
  currentState: Pick<GameState, 'powerPelletActive' | 'powerPelletTimer' | 'level'>
): CollisionResult {
  const result: CollisionResult = {
    score: 0,
    pelletsRemaining: pellets.size,
    powerPelletActive: currentState.powerPelletActive,
    powerPelletTimer: currentState.powerPelletTimer,
    ghostsEaten: 0,
    livesLost: false,
    pelletsToRemove: [],
    powerPelletsToRemove: [],
    ghostUpdates: [],
  };

  const posKey = `${pacmanPos.row},${pacmanPos.col}`;

  // Pellet collision
  if (pellets.has(posKey)) {
    result.score += PELLET_SCORE;
    result.pelletsToRemove.push({ ...pacmanPos });
    result.pelletsRemaining--;
  }

  // Power pellet collision
  if (powerPellets.has(posKey)) {
    result.score += POWER_PELLET_SCORE;
    result.powerPelletsToRemove.push({ ...pacmanPos });
    result.powerPelletActive = true;
    const duration = Math.max(
      POWER_PELLET_MIN_DURATION,
      POWER_PELLET_DURATION - currentState.level * POWER_PELLET_DURATION_DECREASE
    );
    result.powerPelletTimer = duration;
    result.pelletsRemaining--;

    // Set all non-eaten ghosts to frightened
    ghosts.forEach((ghost, i) => {
      if (ghost.mode !== 'eaten') {
        result.ghostUpdates.push({ index: i, mode: 'frightened' });
      }
    });
  }

  // Ghost collisions
  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];
    if (!gridEqual(pacmanPos, ghost.gridPos) && !gridEqual(pacmanPos, ghost.targetGridPos)) {
      continue;
    }

    if (ghost.mode === 'frightened') {
      // Eat the ghost
      const eatScore = GHOST_EAT_SCORES[Math.min(result.ghostsEaten, GHOST_EAT_SCORES.length - 1)];
      result.score += eatScore;
      result.ghostsEaten++;
      result.ghostUpdates.push({ index: i, mode: 'eaten' });
    } else if (ghost.mode !== 'eaten') {
      // Pac-Man dies
      result.livesLost = true;
      break;
    }
  }

  return result;
}
