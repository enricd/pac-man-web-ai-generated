# 10 — Level Progression: Floors, Difficulty, and Invisible Walls

> **Goal**: Understand how levels work, how difficulty scales, and the invisible wall mechanic on even floors.

---

## The Floor Concept

The game has 10 levels themed as floors of an office building:

```
Floor 10 (hardest)  ←  New maze, fast ghosts, short power pellets
Floor 9             ←  Same maze as floor 9 + invisible walls
Floor 8             ←  New maze
...
Floor 2             ←  Same maze as floor 1 + invisible walls
Floor 1 (start)     ←  New maze, base speed
```

**Odd floors** (1, 3, 5, 7, 9): Generate a new maze.
**Even floors** (2, 4, 6, 8, 10): Reuse the previous floor's maze but with invisible walls.

---

## Level Transition Flow

When all pellets are eaten:

```
1. pelletsRemaining reaches 0
2. phase → 'levelTransition'
3. LevelTransition overlay shows "ELEVATOR GOING UP"
4. Elevator animation plays (door spinning)
5. After 2 seconds: nextLevel() is called
6. New maze generated (or reused)
7. Positions reset, pellets repopulated
8. phase → 'playing'
```

```typescript
// In tick() — level complete detection
const totalPellets = newPelletSet.size + newPowerPelletSet.size;
if (totalPellets === 0) {
  set({ phase: 'levelTransition' });
  setTimeout(() => get().nextLevel(), 2000);
  return;
}
```

```typescript
// nextLevel action
nextLevel: () => {
  const state = get();
  const newLevel = state.level + 1;

  if (newLevel > MAX_LEVEL) {
    set({ phase: 'gameOver' });  // Win!
    return;
  }

  // Odd levels: new maze. Even levels: reuse previous.
  let newMaze: MazeData;
  if (newLevel % 2 === 1) {
    newMaze = generateMaze();
    previousMaze = newMaze;
  } else {
    newMaze = previousMaze ?? generateMaze();
  }

  const pellets = createPelletSets(newMaze);

  set({
    phase: 'playing',
    level: newLevel,
    mazeData: newMaze,
    pacman: { ...initialPosition(newMaze) },
    ghosts: createInitialGhosts(newMaze),
    pelletsRemaining: newMaze.pellets.length + newMaze.powerPellets.length,
    pelletSet: pellets.pelletSet,
    powerPelletSet: pellets.powerPelletSet,
    // Reset timers, keep score and lives
  });
},
```

Note: **score and lives carry over** between levels. Only positions, pellets, and timers reset.

---

## Difficulty Scaling

Each level increases difficulty in two ways:

### 1. Ghost speed increase

```typescript
// In tick():
const levelMultiplier = 1 + (state.level - 1) * GHOST_SPEED_INCREASE_PER_LEVEL;
// Level 1: 1.0×, Level 5: 1.2×, Level 10: 1.45×
const ghostSpeed = GHOST_SPEED * levelMultiplier;
```

| Level | Multiplier | Ghost Speed (cells/sec) |
|-------|-----------|------------------------|
| 1 | 1.00 | 5.0 |
| 3 | 1.10 | 5.5 |
| 5 | 1.20 | 6.0 |
| 7 | 1.30 | 6.5 |
| 10 | 1.45 | 7.25 |

Pac-Man speed stays constant at 5.5, so by level 7 ghosts are faster than Pac-Man. Strategy becomes essential.

### 2. Power pellet duration decrease

```typescript
const duration = Math.max(
  POWER_PELLET_MIN_DURATION,                    // Floor: 3 seconds
  POWER_PELLET_DURATION -                       // Base: 8 seconds
    currentState.level * POWER_PELLET_DURATION_DECREASE  // -0.5s per level
);
```

| Level | Duration |
|-------|---------|
| 1 | 7.5s |
| 3 | 6.5s |
| 5 | 5.5s |
| 8 | 4.0s |
| 10 | 3.0s (minimum) |

Less time to eat ghosts = more risk, more excitement.

---

## Invisible Walls (Even Levels)

The signature mechanic for even floors: walls are **invisible** but still solid. They flash visible for 100ms every 15 seconds so the player can memorize the layout.

### The logic

```typescript
// In tick():
if (state.level % 2 === 0) {
  if (invisibleWallFlashTimer >= INVISIBLE_WALL_FLASH_INTERVAL) {  // 15s
    invisibleWallsVisible = true;
    if (invisibleWallFlashTimer >= INVISIBLE_WALL_FLASH_INTERVAL + INVISIBLE_WALL_FLASH_DURATION) {  // +0.1s
      invisibleWallsVisible = false;  // Hide again
      invisibleWallFlashTimer = 0;    // Reset timer
    }
  } else {
    invisibleWallsVisible = false;  // Invisible by default
  }
}
```

Timeline for even levels:
```
0s    ─────────── invisible ──────────── 15s: FLASH! (100ms) ─── invisible ─── 30s: FLASH! ...
```

