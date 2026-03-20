import { useGameStore } from '../stores/gameStore';
import { STARTING_LIVES } from '../utils/constants';
import { useMusic } from '../hooks/useMusic';
import { musicEngine } from '../audio/musicEngine';

const iconBtn: React.CSSProperties = {
  pointerEvents: 'auto',
  background: 'rgba(0,0,0,0.4)',
  border: '2px solid rgba(255,255,255,0.3)',
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '20px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: '"Press Start 2P", "Courier New", monospace',
  textShadow: '2px 2px 4px rgba(0,0,0,0.6)',
  lineHeight: 1,
};

export function HUD() {
  const score = useGameStore(s => s.score);
  const lives = useGameStore(s => s.lives);
  const level = useGameStore(s => s.level);
  const phase = useGameStore(s => s.phase);
  const pauseGame = useGameStore(s => s.pauseGame);
  const { isMuted, toggleMute, hasCustomMelody, notifyCustomChange } = useMusic();

  const openPiano = () => {
    if (phase === 'playing') {
      pauseGame();
    }
  };

  const resetMelody = () => {
    musicEngine.clearCustomMelody();
    notifyCustomChange();
  };

  const isEvenLevel = level % 2 === 0;

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

      {/* Controls help — bottom left */}
      <div style={{
        position: 'absolute',
        bottom: -120,
        left: 28,
        fontSize: '14px',
        lineHeight: '2',
        color: 'rgba(255,255,255,0.8)',
        textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      }}>
        <div>ARROWS / WASD — Move</div>
        <div>EAT ALL PELLETS — Next floor</div>
        <div>POWER PELLET — Eat ghosts</div>
        {isEvenLevel && (
          <div style={{ color: '#F7B731', marginTop: '4px' }}>
            ⚠ INVISIBLE WALLS!<br/>
            They flash briefly every 15s
          </div>
        )}
      </div>

      {/* Audio controls — stacked vertically on the right */}
      <div style={{
        position: 'absolute',
        bottom: -120,
        right: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
      }}>
        <button onClick={toggleMute} style={iconBtn} title={isMuted ? 'Unmute music' : 'Mute music'}>
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button
          onClick={openPiano}
          style={{
            ...iconBtn,
            opacity: phase === 'playing' ? 1 : 0.4,
            cursor: phase === 'playing' ? 'pointer' : 'default',
          }}
          title="Open piano — compose your own melody"
          disabled={phase !== 'playing'}
        >
          🎹
        </button>
        {hasCustomMelody && (
          <button
            onClick={resetMelody}
            style={{ ...iconBtn, fontSize: '16px' }}
            title="Reset to default melody"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
