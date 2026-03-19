import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useGameStore } from '../../stores/gameStore';
import { gridToWorld } from '../../utils/helpers';
import { POWER_PELLET_COLOR } from '../../utils/constants';

export function PowerPellet() {
  const powerPelletSet = useGameStore(s => s.powerPelletSet);
  const pellets = Array.from(powerPelletSet).map(key => {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  });

  return (
    <group>
      {pellets.map(pos => (
        <PowerPelletSingle key={`${pos.row},${pos.col}`} row={pos.row} col={pos.col} />
      ))}
    </group>
  );
}

function PowerPelletSingle({ row, col }: { row: number; col: number }) {
  const meshRef = useRef<Mesh>(null);
  const [x, z] = gridToWorld({ row, col });

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Pulsing effect
    const scale = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[x, 0.35, z]} castShadow>
      <sphereGeometry args={[0.2, 12, 12]} />
      <meshStandardMaterial
        color={POWER_PELLET_COLOR}
        emissive={POWER_PELLET_COLOR}
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}
