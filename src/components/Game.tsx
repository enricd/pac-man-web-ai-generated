import { Maze, FLOOR_STEP } from './maze/Maze';
import { PacMan } from './characters/PacMan';
import { Ghost } from './characters/Ghost';
import { Pellet } from './items/Pellet';
import { PowerPellet } from './items/PowerPellet';
import { GameCamera } from './camera/GameCamera';
import { Elevator } from './mechanics/Elevator';
import { Teleporter } from './mechanics/Teleporter';
import { Outdoor } from './environment/Outdoor';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGameStore } from '../stores/gameStore';
import type { GhostName } from '../types/game';

const GHOST_NAMES: GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'];

export function Game() {
  useGameLoop();
  const level = useGameStore(s => s.level);
  const currentFloorY = (level - 1) * FLOOR_STEP;

  return (
    <>
      {/* Lighting — warm ambient + directional sun with shadows */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[15, 25 + currentFloorY, 15]}
        target-position={[0, currentFloorY, 0]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={50 + currentFloorY}
        shadow-bias={-0.001}
      />
      {/* Soft fill light from the other side */}
      <directionalLight position={[-10, 10 + currentFloorY, -5]} intensity={0.15} />

      {/* Camera */}
      <GameCamera />

      {/* Outdoor environment (grass, trees, path) */}
      <Outdoor />

      {/* Maze (office building) — handles its own Y stacking */}
      <Maze />

      {/* Gameplay entities at current floor height */}
      <group position={[0, currentFloorY, 0]}>
        {/* Items */}
        <Pellet />
        <PowerPellet />

        {/* Characters */}
        <PacMan />
        {GHOST_NAMES.map((name, i) => (
          <Ghost key={name} index={i} name={name} />
        ))}

        {/* Mechanics */}
        <Elevator />
        <Teleporter />
      </group>
    </>
  );
}
