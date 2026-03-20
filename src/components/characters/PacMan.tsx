import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useGameStore } from '../../stores/gameStore';
import { lerpGridToWorld } from '../../utils/helpers';
import { PACMAN_COLOR } from '../../utils/constants';

const SKIN_COLOR = '#D2A272';
const SHIRT_COLOR = PACMAN_COLOR;
const PANTS_COLOR = '#2C2C3A';
const SHOE_COLOR = '#1A1A1A';

export function PacMan() {
  const groupRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const walkCycle = useRef(0);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const { pacman, phase } = useGameStore.getState();
    if (phase === 'gameOver') return;

    // Position
    const [x, z] = lerpGridToWorld(
      pacman.gridPos,
      pacman.targetGridPos,
      pacman.moveProgress
    );
    groupRef.current.position.set(x, 0, z);

    // Rotation based on direction
    switch (pacman.direction) {
      case 'right': groupRef.current.rotation.y = Math.PI / 2; break;
      case 'left': groupRef.current.rotation.y = -Math.PI / 2; break;
      case 'up': groupRef.current.rotation.y = Math.PI; break;
      case 'down': groupRef.current.rotation.y = 0; break;
    }

    // Walk animation — swing arms and legs when moving
    const isMoving = pacman.direction !== 'none' && pacman.moveProgress > 0;
    if (isMoving) {
      walkCycle.current += delta * 10;
    } else {
      // Ease back to neutral
      walkCycle.current *= 0.85;
    }

    const swing = Math.sin(walkCycle.current) * 0.5;

    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
  });

  // Scale: full character fits in ~0.7 units wide, ~0.85 tall
  const s = 0.038; // master scale

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[8 * s, 8 * s, 8 * s]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
      </mesh>

      {/* Eyes - two small dark boxes on the face */}
      <mesh position={[-2 * s, 0.74, 4.01 * s]}>
        <boxGeometry args={[1.5 * s, 1.5 * s, 0.5 * s]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>
      <mesh position={[2 * s, 0.74, 4.01 * s]}>
        <boxGeometry args={[1.5 * s, 1.5 * s, 0.5 * s]} />
        <meshStandardMaterial color="#1A1A2E" />
      </mesh>

      {/* Body / Torso */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[8 * s, 12 * s, 4 * s]} />
        <meshStandardMaterial color={SHIRT_COLOR} roughness={0.5} />
      </mesh>

      {/* Left Arm (pivot at shoulder) */}
      <group position={[-5 * s, 0.56, 0]}>
        <group ref={leftArmRef}>
          <mesh castShadow>
            <boxGeometry args={[2 * s, 12 * s, 4 * s]} />
            <meshStandardMaterial color={SHIRT_COLOR} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Right Arm (pivot at shoulder) */}
      <group position={[5 * s, 0.56, 0]}>
        <group ref={rightArmRef}>
          <mesh castShadow>
            <boxGeometry args={[2 * s, 12 * s, 4 * s]} />
            <meshStandardMaterial color={SHIRT_COLOR} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Left Leg (pivot at hip = torso bottom) */}
      <group position={[-2 * s, 0.23, 0]}>
        <group ref={leftLegRef}>
          <mesh position={[0, -6 * s, 0]} castShadow>
            <boxGeometry args={[4 * s, 12 * s, 4 * s]} />
            <meshStandardMaterial color={PANTS_COLOR} roughness={0.6} />
          </mesh>
          <mesh position={[0, -12 * s, 0.5 * s]}>
            <boxGeometry args={[4 * s, 2 * s, 5 * s]} />
            <meshStandardMaterial color={SHOE_COLOR} roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Right Leg (pivot at hip = torso bottom) */}
      <group position={[2 * s, 0.23, 0]}>
        <group ref={rightLegRef}>
          <mesh position={[0, -6 * s, 0]} castShadow>
            <boxGeometry args={[4 * s, 12 * s, 4 * s]} />
            <meshStandardMaterial color={PANTS_COLOR} roughness={0.6} />
          </mesh>
          <mesh position={[0, -12 * s, 0.5 * s]}>
            <boxGeometry args={[4 * s, 2 * s, 5 * s]} />
            <meshStandardMaterial color={SHOE_COLOR} roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
