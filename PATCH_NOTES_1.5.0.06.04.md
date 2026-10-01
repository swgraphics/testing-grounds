# Testing Grounds 1.5.0.06.04

## World Map
- Reworked the map into one continuous 6x6 cartographic surface.
- Removed all internal A1/A2/A3-style mini-grid labels from the map.
- Removed card/calendar chunk presentation and extra region metadata.
- Topographic terrain now fills the entire map and uses stronger contour visibility.
- Occupied world chunks display only their large high-level designation (A, B, C, D, E, etc.).
- Empty map cells remain available for chunk creation with a simple + marker.
- Existing drag-to-pan and cursor-edge panning behavior preserved.

## Block Size Markers
- Removed floating-above-block height numbers.
- Size markers are now rendered directly onto opposing vertical faces of the block as `1M`, `2M`, `3M`, etc.

## Blank Canvas
- Blank Canvas now initializes all numeric terrain/world settings to 0.
- Terrain remains a flat editable surface.
- Generated vegetation/rock scatter remains empty because density settings are zero, while creator systems remain mounted and available.
- Blank Canvas now starts with FPV ON.

## Terrain Collision
- Added player stabilization after terrain geometry/settings/vertex changes.
- If an edited surface rises into the player, the character controller is lifted above the new terrain and its falling velocity is cleared.
- Terrain physics now also refreshes on terrain vertex edit version changes.

## Verification
- Source structure checked.
- Production Vite build not run because the supplied development archive intentionally excludes `node_modules` and `public`.
