import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import type { Group } from 'three';
import { LeaderboardBillboard } from './LeaderboardBillboard';
import {
  MAZE_WIDTH,
  MAZE_HEIGHT,
  CELL_SIZE,
  GRASS_COLOR,
  GRASS_DARK_COLOR,
  PATH_COLOR,
  TREE_TRUNK_COLOR,
  TREE_LEAVES_COLOR,
  PARKING_LOT_COLOR,
  PARKING_LINE_COLOR,
  CAR_COLORS,
} from '../../utils/constants';

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshStandardMaterial color={TREE_TRUNK_COLOR} />
      </mesh>
      {/* Leaves — simple stacked boxes */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color={TREE_LEAVES_COLOR} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color={TREE_LEAVES_COLOR} />
      </mesh>
    </group>
  );
}

function Car({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[1.6, 0.4, 0.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0.1, 0.55, 0]} castShadow>
        <boxGeometry args={[0.9, 0.3, 0.7]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Windows */}
      <mesh position={[0.1, 0.55, 0.351]}>
        <boxGeometry args={[0.8, 0.22, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.1, 0.55, -0.351]}>
        <boxGeometry args={[0.8, 0.22, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Wheels */}
      {([-0.5, 0.5] as const).map((xOff) =>
        ([-0.4, 0.4] as const).map((zOff) => (
          <mesh key={`${xOff}_${zOff}`} position={[xOff, 0.1, zOff]}>
            <boxGeometry args={[0.25, 0.2, 0.1]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
        )),
      )}
    </group>
  );
}

function CamperVan({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main body — taller and longer than a car */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 0.85]} />
        <meshStandardMaterial color="#F5F5F0" />
      </mesh>
      {/* Roof */}
      <mesh position={[-0.1, 0.7, 0]} castShadow>
        <boxGeometry args={[1.4, 0.1, 0.85]} />
        <meshStandardMaterial color="#F5F5F0" />
      </mesh>
      {/* Cabin (front, slightly lower) */}
      <mesh position={[0.7, 0.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.8]} />
        <meshStandardMaterial color="#F5F5F0" />
      </mesh>
      {/* Windshield */}
      <mesh position={[0.96, 0.5, 0]}>
        <boxGeometry args={[0.01, 0.25, 0.7]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Side windows */}
      <mesh position={[0.3, 0.5, 0.431]}>
        <boxGeometry args={[0.5, 0.2, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.3, 0.5, -0.431]}>
        <boxGeometry args={[0.5, 0.2, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Color stripe */}
      <mesh position={[0, 0.35, 0.431]}>
        <boxGeometry args={[1.6, 0.12, 0.01]} />
        <meshStandardMaterial color="#FF7043" />
      </mesh>
      <mesh position={[0, 0.35, -0.431]}>
        <boxGeometry args={[1.6, 0.12, 0.01]} />
        <meshStandardMaterial color="#FF7043" />
      </mesh>
      {/* Wheels */}
      {([-0.55, 0.55] as const).map((xOff) =>
        ([-0.42, 0.42] as const).map((zOff) => (
          <mesh key={`${xOff}_${zOff}`} position={[xOff, 0.1, zOff]}>
            <boxGeometry args={[0.28, 0.2, 0.1]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Lamborghini({ position, color = '#FF6D00' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* Lower body — very flat and wide wedge base */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[1.8, 0.16, 0.95]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.08} />
      </mesh>
      {/* Upper body — tapered toward front, sits on lower body */}
      <mesh position={[-0.1, 0.24, 0]} castShadow>
        <boxGeometry args={[1.5, 0.1, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.08} />
      </mesh>
      {/* Hood — slopes down toward front */}
      <mesh position={[0.55, 0.26, 0]} rotation={[0, 0, -0.12]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.88]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.08} />
      </mesh>
      {/* Cabin — very small and low, set back */}
      <mesh position={[-0.05, 0.35, 0]} castShadow>
        <boxGeometry args={[0.55, 0.14, 0.7]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.08} />
      </mesh>
      {/* Windshield — angled aggressively */}
      <mesh position={[0.24, 0.33, 0]} rotation={[0, 0, 0.45]}>
        <boxGeometry args={[0.22, 0.02, 0.65]} />
        <meshStandardMaterial color="#0D47A1" metalness={0.9} roughness={0.05} />
      </mesh>
      {/* Rear window — angled back */}
      <mesh position={[-0.33, 0.34, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.15, 0.02, 0.6]} />
        <meshStandardMaterial color="#0D47A1" metalness={0.9} roughness={0.05} />
      </mesh>
      {/* Side windows */}
      <mesh position={[-0.05, 0.36, 0.351]}>
        <boxGeometry args={[0.45, 0.1, 0.01]} />
        <meshStandardMaterial color="#0D47A1" metalness={0.9} roughness={0.05} />
      </mesh>
      <mesh position={[-0.05, 0.36, -0.351]}>
        <boxGeometry args={[0.45, 0.1, 0.01]} />
        <meshStandardMaterial color="#0D47A1" metalness={0.9} roughness={0.05} />
      </mesh>
      {/* Engine cover behind cabin — slightly raised */}
      <mesh position={[-0.55, 0.28, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.85]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.08} />
      </mesh>
      {/* Engine vents — black slats on rear */}
      <mesh position={[-0.55, 0.26, 0.38]}>
        <boxGeometry args={[0.35, 0.08, 0.02]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      <mesh position={[-0.55, 0.26, -0.38]}>
        <boxGeometry args={[0.35, 0.08, 0.02]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Front air intake */}
      <mesh position={[0.88, 0.1, 0]}>
        <boxGeometry args={[0.06, 0.1, 0.7]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Rear diffuser */}
      <mesh position={[-0.88, 0.1, 0]}>
        <boxGeometry args={[0.06, 0.1, 0.8]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Rear spoiler on thin posts */}
      <mesh position={[-0.78, 0.36, 0.3]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      <mesh position={[-0.78, 0.36, -0.3]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      <mesh position={[-0.78, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.03, 0.75]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.08} />
      </mesh>
      {/* Headlights */}
      <mesh position={[0.91, 0.18, 0.3]}>
        <boxGeometry args={[0.02, 0.06, 0.15]} />
        <meshStandardMaterial color="#FFF9C4" emissive="#FFF9C4" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.91, 0.18, -0.3]}>
        <boxGeometry args={[0.02, 0.06, 0.15]} />
        <meshStandardMaterial color="#FFF9C4" emissive="#FFF9C4" emissiveIntensity={0.3} />
      </mesh>
      {/* Taillights */}
      <mesh position={[-0.91, 0.18, 0.35]}>
        <boxGeometry args={[0.02, 0.05, 0.12]} />
        <meshStandardMaterial color="#D32F2F" emissive="#D32F2F" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.91, 0.18, -0.35]}>
        <boxGeometry args={[0.02, 0.05, 0.12]} />
        <meshStandardMaterial color="#D32F2F" emissive="#D32F2F" emissiveIntensity={0.3} />
      </mesh>
      {/* Wheels — low-profile, wide */}
      {([-0.55, 0.55] as const).map((xOff) =>
        ([-0.48, 0.48] as const).map((zOff) => (
          <mesh key={`${xOff}_${zOff}`} position={[xOff, 0.08, zOff]}>
            <boxGeometry args={[0.3, 0.16, 0.08]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
        )),
      )}
    </group>
  );
}

function CargoTruck({ position, color = '#546E7A' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* Cab */}
      <mesh position={[0.65, 0.4, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cab windshield */}
      <mesh position={[1.01, 0.45, 0]}>
        <boxGeometry args={[0.01, 0.35, 0.7]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Cab side windows */}
      <mesh position={[0.65, 0.5, 0.451]}>
        <boxGeometry args={[0.4, 0.25, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.65, 0.5, -0.451]}>
        <boxGeometry args={[0.4, 0.25, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Cargo box */}
      <mesh position={[-0.3, 0.45, 0]} castShadow>
        <boxGeometry args={[1.3, 0.8, 0.95]} />
        <meshStandardMaterial color="#ECEFF1" />
      </mesh>
      {/* Cargo box trim */}
      <mesh position={[-0.3, 0.1, 0]}>
        <boxGeometry args={[1.3, 0.08, 0.96]} />
        <meshStandardMaterial color="#37474F" />
      </mesh>
      {/* Wheels */}
      {([-0.6, 0.6] as const).map((xOff) =>
        ([-0.47, 0.47] as const).map((zOff) => (
          <mesh key={`${xOff}_${zOff}`} position={[xOff, 0.12, zOff]}>
            <boxGeometry args={[0.3, 0.24, 0.12]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Bicycle({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation} scale={1.1}>
      {/* Rear wheel — simple thick disc */}
      <mesh position={[-0.35, 0.22, 0]}>
        <boxGeometry args={[0.38, 0.38, 0.055]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Front wheel */}
      <mesh position={[0.35, 0.22, 0]}>
        <boxGeometry args={[0.38, 0.38, 0.055]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Frame — single diagonal bar connecting wheels */}
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.6, 0.06, 0.05]} />
        <meshStandardMaterial color="#C62828" />
      </mesh>
      {/* Down bar — front wheel to bottom */}
      <mesh position={[0.18, 0.28, 0]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.3, 0.06, 0.05]} />
        <meshStandardMaterial color="#C62828" />
      </mesh>
      {/* Rear bar — seat to rear wheel */}
      <mesh position={[-0.22, 0.28, 0]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color="#C62828" />
      </mesh>
      {/* Seat post */}
      <mesh position={[-0.08, 0.46, 0]}>
        <boxGeometry args={[0.05, 0.14, 0.05]} />
        <meshStandardMaterial color="#C62828" />
      </mesh>
      {/* Seat */}
      <mesh position={[-0.08, 0.54, 0]}>
        <boxGeometry args={[0.16, 0.04, 0.1]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Fork */}
      <mesh position={[0.34, 0.36, 0]}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
        <meshStandardMaterial color="#9E9E9E" />
      </mesh>
      {/* Handlebars */}
      <mesh position={[0.34, 0.5, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.3]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      {/* Kickstand */}
      <mesh position={[-0.05, 0.1, 0.08]} rotation={[0.3, 0, 0.25]}>
        <boxGeometry args={[0.03, 0.24, 0.03]} />
        <meshStandardMaterial color="#9E9E9E" />
      </mesh>
    </group>
  );
}

function Lake({ position }: { position: [number, number, number] }) {
  // Minecraft-style rectangular lake made of overlapping boxes
  const blocks: { pos: [number, number]; size: [number, number] }[] = [
    { pos: [0, 0], size: [6, 4] },
    { pos: [2, 2], size: [3, 2] },
    { pos: [-2, -1.5], size: [3, 2] },
    { pos: [1, -2], size: [2, 1.5] },
  ];
  return (
    <group position={position}>
      {/* Shore blocks */}
      {blocks.map((b, i) => (
        <mesh key={`shore-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[b.pos[0], -0.04, b.pos[1]]}>
          <planeGeometry args={[b.size[0] + 0.6, b.size[1] + 0.6]} />
          <meshStandardMaterial color="#8D6E63" />
        </mesh>
      ))}
      {/* Water blocks */}
      {blocks.map((b, i) => (
        <mesh key={`water-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[b.pos[0], -0.02, b.pos[1]]}>
          <planeGeometry args={b.size} />
          <meshStandardMaterial color="#4FC3F7" metalness={0.4} roughness={0.1} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function ErniBillboard({ position }: { position: [number, number, number] }) {
  const texture = useTexture('/erni_image.png');
  texture.anisotropy = 16;
  const signW = 6.75;
  const signH = 2.7;
  const signY = 3.3;
  const postH = signY + signH / 2; // posts reach top of sign
  return (
    <group position={position}>
      {/* Left post — behind the sign, at inner edge */}
      <mesh position={[-signW / 2 + 0.15, postH / 2, -0.06]} castShadow>
        <boxGeometry args={[0.1, postH, 0.1]} />
        <meshStandardMaterial color="#616161" />
      </mesh>
      {/* Right post — behind the sign, at inner edge */}
      <mesh position={[signW / 2 - 0.15, postH / 2, -0.06]} castShadow>
        <boxGeometry args={[0.1, postH, 0.1]} />
        <meshStandardMaterial color="#616161" />
      </mesh>
      {/* Sign board back */}
      <mesh position={[0, signY, 0]} castShadow>
        <boxGeometry args={[signW, signH, 0.08]} />
        <meshStandardMaterial color="#1A237E" />
      </mesh>
      {/* Sign face with texture (front) */}
      <mesh position={[0, signY, 0.045]}>
        <planeGeometry args={[signW - 0.1, signH - 0.1]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      {/* Sign face with texture (back) */}
      <mesh position={[0, signY, -0.045]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[signW - 0.1, signH - 0.1]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}

function Dog({ bounds }: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }) {
  const ref = useRef<Group>(null);
  const state = useRef({
    x: bounds.minX + (bounds.maxX - bounds.minX) * 0.3,
    z: bounds.minZ + (bounds.maxZ - bounds.minZ) * 0.7,
    targetX: 0,
    targetZ: 0,
    rotation: 0,
    moving: false,
    timer: 0,
  });

  // Pick initial target
  useMemo(() => {
    const s = state.current;
    s.targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
    s.targetZ = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
    s.timer = 1 + Math.random() * 3;
  }, [bounds]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const s = state.current;
    s.timer -= delta;

    if (s.moving) {
      const dx = s.targetX - s.x;
      const dz = s.targetZ - s.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const speed = 1.5;

      if (dist < 0.2 || s.timer <= 0) {
        // Arrived or timed out — stop and wait
        s.moving = false;
        s.timer = 1.5 + Math.random() * 3;
      } else {
        s.x += (dx / dist) * speed * delta;
        s.z += (dz / dist) * speed * delta;
        s.rotation = Math.atan2(dx, dz);
      }
    } else if (s.timer <= 0) {
      // Pick new target
      s.targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      s.targetZ = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      s.moving = true;
      s.timer = 3 + Math.random() * 4;
    }

    ref.current.position.x = s.x;
    ref.current.position.z = s.z;
    ref.current.rotation.y = s.rotation;
  });

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.25, 0.2, 0.5]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.28, 0.28]} castShadow>
        <boxGeometry args={[0.2, 0.18, 0.2]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 0.24, 0.4]}>
        <boxGeometry args={[0.1, 0.08, 0.08]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
      {/* Ears */}
      <mesh position={[0.08, 0.38, 0.28]}>
        <boxGeometry args={[0.06, 0.08, 0.06]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
      <mesh position={[-0.08, 0.38, 0.28]}>
        <boxGeometry args={[0.06, 0.08, 0.06]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.3, -0.28]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.15]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Legs */}
      {([0.08, -0.08] as const).map((xOff) =>
        ([0.15, -0.15] as const).map((zOff) => (
          <mesh key={`leg-${xOff}-${zOff}`} position={[xOff, 0.07, zOff]}>
            <boxGeometry args={[0.06, 0.14, 0.06]} />
            <meshStandardMaterial color="#795548" />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Outdoor() {
  const mazeW = MAZE_WIDTH * CELL_SIZE;
  const mazeH = MAZE_HEIGHT * CELL_SIZE;
  const groundSize = Math.max(mazeW, mazeH) * 3.75;

  // Place trees around the office building (removed bottom 2)
  const trees = useMemo(() => {
    const positions: [number, number, number][] = [
      [mazeW / 2 + 5, 0, mazeH / 2 + 12],
      [mazeW / 2 + 4, 0, -mazeH / 2 - 1],
      [-mazeW / 2 - 5, 0, 2],
      [mazeW / 2 + 5, 0, -3],
      [-mazeW / 2 - 6, 0, -mazeH / 2 + 4],
      [mazeW / 2 + 6, 0, mazeH / 2 - 3],
      [mazeW / 2 + 3, 0, -mazeH / 2 - 5],
      [mazeW / 2 + 2, 0, mazeH / 2 + 10],
      // Back area of the building
      [3, 0, -mazeH / 2 - 3],
      [-2, 0, -mazeH / 2 - 5],
    ];
    return positions;
  }, [mazeW, mazeH]);

  // Street layout (from building outward, positive Z):
  const buildingEdge = mazeH / 2;
  const sidewalkWidth = 2;
  const parkingLaneWidth = 2;
  const drivingLaneWidth = 3;
  const streetWidth = mazeW + 30; // extended further

  const sidewalkCenter = buildingEdge + sidewalkWidth / 2;
  const parkingCenter = buildingEdge + sidewalkWidth + parkingLaneWidth / 2;
  const drivingCenter = buildingEdge + sidewalkWidth + parkingLaneWidth + drivingLaneWidth / 2;
  const roadCenter = buildingEdge + sidewalkWidth + (parkingLaneWidth + drivingLaneWidth) / 2;
  const roadWidth = parkingLaneWidth + drivingLaneWidth;

  // 15 parking slots (3 extra each side): some empty, various vehicle types
  // Types: 'car', 'camper', 'lambo', 'truck', null (empty)
  const numSlots = 15;
  const spacing = 2.2;
  const startX = -((numSlots - 1) * spacing) / 2;
  const slotDefs: { type: 'car' | 'camper' | 'lambo' | 'truck' | null; color: string }[] = [
    { type: 'truck', color: '#546E7A' },     // 0: cargo truck
    { type: 'car', color: CAR_COLORS[5] },   // 1: purple car
    { type: null, color: '' },               // 2: empty
    { type: 'car', color: CAR_COLORS[0] },   // 3: red
    { type: 'car', color: CAR_COLORS[1] },   // 4: beige
    { type: null, color: '' },               // 5: empty
    { type: 'car', color: CAR_COLORS[3] },   // 6: yellow
    { type: 'camper', color: '' },           // 7: camper van
    { type: 'car', color: CAR_COLORS[0] },   // 8: red
    { type: null, color: '' },               // 9: empty
    { type: 'lambo', color: '#FF6D00' },     // 10: lambo (orange)
    { type: 'car', color: CAR_COLORS[7] },   // 11: dark
    { type: 'car', color: CAR_COLORS[3] },   // 12: yellow
    { type: null, color: '' },               // 13: empty
    { type: 'car', color: CAR_COLORS[2] },   // 14: green
  ];

  const vehicles = useMemo(() => {
    const result: { position: [number, number, number]; type: string; color: string }[] = [];
    for (let i = 0; i < numSlots; i++) {
      const def = slotDefs[i];
      if (!def.type) continue;
      result.push({
        position: [startX + i * spacing, 0, parkingCenter],
        type: def.type,
        color: def.color,
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkingCenter]);

  // All slot positions for parking lines (including empty ones)
  const slotPositions = useMemo(
    () => Array.from({ length: numSlots }, (_, i) => startX + i * spacing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <group>
      {/* Grass ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={GRASS_COLOR} />
      </mesh>

      {/* Darker grass patches for variety */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-mazeW / 2 - 4, -0.04, 5]} receiveShadow>
        <planeGeometry args={[6, 8]} />
        <meshStandardMaterial color={GRASS_DARK_COLOR} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mazeW / 2 + 3, -0.04, -4]} receiveShadow>
        <planeGeometry args={[5, 6]} />
        <meshStandardMaterial color={GRASS_DARK_COLOR} />
      </mesh>

      {/* Sidewalk / pavement next to building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, sidewalkCenter]} receiveShadow>
        <planeGeometry args={[streetWidth, sidewalkWidth]} />
        <meshStandardMaterial color={PATH_COLOR} />
      </mesh>

      {/* Road surface (parking lane + driving lane) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, roadCenter]} receiveShadow>
        <planeGeometry args={[streetWidth, roadWidth]} />
        <meshStandardMaterial color={PARKING_LOT_COLOR} />
      </mesh>

      {/* Road center line (between parking and driving lane) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, buildingEdge + sidewalkWidth + parkingLaneWidth]}
      >
        <planeGeometry args={[streetWidth - 1, 0.08]} />
        <meshStandardMaterial color={PARKING_LINE_COLOR} />
      </mesh>

      {/* Driving lane dashed center line */}
      {Array.from({ length: 24 }, (_, i) => (
        <mesh
          key={`dash-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-streetWidth / 2 + 2 + i * 2, -0.01, drivingCenter]}
        >
          <planeGeometry args={[1, 0.06]} />
          <meshStandardMaterial color={PARKING_LINE_COLOR} />
        </mesh>
      ))}

      {/* Parking lines (for all slots, including empty ones) */}
      {slotPositions.map((x, i) => (
        <mesh
          key={`line-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x - 1.1, -0.01, parkingCenter]}
        >
          <planeGeometry args={[0.05, parkingLaneWidth - 0.2]} />
          <meshStandardMaterial color={PARKING_LINE_COLOR} />
        </mesh>
      ))}
      {/* Last parking line on the right */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[slotPositions[slotPositions.length - 1] + 1.1, -0.01, parkingCenter]}
      >
        <planeGeometry args={[0.05, parkingLaneWidth - 0.2]} />
        <meshStandardMaterial color={PARKING_LINE_COLOR} />
      </mesh>

      {/* Curb between sidewalk and road */}
      <mesh position={[0, 0.05, buildingEdge + sidewalkWidth]} castShadow>
        <boxGeometry args={[streetWidth, 0.1, 0.15]} />
        <meshStandardMaterial color="#BDBDBD" />
      </mesh>

      {/* Vehicles */}
      {vehicles.map((v, i) => {
        switch (v.type) {
          case 'camper': return <CamperVan key={`v-${i}`} position={v.position} />;
          case 'lambo': return <Lamborghini key={`v-${i}`} position={v.position} color={v.color} />;
          case 'truck': return <CargoTruck key={`v-${i}`} position={v.position} color={v.color} />;
          default: return <Car key={`v-${i}`} position={v.position} color={v.color} />;
        }
      })}

      {/* Trees */}
      {trees.map((pos, i) => (
        <Tree key={i} position={pos} />
      ))}

      {/* Lake — behind the building (negative Z side), Minecraft-style rectangles */}
      <Lake position={[-mazeW / 2 - 3, 0, -mazeH / 2 - 4]} />

      {/* Billboard — right side of building, between grass and pavement */}
      <ErniBillboard position={[mazeW / 2 + 5, 0, buildingEdge + sidewalkWidth / 2 - 1]} />

      {/* Leaderboard billboard — left side of building */}
      <LeaderboardBillboard position={[-mazeW / 2 - 5, 0, buildingEdge + sidewalkWidth / 2 - 1]} />

      {/* Bicycle leaning against the leaderboard billboard's right post */}
      <Bicycle
        position={[-mazeW / 2 - 5 + 6.75 / 2 - 0.15, 0, buildingEdge + sidewalkWidth / 2 - 1 + 0.25]}
        rotation={[0, 0.3, 0.08]}
      />

      {/* Dog wandering on the grass (right side of building) */}
      <Dog bounds={{
        minX: mazeW / 2 + 2,
        maxX: mazeW / 2 + 10,
        minZ: -mazeH / 2 - 3,
        maxZ: mazeH / 2 - 2,
      }} />
    </group>
  );
}
