import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import { useGameStore } from '../../stores/gameStore';
import { gridToWorld } from '../../utils/helpers';
import { PELLET_COLOR } from '../../utils/constants';

export function Pellet() {
  const meshRef = useRef<InstancedMesh>(null);
  const pelletSet = useGameStore(s => s.pelletSet);
  const spinRef = useRef(0);

  const positions = useMemo(() => {
    const pos: [number, number][] = [];
    for (const key of pelletSet) {
      const [row, col] = key.split(',').map(Number);
      pos.push(gridToWorld({ row, col }));
    }
    return pos;
  }, [pelletSet]);

  const dummyRef = useMemo(() => new Object3D(), []);

  useMemo(() => {
    if (!meshRef.current || positions.length === 0) return;
    positions.forEach(([x, z], i) => {
      dummyRef.position.set(x, 0.15, z);
      dummyRef.rotation.set(Math.PI / 2, 0, 0);
      dummyRef.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummyRef.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummyRef]);

  // Gentle spin animation for all coins
  useFrame((_state, delta) => {
    if (!meshRef.current || positions.length === 0) return;
    spinRef.current += delta * 2;
    positions.forEach(([x, z], i) => {
      dummyRef.position.set(x, 0.15, z);
      dummyRef.rotation.set(Math.PI / 2, spinRef.current, 0);
      dummyRef.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummyRef.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]} castShadow>
      {/* Coin shape: flat cylinder */}
      <cylinderGeometry args={[0.12, 0.12, 0.04, 8]} />
      <meshStandardMaterial color={PELLET_COLOR} metalness={0.3} roughness={0.4} emissive={PELLET_COLOR} emissiveIntensity={0.35} />
    </instancedMesh>
  );
}
