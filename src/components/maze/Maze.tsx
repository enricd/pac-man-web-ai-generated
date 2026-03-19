import { useGameStore } from '../../stores/gameStore';
import { Wall } from './Wall';
import { Floor } from './Floor';
import { GhostHouse } from './GhostHouse';

export function Maze() {
  const grid = useGameStore(s => s.mazeData.grid);
  const level = useGameStore(s => s.level);
  const invisibleWallsVisible = useGameStore(s => s.invisibleWallsVisible);

  const isEvenLevel = level % 2 === 0;
  const wallVisible = isEvenLevel ? invisibleWallsVisible : true;
  const wallOpacity = isEvenLevel && invisibleWallsVisible ? 0.6 : 1;

  return (
    <group>
      <Floor />
      <Wall grid={grid} visible={wallVisible} opacity={wallOpacity} />
      <GhostHouse />
    </group>
  );
}
