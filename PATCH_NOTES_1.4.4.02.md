# Testing Grounds 1.4.4.02 — Single Vertex Editing

## Scope
Extends the passed 1.4.4.01 terrain vertex-selection foundation into direct single/multi-vertex height editing.

## Added
- Selected terrain vertices can be raised/lowered with mouse vertical drag.
- Selected terrain vertices can be raised/lowered with controller Left Stick.
- Multiple selected vertices move together.
- Vertex height offsets are interpolated into the live terrain surface.
- Vertex edits persist in the existing world SAVE WORLD / LOAD WORLD system.
- Vertex edits are normalized/clamped during load.
- Terrain mesh, grid and physics rebuild when vertex edits change.

## Preserved
- 1.4.4.01 vertex selection and hover visualization.
- Existing terrain brush editing.
- Existing world persistence architecture.
- Crimson Tree leaf editing remains outside this terrain-only pass.

## Verification
- Source archive inspected before modification.
- JavaScript/JSX syntax validation performed after modification.
- Vite production build not verified because dependencies/public assets are intentionally omitted from the supplied archive.
