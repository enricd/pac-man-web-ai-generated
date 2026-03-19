import { Canvas } from '@react-three/fiber';
import { Game } from './components/Game';
import { HUD } from './ui/HUD';
import { StartScreen } from './ui/StartScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { LevelTransition } from './ui/LevelTransition';
import { useKeyboard } from './hooks/useKeyboard';
import { useGameStore } from './stores/gameStore';

function App() {
  useKeyboard();
  const phase = useGameStore(s => s.phase);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 22, 8], fov: 50, near: 0.1, far: 100 }}
        style={{ background: '#000' }}
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
