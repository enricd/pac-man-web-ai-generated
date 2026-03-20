import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useGameStore } from '../../stores/gameStore';
import { lerpGridToWorld } from '../../utils/helpers';
import { PACMAN_COLOR } from '../../utils/constants';

export function PacMan() {
  const meshRef = useRef<Mesh>(null);
  const mouthRef = useRef(0);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    const { pacman, phase } = useGameStore.getState();
    if (phase === 'gameOver') return;

    // Position
    const [x, z] = lerpGridToWorld(
      pacman.gridPos,
      pacman.targetGridPos,
      pacman.moveProgress
    );
    meshRef.current.position.set(x, 0.35, z);

    // Rotation based on direction
    switch (pacman.direction) {
      case 'right': meshRef.current.rotation.y = 0; break;
      case 'left': meshRef.current.rotation.y = Math.PI; break;
      case 'up': meshRef.current.rotation.y = Math.PI / 2; break;
      case 'down': meshRef.current.rotation.y = -Math.PI / 2; break;
    }

    // Chomp animation — squash/stretch on X axis
    mouthRef.current += delta * 12;
    const mouthOpen = (Math.sin(mouthRef.current) + 1) / 2;
    meshRef.current.scale.set(0.85 + mouthOpen * 0.15, 1, 1);
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
      <meshStandardMaterial color={PACMAN_COLOR} roughness={0.4} />
    </mesh>
  );
}
