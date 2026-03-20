import { useThree, useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { MAZE_WIDTH, MAZE_HEIGHT, CELL_SIZE, CAMERA_POSITION } from '../../utils/constants';
import { useGameStore } from '../../stores/gameStore';
import { FLOOR_STEP } from '../maze/Maze';
import * as THREE from 'three';

export function GameCamera() {
  const { camera } = useThree();

  useEffect(() => {
    // Initial zoom to fit the maze
    const maxSpan = Math.max(MAZE_WIDTH, MAZE_HEIGHT) * CELL_SIZE;
    const diagonalFactor = 1.15;
    const neededZoom = Math.min(
      window.innerWidth / (maxSpan * diagonalFactor),
      window.innerHeight / (maxSpan * diagonalFactor)
    );
    if ('zoom' in camera) {
      (camera as THREE.OrthographicCamera).zoom = neededZoom;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  // Each frame, smoothly move camera up with the current floor
  useFrame(() => {
    const level = useGameStore.getState().level;
    const targetY = (level - 1) * FLOOR_STEP;

    // Camera base position + floor offset
    const targetCamY = CAMERA_POSITION[1] + targetY;

    // Smooth interpolation
    camera.position.x = CAMERA_POSITION[0];
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.08);
    camera.position.z = CAMERA_POSITION[2];

    camera.lookAt(0, targetY, 0);
  });

  return null;
}
