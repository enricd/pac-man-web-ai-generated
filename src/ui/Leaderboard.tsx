import type { ScoreResponse } from '../api/leaderboard';

interface LeaderboardProps {
  scores: ScoreResponse[];
  loading: boolean;
  highlightUsername?: string;
}

export function Leaderboard({ scores, loading, highlightUsername }: LeaderboardProps) {
  if (loading) {
    return (
      <p style={{ fontSize: '10px', color: '#999', marginTop: '10px' }}>
        Loading leaderboard...
      </p>
    );
  }

  if (scores.length === 0) {
    return (
      <p style={{ fontSize: '10px', color: '#999', marginTop: '10px' }}>
        No scores yet. Be the first!
      </p>
    );
  }

  return (
    <div style={{
      marginTop: '10px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '280px',
      overflowY: 'auto',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '10px',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
      }}>
        <thead>
          <tr style={{ color: '#043184', borderBottom: '2px solid #043184' }}>
            <th style={{ padding: '4px', textAlign: 'left' }}>#</th>
            <th style={{ padding: '4px', textAlign: 'left' }}>NAME</th>
            <th style={{ padding: '4px', textAlign: 'right' }}>SCORE</th>
            <th style={{ padding: '4px', textAlign: 'right' }}>FLOOR</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, i) => {
            const isHighlighted = highlightUsername && entry.username === highlightUsername;
            return (
              <tr
                key={entry.id}
                style={{
                  color: isHighlighted ? '#F7B731' : '#4A4A4A',
                  backgroundColor: isHighlighted ? 'rgba(247, 183, 49, 0.1)' : 'transparent',
                  borderBottom: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                <td style={{ padding: '3px 4px' }}>{i + 1}</td>
                <td style={{ padding: '3px 4px' }}>{entry.username}</td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                  {entry.score.toString().padStart(6, '0')}
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                  {entry.level_reached}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
