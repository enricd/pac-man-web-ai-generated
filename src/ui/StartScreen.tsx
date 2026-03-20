export function StartScreen() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#4A4A4A',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      zIndex: 20,
      background: 'rgba(240, 235, 227, 0.85)',
    }}>
      <h1 style={{ fontSize: '42px', marginBottom: '20px', color: '#043184' }}>
        The ERNI Office PAC-MAN
      </h1>
      <p style={{ fontSize: '18px', color: '#6d6c6c', marginBottom: '10px' }}>
        Office Building Edition
      </p>
      <p style={{ fontSize: '18px', color: '#6d6c6c', animation: 'blink 1.5s infinite' }}>
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
