# 04 — React Three Fiber: 3D in React

> **Goal**: Understand how Three.js works, how React Three Fiber wraps it declaratively, and how our game renders a 3D maze.

---

## The 3D Pipeline (Big Picture)

To render 3D on a webpage, you need:

1. **Scene** — the 3D world containing all objects
2. **Camera** — the viewpoint (where you're looking from)
3. **Renderer** — takes the scene + camera and draws pixels on a `<canvas>` element
4. **Meshes** — 3D objects in the scene, each made of:
   - **Geometry** — the shape (cube, sphere, plane)
   - **Material** — the surface appearance (color, shininess, texture)
5. **Lights** — illuminate the scene so materials are visible
6. **Animation Loop** — runs ~60 times per second, updates positions, re-renders

```python
# Mental model in Python pseudocode:
scene = Scene()
camera = PerspectiveCamera(fov=50, position=(0, 22, 8))
renderer = WebGLRenderer(canvas=document.querySelector('canvas'))

# Build objects
wall_mesh = Mesh(
    geometry=BoxGeometry(1, 1.5, 1),
    material=MeshStandardMaterial(color='#1a3a5c')
)
scene.add(wall_mesh)

# Animation loop — runs 60fps
def animate():
    update_game_state()
    renderer.render(scene, camera)
    request_animation_frame(animate)  # schedule next frame
```

**Three.js** gives you these building blocks in JavaScript. **React Three Fiber (R3F)** lets you declare them as React components instead of imperative API calls.

---

## Plain Three.js vs React Three Fiber

### Imperative (plain Three.js)

```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight);
camera.position.set(0, 22, 8);

const geometry = new THREE.SphereGeometry(0.4, 16, 16);
const material = new THREE.MeshStandardMaterial({ color: '#FFFF00' });
const pacman = new THREE.Mesh(geometry, material);
scene.add(pacman);

const light = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(light);

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  pacman.position.x += 0.01;
  renderer.render(scene, camera);
}
animate();
```

### Declarative (React Three Fiber)

```tsx
import { Canvas } from '@react-three/fiber';

function App() {
  return (
    <Canvas camera={{ position: [0, 22, 8], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#FFFF00" />
      </mesh>
    </Canvas>
  );
}
```

R3F maps **every Three.js class** to a **JSX element** with the same name in camelCase:
- `THREE.Mesh` → `<mesh>`
- `THREE.BoxGeometry` → `<boxGeometry>`
- `THREE.MeshStandardMaterial` → `<meshStandardMaterial>`
- `THREE.AmbientLight` → `<ambientLight>`
- `THREE.PointLight` → `<pointLight>`

Constructor arguments go in the `args` prop: `new BoxGeometry(1, 1.5, 1)` → `<boxGeometry args={[1, 1.5, 1]} />`

Properties map to props: `material.color = 'red'` → `<meshStandardMaterial color="red" />`

---

## The Canvas

```tsx
// src/App.tsx
<Canvas
  shadows                                           // Enable shadow rendering
  camera={{ position: [0, 22, 8], fov: 50 }}       // Camera config
  style={{ background: '#000' }}                    // CSS for the <canvas> element
>
  <Game />  {/* Everything 3D goes inside */}
</Canvas>
```

The `<Canvas>` component:
- Creates a Three.js scene, camera, and renderer
- Sets up the animation loop automatically
- Makes R3F hooks (like `useFrame`) available to children
- Resizes automatically when the browser window changes

**Important**: Everything inside `<Canvas>` is a 3D scene. HTML components (`<div>`, `<h1>`) go **outside** it. That's why our `HUD` and `StartScreen` are siblings of `Canvas`, not children.

---

## Meshes: Geometry + Material

A mesh is any visible 3D object:

```tsx
// src/components/characters/PacMan.tsx
<mesh ref={meshRef} castShadow>
  <sphereGeometry args={[0.4, 16, 16]} />
  {/*                   ↑radius ↑width segments ↑height segments */}
  <meshStandardMaterial
    color={PACMAN_COLOR}
    emissive={PACMAN_COLOR}        // Self-illumination color
    emissiveIntensity={0.3}        // How much it glows
  />
</mesh>
```

### Common geometries in our project

| Geometry | Used for | Args |
|----------|----------|------|
| `boxGeometry` | Walls | `[width, height, depth]` → `[1, 1.5, 1]` |
| `sphereGeometry` | Pac-Man, pellets | `[radius, widthSeg, heightSeg]` |
| `capsuleGeometry` | Ghosts | `[radius, length, capSeg, radSeg]` |
| `planeGeometry` | Floor, teleporter glow | `[width, height]` |

### Materials

| Material | Description | Used for |
|----------|-------------|----------|
| `meshStandardMaterial` | Realistic, reacts to light | Everything in our game |
| `meshBasicMaterial` | No lighting needed, flat color | Not used (but good for debugging) |

Key material properties:
- `color` — base color
- `emissive` + `emissiveIntensity` — self-glow (Pac-Man glows yellow, pellets glow)
- `transparent` + `opacity` — semi-transparency (eaten ghosts at 0.3 opacity)

---

## Lights

Without lights, `meshStandardMaterial` renders as pure black.

```tsx
// src/components/Game.tsx
<ambientLight intensity={0.4} />
{/* Ambient: uniform light from all directions. Like overcast sky. */}

<directionalLight
  position={[10, 20, 10]}
  intensity={0.8}
  castShadow
/>
{/* Directional: parallel rays from a position. Like the sun. Creates shadows. */}

<pointLight position={[0, 3, 0]} intensity={0.5} color="#FFFF00" distance={10} />
{/* Point: light radiating outward from a position. Like a light bulb.
    We attach this conceptually to Pac-Man for a warm glow effect. */}
```

```python
# Python mental model — like game lighting in pygame/pyglet
ambient = AmbientLight(intensity=0.4)       # Base illumination everywhere
sun = DirectionalLight(position=(10, 20, 10))  # Casts shadows
pacman_glow = PointLight(position=pacman.pos, color=YELLOW, radius=10)
```

---

## useFrame — The Game Loop

`useFrame` is the R3F equivalent of `requestAnimationFrame`. It runs a callback **every frame** (~60fps):

```tsx
// src/hooks/useGameLoop.ts
import { useFrame } from '@react-three/fiber';

export function useGameLoop(): void {
  const tick = useGameStore(s => s.tick);

  useFrame((_state, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    tick(clampedDelta);
  });
}
```

**`delta`** is the time in seconds since the last frame. At 60fps, delta ≈ 0.0167. We use it to make movement frame-rate independent:

```typescript
// Bad: moves 1 unit per frame (faster on faster computers)
position.x += 1;

// Good: moves 5 units per second (consistent regardless of framerate)
position.x += 5 * delta;
```

This is the same concept as frame-independent physics in any game engine.

### Direct mutation in useFrame

Inside `useFrame`, we **directly mutate** Three.js objects instead of using React state:

```tsx
// src/components/characters/PacMan.tsx
useFrame((_state, delta) => {
  if (!meshRef.current) return;

  const { pacman } = useGameStore.getState();  // Read state directly (not a hook!)
  const [x, z] = lerpGridToWorld(pacman.gridPos, pacman.targetGridPos, pacman.moveProgress);

  meshRef.current.position.set(x, 0.5, z);    // Direct mutation — no setState!
  meshRef.current.rotation.y = ...;             // Direct mutation
});
```

**Why `getState()` instead of a hook?** Inside `useFrame`, we need the **latest** state every frame. Hooks give you a value that triggers re-renders when it changes — but we're running 60 times per second and don't want re-renders. `getState()` reads the current Zustand snapshot synchronously.

---

## InstancedMesh — Efficient Rendering of Many Identical Objects

Our maze has hundreds of wall blocks. Rendering each as a separate `<mesh>` would be slow (one draw call per wall). `InstancedMesh` renders them all in **one draw call**:

```tsx
// src/components/maze/Wall.tsx
export function Wall({ grid, visible = true, opacity = 1 }: WallProps) {
  const meshRef = useRef<InstancedMesh>(null);

  // Calculate all wall positions once
  const wallPositions = useMemo(() => {
    const positions: [number, number][] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === CellType.WALL) {
          positions.push(gridToWorld({ row: r, col: c }));
        }
      }
    }
    return positions;
  }, [grid]);

  // Set each instance's position via a transformation matrix
  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    wallPositions.forEach(([x, z], i) => {
      dummy.position.set(x, WALL_HEIGHT / 2, z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [wallPositions]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, wallPositions.length]}>
      {/*                                ↑geometry  ↑material  ↑count */}
      <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
      <meshStandardMaterial color={WALL_COLOR} />
    </instancedMesh>
  );
}
```

How it works:
1. Create one geometry and one material (shared)
2. Tell Three.js "render this N times"
3. Each instance gets a **transformation matrix** (position, rotation, scale)
4. GPU renders all N instances in a single draw call

```python
# Python mental model — like batch rendering in pygame
# Bad: draw each wall individually
for wall in walls:
    screen.blit(wall_sprite, wall.position)  # 400 draw calls

# Good: batch them
sprite_batch = SpriteBatch(wall_sprite)
for wall in walls:
    sprite_batch.add(wall.position)
sprite_batch.draw()  # 1 draw call
```

The `Object3D` + `dummy.updateMatrix()` pattern is the Three.js way to set a position as a 4x4 transformation matrix. It's low-level but necessary for instancing.

---

## Coordinate System

Three.js uses a **Y-up** coordinate system:
- **X** → left/right
- **Y** → up/down (height)
- **Z** → forward/backward (depth)

Our game maps the 2D grid to the XZ plane (the "floor"), with Y as height:

```
     Y (up)
     |
     |    Z (depth)
     |   /
     |  /
     | /
     +--------→ X (right)
```

```typescript
// src/utils/helpers.ts
export function gridToWorld(pos: GridPosition): [number, number] {
  const x = (pos.col - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;   // Column → X
  const z = (pos.row - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;   // Row → Z
  return [x, z];
}
// Y is always set separately (0.5 for characters, WALL_HEIGHT/2 for walls)
```

The `-MAZE_WIDTH / 2` centers the maze around the origin (0, 0, 0), so the camera looks at the middle.

---

## The Camera

```tsx
// src/components/camera/GameCamera.tsx
export function GameCamera() {
  const { camera } = useThree();  // Access the scene's camera

  useFrame(() => {
    const { pacman } = useGameStore.getState();
    const [targetX, targetZ] = lerpGridToWorld(...);

    // Smooth follow — lerp camera position towards target
    camera.position.x += (targetX - camera.position.x) * CAMERA_DAMPING;
    camera.position.y += (CAMERA_HEIGHT - camera.position.y) * CAMERA_DAMPING;
    camera.position.z += (targetZ + 8 - camera.position.z) * CAMERA_DAMPING;

    camera.lookAt(targetX, 0, targetZ);  // Always look at Pac-Man
  });

  return null;  // This component renders nothing — it just controls the camera
}
```

**`CAMERA_DAMPING = 0.05`** means the camera moves 5% of the remaining distance each frame. This creates smooth, springy follow behavior. At 60fps, it takes about 60 frames (1 second) to get 95% of the way there.

```python
# Python equivalent — exponential smoothing
camera.x += (target_x - camera.x) * 0.05  # Move 5% of the gap each frame
```

**`useThree()`** is a R3F hook that gives access to the scene's camera, renderer, and other internals. Like dependency injection for 3D.

---

## Shadows

```tsx
<Canvas shadows>                           {/* Enable shadow system */}
  <directionalLight castShadow />          {/* This light creates shadows */}
  <mesh castShadow>                        {/* This object casts shadows */}
  <mesh receiveShadow>                     {/* This surface shows shadows */}
```

Shadows are expensive — only enable them where they matter (our directional light casts, walls/characters cast, floor receives).

---

## Putting It All Together: Game.tsx

```tsx
// src/components/Game.tsx
export function Game() {
  useGameLoop();  // Runs tick() every frame via useFrame

  return (
    <>
      {/* Lighting setup */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#FFFF00" distance={10} />

      {/* Camera follows Pac-Man */}
      <GameCamera />

      {/* The maze: floor + walls + ghost house */}
      <Maze />

      {/* Collectibles */}
      <Pellet />
      <PowerPellet />

      {/* Characters */}
      <PacMan />
      {GHOST_NAMES.map((name, i) => (
        <Ghost key={name} index={i} name={name} />
      ))}

      {/* Mechanics */}
      <Elevator />
      <Teleporter />
    </>
  );
}
```

The component does three things:
1. Starts the game loop (`useGameLoop` → `useFrame` → `tick()`)
2. Sets up the scene (lights, camera)
3. Renders all game objects (they each read from the Zustand store and position themselves)

---

## Try It Yourself

1. **Inspect the scene**: Add `<axesHelper args={[5]} />` inside `<Game>`. This renders red/green/blue lines for the X/Y/Z axes. Verify that X is right, Y is up, Z is forward.

2. **Change the camera**: In `GameCamera.tsx`, change `CAMERA_HEIGHT` in constants to `10` (much closer). See how the game feels different.

3. **Add a test object**: Add a bright red sphere floating above the maze:
   ```tsx
   <mesh position={[0, 5, 0]}>
     <sphereGeometry args={[1]} />
     <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
   </mesh>
   ```

4. **Experiment with lights**: Remove the `<ambientLight>`. Notice how everything not directly lit becomes pure black. This is why ambient light matters.

---

**Next**: [05 — Zustand State Management](05-zustand-state-management.md) — global game state without the boilerplate.
