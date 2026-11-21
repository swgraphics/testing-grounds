# Procedural geology - Patch 07

## Result and preservation

Implemented persistent editable Giant Rock, Cliff Face and two-bank Canyon Wall formations, plus Canyon Edge selection/widening/extension and explicit New Edge creation. The feature ownership strategy was established and tested before replacing placement. Current branch: feat/terrain-export-ui-v2. Starting checkpoint: 245114944a285e141413f4e19f499ce26a7df221.

The latest owner instruction authorizes committing completed previous work before beginning Patch 08. This checkpoint includes the already completed Task 06.1 performance changes and Patch 07. No branch switch, dependency change, push, merge, deployment, backup modification or destructive Git operation was performed. Patch 08 implementation begins only after this checkpoint is committed.

A SHA-256 comparison with the Task 06.1 source manifest found changes only in the 16 existing source files required for geology integration. The CloudField solver, volumetric shader, cloud Move, water shader, player/controller and intro-camera implementations remain unchanged. See geology-patch07.local/preservation.json. The four previously excluded files remain unchanged from HEAD: TG_CODEX_TASK_07.md, public/images/TG_ICON (1).svg, src/components/ui/TitleMedia.jsx, src/config/titleMedia.js.

## Confirmed original problems

- Placement wrote directly into the same 4 m sculpt map as Raise/Lower, with no retained feature identity.
- Pointer/controller placement used hardcoded dimensions; the independent small preview mesh differed from the terrain stamp.
- Canyon Wall made one ridge. Scale in a generic preview did not author the world footprint.
- Geology previews modified shared terrain preview data, rebuilding terrain/collision while positioning.
- Canyon wall detection duplicated an approximate terrain sampler and checked along-wall elevation differences instead of cross-slope continuity.

## Terrain contribution model

Committed height = procedural terrain + manual sculpt + vertex edits + sum of owned geology contributions.

World schema 8 adds world.geology version 1, with unique feature records. Each records type, owner chunk, position, authored metre dimensions, deterministic seed/deformation, rotation, real scale, independent left/right bank offsets/extensions, and a frozen procedural foundation. Generated grids and meshes are disposable derived caches, never persisted. The original procedural evaluator was extracted without mathematical changes into terrainBase.js.

For newly placed parametric formations, the small procedural foundation excludes manual sculpt, vertex edits and other features. A shoulder replaces its frozen procedural relief through its own bounded delta; independent relief remains additive. Repeated parameter edits replace one record and recompute that field, without estimated stamp subtraction, terrain-map writes or accumulated copies. Overlaps sum deterministically. Moving/scaling a formation also changes only its own contribution.

Ordinary sculpted/flattened walls need a bounded exact reference of the composed surface at refinement creation. These canyon-edge records retain those original local surface samples to calculate their own replacement delta. This is not an inferred parametric record for the old wall. Widening can lower the old visible face through the owned layer while leaving the original manual map intact. Extension avoids doubling the joining shoulder. Later independent edits still compose normally; deleting/undoing the refinement removes exactly its contribution. This bounded reference is canonical data; the generated result field is not.

World Save/Load owns complete features. Local Chunk Save/Load/Reset deliberately leaves world-level geology intact, including formations crossing chunk boundaries; it does not partially bake or delete a neighbor's feature. Whole-feature edits/removal use ordinary history transactions. Legacy baked worlds retain their sculpt data and receive no invented feature records. Unsupported versions/malformed records fail validation. Limits: 128 features; at most 160,000 samples per field/reference.

The committed sampler includes geology everywhere, including export. Preview objects never enter that sampler, terrain maps, saved data, history or physics.

## Geometry and controls

- Giant Rock: broad asymmetric mass, seeded angular perimeter, faceted taper and uneven top.
- Cliff Face: wide steep front, asymmetric ledges and stepped rear falloff.
- Canyon Wall: separate flattened elevated shoulders, steep inner faces, lower open corridor and extendable ends.
- Shared definition/generator drives SVG Library thumbnail, orbitable editor preview, reusable placement ghost and committed terrain field.
- HEIGHT, WIDTH, EDGE RANDOMIZER, EDGE DEFORMATION, SCALE and ROTATION are real formation parameters. DEPTH/LENGTH and FLOOR WIDTH add relevant dimensions. Metres/degrees are explicit. PREVIEW ZOOM changes only camera framing. The Canyon editor starts farther away so both banks fit; subsequent Scale changes do not auto-fit the camera.
- Library Apply updates the selected template; Save Library Copy retains authored parameters. World Edit modifies the existing feature with one history entry per gesture. South's world-object selector and selected-feature Edit action reopen the same feature. Live Canyon Edit also exposes DRAW CANYON EDGE.
- Placement uses existing pointer/gamepad confirmation and Library Back behavior. R rotates, brackets scale the geology definition. No legacy hardcoded terrain stamp is used by new placements. Old mesh objects/stamp helpers remain compatible with legacy worlds.

