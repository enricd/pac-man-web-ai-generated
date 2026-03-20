import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color } from 'three';
import type { MazeGrid } from '../../types/maze';
import { CellType } from '../../types/maze';
import {
  WALL_HEIGHT,
  CELL_SIZE,
  WALL_COLOR,
  WALL_TOP_COLOR,
} from '../../utils/constants';
import { gridToWorld, lerpGridToWorld } from '../../utils/helpers';
import { useGameStore } from '../../stores/gameStore';

interface WallProps {
  grid: MazeGrid;
  visible?: boolean;
  opacity?: number;
}

const fullColor = new Color(WALL_COLOR);
const capColor = new Color(WALL_TOP_COLOR);


const HIDDEN_Y = -100;

export function Wall({ grid, visible = true, opacity = 1 }: WallProps) {
  const opaqueRef = useRef<InstancedMesh>(null);
  const opaqueCapRef = useRef<InstancedMesh>(null);
  const fadedRef = useRef<InstancedMesh>(null);
  const fadedCapRef = useRef<InstancedMesh>(null);
  const windowRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  // Separate wall positions into regular walls and window walls
  const { wallPositions, windowPositions } = useMemo(() => {
    const walls: [number, number][] = [];
    const windows: [number, number][] = [];
    const windowSet = new Set<string>();

    // Position-based window pattern: groups of 3 windows, 3 wall gaps
    // Uses the cell's position along the edge (not array index)
    const isWindowSlot = (pos: number): boolean => {
      // Skip corners (pos 0). Pattern repeats every 6: [win win win wall wall wall]
      if (pos <= 0) return false;
      return ((pos - 1) % 6) < 3;
    };

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] !== CellType.WALL) continue;
        const rows = grid.length;
        const cols = grid[0].length;
        // Check each boundary edge and use position along that edge
        if (r === 0 && isWindowSlot(c)) windowSet.add(`${r},${c}`);
        if (r === rows - 1 && isWindowSlot(c)) windowSet.add(`${r},${c}`);
        if (c === 0 && isWindowSlot(r)) windowSet.add(`${r},${c}`);
        if (c === cols - 1 && isWindowSlot(r)) windowSet.add(`${r},${c}`);
      }
    }

    // Second pass: split into walls vs windows
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] !== CellType.WALL) continue;
        const [wx, wz] = gridToWorld({ row: r, col: c });
        if (windowSet.has(`${r},${c}`)) {
          windows.push([wx, wz]);
        } else {
          walls.push([wx, wz]);
        }
      }
    }
    return { wallPositions: walls, windowPositions: windows };
  }, [grid]);

  // Initialize opaque + faded wall meshes
  useEffect(() => {
    if (!opaqueRef.current || !fadedRef.current) return;
    wallPositions.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT / 2, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      opaqueRef.current!.setMatrixAt(i, dummy.matrix);
      opaqueRef.current!.setColorAt(i, fullColor);

      dummy.position.set(x, HIDDEN_Y, z);
      dummy.updateMatrix();
      fadedRef.current!.setMatrixAt(i, dummy.matrix);
      fadedRef.current!.setColorAt(i, fullColor);
    });
    opaqueRef.current.instanceMatrix.needsUpdate = true;
    fadedRef.current.instanceMatrix.needsUpdate = true;
    if (opaqueRef.current.instanceColor) opaqueRef.current.instanceColor.needsUpdate = true;
    if (fadedRef.current.instanceColor) fadedRef.current.instanceColor.needsUpdate = true;
  }, [wallPositions, dummy]);

  // Caps
  useEffect(() => {
    if (!opaqueCapRef.current || !fadedCapRef.current) return;
    wallPositions.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      opaqueCapRef.current!.setMatrixAt(i, dummy.matrix);
      opaqueCapRef.current!.setColorAt(i, capColor);

      dummy.position.set(x, HIDDEN_Y, z);
      dummy.updateMatrix();
      fadedCapRef.current!.setMatrixAt(i, dummy.matrix);
      fadedCapRef.current!.setColorAt(i, capColor);
    });
    opaqueCapRef.current.instanceMatrix.needsUpdate = true;
    fadedCapRef.current.instanceMatrix.needsUpdate = true;
    if (opaqueCapRef.current.instanceColor) opaqueCapRef.current.instanceColor.needsUpdate = true;
    if (fadedCapRef.current.instanceColor) fadedCapRef.current.instanceColor.needsUpdate = true;
  }, [wallPositions, dummy]);

  // Window glass blocks — full cell size, no wall behind them
  // useEffect (not useMemo) because refs are only available after mount
  useEffect(() => {
    if (!windowRef.current || windowPositions.length === 0) return;
    const winDummy = new Object3D();
    windowPositions.forEach(([x, z], i) => {
      winDummy.position.set(x, WALL_HEIGHT / 2, z);
      winDummy.scale.set(1, 1, 1);
      winDummy.updateMatrix();
      windowRef.current!.setMatrixAt(i, winDummy.matrix);
    });
    windowRef.current.instanceMatrix.needsUpdate = true;
  }, [windowPositions]);

  // Per-frame: swap walls between opaque and faded based on proximity to Pac-Man
  useFrame(() => {
    if (!opaqueRef.current || !fadedRef.current || !opaqueCapRef.current || !fadedCapRef.current) return;

    const { pacman } = useGameStore.getState();
    const [px, pz] = lerpGridToWorld(
      pacman.gridPos,
      pacman.targetGridPos,
      pacman.moveProgress
    );

    wallPositions.forEach(([wx, wz], i) => {
      const dx = wx - px;
      const dz = wz - pz;
      const depth = dz * 0.8 + dx * 0.2;
      const lateral = Math.abs(dx - dz * 0.25);
      const inOcclusionZone = depth > 0.5 && depth < 6 && lateral < 2.5;

      if (inOcclusionZone) {
        // Hide opaque, show faded
        dummy.position.set(wx, HIDDEN_Y, wz);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        opaqueRef.current!.setMatrixAt(i, dummy.matrix);
        opaqueCapRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(wx, WALL_HEIGHT / 2, wz);
        dummy.updateMatrix();
        fadedRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(wx, WALL_HEIGHT, wz);
        dummy.updateMatrix();
        fadedCapRef.current!.setMatrixAt(i, dummy.matrix);
      } else {
        // Show opaque, hide faded
        dummy.position.set(wx, WALL_HEIGHT / 2, wz);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        opaqueRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(wx, WALL_HEIGHT, wz);
        dummy.updateMatrix();
        opaqueCapRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(wx, HIDDEN_Y, wz);
        dummy.updateMatrix();
        fadedRef.current!.setMatrixAt(i, dummy.matrix);
        fadedCapRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    opaqueRef.current.instanceMatrix.needsUpdate = true;
    fadedRef.current.instanceMatrix.needsUpdate = true;
    opaqueCapRef.current.instanceMatrix.needsUpdate = true;
    fadedCapRef.current.instanceMatrix.needsUpdate = true;
  });

  if (wallPositions.length === 0 && windowPositions.length === 0) return null;

  return (
    <group visible={visible}>
      {/* Opaque walls */}
      {wallPositions.length > 0 && (
        <>
          <instancedMesh
            ref={opaqueRef}
            args={[undefined, undefined, wallPositions.length]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.6} transparent opacity={opacity} />
          </instancedMesh>
          <instancedMesh
            ref={opaqueCapRef}
            args={[undefined, undefined, wallPositions.length]}
            castShadow
          >
            <boxGeometry args={[CELL_SIZE, 0.05, CELL_SIZE]} />
            <meshStandardMaterial color={WALL_TOP_COLOR} roughness={0.5} transparent opacity={opacity} />
          </instancedMesh>

          {/* Faded walls (alpha 0.3) */}
          <instancedMesh
            ref={fadedRef}
            args={[undefined, undefined, wallPositions.length]}
            renderOrder={1}
          >
            <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
            <meshStandardMaterial
              color={WALL_COLOR}
              roughness={0.6}
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </instancedMesh>
          <instancedMesh
            ref={fadedCapRef}
            args={[undefined, undefined, wallPositions.length]}
            renderOrder={1}
          >
            <boxGeometry args={[CELL_SIZE, 0.05, CELL_SIZE]} />
            <meshStandardMaterial
              color={WALL_TOP_COLOR}
              roughness={0.5}
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </instancedMesh>
        </>
      )}

      {/* Window glass blocks — full cell size, replacing walls */}
      {windowPositions.length > 0 && (
        <instancedMesh
          ref={windowRef}
          args={[undefined, undefined, windowPositions.length]}
          renderOrder={2}
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
