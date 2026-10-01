# TESTING GROUNDS — 1.5.0 PLAN / STATUS
## WORLD CONSTRUCTION + CHUNK FOUNDATION

1.5 is the world-construction phase. 1.6 remains reserved for the new UI implementation.

## Completed in 1.5.0.01–1.5.0.05
- Stable world/chunk schema and versioning.
- Default World remains the normal authored Testing Grounds start.
- Blank Canvas is an explicit alternative starting world.
- Stable chunk grid coordinates and creator-facing names.
- Add Chunk workflow.
- Dynamic chunk navigation from the persisted chunk registry.
- Save Chunk / Load Chunk / Reset Chunk.
- Existing Save World / Load World extended, not replaced.
- Chunk manifest and individual chunk snapshots.
- Current chunk terrain state hydrates when switching chunks.
- Blank Canvas suppresses authored landscape/water/test-course content.
- Creator-added chunks are visible to world-level navigation/compass systems.

## 1.5.0.06 — NEXT
### World Map Rework
The map becomes a chunk grid first and terrain preview second.

Required behavior:
- Clear visible chunk grid.
- Occupied chunk cells stay inside their actual grid cells.
- Empty cells surround the existing authored world.
- Empty cells show `[+]`.
- Selecting `[+]` creates a chunk at that exact coordinate.
- Current chunk is visibly selected.
- Terrain/topographic preview is contained within the relevant world area instead of defining coordinate placement.
- Map state is derived from the authoritative world chunk registry.

The existing 1.5.0.05 map presentation is intentionally left intact until this dedicated pass.

## Later 1.5.x
- Presets: Terrain / Atmosphere / Tree / Rock / Chunk.
- Water overhaul.
- Weather / Wind / Storm / Rain / Lightning.
- Grass V2.
- Undo/history foundation and creator workflow expansion.
- Official demo/integration/stabilization.

## 1.6
New UI implementation using the established Testing Grounds World / Control / Map / Objects / Editor architecture.
