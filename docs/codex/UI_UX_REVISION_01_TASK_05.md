# UI/UX Revision 01 — Task 05: Add Chunk

Implementation/validation: 2026-11-15–16. Worktree: `testing-grounds-dev-07-08`; branch: `feat/terrain-export-ui-v2`; starting HEAD: `b2230de`.

Task 05 implements spatial terrain expansion through the existing TOP — WORLD // MAP workflow. Previous Task 03/04 work remains in the worktree. No dependencies were changed, and no commit, push, merge, deployment, branch change, backup modification, or cleanup was performed.

Status: locally validated and ready for owner review. Final production build, all 10 Node suites, both Task 05 browser acceptance worlds and all seven existing browser regression suites passed. Physical Xbox review remains outstanding.

## 1. Confirmed root cause

The original landscape is one 600 × 600 metre mesh, X/Z `[-300,300]`, with 120 subdivisions per axis. The five default chunks are named area/workspace records inside that landscape, rather than five physical terrain tiles. Their old map positions are presentation slots; their A1–E1 labels do not describe the actual terrain grid.

The old Add Chunk dialog offered the 36 A1–F6 cells **inside** the existing landscape. `GridTerrain` only created an extra 100 metre plane when a record's entire footprint was **outside** that landscape. Adding a normal offered cell therefore created a record and switched settings, with no additional visible terrain. The root-cause browser reproduction confirmed unchanged mesh coverage after Add; it was not inferred from the store alone. See `ui-revision-05.local/root-cause.json` and `populated-root-*.png`.

Other incompatible assumptions were current-area-only object hydration, one mutable terrain preset swapped on selection, vertex editing clamped to ±300, and whole-world vertex maps copied into chunk snapshots.

## 2. Compatible architecture extension

Worlds without expansion retain their existing save format and area behavior. First Add promotes the **currently visible** terrain field into an optional `terrainSurface: {version:1, baseChunkId, settings, terrainEdits, revision}`. Old chunk records, IDs, positions, objects and saved presets remain intact. New physical tiles carry `terrainRegion: {version:1, size, initialShape}`. The existing world vertex registry remains canonical.

Expanded worlds render the original terrain and every added tile together. Area selection changes controls and the selected record without replacing the landscape or moving its objects. Existing area bookmarks remain available through map markers and the area navigation controls. Loading a legacy area's saved terrain preset remains an explicit operation over the original landscape.

`terrainRegions.js` defines actual terrain coverage for rendering consumers, interaction, placement, editing and export. `terrainExpansion.js` validates and registers new tiles. This extends the existing finite generator; it is not a streaming system.

## 3. Geometry and lifecycle

The existing procedural height function, material, colors and 5 metre vertex spacing generate each extension. Default 100 × 100 metre tiles have 20 × 20 subdivisions: 441 vertices and 800 triangles. The original mesh retains 14,641 vertices and 28,800 triangles. Three additions produce four terrain meshes, 15,964 terrain vertices and 31,200 terrain triangles.

Adding a tile leaves existing geometry UUIDs intact. Shape/sculpt/vertex changes invalidate the existing terrain/collider caches; disposed geometry and collider replacement use the existing React/Rapier lifecycle. Added tiles also have terrain-conforming guides and coordinate labels. The redundant flat base floor is hidden and its collider disabled only after expansion, so it cannot conceal or support negative-height terrain incorrectly.

## 4. Placement and coordinates

Placement uses `world.grid.chunkSize` (normally 100 metres), and offers empty cardinal neighbors of actual coverage. Supported sizes must align with the existing 5 metre terrain samples and the 600 metre base footprint. Candidate footprint overlap, occupied grid names and duplicate IDs are rejected. The compact existing dialog shows the grid, X/Z centre and dimensions; no world-building wizard was added.

The default grid has columns increasing along +X and rows along +Z, anchored at `(-300,-300)`. Negative columns/rows use explicit signed grid labels such as `[-1,4]` or `[3,0]`; they are not forced into the old positive-only parser. Placement is limited to meaningful finite coordinates (centres within ±99,000 metres).

