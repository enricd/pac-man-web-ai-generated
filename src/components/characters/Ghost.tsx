import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { lerpGridToWorld } from '../../utils/helpers';
import { GHOST_COLORS, GHOST_FRIGHTENED_COLOR, GHOST_EATEN_COLOR } from '../../utils/constants';
import type { GhostName } from '../../types/game';

interface GhostProps {
  index: number;
  name: GhostName;
}

export function Ghost({ index, name }: GhostProps) {
  const meshRef = useRef<Mesh>(null);
  const baseColor = GHOST_COLORS[name];

  useFrame(() => {
    if (!meshRef.current) return;

    const ghost = useGameStore.getState().ghosts[index];
    if (!ghost) return;

    // Position
    const [x, z] = lerpGridToWorld(
      ghost.gridPos,
      ghost.targetGridPos,
      ghost.moveProgress
    );
    meshRef.current.position.set(x, 0.4, z);

    // Color based on mode
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    switch (ghost.mode) {
      case 'frightened':
        material.color.set(GHOST_FRIGHTENED_COLOR);
        material.opacity = 1;
        material.transparent = false;
        break;
      case 'eaten':
        material.color.set(GHOST_EATEN_COLOR);
        material.opacity = 0.3;
        material.transparent = true;
        break;
      default:
        material.color.set(baseColor);
        material.opacity = 1;
        material.transparent = false;
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[0.65, 0.85, 0.65]} />
      <meshStandardMaterial color={baseColor} roughness={0.4} />
    </mesh>
  );
}
