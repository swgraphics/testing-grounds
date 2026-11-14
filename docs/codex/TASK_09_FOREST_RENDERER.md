# Task 09 — editable leaf-bearing forest

Current approved defaults (supersede earlier palette entries below): leaf fill
`#8BCF6A`, leaf outline `#3A8C0E`, fern fill/accent `#3A8C0E`. Falling leaves
follow leaf fill. Explicit saved colors remain authoritative.

Owner review candidate, 2026-11-13. Worktree: `testing-grounds-dev-07-08`;
branch: `feat/terrain-export-ui-v2`. No commit, push, deployment, dependency
change, or backup modification. Earlier uncommitted work is preserved.

## Confirmed diagnosis

- The first edit of an implicit default scatter profile saved only
  `treeDefinition` and `treeOverrides`. This made an explicit profile without
  density/coverage; its missing density became zero, removing all 144 trees.
  Native entry alone did not remove them in the reproduction; the first change
  did. The fix preserves complete profiles and supplies defaults for older
  incomplete profiles, while honoring explicit zero density and disabled state.
- The reticle's retained target has `point`, not `hit.point`. Its fallback threw
  repeatedly after losing the current ray hit. Branch ring orientation also
  tried to spread a Three.js Vector3. Both paths are corrected.
- Re-entering the same tree could leave panel values at defaults. Edit entry now
  supplies the current definition. `GamepadMenuNavigator.jsx` recognizes the
  focused tree panel, allowing native range keys and panel input ownership.
- The old scatter mixed a legacy crown with procedural geometry. Activating the
  detailed path could leave both models present. All scattered procedural trees
  now use the leaf-bearing design continuously, including during editing.
- Current detailed leaves were already merged: 750 eight-vertex polygons,
  4,500 triangles and 6,000 outline segments per default tree. The verified
  costs were repeated vertex/edge construction, duplicated geometry/materials,
  and invalidation of every tree's definition on an edit. Historical lag was
  not independently measured on the original user's hardware.

## Implementation and compatibility

- `ForestTreeModel.jsx` / `forestGeometry.js`: shared editable leaf shape,
  instanced leaf fills and line outlines; shared trunk geometry/materials;
  per-tree branches, bounds, stable identity, memoization and resource disposal.
  Existing gradients retain the original merged color calculation. Custom leaf
  vertices use the same canonical polygon. Branch face ordering remains usable
  by the existing adaptive reticle and branch editor.
- Attached leaves keep full detail at every distance. There is no canopy proxy,
  edit-entry swap or attached-leaf LOD transition. Native frustum culling applies;
  detached leaf animation runs nearby with 60/70-unit hysteresis. Detached leaves
  use existing generation data with a bounded instanced animation.
- `Landscape.jsx`: adopts the renderer, preserves profile settings and each
  tree's procedural seed on first edit. Single-tree changes leave neighboring
  geometry intact. Tree IDs, density, position, orientation, scale, collision
  setup and scatter seeds remain compatible; no persistence schema change.
- Tree outlines default to `#8BCF6A` in `treeGenerator.js`,
  `CrimsonTreeModel.jsx`, and the `MeshMenu.jsx` fallback. Fill/trunk colors stay
  intact. Default fern emissive accent in `Landscape.jsx` is `#1F5E3B`; this fern
  has no separate outline material. Other nature assets and UI brand colors
  are untouched by this task.
- Built-in display labels now say DEFAULT TREE in `objectRegistry.js`,
  `MeshMenu.jsx`, `CrimsonTreeInteractionPanel.jsx`, and `Landscape.jsx`.
  `MeshPlacementSystem.jsx`, `treeCanopy.js` and `CrimsonTreeModel.jsx` comments
  use the new name. Internal IDs, events and filenames retain their existing
  identifiers for compatibility. Saved custom names are not rewritten.
- Saved explicit colors—including the old red—are honored. A saved tree without
  an explicit outline inherits the new green; a new default scatter uses green.
  Default ferns regenerate from terrain settings, without per-fern saved colors.
  No ambiguous old-red-to-green migration is performed.

## Measurements and validation

Full-scene Chrome measurements use a fresh isolated browser profile, 1440×1000,
five-second samples, identical fixed cameras, default density 16 / 144 trees.
Draw/triangle counters include the rest of the world and shadow passes.

| Camera | Original canopy mean / p95 ms | Leaf forest mean / p95 ms | Calls before / after | Triangles before / after |
| --- | --- | --- | --- | --- |
| Overview `(0,35,65)` toward `(0,5,0)` | 48.21 / 60.60 | 49.65 / 60.70 | 6,911 / 7,127 | 324,458 / 1,316,774 |
| Near the same tree | 42.58 / 54.60 | 43.51 / 54.70 | 6,086 / 6,284 | 314,252 / 1,181,952 |

