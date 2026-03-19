// Teleporter visual effect — edge glow where teleport corridors exist
import { useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { gridToWorld } from '../../utils/helpers';

export function Teleporter() {
  const mazeData = useGameStore(s => s.mazeData);

  const positions = useMemo(() => {
    const all: [number, number, number][] = [];
    for (const pos of mazeData.teleportLeft) {
      const [x, z] = gridToWorld(pos);
      all.push([x - 0.5, 0.5, z]);
    }
    for (const pos of mazeData.teleportRight) {
      const [x, z] = gridToWorld(pos);
      all.push([x + 0.5, 0.5, z]);
    }
    return all;
  }, [mazeData]);

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <planeGeometry args={[0.1, 1]} />
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={1}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
