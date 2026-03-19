import { useGameStore } from '../stores/gameStore';

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
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#fff',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '14px',
      pointerEvents: 'none',
      zIndex: 10,
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    }}>
      <div>SCORE: {score.toString().padStart(6, '0')}</div>
      <div>FLOOR {level} / 10</div>
      <div>
        {'♥'.repeat(lives)}
        {'♡'.repeat(Math.max(0, 3 - lives))}
      </div>
    </div>
  );
}
