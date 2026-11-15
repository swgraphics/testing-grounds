# Testing Grounds Change Report — UI/UX Revision 01, Pass 02B

2026-11-14. Worktree: `D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`.
Branch: `feat/terrain-export-ui-v2`; HEAD remains `93d513c`.

Pass 02B implementation and validation are complete. Awaiting owner review;
Pass 03A has not started.

## Canonical South workflow

One shared South controller now owns Library, Selected Object, Scatter /
Populations and Animation Actions. It retains the horizontal gallery from 02A.
Selecting a card highlights that item and keeps South open. **Place** explicitly
enters the existing World-first placement operation. Escape, simulated Xbox B
and Back to Library retain the selected item and browsing position through the
existing placement-origin navigation.

The established interface is preserved: World starts with all four panels closed;
Editor starts with all four open; either supports independent combinations.
The Compass remains the gateway. Both layouts use the same components, controls,
settings and visibility map. No new viewing mode or editing backend was added.

| South view | Behavior |
| --- | --- |
| Library | One horizontally scrollable gallery of built-ins, saved copies, local GLB uploads and assets referenced by existing populations; selection precedes action |
| Selected Object | Library-template actions or an explicitly selected live world target; world-object picker and Use World Selection |
| Edit Object | One focused window opens upward from South, with existing procedural-tree preview/direct gestures, supported properties and live world transforms |
| Scatter / Populations | Eligible library-object picker and Add Selected to Scatter, followed by existing populations/settings |
| Animation Actions | Existing Universal Animation Library actions explicitly target the active compatible Crash Tester; unsupported characters show feedback |

The former South entry-button wrapper was removed. MeshMenu is the sole Library
and object-action controller. Existing Object/Menu and Dev Tools Materials links
route to this same South controller; they do not open another object interface.
Animation Actions was extracted from InputHUD into one South component, retaining
the same action list, event, durations and player/mixer implementation. Character
actions are not displayed as properties of arbitrary library objects.

Library templates retain Save Library Copy / Cancel drafts using the existing
saved-object API. A placed object or selected scattered tree is a live world
target identified by ID and scope; its values come from the world store. The
focused editor changes that target, rather than creating an unrelated copy.
World targets expose the existing position, rotation and scale fields where
supported, plus access to existing Undo/Redo. Returning to world controls and
reopening the editor reads the same updated values.

The focused window uses the same layout in both views. Scoped CSS overrides
the older Editor View modal positioning and stacking rules, keeping the window
inside the viewport and above the panels. Its preview and controls fill the
desktop window; mobile stacks them with contained scrolling and reachable Back.

Local GLB uploads remain session-only. The picker accepts `.glb`, rejects the
existing unsupported formats with feedback, and selects the uploaded library
item for explicit Place. Uploading clears a previously focused world target so
Place addresses the new upload. No OBJ/FBX/sidecars or durable asset storage.
Save Library Copy is disabled for a File-only GLB, with session-only guidance;
the library cannot create a persistent copy without a registered model path.

## Shared tree editing

Tree Interaction and focused Edit Object now render the same `TreeProperties`
component and property definitions. Both use the same world-target mutation
adapter and the existing placed/scattered tree event consumers.

Shared controls cover supported trunk geometry, primary branch parameters,
secondary parameters, leaf size/density/clustering/distribution, floating-leaf
enable/density, fill/outline colors, gradient enable/color, variation seed and the
existing leaf-vertex entry points. Existing direct trunk/branch editing, custom
branch creation, instance scope, branch scope and gesture controls remain.
Placed-tree transforms and world Undo/Redo use shared components as well.

Explicit zero/false, missing defaults, legacy palette values, nested overrides
and untouched sections are preserved. A color-only patch keeps unrelated
definition sections intact. No tree generator, forest renderer or geometry
algorithm was rewritten. Existing forest material/resource optimizations remain.

For placed-tree notifications, MeshPlacementSystem now updates the world store
outside the React state updater and keeps its local render update pure. This
avoids the render-time cross-component warning exposed by focused property
editing. An existing-target selection bridge keeps the existing R / [ / ]
world controls aligned with a focused world object. Dragging, grounding,
placement geometry and history algorithms retain their implementations.
The terrain-follow calculation also runs in its event handler instead of a
React state updater. Its anchoring math and threshold are unchanged; the handler
subscribes to the current placed-object list. This removes the same store-write
warning exposed by strict console capture during the save/load journey.

