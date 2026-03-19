import { Maze } from './maze/Maze';
import { PacMan } from './characters/PacMan';
import { Ghost } from './characters/Ghost';
import { Pellet } from './items/Pellet';
import { PowerPellet } from './items/PowerPellet';
import { GameCamera } from './camera/GameCamera';
import { Elevator } from './mechanics/Elevator';
import { Teleporter } from './mechanics/Teleporter';
import { useGameLoop } from '../hooks/useGameLoop';
import type { GhostName } from '../types/game';

const GHOST_NAMES: GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'];

export function Game() {
  useGameLoop();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* Pac-Man emits a soft point light */}
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#FFFF00" distance={10} />

      {/* Camera */}
      <GameCamera />

      {/* Maze */}
      <Maze />

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
    </>
  );
}
