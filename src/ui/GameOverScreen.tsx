import { useGameStore } from '../stores/gameStore';
import { MAX_LEVEL } from '../utils/constants';

export function GameOverScreen() {
  const score = useGameStore(s => s.score);
  const level = useGameStore(s => s.level);
  const lives = useGameStore(s => s.lives);

  const isWin = level > MAX_LEVEL || (level === MAX_LEVEL && lives > 0);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: isWin ? '#27AE60' : '#E55039',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      zIndex: 20,
      background: 'rgba(240, 235, 227, 0.9)',
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
        {isWin ? 'YOU WIN!' : 'GAME OVER'}
      </h1>
      <p style={{ fontSize: '16px', color: '#F7B731', marginBottom: '10px' }}>
        SCORE: {score.toString().padStart(6, '0')}
      </p>
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '20px' }}>
        Reached Floor {level}
      </p>
      <p style={{ fontSize: '12px', color: '#999', animation: 'blink 1.5s infinite' }}>
        Press SPACE to restart
      </p>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
