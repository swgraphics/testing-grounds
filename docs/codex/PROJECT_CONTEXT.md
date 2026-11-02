# Testing Grounds — Project Context

## Purpose
Testing Grounds (TG) is a procedural world-building/game-development environment. Product direction includes supporting Projects with custom game UI, menus, and gameplay—not only loading Worlds. Treat this as a direction, not proof the full Project abstraction exists.

## Historical stack
Earlier inspection identified React, Vite, Three.js/React Three Fiber, Rapier, Zustand, and JavaScript modules. Verify current package/source files.

## Current working copy (user-reported)
`D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-current`

Historical repository: https://github.com/swgraphics/testing-grounds
Historical production deployment: https://testing-grounds-ten.vercel.app/
Do not push or deploy without explicit approval. A separate backup was previously identified at `C:\Users\Tavis\testing-grounds`; keep designated backups untouched and verify paths on the current machine.

## Historical architecture pointers — verify first
An earlier archive contained:
- `src/systems/terrain/terrainHeight.js`: terrain height evaluation, historically combining procedural terrain, edit deltas, vertex-edit deltas, and geology preview deltas.
- `src/components/world/GridTerrain.jsx`: terrain mesh/rendering.
- `src/systems/terrain/terrainEdits.js`: terrain edits and serialization.
- `src/systems/terrain/terrainVertexEditing.js`: vertex edits and serialization.
- `src/systems/terrain/terrainSettings.js`: terrain settings.
- `src/systems/world/worldPersistence.js`: world serialization/persistence.
- `src/systems/world/worldStore.js`: world snapshot access.
These paths and responsibilities may have changed. Inspect current definitions and call sites.

## Architectural preference
Keep committed world data distinct from transient previews, generated render representations, and portable exports. Verify actual current behavior before applying this principle.

## World vs. Project
A World concerns world/terrain and related data. A Project may wrap a game experience, including custom UI, menus, and gameplay. This is a user-established product direction; verify implementation.