## Canyon Edge 2.0

CanyonEdgeSystem is the sole active canyon gesture owner. Old Canyon handlers/guides were removed from WorldInteractionSystem; other tools retain that controller. The historical analyzer export delegates to the committed-surface analyzer.

SELECT WALL distinguishes center cross-section and endpoint continuation using authored bank metadata when available, and committed cross-slope sampling for ordinary terrain. AUTO chooses WIDEN or EXTEND; explicit modes are also available. One gesture updates only the selected bank. NEW EDGE must be selected explicitly and makes one raised bank along a line. Pointer drag/release and start/end clicks are supported. Xbox RT plus stick previews; release confirms and B cancels.

Guides use screen-space blue #2a8fff, white core, dark outline and endpoint handles. Dashed hover, solid selected and a separate translucent candidate surface distinguish states. Preview geometry is reused while dragging. Ray marching finds the first terrain crossing rather than assuming one height intersection across the full ray.

Escape/B, direct Compass return, blur, pointer cancellation and mode/tool changes discard uncommitted previews. Synthetic pointer-up from direct return cannot commit a canyon gesture. Gesture ownership clears gameplay input and is released on completion/cancellation. UI controls remain outside canvas painting.

## Rendering and performance

4 m Float64 contribution fields use bilinear sampling and a 64 m spatial index. Existing 5 m terrain render/collider sampling remains. Procedural/sculpt/vertex foundation samples are cached separately, so a geology-only change does not reevaluate those expensive samples. Bounded invalidation refreshes affected regions and grounding; unaffected extension chunks retain their geometry. The original 600 m base terrain is still one mesh/collider, so a feature touching it rebuilds that base resource. This patch does not claim subregion base-mesh rebuilding.

Native Chrome measurement with six active clouds: 12 continuous height updates completed through two browser animation frames in median 83.55 ms, range 14.5-90.7 ms (geology-patch07.local/canyon-browser/results.json). This is an observed development-mode interaction measurement, not a universal FPS or performance guarantee. The full Task 06.1 before/after matrix remains documented separately; no simulation resolution, solver, raymarch quality or cloud fidelity was reduced.

## Verification

Commands actually run successfully:

- node scripts/test-geology-patch07.mjs - 9 groups: composition/isolation, 25 repeated changes, overlaps, history/cancel, deletion, independent canyon banks, real scale/distinct profiles, Save/Load and legacy/version validation.
- node scripts/test-canyon-edge-patch07.mjs - 7 groups: rotated/scaled center/end detection, one-bank edits, ordinary-wall reversible refinements and later manual edits, bounded extension, New Edge, cross-chunk export and reference persistence.
- node scripts/test-task05.mjs - populated/Blank expansion, shared sculpt/vertex seams, local snapshots, world persistence and export coverage.
- node scripts/test-terrain-export.mjs - bounds, committed-only sampling, binary GLB round-trip and immutability.
- node scripts/test-object-workflows.mjs - existing tree/object editing, history, scatter and persistence.
- node scripts/test-cloudfield-editor-performance.mjs - cache invalidation, mesh-derived guides, empty volume/resource retention.
- node scripts/test-cloudfield-integration.mjs - cloud creation/limits, Save/Load, history, guide coordination and resource disposal.
- node scripts/test-final-checkpoint.mjs - Compass states/direct return, Editor/panel mapping and ownership.
- node scripts/test-world-first-tools.mjs - panel combinations, canonical tools, Library Back and controller hierarchy.
- node scripts/test-ui-navigation.mjs - focus/context/neutral-gate behavior.
- TG_TEST_URL=http://127.0.0.1:5210/ node scripts/browser-geology-patch07.mjs - native real controls, Preview/Scale, stable non-destructive ghost, terrain resource isolation, Escape, native placement of all three types, live editing/history and Save/Load. Four acceptance groups, no console errors/failed HTTP requests.
- TG_TEST_URL=http://127.0.0.1:5210/ node scripts/browser-canyon-patch07.mjs - nine acceptance groups: native center/end gestures, cancellation, New Edge, simulated Xbox, affected/unaffected region resources, Rapier seam/shoulder probes, distinct formations/cloud coexistence, Save/Load and six-cloud editing measurements. No console errors/failed HTTP requests.
- npm.cmd run build - production build passed; existing large-bundle warning remains.
- Focused ESLint on new geology modules/components and objectEditing passed. Full src ESLint reports 56 errors/20 warnings: existing failures (including one procedural-evaluator warning relocated by extraction), no increase in error count from Task 06.1. Full repository lint is not a clean check.
- git diff --check - passed after removing trailing whitespace.