Measured GPU: AMD Radeon(TM) Graphics through ANGLE / Direct3D11.
Original geometry count: 5,076; leaf forest: 4,789 before editing. Both use eight
textures. Earlier leaf samples were 46.93–49.34 ms overview and 38.95–42.62 ms
nearby; these are observations, not hardware-independent performance promises.
There is substantially more geometry to draw despite comparable measured frame
times. Maximum density, mobile hardware and physical Xbox remain unvalidated.

A Node generation comparison using all 144 original tree definitions measured
3,808 ms for the former detailed merged geometry/edges path versus 172 ms for
instanced preparation (including branch generation). Leaf/outline array payload:
45,360,000 versus 13,824,000 bytes, excluding common shape and other scene data.
This is CPU preparation, not browser FPS or total process memory.

Observed checks:

- PASS `node scripts/test-forest-renderer.mjs`: leaf vertex and outline-count
  parity, bounding volumes, custom polygon, default and explicit custom colors.
- PASS `node scripts/test-world-first-tools.mjs`.
- PASS `node scripts/test-ui-navigation.mjs`.
- PASS `node scripts/test-terrain-export.mjs`.
- PASS `node scripts/browser-ui-smoke.mjs`: A–F, native compass, independent
  panels, world-only sculpting, real GLB download, placement, Undo/Redo,
  save/load, movement/camera, desktop/small layouts and simulated gamepad input;
  no browser exceptions or failed requests.
- PASS `node scripts/browser-forest.mjs optimized`: native reticle selection,
  native trunk/branch/leaf sliders after re-entry, all 144 trees retained,
  exact pre-change IDs/positions, unchanged neighboring geometry, saved edits,
  custom colors and gradients, four consecutive tree selections, incomplete
  legacy profiles, and explicit zero density. No runtime errors. Eight repeated
  edits held geometry count at 4,791 with no progressive accumulation.
- PASS `npm.cmd run build` on the final source (30.44 s); bundle-size and
  plugin-timing warnings remain.
- Repository lint remains failing: final `node node_modules/eslint/bin/eslint.js . --format json --output-file task-09-browser.local/lint-final.json`
  exited 1 with 61 errors / 30 warnings. Both new renderer modules have zero
  diagnostics. The earlier `npm.cmd run lint` also failed; unrelated lint
  findings were not expanded into this task.
- PASS scoped `git diff --check` (line-ending notices only) and Node syntax
  checks for the new geometry module/browser script.

Browser evidence: ignored `task-09-browser.local/` (baseline/optimized JSON and
screenshots). Tests use disposable Chrome storage, not the owner's saved world.
New verification scripts: `scripts/browser-forest.mjs` and
`scripts/test-forest-renderer.mjs`.

## Manual owner checklist

1. Enter the default world, walk through trees, and inspect nearby/distant leaves
   and green outlines; check the fern accent.
2. Aim at a trunk, enter Edit Tree, and change trunk/branch/leaf controls. Check
   neighboring trees remain present and no canopy appears.
3. Exit, revisit, save and reload; verify the same tree's shape and custom color.
4. Repeat with several trees and check navigation, terrain export and movement;
   perform physical Xbox validation if available.

## Falling-leaf color follow-up

Falling leaves now use a separate shared material that follows the tree outline
color (`#8BCF6A` by default, including saved custom outline overrides). Attached
leaf fills and animation remain unchanged. Changed `ForestTreeModel.jsx` and
the existing forest browser palette assertion. PASS production build (23.13 s),
focused renderer lint, `node scripts/test-forest-renderer.mjs`, and
`node scripts/browser-forest.mjs optimized`: all 144 default falling-leaf
materials were `8bcf6a`, with no runtime errors. The portable-drive development
server needed a restart because it initially served a cached older module.

## Default fill palette correction

Updated `treeGenerator.js`, `CrimsonTreeModel.jsx`, `ForestTreeModel.jsx`,
`Landscape.jsx`, and `MeshMenu.jsx`, plus existing renderer/browser palette
checks. Tree leaf fill is `#8BCF6A`; outlines and fern fill/accent are `#3A8C0E`.
Falling leaves now follow the leaf fill instead of the outline. Saved explicit
fill/outline colors remain intact; no world migration. Geometry, distribution,
scale, placement, and UI brand colors are unchanged. PASS production build
(26.45 s; existing bundle/plugin warnings), renderer test, focused renderer lint,
browser script syntax check, scoped diff whitespace check, and live Chrome
forest palette/edit/persistence checks with zero runtime errors. Screenshot:
`task-09-browser.local/optimized-before.png`. Refresh the restarted port 5181
development server to see these defaults.
