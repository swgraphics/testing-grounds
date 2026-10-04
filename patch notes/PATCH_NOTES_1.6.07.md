# Testing Grounds — Patch 1.6.07

## Water — first implementation pass

Built from the approved **1.6.06** snapshot.

### Included

- Reworked water animation to use a broader peak profile and more varied crossing waves.
- Added `waterSubdivisions` as a real terrain setting with a precision slider.
- Reduced the default water subdivision workload from the previous hard-coded 180 segments to a configurable default of 48.
- Added a soft blue/emissive water layer plus a translucent white highlight layer driven by wave peaks.
- Water technical wireframe now follows the existing WORLD GUIDES visibility state.
- Added persistent river objects under `chunk.water.rivers`.
- Preserved `riverPoints` as a compatibility representation for existing saved worlds.
- River drawing now creates a persistent path and deforms terrain beneath the path, rather than only recording points.
- River surfaces conform to the current terrain height and use a ribbon surface rather than the old tube-shaped water mesh.
- Added `CURRENT` direct interaction. Dragging from a starting point records a persistent current direction and strength on the current chunk.
- River/current edits use the existing Undo/Redo transaction architecture as one gesture = one command.
- Existing terrain history behavior remains untouched for non-water tools.
- Existing world/chunk persistence already preserves `chunk.water`, so the new river/current state remains serializable without a schema migration.

### Intentionally deferred

- Procedural waterfalls based on elevation drops.
- Dedicated pond/lake drawing tool.
- Procedural beach/shore material states.
- Dedicated water-level editing separate from the existing global Water Height setting.
- Advanced current fields/regional flow simulation.
- Water-specific collision/swimming behavior.

These are deliberately deferred so this pass establishes the direct water interaction and persistent representation without creating a large disconnected water subsystem.

## Verification

- `waterEdits.js` syntax checked with Node.
- `terrainSettings.js` syntax checked with Node.
- A production Vite build could **not** be verified because the materialized project does not contain installed Vite dependencies; `npm install --ignore-scripts` timed out in the isolated environment.
- Browser testing remains required and authoritative.