Additional native regressions: browser-water-surface.mjs passed shore/low/high views, midday/sunset/night, low/high wind, guides, ponds/waterfalls/chunk water and persistence. browser-cloudfield-move.mjs passed all seven groups (both UI entrypoints, mouse drag/input isolation, Undo/Redo, blur/cancel, simulated Xbox/depth, B while held, Save/Load). Fresh Vite server 5211 was used for the latter, avoiding hot-reload module identities from the development session. A prior loaded-session Move run timed out at cloud selection, and one repeated geology run timed out at placement readiness; both are recorded as failed attempts, with serial reruns passing. These were not counted as passes. browser-final-checkpoint.mjs also passed all six native groups, including first-/third-person tree gestures on both sides of a chunk seam, movement recovery, object placement/editing and all Compass states (task-051.local/browser/final-checkpoint-results.json). No console errors or failed requests. Final production build: dist/assets/index-BI23moGI.js; build exited 0.

## Changed file scope

- Foundation: systems/geology/{geologyDefinition,geologyField,geologySampling,geologyFeatures,geologyGeometry,canyonEdgeOperations,canyonEdgeStore}.js; systems/terrain/{terrainBase,terrainHeight,terrainEdits,terrainRenderState}.js.
- Rendering/gestures: world/{GridTerrain,MeshPlacementSystem,WorldInteractionSystem,Landscape,CanyonEdgeSystem,GeologyPlacementGhost}.jsx; world/useGeologyTerrainVersion.js; scenes/TestingGrounds.jsx.
- UI: ui/{MeshMenu,GeologyEditor,GeologyThumbnail,GeologySelectionActions,CanyonEdgeControls,GamepadMenuNavigator}.jsx, GeologyEditor.css, CanyonEdgeControls.css and App.jsx.
- Data/history: systems/world/{worldStore,worldPersistence}.js, history/historyStore.js, objects/{objectEditing,objectRegistry}.js.
- Validation: test-geology-patch07.mjs, test-canyon-edge-patch07.mjs, browser-geology-patch07.mjs, browser-canyon-patch07.mjs and this report.
- Preserved Task 06.1 scope, including WorldMap/GridFloor/CloudField resource optimizations, browser helpers, profiling scripts and performance report, is described in CLOUDFIELD_TG_PERFORMANCE_06_1.md. No unrelated source changes were folded into geology.

## Evidence and limitations

Local screenshots/results (ignored validation artifacts):

- geology-patch07.local/canyon-browser/before-formation.png and three-distinct-formations-cloud.png: before/after world terrain.
- geology-patch07.local/browser-final/giant-rock-editor.png, canyon-object-editor.png, giant-rock-placement-ghost.png, cliff-face-native-placement.png, canyon-wall-native-placement.png.
- geology-patch07.local/canyon-browser/canyon-center-hover.png, canyon-widen-preview.png, canyon-end-preview.png, new-edge-preview.png.
- foundation-results.json, canyon-results.json, browser-final/results.json and canyon-browser/results.json contain exact observed assertions/probes/timings.

Physical Xbox hardware and subjective owner acceptance remain pending; gamepad checks are simulated native browser input. Terrain remains a heightfield: no overhangs/caves; details below the existing render grid can be smoothed away. Very small scaled formations share that resolution limit. Overlaps deliberately add, so overlapping shoulders can raise one another; ordinary manual relief can make a shoulder uneven. A frozen contribution remains independent when procedural terrain settings later change. Ordinary-wall refinement references are bounded, so large later transforms should be reviewed visually. Whole feature deletion is explicit through Edit Object. This is not a new general terrain layer UI or partial Chunk Save format.

Patch 08's attachment contains historical ordering language; the owner's latest explicit sequence controls: finish/commit Patch 07 first, then restore EAST TOOLS using the implemented canyon controller.
