import { useEffect, useRef } from 'react';
import type { Direction } from '../types/game';
import { useGameStore } from '../stores/gameStore';
import { KEY_REPEAT_DELAY } from '../utils/constants';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function useKeyboard(): void {
  const setDirection = useGameStore(s => s.setDirection);
  const clearDirection = useGameStore(s => s.clearDirection);
  const startGame = useGameStore(s => s.startGame);
  const restartGame = useGameStore(s => s.restartGame);
  const phase = useGameStore(s => s.phase);

  // Track which direction key is currently held
  const heldKeyRef = useRef<string | null>(null);
  const holdStartRef = useRef<number>(0);
  const hasSentFirstRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        if (phase === 'start') {
          startGame();
        }

        // If this key is already held (repeat event), check if hold duration exceeds threshold
        if (heldKeyRef.current === e.key) {
          const elapsed = (performance.now() - holdStartRef.current) / 1000;
          if (elapsed >= KEY_REPEAT_DELAY && !hasSentFirstRef.current) {
            // Held long enough — enable continuous movement
            hasSentFirstRef.current = true;
          }
          if (hasSentFirstRef.current) {
            setDirection(dir);
          }
          return;
        }

        // New key press — send a single step
        heldKeyRef.current = e.key;
        holdStartRef.current = performance.now();
        hasSentFirstRef.current = false;
        setDirection(dir);
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (phase === 'gameOver') {
          restartGame();
        } else if (phase === 'start') {
          startGame();
        }
      }

      // Dev only: press 'L' to skip to next level
      if (e.key === 'l' || e.key === 'L') {
        if (import.meta.env.DEV && phase === 'playing') {
          useGameStore.getState().nextLevel();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (heldKeyRef.current === e.key) {
        heldKeyRef.current = null;
        hasSentFirstRef.current = false;
        // Stop movement when key is released
        clearDirection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setDirection, clearDirection, startGame, restartGame, phase]);
}
