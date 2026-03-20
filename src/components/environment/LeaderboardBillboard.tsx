import { Text } from '@react-three/drei';
import { useGameStore } from '../../stores/gameStore';

const SIGN_W = 6.75;
const SIGN_H = 4.0;
const SIGN_Y = 3.3;
const POST_H = SIGN_Y + SIGN_H / 2;

const BOARD_COLOR = '#1A237E';
const POST_COLOR = '#616161';
const TITLE_COLOR = '#FFD700';
const RANK_COLOR = '#FFFFFF';
const NAME_COLOR = '#F0EBE3';
const SCORE_COLOR = '#F7B731';
const FONT_URL = '/PressStart2P-Regular.ttf';

export function LeaderboardBillboard({ position }: { position: [number, number, number] }) {
  const scores = useGameStore(s => s.leaderboardTop5);

  const topY = SIGN_Y + SIGN_H / 2 - 0.45;
  const lineHeight = 0.55;

  return (
    <group position={position}>
      {/* Left post */}
      <mesh position={[-SIGN_W / 2 + 0.15, POST_H / 2, -0.06]} castShadow>
        <boxGeometry args={[0.1, POST_H, 0.1]} />
        <meshStandardMaterial color={POST_COLOR} />
      </mesh>
      {/* Right post */}
      <mesh position={[SIGN_W / 2 - 0.15, POST_H / 2, -0.06]} castShadow>
        <boxGeometry args={[0.1, POST_H, 0.1]} />
        <meshStandardMaterial color={POST_COLOR} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, SIGN_Y, 0]} castShadow>
        <boxGeometry args={[SIGN_W, SIGN_H, 0.08]} />
        <meshStandardMaterial color={BOARD_COLOR} />
      </mesh>

      {/* Title */}
      <Text
        position={[0, topY, 0.05]}
        fontSize={0.38}
        color={TITLE_COLOR}
        anchorX="center"
        anchorY="middle"
        font={FONT_URL}
      >
        TOP PLAYERS
      </Text>

      {/* Score rows */}
      {scores.slice(0, 5).map((entry, i) => {
        const y = topY - (i + 1) * lineHeight;
        const rankText = `${i + 1}.`;
        const nameText = entry.username.length > 10
          ? entry.username.slice(0, 9) + '..'
          : entry.username;
        const scoreText = entry.score.toString().padStart(6, '0');

        return (
          <group key={entry.id}>
            <Text position={[-SIGN_W / 2 + 0.6, y, 0.05]} fontSize={0.28} color={RANK_COLOR} anchorX="center" anchorY="middle" font={FONT_URL}>
              {rankText}
            </Text>
            <Text position={[-SIGN_W / 2 + 1.3, y, 0.05]} fontSize={0.28} color={NAME_COLOR} anchorX="left" anchorY="middle" font={FONT_URL}>
              {nameText}
            </Text>
            <Text position={[SIGN_W / 2 - 0.4, y, 0.05]} fontSize={0.28} color={SCORE_COLOR} anchorX="right" anchorY="middle" font={FONT_URL}>
              {scoreText}
            </Text>
          </group>
        );
      })}

      {/* Empty state */}
      {scores.length === 0 && (
        <Text position={[0, SIGN_Y - 0.3, 0.05]} fontSize={0.25} color={RANK_COLOR} anchorX="center" anchorY="middle" font={FONT_URL}>
          NO SCORES YET
        </Text>
      )}
    </group>
  );
}
