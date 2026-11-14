# Terrain Export v1 — Task 07

Implemented on base `c55b052c8a48760878f7f45980a874f5453903df` in
`D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`, branch
`feat/terrain-export-ui-v2`. The original repository's working files were not changed.
Only its remote-tracking reference was updated by the required fetch.

## Use

1. In this worktree, run `npm.cmd run dev`. Enter a world, open EDITOR, and choose
   TERRAIN EXPORT in the bottom bar. Set numerical min/max X/Z, inspect the pale
   world boundary and dimensions, choose segments/origin/filename, then Export GLB.
   Try a non-square region crossing X=100 or the base terrain edge X=300; sculpt
   and edit vertices first, and compare export while a geology preview is active.
2. In Blender use File > Import > glTF 2.0 and choose the downloaded `.glb`, or
   import it using CloudField's supported GLB workflow. Inspect surface shape,
   upward normals, scale and elevation. Centered Origin recenters X/Z only.

The panel documents resolution, validates bounds and whole-number segments
(1–512 per axis), confirms dimensions/counts, reports progress/errors, and
sanitizes filenames. Coordinates are limited to +/-100,000 world units.

## Confirmed implementation

- `getCommittedTerrainHeightAt` shares the existing procedural formula and the
  existing sculpt/vertex delta readers. It never calls the geology preview reader.
  Existing `getTerrainHeightAt` callers still receive committed height + preview,
  preserving rendering, collider, placement and camera sampling behavior.
- Both GridTerrain and its extension chunks use this same world-space height
  field. Export follows the current terrain settings and authoritative vertex
  registry, with continuous sampling across chunk boundaries. It does not load or
  switch saved chunks, merge inactive chunk settings, or serialize the world.
- Export samples the selected rectangle's boundary endpoints into one indexed
  Y-up mesh, with +Y triangle winding, normals, UVs and identity transform.
- A neutral gray MeshStandardMaterial is the documented portable PBR fallback.
  Application shaders/colors are not baked. Water, objects, foliage, colliders,
  previews and gizmos are not exported. No live scene objects are read or changed.
- Export options are transient Zustand state. The nonmodal panel supports normal
  form focus, Escape and focus restoration. The boundary is visible only with the
  editor/export tool open and valid input; it follows visible terrain including
  any preview to show the selected X/Z footprint.
- Temporary geometry/material are disposed on success/failure. Download anchors
  are removed and object URLs are revoked after download initiation.

## Changed files

- `src/systems/terrain/terrainHeight.js`
- `src/systems/terrain/terrainExport.js` (new)
- `src/systems/terrain/terrainExportStore.js` (new)
- `src/components/ui/EditorView.jsx`
- `src/components/ui/TerrainExportPanel.jsx` (new)
- `src/components/ui/TerrainExportPanel.css` (new; scoped styles)
- `src/components/world/TerrainExportPreview.jsx` (new)
- `src/scenes/TestingGrounds.jsx`
- `scripts/test-terrain-export.mjs` (new)
- This document (new).

The handoff `TG_CODEX_TASK_07.md` and all ten supplied SVG/PNG reference assets
were copied intact into this worktree for review/future Task 08. No Task 08 UI,
fonts, logos, character models, controller or persistence changes were made.

## Validation observed

- PASS: `npm.cmd ci` using the existing lockfile, no dependency declaration/lockfile changes.
- PASS: `node scripts/test-terrain-export.mjs` (no new test framework).
  Asserts invalid bounds/resolution/origin rejection, non-square dimensions,
  sanitization, endpoint sampling, counts, every triangle's +Y winding, normals,
  UVs, world/centered origin, continuous chunk-crossing rows, sculpt + vertex
  fidelity, geology preview exclusion, unchanged world/settings and object
  identity, actual binary GLB structure and GLTFLoader round-trip (5,580 bytes),
  PBR/surface-only identity transform, disposal on success/failure, and mocked
  download/anchor/delayed URL cleanup including failure.
  Node supplies a FileReader shim only for the real Three.js exporter/loader.
- PASS: `npm.cmd run build` (large-bundle and plugin-timing warnings).
- FAIL (preexisting): `npm.cmd run lint -- --format json --output-file terrain-export-lint.local`
  reports 69 errors and 30 warnings. New source files have zero errors/warnings.
  ESLint API comparison against `git show HEAD:<path>` confirms unchanged counts
  in edited existing files: EditorView 1 error, terrainHeight 1 error, scene 0.
  All other linted existing source files are unchanged. The ignored `.local`
  JSON file contains the full repository lint results.
- PASS: `git diff --check`.
- NOT TESTED: browser UI, real browser download/console, Xbox runtime,
  Blender/CloudField visual import. No browser automation tool was available;
  Blender was not found on PATH. The owner should run the two steps above.

No commits, pushes or deployments. Task 08 has not started.
