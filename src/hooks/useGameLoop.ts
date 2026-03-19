import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';

export function useGameLoop(): void {
  const tick = useGameStore(s => s.tick);

  useFrame((_state, delta) => {
    // Clamp delta to avoid huge jumps when tab is unfocused
    const clampedDelta = Math.min(delta, 0.1);
    tick(clampedDelta);
  });
}
