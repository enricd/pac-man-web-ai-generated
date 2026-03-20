import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PCFShadowMap } from 'three';
import { Game } from './components/Game';
import { HUD } from './ui/HUD';
import { StartScreen } from './ui/StartScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { LevelTransition } from './ui/LevelTransition';
import { Piano } from './ui/Piano';
import { useKeyboard } from './hooks/useKeyboard';
import { useMusic } from './hooks/useMusic';
import { useGameStore } from './stores/gameStore';
import { BACKGROUND_COLOR, CAMERA_POSITION, CAMERA_ZOOM } from './utils/constants';

function Credits() {
  const [expanded, setExpanded] = useState(false);
  const phase = useGameStore(s => s.phase);
  const hasOverlay = phase === 'start' || phase === 'gameOver' || phase === 'levelTransition';

  const textColor = hasOverlay ? 'rgba(30,30,60,0.7)' : 'rgba(255,255,255,0.65)';
  const accentColor = hasOverlay ? '#0e7490' : '#7dd3fc';

  const linkStyle: React.CSSProperties = {
    color: accentColor,
    textDecoration: 'underline',
  };

  const toggleStyle: React.CSSProperties = {
    cursor: 'pointer',
    color: accentColor,
    userSelect: 'none',
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
      left: 14,
      right: 14,
      color: textColor,
      textShadow: hasOverlay ? 'none' : '1px 1px 3px rgba(0,0,0,0.8)',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '16px',
      lineHeight: '1.6',
      pointerEvents: 'auto',
      zIndex: 30,
    }}>
      {expanded ? (
        <span>
          <a href="https://github.com/enricd/pac-man-web-ai-generated" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Game
          </a>{' '}
          created by{' '}
          <a href="https://enricd.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Enric Domingo
          </a>{' '}
          with the use of AI from Claude Code, because{' '}
          <a href="https://www.linkedin.com/in/javier-hernandez-brana/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Javi H
          </a>{' '}
          forced his ERNI unit to do it (just kidding, this is the best Unit 😎){' '}
          <span onClick={() => setExpanded(false)} style={toggleStyle}>▲</span>
        </span>
      ) : (
        <span>
          <a href="https://github.com/enricd/pac-man-web-ai-generated" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Game
          </a>{' '}
          created by{' '}
          <a href="https://enricd.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Enric Domingo
          </a>{' '}
          with the use of AI from Claude Code{' '}
          <span onClick={() => setExpanded(true)} style={toggleStyle}>...</span>
        </span>
      )}
    </div>
  );
}

function App() {
  useKeyboard();
  useMusic();
  const phase = useGameStore(s => s.phase);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows={{ type: PCFShadowMap }}
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
      {phase === 'paused' && <Piano />}
      <Credits />
    </div>
  );
}

export default App;
