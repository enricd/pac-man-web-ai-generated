import { useRef, useMemo } from 'react';
import { InstancedMesh, Object3D } from 'three';
import type { MazeGrid } from '../../types/maze';
import { CellType } from '../../types/maze';
import { WALL_HEIGHT, CELL_SIZE, WALL_COLOR } from '../../utils/constants';
import { gridToWorld } from '../../utils/helpers';

interface WallProps {
  grid: MazeGrid;
  visible?: boolean;
  opacity?: number;
}

export function Wall({ grid, visible = true, opacity = 1 }: WallProps) {
  const meshRef = useRef<InstancedMesh>(null);

  const wallPositions = useMemo(() => {
    const positions: [number, number][] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === CellType.WALL) {
          positions.push(gridToWorld({ row: r, col: c }));
        }
      }
    }
    return positions;
  }, [grid]);

  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    wallPositions.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT / 2, z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [wallPositions]);

  if (wallPositions.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, wallPositions.length]}
      castShadow
      receiveShadow
      visible={visible}
    >
      <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
      <meshStandardMaterial
        color={WALL_COLOR}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </instancedMesh>
  );
}