Confirmed engine limits are represented consistently:

- Trunk/branch material colors are fixed by the current renderer. Neither
  presentation invents editable material parameters for them.
- Secondary count is consumed for custom branches and capped at eight by the
  existing generator. Ordinary generated branches do not consume that count.
  Stored secondary length/thickness/randomness have no current generator
  consumer; both editors retain their values with disabled controls and an
  explanation. Existing stored values are not normalized merely by opening UI.
- Generated scatter instance transforms remain population-owned. The editor
  explains this rather than exposing nonfunctional position/rotation/scale.
  Population-wide variation seeds are likewise generated per instance; the seed
  control is disabled in that scope and remains editable for single trees.
- The procedural branch investigation stays with Pass 03B. This pass does not
  claim to repair the reported Secondary Branches behavior.

## Scatter parity and state

Both Add entry points call `addObjectToScatter` against the same
`world.scatterProfiles` dictionary. Existing enabled/disabled populations remain
discoverable. Re-adding preserves current density, coverage, variation values,
definitions and instance overrides, including explicit zero. Add uses the
existing history system for Undo/Redo. Existing population-setting handlers and
single/global scattered-tree editing are retained.

Procedural trees and assets with a registered model path are eligible for the
existing population renderers. Local uploaded files, procedural blocks/effects
and terrain stamps lack such a renderer: the add action is disabled with an
explanation, while individual placement remains available. No second scatter
system or unsupported population renderer was introduced.

Panel transitions retain South's selected library item, browsing position,
current population/view and world-target descriptor. World values and
populations remain owned by the existing stores. Saved-world formats and object
schemas are unchanged; the new event marker and selection descriptors are
transient UI metadata.

## Incremental changed files

These changes extend the uncommitted Pass 01 / 01.1 / 02A working state.

| Files | Purpose |
| --- | --- |
| `src/components/ui/MeshMenu.jsx` | Canonical South views, explicit Place, live world-target editor, retained library drafts and shared population access |
| `src/components/ui/DirectionalPanels.jsx`, `DirectionalPanels.css` | Remove redundant South wrapper, contain contextual views, focused editor sizing and shared controls |
| `src/App.jsx` | Remove the old animation portal-host wiring |
| `src/components/ui/InputHUD.jsx`, `AnimationActions.jsx` | Extract the existing action picker into South; keep engine-wide Dev Tools in East |
| `src/components/ui/TreeProperties.jsx`, `src/systems/objects/treeProperties.js` | One tree property definition, control set, fallback and nested-patch behavior |
| `src/components/ui/ObjectTransformProperties.jsx`, `ObjectEditHistory.jsx` | Shared existing transform/history operations |
| `src/components/ui/CrimsonTreeInteractionPanel.jsx` | Reuse the shared properties/history/transforms and open the same target in South |
| `src/systems/objects/objectEditing.js` | Resolve live world targets and apply shared property mutations through current store/history/event operations |
| `src/components/world/MeshPlacementSystem.jsx` | Pure local tree render updates, focused-world selection handoff and event-time terrain-follow notifications |
| `src/systems/objects/scatterOperations.js` | One eligible Add operation, retained profile data and current history integration |
| `scripts/test-object-workflows.mjs`, `browser-object-workflows.mjs` | Focused data/compatibility tests and staged native South acceptance journeys |
| `scripts/browser-world-first-tools.mjs` | Explicit selection then Place; preserve earlier evidence in a new artifact directory |
| `scripts/browser-demo-stability.mjs` | Existing object regression uses the explicit Place action |
| `scripts/browser-forest.mjs` | Fresh world readiness, grouped-control access, separate artifact location and live gradient evidence |
| `docs/codex/UI_UX_REVISION_01_PASS_02B.md` | This report |

## Validation

Implementation proceeded in the requested stages. Stage A browser validation
passed before sharing editing controls. Stage B passed shared values, real world
material color, transforms, native Tree Interaction and persistence before
Scatter consolidation. The combined Stage C acceptance run passed equivalent
population data from both contexts and both starting views, actual forest
rendering, retained overrides and saved-world restoration.

