# Three.js 0.183 — Quick Reference

> **Always verify against latest docs**: `npx ctx7@latest docs /mrdoob/three.js "<query>"`

## Version (this project)

- `three` ^0.183.2
- `@types/three` ^0.183.1

---

## Geometries

All geometries extend `BufferGeometry`. Constructor args passed as arrays in R3F.

| Geometry | Constructor Args | R3F JSX |
|----------|-----------------|---------|
| `BoxGeometry` | `(width, height, depth, wSeg, hSeg, dSeg)` | `<boxGeometry args={[1, 1, 1]} />` |
| `SphereGeometry` | `(radius, wSeg, hSeg, phiStart, phiLen, thetaStart, thetaLen)` | `<sphereGeometry args={[0.5, 32, 16]} />` |
| `PlaneGeometry` | `(width, height, wSeg, hSeg)` | `<planeGeometry args={[10, 10]} />` |
| `CylinderGeometry` | `(radiusTop, radiusBot, height, radSeg, hSeg, openEnded)` | `<cylinderGeometry args={[0.5, 0.5, 2, 32]} />` |
| `ConeGeometry` | `(radius, height, radSeg, hSeg, openEnded)` | `<coneGeometry args={[0.5, 1, 32]} />` |
| `TorusGeometry` | `(radius, tube, radSeg, tubSeg, arc)` | `<torusGeometry args={[1, 0.3, 16, 100]} />` |
| `CapsuleGeometry` | `(radius, length, capSeg, radSeg)` | `<capsuleGeometry args={[0.3, 0.6, 8, 16]} />` |
| `RingGeometry` | `(innerR, outerR, thetaSeg, phiSeg)` | `<ringGeometry args={[0.5, 1, 32]} />` |

---

## Materials

### MeshStandardMaterial (PBR — most common)

```tsx
<meshStandardMaterial
  color="#ff0000"           // Base color
  roughness={0.7}           // 0 = mirror, 1 = matte
  metalness={0.2}           // 0 = dielectric, 1 = metal
  emissive="#000000"        // Self-lit color (unaffected by lights)
  emissiveIntensity={1}     // Emissive brightness
  transparent={true}        // Enable transparency
  opacity={0.5}             // 0 = invisible, 1 = opaque (needs transparent=true)
  side={THREE.DoubleSide}   // FrontSide | BackSide | DoubleSide
  wireframe={false}         // Wireframe rendering
  flatShading={false}       // Flat vs smooth shading
  // Texture maps
  map={colorTexture}        // Diffuse texture
  normalMap={normalTex}     // Surface detail
  roughnessMap={roughTex}   // Per-pixel roughness
  metalnessMap={metalTex}   // Per-pixel metalness
  aoMap={aoTex}             // Ambient occlusion
  alphaMap={alphaTex}       // Transparency map
  alphaTest={0.5}           // Threshold-based transparency
/>
```

### Other Materials

| Material | Use Case |
|----------|----------|
| `MeshBasicMaterial` | No lighting (always fully lit). Cheapest. Good for UI, debug. |
| `MeshPhongMaterial` | Specular highlights with Blinn-Phong. Cheaper than Standard. |
| `MeshLambertMaterial` | Diffuse only, no specular. Very cheap. |
| `MeshPhysicalMaterial` | Extension of Standard with clearcoat, transmission, IOR. Expensive. |
| `MeshToonMaterial` | Cel/cartoon shading. |
| `LineBasicMaterial` | For `Line` objects. |
| `PointsMaterial` | For `Points` objects. |
| `ShaderMaterial` | Custom GLSL shaders. |

---

## Lights

| Light | Shadows | Description |
|-------|---------|-------------|
| `AmbientLight(color, intensity)` | No | Uniform from all directions |
| `DirectionalLight(color, intensity)` | Yes | Parallel rays (sun-like) |
| `PointLight(color, intensity, distance, decay)` | Yes | Emits from a point in all directions |
| `SpotLight(color, intensity, distance, angle, penumbra, decay)` | Yes | Cone-shaped |
| `HemisphereLight(skyColor, groundColor, intensity)` | No | Sky/ground gradient |
| `RectAreaLight(color, intensity, width, height)` | No | Rectangular area (Standard/Physical only) |

