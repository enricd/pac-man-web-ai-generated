import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useGameStore } from '../../stores/gameStore';
import { gridToWorld } from '../../utils/helpers';
import { ELEVATOR_COLOR } from '../../utils/constants';

export function Elevator() {
  const meshRef = useRef<Mesh>(null);
  const phase = useGameStore(s => s.phase);
  const mazeData = useGameStore(s => s.mazeData);

  const [x, z] = gridToWorld(mazeData.pacmanSpawn);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (phase === 'levelTransition') {
      meshRef.current.visible = true;
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.5 + 1;
      meshRef.current.rotation.y = clock.elapsedTime * 2;
    } else {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} position={[x, 1, z]} visible={false} castShadow>
      <boxGeometry args={[1.5, 2, 0.1]} />
      <meshStandardMaterial color={ELEVATOR_COLOR} />
    </mesh>
  );
}
