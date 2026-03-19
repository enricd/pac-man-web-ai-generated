# React Three Fiber v9 + Drei v10 — Quick Reference

> **Always verify against latest docs**: `npx ctx7@latest docs /pmndrs/react-three-fiber "<query>"` and `npx ctx7@latest docs /pmndrs/drei "<query>"`

## Versions (this project)

- `@react-three/fiber` ^9.5.0
- `@react-three/drei` ^10.7.7
- `three` ^0.183.2
- `react` ^19.2.4

---

## React 19 Compatibility

- R3F v8 → React 18, **R3F v9 → React 19** (hard requirement — Fiber is a React renderer).
- TypeScript: `Props` was renamed to `CanvasProps` in v9.
- `ref` is now a regular prop in React 19 (no `forwardRef` needed).

## Canvas

Root container for a Three.js scene. Handles renderer, camera, scene lifecycle.

```tsx
import { Canvas } from '@react-three/fiber'

<Canvas
  camera={{ position: [0, 0, 5], fov: 75 }}
  shadows                          // Enable shadow maps
  dpr={[1, 2]}                    // Device pixel ratio range
  gl={{ antialias: true, alpha: true }}
  frameloop="always"              // "always" | "demand" | "never"
  flat                            // Use THREE.NoToneMapping (default is ACESFilmic)
  onCreated={(state) => {}}       // Called when Canvas is ready
  fallback={<div>No WebGL</div>} // Fallback if WebGL unavailable
>
  {/* Scene children here */}
</Canvas>
```

**Key rules:**
- All R3F hooks (`useFrame`, `useThree`, `useLoader`) must be called inside `<Canvas>`.
- `<Canvas>` creates its own `<div>` — it fills the parent container.
- React 19 compatible out of the box with R3F v9.

---

## useFrame

Runs every rendered frame. **Must be inside `<Canvas>`.**

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function RotatingBox() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state, delta) => {
    // state: { clock, camera, scene, gl, mouse, size, ... }
    // delta: seconds since last frame (use for frame-rate independence)
    meshRef.current.rotation.x += delta
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  )
}
```

**Priority parameter**: `useFrame(callback, priority)` — higher priority runs first. Priority > 0 takes over the render loop (you must call `gl.render(scene, camera)` yourself).

**Performance**: Avoid creating objects inside useFrame. Pre-allocate vectors/matrices as module-level or ref constants.

---

## useThree

Access Three.js internals. Supports selectors for performance.

```tsx
import { useThree } from '@react-three/fiber'

// Full state (re-renders on ANY change — avoid)
const state = useThree()

// Selector (re-renders only when camera changes)
const camera = useThree((state) => state.camera)
const { size, viewport } = useThree((state) => ({ size: state.size, viewport: state.viewport }))

// Imperative (no re-render)
const get = useThree((state) => state.get)
const invalidate = useThree((state) => state.invalidate)
```

Available state: `gl`, `scene`, `camera`, `raycaster`, `pointer`, `mouse`, `clock`, `size`, `viewport`, `set`, `get`, `invalidate`, `advance`, `controls`.

---

## InstancedMesh

Render many identical geometries in a single draw call. Critical for walls and pellets.

```tsx
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

