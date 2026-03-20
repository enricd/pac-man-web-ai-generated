import { MAZE_WIDTH, MAZE_HEIGHT, CELL_SIZE, FLOOR_COLOR } from '../../utils/constants';

const SLAB_THICKNESS = 0.15;

export function Floor() {
  return (
    <mesh position={[0, -SLAB_THICKNESS / 2, 0]} receiveShadow castShadow>
      <boxGeometry args={[MAZE_WIDTH * CELL_SIZE, SLAB_THICKNESS, MAZE_HEIGHT * CELL_SIZE]} />
      <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} />
    </mesh>
  );
}
