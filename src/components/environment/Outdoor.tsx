import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import type { Group } from 'three';
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

  // 9 parking slots: slots 2 and 6 empty, slot 4 is camper van
  const numSlots = 9;
  const spacing = 2.2;
  const startX = -((numSlots - 1) * spacing) / 2;
  const emptySlots = new Set([2, 6]);
  const camperSlot = 4;
  const slotColors = [
    CAR_COLORS[0], CAR_COLORS[1], null, CAR_COLORS[3], 'camper',
    CAR_COLORS[0], null, CAR_COLORS[7], CAR_COLORS[3],
  ];

  const cars = useMemo(() => {
    const result: { position: [number, number, number]; color: string; isCamper: boolean }[] = [];
    for (let i = 0; i < numSlots; i++) {
      if (emptySlots.has(i)) continue;
      result.push({
        position: [startX + i * spacing, 0, parkingCenter],
        color: slotColors[i] === 'camper' ? '' : slotColors[i]!,
        isCamper: i === camperSlot,
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

      {/* Cars and camper van */}
      {cars.map((car, i) =>
        car.isCamper ? (
          <CamperVan key={`car-${i}`} position={car.position} />
        ) : (
          <Car key={`car-${i}`} position={car.position} color={car.color} />
        ),
      )}

      {/* Trees */}
      {trees.map((pos, i) => (
        <Tree key={i} position={pos} />
      ))}

      {/* Lake — behind the building (negative Z side), Minecraft-style rectangles */}
      <Lake position={[-mazeW / 2 - 3, 0, -mazeH / 2 - 4]} />

      {/* Billboard — right side of building, between grass and pavement */}
      <ErniBillboard position={[mazeW / 2 + 5, 0, buildingEdge + sidewalkWidth / 2 - 1]} />

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
