import { useEffect } from 'react';
import type { Direction } from '../types/game';
import { useGameStore } from '../stores/gameStore';

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
  const startGame = useGameStore(s => s.startGame);
  const restartGame = useGameStore(s => s.restartGame);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        if (phase === 'start') {
          startGame();
        }
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDirection, startGame, restartGame, phase]);
}