Both browser acceptance worlds create the same three tiles:

| Grid / ID | Centre X/Z | X bounds | Z bounds | Dimensions |
| --- | --- | --- | --- | --- |
| G4 / `terrain-6-4` | 350 / 50 | 300–400 | 0–100 | 100 × 100 m |
| H4 / `terrain-7-4` | 450 / 50 | 400–500 | 0–100 | 100 × 100 m |
| G5 / `terrain-6-5` | 350 / 150 | 300–400 | 100–200 | 100 × 100 m |

These are adjacent, non-overlapping additions, totalling 30,000 square metres beyond the original 360,000 square metres. Full records and bounds are in `details-{populated,blank}-final.json`.

## 5. Seams

Every tile samples a shared world-coordinate field at its edges. Its seven existing shape parameters blend smoothly from that field into its local interior across up to 20 metres. Sculpt and vertex deltas are shared spatial maps applied after procedural sampling, so deformation across an edge updates both meshes and colliders. Materials retain the existing flat-shaded treatment.

Browser tests compare all 21 rendered vertices along the base/G4 seam after an edge sculpt; their Float32 positions are identical. Node tests cover continuous sampling, every representative brush, local shape restoration and vertex edits beyond ±300. No separate sculpt system was introduced.

## 6. Collision, discovery and movement

Each extension has a fixed terrain trimesh collider. The original PlayerController and movement/camera algorithms were not changed by Task 05. Coordinate coverage and collider integration supply the additional ground.

Terrain readiness is registered after the render/collider commit. Map navigation waits for destination readiness, clears held gameplay input and sends the existing teleport event; the existing controller places the character using terrain height. Missing or unready terrain produces feedback. Area discovery follows actual physical region transitions while preserving a manually selected destination until the player crosses a boundary. Expanded Blank Canvas now mounts this same discovery component; untouched Blank Canvas keeps its previous behavior.

The browser harness queries live Rapier terrain trimeshes, teleports through native map controls, then moves the actual dynamic player with simulated controller input across X=300 and back at normal speed. It checks support, finite coordinates, active-region transitions and collider heights. Terrain/collider differences are bounded by 0.02 m at creation and 0.03 m after edits. Synthetic camera fixtures make world interactions and screenshots repeatable; they do not alter application camera code.

## 7. World Map and feedback

After expansion, the existing map uses actual spatial coverage and frontier cells. Existing base coverage is not presented as dozens of new save records; original areas appear as separate markers at their real locations. New tiles have selectable grid labels and active state. Creation reports the name/grid/centre with a direct LOCATE CHUNK button. Invalid placement gives a contextual error. Previous/current/next area navigation uses the same readiness-aware teleport helper.

Keyboard Tab stays within the compact creation dialog. Browser acceptance also exercises simulated controller selection/adjustment, Back, sequential D-pad focus and A to create. Compass styling, Quick Tools, Shortcuts, loading design, panel independence and Editor/World presentation remain the approved Task 04 implementation.

## 8. Terrain editing and history

Raise, Lower, Smooth, Flatten, Slope and vertex editing use the existing world-coordinate sample/commit mechanisms on valid new terrain. Interaction rejects empty space outside actual coverage. The browser uses native Raise/Lower actions on added terrain and native edge sculpting, then checks rendered seams and rebuilt collision; focused Node checks cover all five brushes and vertex/history persistence.

Terrain history paths become world-surface paths after promotion. Existing terrain Undo/Redo entries for the promoted visible area are adapted, and new edits continue through the same history store. Object Undo/Redo resolves its actual owner record and does not broadcast terrain invalidation. Chunk creation itself was not undoable before this task and remains outside history. Explicit chunk Load/Reset clears history so stale edits cannot restore removed local data.

## 9. World and Chunk persistence semantics