Completed checks:

| Command | Result |
| --- | --- |
| `npm.cmd run build` | PASS; existing large-bundle/plugin-timing warnings |
| `node scripts/test-object-workflows.mjs` | PASS: live target edits, defaults/zero/legacy overrides, transform history, population eligibility/Add history and save/load |
| `node scripts/test-ui-navigation.mjs` | PASS: hierarchy, contexts, analog hysteresis and neutral handoff |
| `node scripts/test-world-first-tools.mjs` | PASS: all 16 combinations from both presets, retained tools/settings and contextual Back |
| `node scripts/test-forest-renderer.mjs` | PASS: leaf/outline parity, bounds, custom geometry and palettes |
| `node scripts/test-demo-stability.mjs` | PASS: persistence, object history and terrain-invalidation isolation; rerun after notification adjustment |
| `node scripts/test-crash-tester.mjs` | PASS: skeleton/bind/texture/fallback checks and 106 actions |
| `node scripts/test-terrain-export.mjs` | PASS: committed sampling, actual GLB loader round-trip and cleanup |
| Authored-forest browser command below | PASS: 144 trees, native shared controls, legacy colors, live gradients, persistence and bounded repeated-edit geometry counts |
| `node scripts/browser-object-workflows.mjs --url=http://127.0.0.1:5188/` | PASS on final property/notification code: stages A/B/C, actual Crash Tester action state, rendered color/gradient, focused Undo/Redo, world transform continuity and both Add paths; zero console errors/HTTP failures |
| Targeted `browser-demo-stability.mjs` command below | PASS: all eight cases, zero console errors/HTTP failures |
| `node scripts/browser-object-workflows.mjs --url=http://127.0.0.1:5188/ --library-copy` | PASS: Save Copy persists edited properties, Cancel discards the draft, world objects remain unchanged, session-only GLB copying is disabled; zero console errors/HTTP failures |
| `node scripts/browser-world-first-tools.mjs --url=http://127.0.0.1:5188/` | PASS: all eleven regression groups, including simulated Xbox selection/explicit Place/contextual B, all panel combinations, sculpt/history, world save/load and movement; zero console errors/HTTP failures |
| `node scripts/browser-world-first-tools.mjs --panel-layout --url=http://127.0.0.1:5188/` | PASS: all five groups; shared panels at six viewport sizes, plus rendered focused preview and Back at 1280×720 and 390×844; zero console errors/HTTP failures |
| `npm.cmd run lint -- --format json --output-file ui-revision-02b.local/lint-after.json` | Existing lint debt: 57 errors / 29 warnings versus baseline 58 / 29; no added diagnostics |
| `git -c core.safecrlf=false diff --check` and changed/new browser/Node script syntax checks | PASS |

The targeted command was:

```powershell
node scripts/browser-demo-stability.mjs 'World map|Area rename|Chunk save|Help dialog|Saved title|Object placement|Unsupported uploads|Local GLB' --url=http://127.0.0.1:5188/
```

This verifies native object dragging with unchanged grounding, Undo/Redo,
rotation/scale and persistence; chunk operations; rename cancellation; Help;
saved-title loading; unsupported uploads; and real GLB import/placement after a
focused world target. The uploaded record remains session-only with no model
path. Add Chunk's existing operation is tested; the terrain-visibility issue is
not claimed repaired.

The forest command used a separate evidence directory:

```powershell
$env:TG_TEST_URL='http://127.0.0.1:5188/'
$env:TG_FOREST_ARTIFACT='ui-revision-02b.local/forest'
node scripts/browser-forest.mjs task12
```

Its four gradient trees have nonuniform live vertex-color attributes. Repeated
geometry counts were `[4794, 4794, 4794, 4794, 4794, 4794, 4794, 4794]`.
This is a regression/resource check, not a new device-performance claim.

Validation setup notes:

- The first validation servers used file polling and stalled while streaming
  the existing 14.7 MB character asset. A hidden server with native file watching
  on port 5188 delivered the same file in 100 ms and allowed live-world tests.
  No Vite configuration or application loading algorithm was changed.
