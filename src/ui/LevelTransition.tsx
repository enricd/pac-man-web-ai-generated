import { useGameStore } from '../stores/gameStore';

export function LevelTransition() {
  const level = useGameStore(s => s.level);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#FFD700',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      zIndex: 20,
      background: 'rgba(0,0,0,0.6)',
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>
        ELEVATOR GOING UP
      </h2>
      <p style={{ fontSize: '16px', color: '#fff' }}>
        Floor {level} → Floor {level + 1}
      </p>
    </div>
  );
}
