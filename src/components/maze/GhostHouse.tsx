import { useMemo } from 'react';
import {
  GHOST_HOUSE_ROW,
  GHOST_HOUSE_COL,
  GHOST_HOUSE_WIDTH,
  GHOST_HOUSE_HEIGHT,
  CELL_SIZE,
} from '../../utils/constants';
import { gridToWorld } from '../../utils/helpers';

export function GhostHouse() {
  const { position, width, height } = useMemo(() => {
    const centerRow = GHOST_HOUSE_ROW + GHOST_HOUSE_HEIGHT / 2;
    const centerCol = GHOST_HOUSE_COL + GHOST_HOUSE_WIDTH / 2;
    const [x, z] = gridToWorld({ row: centerRow, col: centerCol });
    return {
      position: [x, 0.01, z] as [number, number, number],
      width: GHOST_HOUSE_WIDTH * CELL_SIZE,
      height: GHOST_HOUSE_HEIGHT * CELL_SIZE,
    };
  }, []);

  return (
    <group>
      {/* Ghost house floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#1a1a3a" />
      </mesh>
      {/* Ghost house door indicator */}
      <mesh
        position={[
          ...gridToWorld({ row: GHOST_HOUSE_ROW - 1, col: Math.floor(28 / 2) }),
        ].reduce<[number, number, number]>(
          (acc, val, i) => {
            if (i === 0) acc[0] = val;
            else acc[2] = val;
            return acc;
          },
          [0, 0.3, 0]
        )}
      >
        <boxGeometry args={[CELL_SIZE, 0.3, CELL_SIZE * 0.3]} />
        <meshStandardMaterial color="#FFB8FF" emissive="#FFB8FF" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