**World Save/Load** preserves layout, IDs, tile shapes, the shared sculpt field, canonical vertex registry, objects, water, Scatter profiles and current selection. App reload reconstructs the meshes and saved data. Optional surface version validation rejects unsupported data without rewriting it. Pre-expansion worlds continue through the legacy path. Signed frontier coordinates and unsupported-version preservation have focused tests.

**Save Chunk** captures its own terrain shape, objects/water/foliage and a spatial snapshot of sculpt/vertex samples strictly inside its footprint. **Load Chunk** restores that record and interior samples without changing its location, identity or neighbors. **Reset Chunk** retains its footprint/name, restores its creation shape, clears its own objects/water/foliage and explicitly anchored Scatter profiles, and clears interior edit samples. Shared boundary samples remain world-owned on both Load and Reset, preventing a local restore from erasing a neighbor's seam.

In expanded mode, global environment controls (Sun, atmosphere, global water and population settings) belong to World Save/Load. Tile Load/Reset restores local shape/data rather than replacing those world-wide controls. Unexpanded legacy worlds retain their original full-preset commands.

Legacy area bookmarks are presets for the **original 600 × 600 landscape**, not new 100 metre regions. Their explicit Load/Reset retains that original scope and base shape semantics. Inactive legacy sculpt presets survive expanded World Save; the active legacy preset is updated from the visible base field. Added tile interiors remain independent. Changing the base procedural field also changes its contribution at shared tile edges, preserving continuity.

Storage remains existing browser localStorage. File uploads retain their existing session-only contract; this task adds no Project or cloud persistence.

## 10. Objects, vegetation, guides and environment

Expanded worlds hydrate objects from all chunk records, rather than unmounting them on every area selection. New placement is owned by the terrain under its actual coordinates. Editing, transform history and tree selection can resolve objects outside the selected record. The browser places a grounded BLOCK on G4, performs Undo/Redo, places an editable DEFAULT TREE on G5, changes its trunk height, creates an anchored Scatter population and observes trees rendered on actual new terrain. All survive saved-world reload.

The original implicit forest is anchored to the promoted base area; changing selection no longer moves or duplicates it. New custom populations can anchor to a new tile; unsupported empty terrain positions are filtered. The existing tree branch/canopy algorithms and gestures are unchanged.

Existing global Sun/atmosphere settings remain world-wide. Pond bodies from all chunk records remain visible; river edits retain world coordinates. The existing 900 metre global water plane and water algorithms are unchanged. No automatic forest generation, new fluid system or new atmosphere system was added.

## 11. Terrain Export

The contract remains a user-defined X/Z rectangle, terrain surface only, committed edits, world/centred origin and GLB. It can span the original/new boundary or several supported tiles; coverage validation rejects rectangles containing terrain-free holes. It is not labelled as an automatic whole-world export. The existing exporter and resource cleanup remain in use.

Browser acceptance generates an actual binary GLB for X 280–380 / Z 20–80, at 20 × 12 subdivisions (273 vertices), crossing the base/G4 seam. Existing export suites additionally check winding, normals, bounds, preview exclusion, GLTFLoader round trip and downloads.

## 12. Validation and screenshots

Evidence stays under ignored `ui-revision-05.local/`; earlier Task 03/04 evidence is preserved. The initial worktree hashes/snapshots distinguish Task 05 from the pre-existing changes. Early plane diagnostics also counted the water plane; final acceptance terrain counts use explicit terrain-mesh tags.

