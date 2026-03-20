import { useMemo } from 'react';
import {
  GHOST_HOUSE_ROW,
  GHOST_HOUSE_COL,
  GHOST_HOUSE_WIDTH,
  GHOST_HOUSE_HEIGHT,
  CELL_SIZE,
  MAZE_WIDTH,
  GHOST_HOUSE_FLOOR_COLOR,
  GHOST_HOUSE_DOOR_COLOR,
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

  const doorPos = useMemo(() => {
    const [x, z] = gridToWorld({ row: GHOST_HOUSE_ROW - 1, col: Math.floor(MAZE_WIDTH / 2) });
    return [x, 0.3, z] as [number, number, number];
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={GHOST_HOUSE_FLOOR_COLOR} roughness={0.9} />
      </mesh>
      <mesh position={doorPos} castShadow>
        <boxGeometry args={[CELL_SIZE, 0.3, CELL_SIZE * 0.3]} />
        <meshStandardMaterial color={GHOST_HOUSE_DOOR_COLOR} />
      </mesh>
    </group>
  );
}
