import { useRef, useMemo } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { useGameStore } from '../../stores/gameStore';
import { gridToWorld } from '../../utils/helpers';
import { PELLET_COLOR } from '../../utils/constants';

export function Pellet() {
  const meshRef = useRef<InstancedMesh>(null);
  const pelletSet = useGameStore(s => s.pelletSet);

  const positions = useMemo(() => {
    const pos: [number, number][] = [];
    for (const key of pelletSet) {
      const [row, col] = key.split(',').map(Number);
      pos.push(gridToWorld({ row, col }));
    }
    return pos;
  }, [pelletSet]);

  useMemo(() => {
    if (!meshRef.current || positions.length === 0) return;
    const dummy = new Object3D();
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, 0.25, z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={PELLET_COLOR}
        emissive={PELLET_COLOR}
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
}