### The rendering

```tsx
// src/components/maze/Maze.tsx
export function Maze() {
  const level = useGameStore(s => s.level);
  const invisibleWallsVisible = useGameStore(s => s.invisibleWallsVisible);

  const isEvenLevel = level % 2 === 0;
  const wallVisible = isEvenLevel ? invisibleWallsVisible : true;
  const wallOpacity = isEvenLevel && invisibleWallsVisible ? 0.6 : 1;

  return (
    <group>
      <Floor />
      <Wall grid={grid} visible={wallVisible} opacity={wallOpacity} />
      <GhostHouse />
    </group>
  );
}
```

When `visible` is `false`, the Wall InstancedMesh is hidden entirely. During the flash, walls appear at 60% opacity (semi-transparent) so the player gets a ghostly glimpse of the layout.

```tsx
// src/components/maze/Wall.tsx
<instancedMesh visible={visible}>
  <meshStandardMaterial
    transparent={opacity < 1}
    opacity={opacity}
  />
</instancedMesh>
```

### Gameplay strategy

Since even levels reuse the previous odd level's maze, the player has one full level to memorize the layout before walls become invisible. This rewards spatial memory and makes the game progressively more challenging.

---

## The Elevator Component

The elevator is a visual indicator during level transitions:

```tsx
// src/components/mechanics/Elevator.tsx
export function Elevator() {
  const phase = useGameStore(s => s.phase);

  useFrame(({ clock }) => {
    if (phase === 'levelTransition') {
      meshRef.current.visible = true;
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.5 + 1;
      meshRef.current.rotation.y = clock.elapsedTime * 2;
    } else {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <boxGeometry args={[1.5, 2, 0.1]} />
      <meshStandardMaterial color="#8B4513" emissive="#FFD700" />
    </mesh>
  );
}
```

During `levelTransition` phase:
- A golden door appears at Pac-Man's spawn
- It bobs up and down (`Math.sin` for oscillation)
- It rotates (`clock.elapsedTime * 2` for spin)
- After 2 seconds, `nextLevel()` replaces it with the new maze

---

## Maze Reuse: previousMaze

The store tracks the previous maze so even levels can reuse it:

```typescript
// In the store:
previousMaze: MazeData | null;

// In nextLevel():
if (newLevel % 2 === 1) {
  newMaze = generateMaze();      // New maze for odd levels
  previousMaze = newMaze;        // Save for next (even) level
} else {
  newMaze = previousMaze ?? generateMaze();  // Reuse for even levels
}
```

The `??` (nullish coalescing) handles the edge case where `previousMaze` might be null — generates a fresh maze as fallback.

---

## Win Condition

```typescript
if (newLevel > MAX_LEVEL) {
  set({ phase: 'gameOver' });  // But with a win message
  return;
}
```

The `GameOverScreen` checks whether it's a win or loss:

```tsx
const isWin = level > MAX_LEVEL || (level === MAX_LEVEL && lives > 0);

<h1>{isWin ? 'YOU WIN!' : 'GAME OVER'}</h1>
```

Reaching floor 10 and eating all pellets triggers the win state.

---

## setTimeout in React: A Word of Caution

We use `setTimeout` for the level transition delay:

```typescript
setTimeout(() => get().nextLevel(), 2000);
```

This works here because:
1. We guard against stale state: `get()` reads fresh state at execution time
2. The timeout is short (2 seconds)
3. There's only one transition happening at a time

In general, mixing `setTimeout` with React state is risky — the callback might execute when the component has unmounted or state has changed. For longer delays or complex timing, you'd use `useEffect` with cleanup:

```typescript
// Safer pattern (not used here, but good to know):
useEffect(() => {
  if (phase !== 'levelTransition') return;
  const timer = setTimeout(() => nextLevel(), 2000);
  return () => clearTimeout(timer);  // Cleanup if component unmounts
}, [phase]);
```

```python
# Python equivalent concern — like asyncio tasks that outlive their scope
task = asyncio.create_task(delayed_action())
# If the parent is cancelled, the task keeps running...
# Solution: cancellation tokens or structured concurrency
```

---

## Try It Yourself

1. **Skip to an even level**: In the browser console, call `useGameStore.setState({ level: 2 })` and eat all pellets on level 1. The next level will have invisible walls.

2. **Test the flash**: On an even level, count 15 seconds. The walls should briefly flash. Change `INVISIBLE_WALL_FLASH_INTERVAL` to `3` for faster testing.

3. **Feel the difficulty**: Play through levels 1-5. Notice ghosts getting faster and power pellets lasting shorter. The game gets noticeably harder.

4. **Quick win test**: Set `pelletsRemaining` to 0 and both sets to empty via console — does the level transition trigger?

---

**Next**: [11 — Deployment](11-deployment.md) — Docker, nginx, Traefik, and CI/CD.
