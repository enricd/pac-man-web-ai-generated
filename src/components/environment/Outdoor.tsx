import { useMemo } from 'react';
import {
  MAZE_WIDTH,
  MAZE_HEIGHT,
  CELL_SIZE,
  GRASS_COLOR,
  GRASS_DARK_COLOR,
  PATH_COLOR,
  TREE_TRUNK_COLOR,
  TREE_LEAVES_COLOR,
} from '../../utils/constants';

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshStandardMaterial color={TREE_TRUNK_COLOR} />
      </mesh>
      {/* Leaves — simple stacked boxes */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color={TREE_LEAVES_COLOR} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color={TREE_LEAVES_COLOR} />
      </mesh>
    </group>
  );
}

export function Outdoor() {
  const mazeW = MAZE_WIDTH * CELL_SIZE;
  const mazeH = MAZE_HEIGHT * CELL_SIZE;
  const groundSize = Math.max(mazeW, mazeH) * 2.5;

  // Place trees around the office building
  const trees = useMemo(() => {
    const positions: [number, number, number][] = [
      [-mazeW / 2 - 3, 0, -mazeH / 2 - 2],
      [-mazeW / 2 - 2, 0, mazeH / 2 + 3],
      [mazeW / 2 + 4, 0, -mazeH / 2 - 1],
      [mazeW / 2 + 2, 0, mazeH / 2 + 2],
      [-mazeW / 2 - 5, 0, 2],
      [mazeW / 2 + 5, 0, -3],
    ];
    return positions;
  }, [mazeW, mazeH]);

  return (
    <group>
      {/* Grass ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={GRASS_COLOR} />
      </mesh>

      {/* Darker grass patches for variety */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-mazeW / 2 - 4, -0.04, 5]} receiveShadow>
        <planeGeometry args={[6, 8]} />
        <meshStandardMaterial color={GRASS_DARK_COLOR} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mazeW / 2 + 3, -0.04, -4]} receiveShadow>
        <planeGeometry args={[5, 6]} />
        <meshStandardMaterial color={GRASS_DARK_COLOR} />
      </mesh>

      {/* Simple path leading to the building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, mazeH / 2 + 4]} receiveShadow>
        <planeGeometry args={[2, 8]} />
        <meshStandardMaterial color={PATH_COLOR} />
      </mesh>

      {/* Trees */}
      {trees.map((pos, i) => (
        <Tree key={i} position={pos} />
      ))}
    </group>
  );
}
