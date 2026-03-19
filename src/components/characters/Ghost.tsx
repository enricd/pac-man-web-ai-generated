import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
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
    meshRef.current.position.set(x, 0.5, z);

    // Color based on mode
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    switch (ghost.mode) {
      case 'frightened':
        material.color.set(GHOST_FRIGHTENED_COLOR);
        material.emissive.set(GHOST_FRIGHTENED_COLOR);
        break;
      case 'eaten':
        material.color.set(GHOST_EATEN_COLOR);
        material.emissive.set(GHOST_EATEN_COLOR);
        material.opacity = 0.3;
        material.transparent = true;
        break;
      default:
        material.color.set(baseColor);
        material.emissive.set(baseColor);
        material.opacity = 1;
        material.transparent = false;
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      {/* Ghost body: cylinder + half sphere on top */}
      <capsuleGeometry args={[0.35, 0.3, 8, 16]} />
      <meshStandardMaterial
        color={baseColor}
        emissive={baseColor}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Need THREE import for type assertion in useFrame
import * as THREE from 'three';
void THREE;
