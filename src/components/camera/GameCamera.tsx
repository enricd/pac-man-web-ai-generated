import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';
import { lerpGridToWorld } from '../../utils/helpers';
import { CAMERA_HEIGHT, CAMERA_DAMPING } from '../../utils/constants';

export function GameCamera() {
  const { camera } = useThree();

  useFrame(() => {
    const { pacman } = useGameStore.getState();
    const [targetX, targetZ] = lerpGridToWorld(
      pacman.gridPos,
      pacman.targetGridPos,
      pacman.moveProgress
    );

    // Isometric-style: camera above and slightly behind
    const camTargetX = targetX;
    const camTargetZ = targetZ + 8;
    const camTargetY = CAMERA_HEIGHT;

    // Smooth follow with damping
    camera.position.x += (camTargetX - camera.position.x) * CAMERA_DAMPING;
    camera.position.y += (camTargetY - camera.position.y) * CAMERA_DAMPING;
    camera.position.z += (camTargetZ - camera.position.z) * CAMERA_DAMPING;

    // Look at Pac-Man's position
    camera.lookAt(targetX, 0, targetZ);
  });

  return null;
}
