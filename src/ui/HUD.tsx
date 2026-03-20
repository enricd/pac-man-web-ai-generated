import { useGameStore } from '../stores/gameStore';
import { STARTING_LIVES } from '../utils/constants';

export function HUD() {
  const score = useGameStore(s => s.score);
  const lives = useGameStore(s => s.lives);
  const level = useGameStore(s => s.level);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '16px 28px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#FFFFFF',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '22px',
      pointerEvents: 'none',
      zIndex: 10,
      textShadow: '2px 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)',
    }}>
      <div>SCORE: {score.toString().padStart(6, '0')}</div>
      <div style={{ color: '#FFD700' }}>
        {'♥'.repeat(lives)}
        {'♡'.repeat(Math.max(0, STARTING_LIVES - lives))}
      </div>
      <div>FLOOR {level} / 10</div>
    </div>
  );
}
