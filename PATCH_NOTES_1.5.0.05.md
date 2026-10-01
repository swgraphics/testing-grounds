# Testing Grounds 1.5.0.05 — World Construction Overhaul

## Scope
This release combines 1.5.0.01 through 1.5.0.05 into one world/chunk foundation pass.

### Included
- Versioned world schema upgraded to v5.
- Default world remains the authored Testing Grounds world.
- Blank Canvas is now an explicit starting-world option.
- Stable chunk grid coordinates and coordinate metadata.
- Creator chunk creation from the World Editor.
- New chunks derive their world position from their grid coordinate.
- Creator-facing chunk naming and rename workflow.
- Dynamic chunk navigation controls use the persisted world chunk registry.
- Save Chunk / Load Chunk / Reset Chunk controls.
- Existing Save World / Load World retained as the authoritative complete-world persistence path.
- World saves also refresh individual chunk snapshots and the chunk manifest.
- Current chunk terrain settings hydrate when changing chunks.
- Existing terrain/object persistence remains compatible with the new chunk layer.
- Blank Canvas suppresses authored landscape, water, and test-course content while preserving the editable terrain/grid/player foundation.
- Blank Canvas terrain starts from a clean zero procedural surface and can be shaped normally through creator edits.
- Compass chunk markers now read from the live chunk registry, including creator-added chunks.
- Existing World Map presentation is intentionally unchanged for 1.5.0.05. The dedicated map/grid rework is reserved for 1.5.0.06.

## Deferred
- 1.5.0.06 World Map grid rework: occupied cells, empty cells, [+] creation affordances, and terrain-preview integration.
- Full physical multi-chunk terrain rendering/streaming.
- Water/weather/Grass V2 feature overhauls.
- Preset architecture.
- Undo/history implementation beyond persistence foundations.
- Export/import UI.
- 1.6 UI overhaul.

## Compatibility
Existing v1-v3 saved worlds are migrated into the v5 world schema. Existing Save World / Load World behavior is preserved and extended rather than replaced.

## Verification
- JavaScript source syntax checked for modified `.js` files.
- JSX files reviewed structurally after edits.
- Full Vite production build was not claimed because the supplied development archive intentionally excludes `node_modules` and `public`.
