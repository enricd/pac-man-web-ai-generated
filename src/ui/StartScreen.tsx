import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { fetchLeaderboard, type ScoreResponse } from '../api/leaderboard';
import { Leaderboard } from './Leaderboard';

const USERNAME_KEY = 'pacman_username';
const USERNAME_REGEX = /[^a-zA-Z0-9_]/g;
const MAX_LENGTH = 16;

export function StartScreen() {
  const setUsername = useGameStore(s => s.setUsername);
  const startGame = useGameStore(s => s.startGame);
  const [inputValue, setInputValue] = useState('');
  const [scores, setScores] = useState<ScoreResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved) {
      setInputValue(saved);
      setUsername(saved);
    }
    fetchLeaderboard()
      .then(data => setScores(data))
      .finally(() => setLoading(false));
  }, [setUsername]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(USERNAME_REGEX, '').slice(0, MAX_LENGTH);
    setInputValue(cleaned);
    localStorage.setItem(USERNAME_KEY, cleaned);
    setUsername(cleaned);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && inputValue.length > 0) {
      e.preventDefault();
      startGame();
    }
  }

  const hasUsername = inputValue.length > 0;

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
      <p style={{ fontSize: '18px', color: '#6d6c6c', marginBottom: '20px' }}>
        Get to the top, don't be a loser!
      </p>

      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
        <label style={{ fontSize: '14px', color: '#6d6c6c', display: 'block', marginBottom: '6px' }}>
          ENTER YOUR NAME
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={MAX_LENGTH}
          placeholder="username"
          autoFocus
          style={{
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            fontSize: '14px',
            padding: '8px 12px',
            border: '2px solid #043184',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#043184',
            textAlign: 'center',
            outline: 'none',
            width: '240px',
          }}
        />
      </div>

      {hasUsername ? (
        <p style={{ fontSize: '14px', color: '#6d6c6c', animation: 'blink 1.5s infinite', marginBottom: '10px' }}>
          Press ENTER to start
        </p>
      ) : (
        <p style={{ fontSize: '14px', color: '#E55039', marginBottom: '10px' }}>
          Username required to play
        </p>
      )}

      <Leaderboard scores={scores} loading={loading} />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