### Shadow Setup

```tsx
// On Canvas
<Canvas shadows>

// On light
<directionalLight
  castShadow
  position={[5, 10, 5]}
  shadow-mapSize-width={2048}
  shadow-mapSize-height={2048}
  shadow-camera-near={0.5}
  shadow-camera-far={50}
/>

// On meshes
<mesh castShadow receiveShadow>
```

---

## InstancedMesh

Render thousands of identical meshes in a single draw call.

```typescript
// Constructor: new THREE.InstancedMesh(geometry, material, count)
const mesh = new THREE.InstancedMesh(geometry, material, 1000)

// Set per-instance transform
const matrix = new THREE.Matrix4()
const tempObj = new THREE.Object3D()
tempObj.position.set(x, y, z)
tempObj.rotation.set(rx, ry, rz)
tempObj.scale.setScalar(s)
tempObj.updateMatrix()
mesh.setMatrixAt(index, tempObj.matrix)
mesh.instanceMatrix.needsUpdate = true  // REQUIRED after updates

// Set per-instance color
const color = new THREE.Color()
mesh.setColorAt(index, color.set('#ff0000'))
mesh.instanceColor!.needsUpdate = true  // REQUIRED after updates
```

**Properties:**
- `instanceMatrix` — `InstancedBufferAttribute` of 4x4 matrices
- `instanceColor` — `InstancedBufferAttribute` of colors (null until first `setColorAt`)
- `count` — Number of instances to render (can be less than allocated)

---

## Camera

### PerspectiveCamera

```typescript
// PerspectiveCamera(fov, aspect, near, far)
// fov is in DEGREES (unlike most Three.js which uses radians)
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
camera.position.set(0, 5, 10)
camera.lookAt(0, 0, 0)

// After resize
camera.aspect = newWidth / newHeight
camera.updateProjectionMatrix()
```

### OrthographicCamera

```typescript
// OrthographicCamera(left, right, top, bottom, near, far)
const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000)
```

---

## Object3D (base class for all 3D objects)

### Transform Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `position` | `Vector3` | `(0,0,0)` | Local position |
| `rotation` | `Euler` | `(0,0,0)` | Local rotation (radians) |
| `scale` | `Vector3` | `(1,1,1)` | Local scale |
| `quaternion` | `Quaternion` | — | Rotation as quaternion |
| `visible` | `boolean` | `true` | Visibility |
| `castShadow` | `boolean` | `false` | Cast shadows |
| `receiveShadow` | `boolean` | `false` | Receive shadows |

### Methods

```typescript
object.add(child)            // Add child
object.remove(child)         // Remove child
object.lookAt(x, y, z)      // Point at position
object.traverse(callback)   // Walk all descendants
object.getWorldPosition(v)  // Get world-space position into v
```

---

## Coordinate System

Three.js uses a **right-handed** coordinate system:
- **X** = right
- **Y** = up
- **Z** = towards camera (out of screen)

This project maps grid → world as:
- Grid `col` → world `x`
- Grid `row` → world `z` (negative)
- World `y` = height (up)

---

## Math Utilities

```typescript
import * as THREE from 'three'

new THREE.Vector3(x, y, z)
new THREE.Matrix4()
new THREE.Color('#ff0000')    // or 0xff0000 or 'red' or 'rgb(255,0,0)'
new THREE.Euler(x, y, z)     // Radians

THREE.MathUtils.lerp(a, b, t)           // Linear interpolation
THREE.MathUtils.clamp(value, min, max)
THREE.MathUtils.degToRad(degrees)
THREE.MathUtils.randFloat(min, max)
```

---

## Disposal

Three.js objects (geometries, materials, textures) must be manually disposed to free GPU memory:

```typescript
geometry.dispose()
material.dispose()
texture.dispose()
renderer.dispose()
```

R3F auto-disposes on unmount. Use `dispose={null}` on `<group>` to prevent disposal of shared resources.
