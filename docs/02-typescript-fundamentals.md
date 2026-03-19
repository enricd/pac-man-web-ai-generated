# 02 — TypeScript Fundamentals for Python Developers

> **Goal**: Understand TypeScript's type system by mapping it to Python concepts you already know.

---

## Why TypeScript?

TypeScript is to JavaScript what type hints are to Python — except TS actually **enforces** them at compile time. In Python, `def foo(x: int) -> str:` is a suggestion that mypy can check. In TypeScript, if you violate a type, your code **won't build**.

```python
# Python — runs fine, mypy might complain
def greet(name: str) -> str:
    return name + 1  # TypeError at runtime

# TypeScript — build error, never reaches runtime
function greet(name: string): string {
    return name + 1;  // Error: Operator '+' cannot be applied to 'string' and 'number'
}
```

---

## Primitive Types

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `str` | `string` | Lowercase in TS! |
| `int`, `float` | `number` | JS has only one number type |
| `bool` | `boolean` | |
| `None` | `null` / `undefined` | TS has both (explained below) |
| `list[int]` | `number[]` | |
| `tuple[int, str]` | `[number, string]` | |
| `dict[str, int]` | `Record<string, number>` | Or `{ [key: string]: number }` |

### null vs undefined

Python has one "nothing": `None`. JavaScript has two:
- **`undefined`** — variable declared but not assigned, or missing function parameter
- **`null`** — explicitly set to "no value"

In practice, you'll mostly encounter `undefined`. When in doubt, check for both: `if (value == null)` catches both (using `==` not `===`).

---

## Interfaces — Like Python dataclasses/TypedDicts

This is the most common way to define object shapes in TS:

```typescript
// src/types/maze.ts
export interface GridPosition {
  row: number;
  col: number;
}
```

```python
# Python equivalent
from dataclasses import dataclass

@dataclass
class GridPosition:
    row: int
    col: int

# Or with TypedDict:
from typing import TypedDict

class GridPosition(TypedDict):
    row: int
    col: int
```

Interfaces are **structural** — any object with the right shape matches, regardless of where it was created. Python's protocols (`typing.Protocol`) work the same way.

```typescript
// This works — no need to explicitly construct a GridPosition
const pos: GridPosition = { row: 5, col: 10 };
```

### Optional properties

```typescript
interface WallProps {
  grid: MazeGrid;
  visible?: boolean;   // Optional — can be omitted
  opacity?: number;
}
```

In Python: `visible: bool = True` (default parameter). In TS, `visible?: boolean` means the property may be `undefined`.

### Extending interfaces

```typescript
// src/types/game.ts
export interface CharacterState {
  gridPos: GridPosition;
  direction: Direction;
  moveProgress: number;
}

export interface GhostState extends CharacterState {
  name: GhostName;
  mode: GhostMode;
  scatterTarget: GridPosition;
}
```

```python
# Python equivalent
@dataclass
class CharacterState:
    grid_pos: GridPosition
    direction: Direction
    move_progress: float

@dataclass
class GhostState(CharacterState):
    name: GhostName
    mode: GhostMode
    scatter_target: GridPosition
```

---

## Union Types — Like Python's Union/Literal

```typescript
// src/types/game.ts
export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';
export type GhostMode = 'scatter' | 'chase' | 'frightened' | 'eaten';
export type GamePhase = 'start' | 'playing' | 'dying' | 'levelTransition' | 'gameOver';
```

```python
# Python equivalent
from typing import Literal

Direction = Literal['up', 'down', 'left', 'right', 'none']
GhostMode = Literal['scatter', 'chase', 'frightened', 'eaten']
```

These are **string literal unions** — the variable can only be one of those exact strings. The compiler will catch typos:

```typescript
const dir: Direction = 'up';      // OK
const dir: Direction = 'Up';      // Error: Type '"Up"' is not assignable to type 'Direction'
```

---

## `as const` — Enum-Like Constants

