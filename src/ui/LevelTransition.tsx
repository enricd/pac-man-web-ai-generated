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
      color: '#F7B731',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      zIndex: 20,
      background: 'rgba(240, 235, 227, 0.8)',
    }}>
      <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>
        ELEVATOR GOING UP
      </h2>
      <p style={{ fontSize: '16px', color: '#4A4A4A' }}>
        Floor {level} → Floor {level + 1}
      </p>
    </div>
  );
}
