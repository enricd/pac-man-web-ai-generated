export function StartScreen() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#FFFF00',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      zIndex: 20,
      background: 'rgba(0,0,0,0.7)',
    }}>
      <h1 style={{ fontSize: '36px', marginBottom: '20px', textShadow: '0 0 20px #FFFF00' }}>
        3D PAC-MAN
      </h1>
      <p style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>
        Office Building Edition
      </p>
      <p style={{ fontSize: '12px', color: '#aaa', animation: 'blink 1.5s infinite' }}>
        Press ARROW KEY or SPACE to start
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