function Instances({ positions }: { positions: [number, number, number][] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = new THREE.Object3D()

  useEffect(() => {
    positions.forEach((pos, i) => {
      tempObject.position.set(...pos)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" />
    </instancedMesh>
  )
}
```

**Key points:**
- `args={[geometry, material, count]}` — pass `undefined` for geometry/material to use JSX children.
- After `setMatrixAt()`, set `instanceMatrix.needsUpdate = true`.
- After `setColorAt()`, set `instanceColor.needsUpdate = true`.
- Pre-allocate `Object3D` / `Matrix4` outside the loop.

---

## Events

R3F meshes support pointer events via raycasting.

```tsx
<mesh
  onClick={(e) => { e.stopPropagation(); /* ... */ }}
  onPointerOver={(e) => { /* hover */ }}
  onPointerOut={(e) => { /* unhover */ }}
  onPointerMove={(e) => { /* e.point = world coords */ }}
/>
```

Event object includes: `point` (world intersection), `distance`, `face`, `object`, `stopPropagation()`.

---

## useLoader

Load assets with React Suspense integration. Auto-caches by URL.

```tsx
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'

function TexturedMesh() {
  const texture = useLoader(TextureLoader, '/textures/wall.jpg')
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

// Preload (call outside component)
useLoader.preload(TextureLoader, '/textures/wall.jpg')
```

---

## Disposal

R3F auto-disposes geometries/materials/textures on unmount. To prevent (for shared assets):

```tsx
<group dispose={null}>
  <mesh geometry={sharedGeo} material={sharedMat} />
</group>
```

---

## Performance Patterns

1. **Selectors** — Always use selectors with `useThree` and Zustand stores to avoid unnecessary re-renders.
2. **Refs over state** — For per-frame updates, mutate refs in `useFrame` instead of calling `setState`.
3. **InstancedMesh** — Use for any repeated geometry (walls, pellets, particles).
4. **useMemo** — Memoize geometry/material arrays, position calculations.
5. **On-demand rendering** — Set `frameloop="demand"` + call `invalidate()` when state changes (not needed for games).
6. **Don't create objects in useFrame** — Pre-allocate `Vector3`, `Matrix4`, `Object3D`, `Color` outside the render loop:

```tsx
// BAD: creates new Vector3 every frame → GC pressure
useFrame(() => { ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1) })

// GOOD: reuse pre-allocated vector
const vec = useMemo(() => new THREE.Vector3(), [])
useFrame(() => { ref.current.position.lerp(vec.set(x, y, z), 0.1) })
```

7. **Use `visible` instead of unmounting** — Avoid mounting/unmounting components with expensive resources (buffers, materials). Toggle `visible` prop instead:

```tsx
// BAD: unmounts and remounts (re-compiles shaders)
{showStage && <Stage />}

// GOOD: keeps mounted, toggles visibility
<Stage visible={showStage} />
```

8. **PerformanceMonitor** — Auto-adjust DPR based on FPS:
```tsx
const [dpr, setDpr] = useState(1.5)
<Canvas dpr={dpr}>
  <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
</Canvas>
```

---

# Drei v10 Helpers

## Declarative Instances

Higher-level API over InstancedMesh:

```tsx
import { Instances, Instance } from '@react-three/drei'

<Instances limit={1000}>
  <boxGeometry />
  <meshStandardMaterial />
  {positions.map((pos, i) => (
    <Instance key={i} position={pos} color="orange" scale={0.5} />
  ))}
</Instances>
```

## KeyboardControls

Declarative keyboard input:

```tsx
import { KeyboardControls, useKeyboardControls } from '@react-three/drei'

// Wrap app
<KeyboardControls map={[
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
]}>
  <Canvas>...</Canvas>
</KeyboardControls>

// In component
const forward = useKeyboardControls((state) => state.forward)
```

## OrbitControls

```tsx
import { OrbitControls } from '@react-three/drei'
<OrbitControls makeDefault enableDamping dampingFactor={0.05} />
```

## useTexture (load textures easily)

```tsx
import { useTexture } from '@react-three/drei'

// Single texture
const colorMap = useTexture('/textures/color.jpg')

// Multiple textures
const [color, normal] = useTexture(['/textures/color.jpg', '/textures/normal.jpg'])

// PBR map object (keys match material props — spread directly)
const textures = useTexture({
  map: '/textures/albedo.jpg',
  normalMap: '/textures/normal.jpg',
  roughnessMap: '/textures/roughness.jpg',
})
<meshStandardMaterial {...textures} />
```

## Html (embed DOM elements in 3D scene)

```tsx
import { Html } from '@react-three/drei'

<group position={[0, 2, 0]}>
  <Html center distanceFactor={10} style={{ background: 'white', padding: '10px' }}>
    <h1>Label</h1>
  </Html>
</group>
```

Props: `center`, `distanceFactor`, `transform`, `sprite`, `occlude`, `portal`, `zIndexRange`.

## Environment (HDR lighting)

```tsx
import { Environment } from '@react-three/drei'
<Environment preset="city" />  // Presets: apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse
<Environment background />     // Also use as scene background
```

## Text (SDF 3D text)

```tsx
import { Text } from '@react-three/drei'
<Text color="white" fontSize={1} position={[0, 2, 0]} anchorX="center" anchorY="middle">
  GAME OVER
</Text>
```

## Other Useful Helpers

| Helper | Purpose |
|--------|---------|
| `Billboard` | Always face camera |
| `Float` | Animated floating effect |
| `Center` | Auto-center children |
| `useGLTF` | Load GLTF/GLB models |
| `Sky` | Procedural sky shader |
| `Stats` | FPS/MS/MB performance stats (dev overlay) |
| `PerformanceMonitor` | Auto-adjust DPR based on FPS |
| `Bvh` | Accelerated raycasting for all children |
| `ContactShadows` | Soft shadows beneath objects |
| `Stage` | Complete scene setup (lights, shadows, env) |
| `AdaptiveDpr` | Auto-reduce DPR when FPS drops |
| `Preload` | Precompile scene via `gl.compile` (`<Preload all />`) |
| `meshBounds` | Cheaper bounding-sphere raycasting (`<mesh raycast={meshBounds}>`) |

---

## R3F JSX ↔ Three.js Mapping

| JSX | Three.js |
|-----|----------|
| `<mesh>` | `new THREE.Mesh()` |
| `<group>` | `new THREE.Group()` |
| `<instancedMesh>` | `new THREE.InstancedMesh()` |
| `<boxGeometry args={[1,1,1]}>` | `new THREE.BoxGeometry(1,1,1)` |
| `<meshStandardMaterial color="red">` | `new THREE.MeshStandardMaterial({color:'red'})` |
| `<ambientLight intensity={0.5}>` | `new THREE.AmbientLight(0xffffff, 0.5)` |
| `<pointLight position={[0,5,0]}>` | `new THREE.PointLight(); light.position.set(0,5,0)` |
| `<primitive object={obj}>` | Insert pre-existing Three.js object |

**Constructor args**: Pass via `args` prop as array. E.g., `<sphereGeometry args={[0.5, 32, 16]}>`

**Attach**: Child elements auto-attach to parent (`geometry` → `parent.geometry`, `material` → `parent.material`). Override with `attach="property-name"`.

**TypeScript**: Use `ThreeElements` for typed mesh props:
```tsx
import { ThreeElements } from '@react-three/fiber'
function Box(props: ThreeElements['mesh']) {
  return <mesh {...props}><boxGeometry /><meshStandardMaterial /></mesh>
}
```
