import { MAZE_WIDTH, MAZE_HEIGHT, CELL_SIZE, FLOOR_COLOR } from '../../utils/constants';

export function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[MAZE_WIDTH * CELL_SIZE, MAZE_HEIGHT * CELL_SIZE]} />
      <meshStandardMaterial color={FLOOR_COLOR} />
    </mesh>
  );
}
