# Testing Grounds 1.5.0.06 — World Map / Grid Rework

## Scope
The World Map is now derived from the authoritative world chunk registry and presents the world as a real 6 × 6 chunk grid.

## Changes
- Replaced floating AREA_CONFIG map nodes with actual grid cells.
- Occupied chunks render inside their exact grid cells.
- Empty cells surround the authored starting world and display `[+]`.
- Clicking an empty `[+]` opens Add Chunk with that exact coordinate preselected.
- Clicking an occupied cell selects/teleports to that chunk.
- Current chunk has an explicit active state.
- Terrain/topographic preview is a visual layer behind the grid rather than the coordinate system.
- Empty cells mask the terrain preview so unoccupied world space reads as empty.
- Map cell contents are derived from the authoritative persisted chunk registry.
- Existing Add Chunk dialog remains available from the editor footer.
- No 1.6 visual/UI overhaul is introduced here.

## Compatibility
- Existing Default World is preserved.
- Existing Blank Canvas is preserved.
- Existing chunk creation, rename, navigation, and persistence remain the underlying systems.
- Existing Save World / Load World behavior is unchanged.

## Verification
- Source structure checked after patching.
- Production Vite build was not run because the supplied development archive intentionally excludes `node_modules` and `public`.
