export interface ScoreSubmission {
  username: string;
  score: number;
  level_reached: number;
  time_played_seconds: number;
}

export interface ScoreResponse {
  id: number;
  username: string;
  score: number;
  level_reached: number;
  time_played_seconds: number;
  created_at: string;
}

export async function submitScore(submission: ScoreSubmission): Promise<ScoreResponse | null> {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(limit = 20): Promise<ScoreResponse[]> {
  try {
    const res = await fetch(`/api/leaderboard?limit=${limit}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
