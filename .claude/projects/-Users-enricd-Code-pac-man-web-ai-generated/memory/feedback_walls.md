---
name: walls_individual_blocks_ok
description: User prefers the individual block look for walls — don't attempt merged geometry refactors
type: feedback
---

The individual-cube look of the walls (InstancedMesh with boxGeometry per cell) is acceptable. Don't try to merge wall geometry to eliminate seams or internal faces — it broke other things and the user prefers the current style.

**Why:** A merged-geometry rewrite of Wall.tsx broke the occlusion system and other features. The block look fits the aesthetic.
**How to apply:** Leave Wall.tsx's InstancedMesh approach as-is. Don't refactor walls to use merged BufferGeometry.