TypeScript has `enum`, but our project uses `as const` objects instead (because of the `erasableSyntaxOnly` setting, and because it's the modern preferred pattern):

```typescript
// src/types/maze.ts
export const CellType = {
  WALL: 0,
  PATH: 1,
  GHOST_HOUSE: 2,
  GHOST_DOOR: 3,
} as const;

export type CellType = (typeof CellType)[keyof typeof CellType];
// CellType = 0 | 1 | 2 | 3
```

Let's unpack that type line:
1. `typeof CellType` → the type of the object: `{ readonly WALL: 0; readonly PATH: 1; ... }`
2. `keyof typeof CellType` → `'WALL' | 'PATH' | 'GHOST_HOUSE' | 'GHOST_DOOR'`
3. `(typeof CellType)[keyof typeof CellType]` → `0 | 1 | 2 | 3` (the values)

```python
# Python equivalent
from enum import IntEnum

class CellType(IntEnum):
    WALL = 0
    PATH = 1
    GHOST_HOUSE = 2
    GHOST_DOOR = 3
```

Usage is identical: `CellType.WALL`, `CellType.PATH`, etc.

---

## Generics — Like Python's TypeVar

Generics let you write type-safe code that works with multiple types:

```typescript
// Built-in example: Array<T>
const numbers: Array<number> = [1, 2, 3];  // same as number[]
const strings: Array<string> = ['a', 'b'];

// Record<K, V> — typed dictionary
const ghostColors: Record<string, string> = {
  blinky: '#FF0000',
  pinky: '#FFB8FF',
};
```

```python
# Python equivalent
numbers: list[int] = [1, 2, 3]
ghost_colors: dict[str, str] = {
    "blinky": "#FF0000",
    "pinky": "#FFB8FF",
}
```

### Common utility types (used in this project)

```typescript
// Pick — select specific properties (like a subset TypedDict)
type Position = Pick<CharacterState, 'gridPos' | 'targetGridPos'>;

// Omit — exclude properties
type CharacterWithoutDirection = Omit<CharacterState, 'direction'>;

// Partial — make all properties optional
type PartialGame = Partial<GameState>;

// Record — typed dictionary
const scores: Record<GhostName, number> = { blinky: 0, pinky: 0, inky: 0, clyde: 0 };
```

---

## Type Assertions

Sometimes you know more than TypeScript does:

```typescript
// The ! operator: "I know this isn't null"
document.getElementById('root')!
// Without !, TS complains that getElementById might return null

// Type assertion: "Trust me, this is a MeshStandardMaterial"
const material = meshRef.current.material as THREE.MeshStandardMaterial;
```

```python
# Python equivalent — typing.cast
from typing import cast
material = cast(MeshStandardMaterial, mesh_ref.material)
```

Use sparingly — every assertion is you telling the compiler "I'm smarter than you." Sometimes you're wrong.

---

## Functions

```typescript
// Named function with types
function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// Arrow function (like Python's lambda, but can be multi-line)
const gridEqual = (a: GridPosition, b: GridPosition): boolean =>
  a.row === b.row && a.col === b.col;

// Function with optional parameter
function generateMaze(seed?: number): MazeData {
  const rng = createRNG(seed ?? Math.floor(Math.random() * 1000000));
  // ...
}
```

**`??`** is the **nullish coalescing operator** — returns the right side if left is `null` or `undefined`. Like Python's `value if value is not None else default`, or more precisely like `seed or random_seed` but only for None/undefined, not for falsy values like `0`.

**`=>`** arrow functions capture `this` from their surrounding scope. In our project, this rarely matters since we avoid class-based patterns, but it's a React convention to use arrows.

---

## Arrays and Iteration

```typescript
// Array methods (similar to Python list comprehensions)
const positions = pellets.map(p => gridToWorld(p));           // [f(x) for x in pellets]
const walls = grid.filter(cell => cell === CellType.WALL);     // [x for x in grid if x == WALL]
const total = scores.reduce((sum, s) => sum + s, 0);           // sum(scores)
const found = ghosts.find(g => g.name === 'blinky');           // next(g for g in ghosts if g.name == 'blinky')
const hasPath = grid.some(cell => cell === CellType.PATH);     // any(c == PATH for c in grid)
const allPaths = grid.every(cell => cell === CellType.PATH);   // all(c == PATH for c in grid)

// Destructuring (like Python's tuple unpacking)
const [x, z] = gridToWorld(pos);  // x, z = grid_to_world(pos)
const { row, col } = pos;          // row, col = pos.row, pos.col
```

### Set

```typescript
// Used in our game for pellet tracking
const pelletSet = new Set<string>();
pelletSet.add('5,10');
pelletSet.has('5,10');  // true
pelletSet.delete('5,10');
pelletSet.size;  // 0
```

Identical API to Python's `set`, except we store strings like `"row,col"` as keys (since JS Sets use reference equality for objects, not structural equality).

---

## Destructuring and Spread

Two patterns you'll see everywhere in React code:

```typescript
// Destructuring — extracting values from objects/arrays
const { gridPos, direction, moveProgress } = state;
const [first, ...rest] = [1, 2, 3, 4];  // first = 1, rest = [2, 3, 4]

// Spread — copying/merging objects (like Python's {**dict1, **dict2})
const newState = { ...oldState, score: oldState.score + 10 };
const combined = [...array1, ...array2];
```

This is critical for React because **state must be immutable** — you never modify state directly, you create a new object with the changes. The `...` spread makes this concise:

```typescript
// In our game store:
set(s => ({
  pacman: {
    ...s.pacman,          // Copy all existing pacman properties
    nextDirection: dir,   // Override just this one
  },
}));
```

```python
# Python equivalent
new_pacman = {**pacman, "next_direction": dir}
# Or with dataclasses:
new_pacman = dataclasses.replace(pacman, next_direction=dir)
```

---

## `import type` — Compile-Time Only

```typescript
import type { MazeData } from '../types/maze';     // Erased at runtime
import { CellType } from '../types/maze';            // Included at runtime
```

`import type` is removed during compilation — it tells the bundler "I only need this for type checking." Use it when you only reference something in type positions (`: MazeData`, `as MazeData`), not as a value.

This is unique to TypeScript — Python's `from __future__ import annotations` is the closest equivalent (makes all annotations strings evaluated lazily).

---

## Try It Yourself

1. **Read `src/types/game.ts`** — trace how `GhostState extends CharacterState`. What properties does a `GhostState` have in total?

2. **Read `src/utils/helpers.ts`** — look at `directionToOffset`. It uses a `switch` statement (like Python's `match`). What would happen if you added a new direction to the `Direction` union type but forgot to handle it here?

3. **Experiment in `src/utils/constants.ts`** — try changing `PACMAN_SPEED` to a string like `"fast"`. What error do you get? How does this compare to what would happen in Python without mypy?

---

**Next**: [03 — React Fundamentals](03-react-fundamentals.md) — components, hooks, and the rendering model.
