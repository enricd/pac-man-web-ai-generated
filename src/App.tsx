import { Canvas } from '@react-three/fiber';
import { Game } from './components/Game';
import { HUD } from './ui/HUD';
import { StartScreen } from './ui/StartScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { LevelTransition } from './ui/LevelTransition';
import { useKeyboard } from './hooks/useKeyboard';
import { useGameStore } from './stores/gameStore';
import { BACKGROUND_COLOR, CAMERA_POSITION, CAMERA_ZOOM } from './utils/constants';

function App() {
  useKeyboard();
  const phase = useGameStore(s => s.phase);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        orthographic
        camera={{
          position: [CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2]],
          zoom: CAMERA_ZOOM,
          near: 0.1,
          far: 200,
        }}
        style={{ background: BACKGROUND_COLOR }}
      >
        <Game />
      </Canvas>

      {/* UI Overlays */}
      <HUD />
      {phase === 'start' && <StartScreen />}
      {phase === 'gameOver' && <GameOverScreen />}
      {phase === 'levelTransition' && <LevelTransition />}
    </div>
  );
}

export default App;
