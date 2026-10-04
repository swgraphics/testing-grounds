# Canyon Edge + World Guides Patch

Source of truth: TG_1.6.04.03.zip
Patch type: focused source replacement; preserve unrelated files.

## Changes
- GridFloor.jsx: grid distance labels and A1-F6 coordinate labels now follow the existing World Guides visibility state.
- Helpers.jsx: world marker rings and names now follow the same World Guides visibility state.
- WorldInteractionSystem.jsx: Canyon Edge hover/selection preview now updates on pointer movement even when no terrain brush painting operation is active. This repairs the preview path between first and second clicks.
- terrainEdits.js: Canyon Edge deformation now applies only to the elevated side identified by the terrain gradient normal instead of symmetrically raising both sides of the selected edge.

## Validation
This patch was assembled from the supplied source ZIP. A full Vite build was not run in this environment because project dependencies were not installed here. Run `npm run build` in the active project after applying the patch.

## Focused in-world tests
1. World Guides ON: grid lines, meter labels, A1-F6 labels, marker rings, and marker names are visible.
2. World Guides OFF: all of the above disappear together.
3. Toggle World Guides ON again: all return.
4. Canyon Edge: hover an existing elevated terrain edge; confirm the blue selection preview appears.
5. First click selects the edge. Move the reticle and confirm the blue extrusion preview follows it.
6. Second click commits the edge. Confirm the deformation occurs on one side only.
7. Confirm terrain collision and undo/redo remain functional.

## Scope note
This is a focused first pass. The existing Canyon Edge selection still depends on terrain-gradient detection (`analyzeTerrainWallAt`); elevated surfaces without a detectable edge gradient may not be selectable. The patch does not claim that every possible terrain shape is supported until tested in-world.