| Check | Observed result |
| --- | --- |
| `node node_modules/vite/bin/vite.js build` | PASS final application, exit 0, 2m 34s. `build-final.log`. Existing bundle-size warning. |
| `node ui-revision-05.local/run-node.mjs` | PASS all 10 suites: UI navigation, world-first tools, object workflows, forest renderer, Crash Tester, terrain export, demo stability, Task 03, Task 04, Task 05. Individual commands and exit codes: `node-suites.log`. |
| `node scripts/test-task05.mjs` | PASS, including subsequent signed-grid, inactive legacy sculpt-preset and unsupported-version tests. `node-results.json`. |
| `node scripts/browser-task05.mjs` | PASS final application, including three additions, active-region transitions, native tools/placement/tree editing, actual Scatter, real reload, local persistence, export and resource checks. `stage-final-populated.json`; zero console errors / failed requests. |
| `node scripts/browser-task05.mjs --blank` | PASS final application, including three additions, active-region transitions, native tools/placement/tree editing, actual Scatter, real reload, local persistence, export and resource checks. `stage-final-blank.json`; zero console errors / failed requests. |
| `node scripts/browser-ui-smoke.mjs` | PASS all 11 groups, zero errors / failed requests. `regression/world-first/browser-results.json`. |
| `node scripts/browser-demo-stability.mjs` | PASS all 17 checks, zero errors / failed requests. Terrain brushes/history, vertex persistence, native Add/rename/chunk commands, water/Sun/clouds, plateau/export, object transforms/uploads, dense forest, movement and reload. `regression/demo/browser/results.json`. |
| `node scripts/browser-task03.mjs` | PASS all stages: controller hierarchy/focus, tree selection/direct editing, live branches/history/save, speed presets and movement recovery. `regression/task03/task03-results.json`; zero errors / failed requests. Physical Xbox pending. |
| `node scripts/browser-task04.mjs` | PASS A+B+C: approved layouts/Compass, characters/sliders/loading, Quick Tools/guides/history and complete shortcut assignment/action/reload lifecycle. `regression/task04/stage-final.json`; zero errors / failed requests. |
| `node scripts/browser-object-workflows.mjs` | PASS title and all three workflow stages: placement/Back, native tree edits/transforms/palette/gradients, equivalent Scatter behavior and saved-world restoration. `regression/object/object-results.json`; zero errors / failed requests. |
| `node scripts/browser-forest.mjs` | PASS 144-tree identity, neighbor geometry, palette/gradients, repeated editing, legacy profile fallbacks, persistence and bounded repeated resources. `regression/forest/optimized.json`; zero reported errors. |
| `node scripts/browser-crash-tester.mjs` | PASS 18 clips, movement/camera/FPV, material/geometry reuse, independent skeletons, bounded reselection resources and flat-terrain grounding. `regression/character/staged-results.json`; zero reported errors. |
| `node node_modules/eslint/bin/eslint.js . --format json --output-file ui-revision-05.local/lint-final.json` | Exit 1: 56 errors / 25 warnings versus Task 04 57 / 29; no increased file/rule/severity counts. Final comparison: `lint-comparison.json`. |
| `node --check scripts/browser-task05.mjs`; `node --check scripts/test-task05.mjs`; `git diff --check` | PASS, exit 0. |

Final screenshots use both `populated-` and `blank-` prefixes:

- `original-world.png`: original terrain footprint.
- `new-adjacent-terrain.png`: first addition viewed from outside the original boundary.
- `map-new-chunk.png`: spatial map, selected tile and creation feedback.
- `player-new-terrain-visible.png`: visible avatar on the extension; numerical support is recorded separately.
- `crossing-boundary.png`: actual controller traversal at the seam.
- `raise-new-chunk.png`, `tree-new-terrain.png`, `scatter-new-terrain.png`: editing and placement/population integration.
- `expanded-after-reload.png`: restored edited terrain and objects after a real page reload and LOAD SAVED WORLD.
- `multiple-chunks.png`: all terrain sections from a wider camera.

During harness development, waits were corrected for initial Vite transformation, live collider mounting and the populated scene's asynchronous asset/terrain commit. Older regression harnesses accept `TG_BROWSER_WAIT_ATTEMPTS=300` for the slower local cold mount; their normal defaults and behavior assertions are unchanged. The demo plateau fixture now selects the original area before probing its fixed mountain coordinates: after Add, the selected new tile's shape controls correctly affect that tile instead. Its height-change assertion is retained. Ray queries explicitly filter terrain trimeshes, rather than the player capsule; Scatter probes use world positions; controller dialog navigation uses existing sequential D-pad behavior. Final success requires the actual rendered terrain/collider and clean runtime/network arrays, not just stored records.

