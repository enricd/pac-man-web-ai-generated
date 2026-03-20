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
    const scale = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2;
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.rotation.set(Math.PI / 2, clock.elapsedTime * 2, 0);
  });

  return (
    <mesh ref={meshRef} position={[x, 0.25, z]} castShadow>
      <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
      <meshStandardMaterial color={POWER_PELLET_COLOR} metalness={0.3} roughness={0.3} emissive={POWER_PELLET_COLOR} emissiveIntensity={0.4} />
    </mesh>
  );
}