- Browser harnesses now capture `Runtime.consoleAPICalled` errors as well as
  exceptions and network errors. This exposed the store writes during React
  updates described above; final South and object/persistence reruns passed with
  strict capture. Earlier failure captures remain unlinked as diagnostic history.
- Concurrent Node SSR harnesses briefly reported shared HMR-port contention;
  their assertions and final exit codes passed. This is separate from browser
  console/network checks.
- The project lint baseline excludes local preservation copies. Audit snapshots
  use a `.snapshot` suffix so they are not treated as application source.

## Screenshot index

Actual browser screenshots, generated locally and ignored by Git:

| Capture | File |
| --- | --- |
| South Object Library | [01-library.png](../../ui-revision-02b.local/01-library.png) |
| Selected-object actions | [02-selected-object.png](../../ui-revision-02b.local/02-selected-object.png) |
| World-first placement | [03-placement.png](../../ui-revision-02b.local/03-placement.png) |
| Focused Edit Object | [04-focused-edit-object.png](../../ui-revision-02b.local/04-focused-edit-object.png) |
| Scatter / Populations | [05-scatter-populations.png](../../ui-revision-02b.local/05-scatter-populations.png) |
| Tree Interaction | [06-tree-interaction.png](../../ui-revision-02b.local/06-tree-interaction.png) |
| Shared color/gradient editing | [07-tree-color-gradient.png](../../ui-revision-02b.local/07-tree-color-gradient.png) |
| South Animation Actions | [08-animation-actions.png](../../ui-revision-02b.local/08-animation-actions.png) |
| South in Editor View | [09-south-editor-view.png](../../ui-revision-02b.local/09-south-editor-view.png) |
| Focused Editor View, 1280×720 | [focused-editor-1280x720.png](../../ui-revision-02b.local/regression/layout/focused-editor-1280x720.png) |
| Focused Editor View, 390×844 | [focused-editor-390x844.png](../../ui-revision-02b.local/regression/layout/focused-editor-390x844.png) |

Machine-readable evidence:
[South acceptance](../../ui-revision-02b.local/object-results.json),
[library drafts/uploads](../../ui-revision-02b.local/library-copy-results.json),
[World-first/controller regression](../../ui-revision-02b.local/regression/browser-results.json),
[responsive layouts](../../ui-revision-02b.local/regression/layout/layout-results.json),
[forest](../../ui-revision-02b.local/forest/task12.json),
[targeted regressions](../../task-12-qa.local/browser-World_map_Area_rename_Chunk_save_Help_dialog_Saved_title_Object_placement_Unsupported_uploads_Local_GLB/results.json),
[preservation](../../ui-revision-02b.local/preservation.json), and
[lint comparison](../../ui-revision-02b.local/lint-comparison.json).

## Preservation and remaining passes

The four excluded files match their starting SHA-256 hashes:
`TG_CODEX_TASK_07.md`, `public/images/TG_ICON (1).svg`,
`src/components/ui/TitleMedia.jsx`, `src/config/titleMedia.js`.
All twenty-one starting changed/untracked files outside the seven intentionally
extended files remain byte-identical, including the exclusions. Earlier reports and
evidence are preserved. No dependencies or designated backups were modified.

Player movement/physics/intro-camera algorithms, title composition, Compass
design/mappings, world/chunk generation, procedural geometry, forest renderer,
world serialization and dependency manifests are unchanged. No commit, push,
merge, deployment or branch change.

- **03A:** deliberate tree activation, accidental movement interruptions,
  comprehensive Full Editor controller focus and reliable input dismissal
  remain deferred. Tests resume world focus explicitly for keyboard gestures,
  consistent with the existing regression fixtures. No new hold/long-press or
  controller gestures were introduced.
- **03B:** Secondary Branches functional investigation, Add Chunk terrain
  visibility and other assigned engine issues remain deferred.
- Trunk/branch material editing and generated scatter transforms are not
  exposed as working capabilities. Non-tree/non-firefly focused previews retain
  the existing asset placeholder and use the world as their visual preview.
- Physical Xbox and real touch testing remain unverified. Simulated input and
  browser layout checks do not certify hardware or device performance.
- Global lint debt remains; no unrelated lint or repository refactor.

Stop for owner review before Pass 03A. Do not begin the next pass automatically.