## 13. Performance observations

Creation retained the original mesh UUID; adding each tile allocated one additional terrain mesh/collider rather than rebuilding the original terrain. The final populated-world teleports across G4/H4/G5/G4 held at 342 colliders, 4,814 renderer geometries and four terrain regions. Blank Canvas held at six colliders, 80 renderer geometries and four terrain regions over the same revisits. These counts include the entire scene, not just terrain; fresh runs can differ in generated tree geometry, so stability is assessed within each run.

Blank Canvas's measured teleport position was `(350, 0.7999996, 50)` above terrain height 0. The controller traversal started at X=295 and reached X=306.243 at Y=0.8000067 with live terrain support, then returned inside the base. GLB output was 12,940 bytes in Blank Canvas and 12,968 bytes in the populated world for the same 273-vertex export region.

Shape/sculpt commits still regenerate the terrain caches through the shared invalidation key. Fine-grained dirty-region rebuilding and streaming/LOD are deferred. These headless software-renderer observations establish bounded short-run resources only; no FPS or hardware performance improvement is claimed. Cold Vite/asset loading required readiness waits; production build warnings and existing scene costs remain.

## 14. Limitations and owner review

- Physical Xbox ergonomics and extended uneven-ground camera/animation play remain owner hardware review. Simulated browser controller tests do not replace that review.
- Terrain is finite. There is no unlimited streaming or 500X traversal guarantee beyond actual coverage.
- Local chunk restore preserves shared edge edits intentionally. Legacy area presets still affect the original landscape and the shared base contribution at tile borders.
- Global water retains its existing extent; new terrain does not imply an expanded ocean or water simulation.
- Existing lint debt, bundle warnings, localStorage capacity/error UX and session-only uploaded assets remain. No new storage guarantees are claimed.
- View screenshots with guides enabled as functional evidence; the existing large billboard grid labels can overlap nearby camera views. Quick Tools can hide guides.

Next step after final validation: owner review of Task 05, including physical Xbox behavior. Stop here; no Task 06 work or publication is included.

## Task 05 file scope

New runtime files: `src/systems/world/{terrainRegions,terrainExpansion,terrainReadiness,spatialTerrainSnapshots}.js`.

Runtime changes: `src/App.jsx`; `src/components/ui/{AreaDiscovery,ChunkCreationDialog,DirectionalPanels,WorldMap}.jsx`; `src/components/world/{GridTerrain,GridFloor,Landscape,Water,MeshPlacementSystem,WorldInteractionSystem,TerrainVertexEditor,CrimsonTreeInteractionSystem}.jsx`; `src/systems/terrain/{terrainHeight,terrainSettings,terrainEdits,terrainVertexEditing,terrainExport}.js`; `src/systems/world/{worldStore,worldPersistence}.js`; `src/systems/objects/{objectEditing,scatterOperations}.js`; `src/systems/ui/navigationActions.js`.

Validation/docs: `scripts/test-task05.mjs`, `scripts/browser-task05.mjs`, this report and confirmed decision notes. Existing browser harnesses for world-first tools, demo stability, Task 03/04 and object workflows gain an optional readiness-wait environment setting. The demo plateau fixture selects the base area it samples. `scripts/browser-task04.mjs` also gains the evidence-directory environment override so its regression does not overwrite Task 04 artifacts. No behavior assertions were removed.

The four excluded files remain untouched: `TG_CODEX_TASK_07.md`, `public/images/TG_ICON (1).svg`, `src/components/ui/TitleMedia.jsx`, `src/config/titleMedia.js`. Task 03/04 PlayerController, tree branch/canopy, HUD/Compass styling and shortcut sources are preserved; existing Git modifications there precede Task 05.

`ui-revision-05.local/preservation-checks.json` records 14 byte-for-byte baseline matches for the exclusions and protected controller/tree/HUD/Compass sources. `git diff --check` passes; the work remains uncommitted for owner review.
