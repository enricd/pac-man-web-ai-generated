import { useGameStore } from '../../stores/gameStore';
import { Wall } from './Wall';
import { Floor } from './Floor';
import { GhostHouse } from './GhostHouse';
import { PreviousFloor } from './PreviousFloor';
import { WALL_HEIGHT } from '../../utils/constants';

// Each floor = wall height + floor slab thickness
const SLAB_THICKNESS = 0.15;
export const FLOOR_STEP = WALL_HEIGHT + SLAB_THICKNESS;

export function Maze() {
  const grid = useGameStore(s => s.mazeData.grid);
  const level = useGameStore(s => s.level);
  const invisibleWallsVisible = useGameStore(s => s.invisibleWallsVisible);
  const completedFloors = useGameStore(s => s.completedFloors);

  const isEvenLevel = level % 2 === 0;
  const wallVisible = isEvenLevel ? invisibleWallsVisible : true;
  const wallOpacity = isEvenLevel && invisibleWallsVisible ? 0.6 : 1;

  const currentFloorY = (level - 1) * FLOOR_STEP;

  return (
    <group>
      {/* Previous floors at their stacked heights */}
      {completedFloors.map((floorGrid, i) => (
        <PreviousFloor
          key={i}
          grid={floorGrid}
          yOffset={i * FLOOR_STEP}
        />
      ))}

      {/* Current playable floor */}
      <group position={[0, currentFloorY, 0]}>
        <Floor />
        <Wall grid={grid} visible={wallVisible} opacity={wallOpacity} />
        <GhostHouse />
      </group>
    </group>
  );
}
