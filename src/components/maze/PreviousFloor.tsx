import { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import type { MazeGrid } from '../../types/maze';
import {
  WALL_HEIGHT,
  CELL_SIZE,
  WALL_COLOR,
  FLOOR_COLOR,
  MAZE_WIDTH,
  MAZE_HEIGHT,
} from '../../utils/constants';
import { gridToWorld } from '../../utils/helpers';

interface PreviousFloorProps {
  grid: MazeGrid;
  yOffset: number;
}

const wallColor = new Color(WALL_COLOR).multiplyScalar(0.88);
const SLAB_COLOR = '#B0B0B0';
const SLAB_THICK = 0.15;

// Same window pattern as Wall.tsx
function isWindowSlot(pos: number): boolean {
  if (pos <= 0) return false;
  return ((pos - 1) % 6) < 3;
}

export function PreviousFloor({ grid, yOffset }: PreviousFloorProps) {
  const wallRef = useRef<InstancedMesh>(null);
  const windowRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const { outerWalls, outerWindows } = useMemo(() => {
    const walls: [number, number][] = [];
    const windows: [number, number][] = [];
    const rows = grid.length;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isBoundary = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
        if (!isBoundary) continue;

        const [wx, wz] = gridToWorld({ row: r, col: c });

        let isWindow = false;
        if (r === 0 && isWindowSlot(c)) isWindow = true;
        if (r === rows - 1 && isWindowSlot(c)) isWindow = true;
        if (c === 0 && isWindowSlot(r)) isWindow = true;
        if (c === cols - 1 && isWindowSlot(r)) isWindow = true;

        if (isWindow) {
          windows.push([wx, wz]);
        } else {
          walls.push([wx, wz]);
        }
      }
    }
    return { outerWalls: walls, outerWindows: windows };
  }, [grid]);

  // useEffect instead of useMemo — refs are only available after mount
  useEffect(() => {
    if (!wallRef.current) return;
    outerWalls.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT / 2, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      wallRef.current!.setMatrixAt(i, dummy.matrix);
      wallRef.current!.setColorAt(i, wallColor);
    });
    wallRef.current.instanceMatrix.needsUpdate = true;
    if (wallRef.current.instanceColor) wallRef.current.instanceColor.needsUpdate = true;
  }, [outerWalls, dummy]);

  useEffect(() => {
    if (!windowRef.current || outerWindows.length === 0) return;
    outerWindows.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT / 2, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      windowRef.current!.setMatrixAt(i, dummy.matrix);
    });
    windowRef.current.instanceMatrix.needsUpdate = true;
  }, [outerWindows, dummy]);

  return (
    <group position={[0, yOffset, 0]}>
      {/* Floor slab (bottom of this story) — thick box blocks shadows */}
      <mesh position={[0, -SLAB_THICK / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[MAZE_WIDTH * CELL_SIZE, SLAB_THICK, MAZE_HEIGHT * CELL_SIZE]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9} />
      </mesh>

      {/* Ceiling slab (top of this story) */}
      <mesh position={[0, WALL_HEIGHT + SLAB_THICK / 2, 0]} castShadow>
        <boxGeometry args={[MAZE_WIDTH * CELL_SIZE, SLAB_THICK, MAZE_HEIGHT * CELL_SIZE]} />
        <meshStandardMaterial color={SLAB_COLOR} roughness={0.8} />
      </mesh>

      {/* Outer walls */}
      {outerWalls.length > 0 && (
        <instancedMesh
          ref={wallRef}
          args={[undefined, undefined, outerWalls.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.7} />
        </instancedMesh>
      )}

      {/* Window glass blocks */}
      {outerWindows.length > 0 && (
        <instancedMesh
          ref={windowRef}
          args={[undefined, undefined, outerWindows.length]}
        >
          <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
          <meshStandardMaterial
            color={'#5BB8E8'}
            metalness={0.5}
            roughness={0.02}
            transparent
            opacity={0.55}
            emissive={'#3A9BD5'}
            emissiveIntensity={0.25}
          />
        </instancedMesh>
      )}
    </group>
  );
}
