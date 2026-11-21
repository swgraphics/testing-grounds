# Demo 1.0 consolidated stability register

## Baseline and boundaries

Task 12, 2026-11-13 (America/Chicago). Branch `feat/terrain-export-ui-v2`,
baseline `7573ac0f51887ee5923eadb238d2132da3f3fa6d`. Initially no tracked
changes; four deliberately excluded files were already untracked. No installs,
commits, pushes, deployments, production/settings changes or backup modifications.
Approved interface composition is retained; PlayerController algorithms untouched.

Preview was successfully built from the baseline in Task 11, but its Vercel login
protection blocks actual online app tests. Protection remains enabled; online
verification is PENDING. Local evidence is not online verification.

## Issue register

| ID / severity | Feature / reproduction | Expected / actual / confirmed cause | Fix and verification | Release classification |
| --- | --- | --- | --- | --- |
| QA-01 Low | Landscape lint: run ESLint at baseline. | No unused import or missing memo dependency. Baseline has unused `THREE` and omitted `isDefaultCrimson`. | FIXED: removed import; added dependency. Preserved terrain-setting invalidation because the sampler reads module state, with a narrowly explained lint directive. Lint now 60 errors / 29 warnings. | Corrected; legacy lint separate. |
| QA-02 High | Change cloud density/color, Save World, change them again, Load World. | Renderer should restore saved values. Store restored density `.31`, but live settings stayed `.87`; colors also stale. `CloudField` reads a separate mutable settings object that was never rehydrated. | FIXED: restore renderer object's defaults plus saved overrides on cloud-store changes. Node regression and browser Save/Load and title/reload/Load Saved World PASS. Object identity retained; partial old saves and blank-world isolation tested. | Resolved demo blocker. |
| QA-03 Medium | Rename current area, type draft, press Escape. | Cancel without changing name. Actual name became `SHOULD CANCEL`. Shell capture handler dismissed editor, triggering blur/commit before cancel. | FIXED: inline rename fields receive Escape first; cancel stops propagation. Browser confirms name remains `QA CHUNK`. Equivalent mesh rename handler protected too. | Resolved. |
| QA-04 Medium | Upload file, then use PLACE; inspect accepted extensions and saved object record. | Supported formats and persistence limits should be clear. Picker advertised OBJ/FBX to a GLTFLoader; upload set UI to placement without starting placement, making PLACE cancel. Uploaded records lack persistent model paths. | FIXED misleading exposure/state: GLB-only picker, explicit rejection feedback, selection state lets PLACE start importer/placement. Real GLB placement PASS. UI now explains local files are session-only. | Session-only GLB previews accepted limitation. Persistent upload storage and other formats are post-demo work. |
| QA-05 Medium | Atmosphere: move former `Wispy → Thick` slider. | Visible cloud change; actual key `fluffiness` did not exist in settings or shader, and puffiness/wispy uniforms were not synchronized. | FIXED: existing puffiness setting drives existing shader uniform, label/range now match it. Browser native ArrowRight changes setting and live shader to `.51`; density also verified at `.32`. | Resolved; no new cloud system. |
| QA-06 Medium | Atmosphere Wind Direction slider; trace consumers. | A live control should affect rendering. State changed but no active renderer consumes this key. | Disabled and labelled `(planned)`, with explanatory title. Wind strength/speed and cloud rotation remain available. | Explicit post-demo roadmap item. |
| QA-07 High | Click/drag a placed BLOCK with mouse. | Select/drag without exception. Actual `TypeError: event.preventDefault is not a function` stopped `beginObjectDrag` before transaction initialization. R3F event is not a DOM PointerEvent; calling native preventDefault also conflicts with passive listener. | FIXED: remove invalid cancellation, retain R3F stopPropagation. Native selection/drag now PASS without console errors; existing terrain anchoring also keeps block center at Y=2 instead of burying it at Y=0. | Resolved demo blocker. |
| QA-12 High | Drag placed BLOCK, Undo. | Restore X/Z as well as Y. Browser restored Y but retained moved X/Z. Object-only history unnecessarily broadcast terrain invalidation; terrain-follow wrote stale cached positions back over restored world data. | FIXED: terrain history listener filters affected paths. Native drag Undo/Redo, rotation `π/12`, scale `1.1` and save/load PASS. Focused Node test verifies no terrain invalidation on object history and continued invalidation on terrain history. | Resolved demo blocker. |
| QA-08 Medium | Previously reported intermittent character tilt / rapid facing switching. | Stable facing and upright root. Not reproduced in standard movement, 18 clips, camera/FPV and reselection suites. Six rapid direction changes also have finite yaw-only world rotations and actual position changes. | No speculative controller changes. Short synthetic stress PASS; extended uneven-ground/manual/controller play still recommended. | Unconfirmed report; manual follow-up, not asserted resolved. |
| QA-09 Medium | Default/denser scene performance and repeated interactions. | Stable resources and usable frame pacing. Default forest close-view p50 about 49 ms on this headless run; whole scene has thousands of calls. | Eight tree edits stay at 4,791 geometries. Final six panel/export/save/load cycles on flat isolated world stay at 86 geometries / 8 textures. 288-tree sample renders and restores density 16. | Documented performance limitation; interactive device profiling required before broad performance claims. No large optimization refactor here. |
| QA-10 High (validation gate) | Open actual Vercel Preview. | Test actual deployed app. Login protection prevents access; no connected Vercel tools became available. | PENDING; protection retained. Local browser runs do not satisfy this gate. | Public launch blocker; no application defect inferred. |
| QA-11 Low | Run repository lint. | Lint-clean release desired; baseline contains 61 errors / 30 warnings, including QA-01. | 60 errors / 29 warnings remain after the two targeted fixes. Existing rules/classes not refactored or declared harmless. | Documented legacy limitation requiring separate triage/acceptance. |

## Excluded-file dependency verification

All four files remain untouched/untracked. `src/components/ui/TitleMedia.jsx`
only imports the excluded `src/config/titleMedia.js`; neither is imported by any
committed source. `public/images/TG_ICON (1).svg` has no runtime reference; the
committed icon is `TG_ICON.svg`. `TG_CODEX_TASK_07.md` is an old handoff prompt,
not application input. Historical notes in `UI_V2_2.md`,
`TASK_08_01_SAVE_POINT.md`, and `TERRAIN_EXPORT_V1.md` mention these files; those
mentions describe history, not required release artifacts. Task 11 explicitly
lists the exclusions. Search of emitted JS found no references to these names.
Vite copies all local public assets, so this worktree's `dist` may contain the
unused duplicate SVG; a Git-only build does not have that untracked file.

## Control audit and finite demo scope

| System | Actual evidence / limits |
| --- | --- |
| World/persistence | Native title Enter/Blank/Load Saved, Save/Load, reload, Add Chunk, area rename cancel; chunk Save/Load/Reset extension tested. Store history and real world state observed. |
| Navigation/input | Exact World > Tools > Terrain > Raise route; no panel required. All four panels independently compose/collapse. Mouse, keyboard, simulated Xbox Menu/analog/D-pad/A/B, Parent, Escape, Help and focus ownership tested. No physical Xbox claim. |
| Terrain | Native Raise sculpts visible world. Browser module probes test Raise/Lower/Smooth/Flatten/Slope height deltas + undo; vertex edit persistence; plateau sampling above plateau threshold. Region route is bounding-region Export, not a new region sculpt system. Native export validation and real GLB download plus GLTFLoader round trip tested. Vertex-selection gestures and external import need manual confirmation. |
| Nature/objects | Native selection and trunk/branch/leaf sliders on scattered trees; custom gradients/colors and incomplete old profile fallback persist. Density zero/restore and 288-tree sample tested. BLOCK placement/rotation/scale tested; actual drag/history correction tracked in QA-07. Local upload GLB works within session only. |
| Environment | Native Sun drag changes height/rotation; Lake creates water body; River modifies terrain; cloud density/puffiness reach shader uniforms; cloud colors restore. This is existing basin/global-water cutting, not a new fluid simulation. No external CloudField import claim. |
| Character | Crash Tester 2.0 is default; 66 bones, three 2K maps, 10,403 triangles; walk/run/jump/landing, 18 library clips, camera/FPV and old/new switching tested. Root upright stress is short, not proof intermittent skeletal tilt can never occur. |
| Interface | Approved title/brand/layout preserved. Desktop/small composition screenshots, Dev Tools, Help, import rejection and export feedback checked. Dev locks explain locked sliders. Debug speed controls are session diagnostics. |

Not promised for Demo 1.0: general path generation (existing Slope only), a
separate region sculpt system (existing Export region only), new material editor
(Materials currently routes to library), directional wind, durable local-file
uploads/OBJ/FBX/sidecar glTF, new river-fluid simulation. These are roadmap items,
not hidden implementations. Existing Save World feedback is minimal; browser
storage quota/error UX was not stress-tested. No blanket assertion that every
experimental Dev Tools combination or third-party asset was tested.

## Test execution and evidence

- Six focused Node suites: PASS (`node scripts/test-crash-tester.mjs`,
  `node scripts/test-world-first-tools.mjs`, `node scripts/test-ui-navigation.mjs`,
  `node scripts/test-terrain-export.mjs`, `node scripts/test-forest-renderer.mjs`,
  `node scripts/test-demo-stability.mjs`). Final combined run exit 0.
- `node scripts/browser-ui-smoke.mjs`: PASS; eight scenario groups, zero console
  errors and failed requests. Screenshots/JSON/real downloaded GLB in
  `task-0801-browser.local/` (ignored local evidence).
  Final run: fresh server `npm.cmd run dev -- --host 127.0.0.1 --port 5182 --strictPort`,
  then `$env:TG_TEST_URL='http://127.0.0.1:5182/'; node scripts/browser-ui-smoke.mjs`;
  original existing smoke harness retained unchanged.
- `node scripts/browser-forest.mjs task12`: PASS; exact 144 IDs/placements,
  native editing, legacy explicit red/gradient preservation, missing-vs-zero
  density, repeated resource counts; `task-09-browser.local/task12.json`.
- `node scripts/browser-crash-tester.mjs final`: PASS, zero runtime errors;
  18 clips, real movement/jump, camera, FPV, grounding, reselection resources;
  `task-10-browser.local/final-results.json`. New model first request 7.87 s /
  14.7 MB in this local run; not a cold Internet-load measurement.
- Final `$env:TG_TEST_URL='http://127.0.0.1:5182/'; node scripts/browser-demo-stability.mjs`:
  **17 scenarios PASS**, zero console errors/failed requests, exit 0.
  JSON/screenshots `task-12-qa.local/browser/`. Object gestures are isolated in
  Blank Canvas; the later 288-tree population probe uses that same flat fixture,
  while the separate forest suite validates the authored 144-tree landscape.
  `node scripts/browser-demo-stability.mjs movement`: tightened world-space
  rotation + real displacement PASS; separate evidence `browser-movement/`.
  `node scripts/browser-demo-stability.mjs extras`: PASS after QA-07/12 fixes;
  native chunk Save/Load/Reset and object drag/Undo/Redo/rotation/scale/persistence,
  zero runtime errors/failed requests; `task-12-qa.local/browser-extras/`.
- Early audit failures included wrong selectors, plateau sampling inside the
  intentionally flat spawn, upload camera below edited terrain, and evaluation
  during a reload context transition. Test setup corrected; these are not
  established deployment or app failures. Actual QA-02/03/07 failures retained
  above with their causes and retest status.
  Navigation reruns against the long-running port 5181 server reported no sculpt
  changes despite world input ownership, a canvas click target and an intersecting
  camera ray. The unchanged suite passes that step against a fresh port 5182 Vite
  server; stale HMR/module state is the indicated test-environment cause. Temporary
  camera/diagnostic edits to the existing smoke harness were removed. No player/
  intro-camera implementation was altered. Final browser runs use the fresh server.
  Object gestures use a Blank Canvas fixture after automatic AreaDiscovery
  switched chunks during an earlier combined run. This isolates native gestures
  from expected area switching; the independent object fixture already passed.
- Baseline lint: **61 errors / 30 warnings**. This includes QA-01; it is not
  described as entirely preexisting. The remaining legacy diagnostics are not
  authorization for a repository-wide lint refactor. Final comparison is
  **60 errors / 29 warnings**; no new rule classes from these fixes. Exact command:
  `node node_modules/eslint/bin/eslint.js . --format json --output-file task-12-qa.local/lint-final.json`
  (exit 1, expected from remaining diagnostics). A temporary partial test scaffold
  briefly added a parsing diagnostic; it was removed and is not in final totals.
- Final `npm.cmd run build`: PASS (24.75 s after all source fixes), bundle
  `index-C31qLmFg.js`; existing large-bundle and plugin timing warnings.
- `git diff --check`: PASS. `git diff --exit-code -- src/components/character/PlayerController.jsx src/styles/brand.css src/components/ui/TitleScreen.css`: PASS;
  controller algorithm, brand `#FF4800` and approved title stylesheet unchanged.

### Evidence links (local, deliberately ignored)

- [World-first composition](../../task-0801-browser.local/03-full-composition.png)
- [Small composition](../../task-0801-browser.local/04-small-composition.png)
- [Forest native editing](../../task-09-browser.local/task12-edited.png)
- [Crash Tester](../../task-10-browser.local/final-idle-front.png)
- [Expanded audit JSON](../../task-12-qa.local/browser/results.json)
- [Movement stress JSON](../../task-12-qa.local/browser-movement/results.json)
- [Object/chunk regression JSON](../../task-12-qa.local/browser-extras/results.json)
- [Object transform screenshot](../../task-12-qa.local/browser-extras/object-transform.png)

Evidence is machine-local and not part of Git/release assets. GPU identification
in forest evidence: ANGLE / AMD Radeon Graphics / Direct3D11. Five-second forest
samples used the same scene/camera before and after a tree edit (overview mean
57.3 ms, near 49.0 ms, edited 51.6 ms). The denser two-second sample is only a
render/population check: changing view/physics/warmup prevents a fair speedup
claim. JS heap samples fluctuate with GC and are not a long-duration leak proof.

## Release decision and manual gates

**NO-GO for public Demo 1.0 launch yet.** Local stability regressions pass after
the verified fixes; there are no remaining confirmed Critical/High application
defects in the exercised scope. The remaining High readiness gate is actual
authenticated Preview verification, with the existing licensing gate retained.
Protection must stay enabled. No production release is authorized by Task 12.
Task 12 fixes have not been deployed; a later authorized Preview build must
contain these fixes before its online smoke test can certify them.

Recommended final manual checks, without expanding demo scope:

1. Owner-authenticated Preview: repeat title/default/blank/saved entry, character
   and textures, compass/panels, sculpt, tree editing, save/reload and GLB download.
2. Physical Xbox: Menu/D-pad/A/B, focus release back to movement, triggers and
   analog dead zones; automated simulation does not certify hardware.
3. Longer uneven-ground play: rapid facing changes, sprint/jump/landing and
   first-person/orbit transitions; capture intermittent tilt if it recurs.
4. Typical desktop/mobile devices: cold initial load, panel reachability, dense
   forest, repeated save/load and interactive frame pacing. Current measurements
   are headless local evidence, not a device-performance guarantee.
5. Import exported terrain into Blender and the external CloudField workflow;
   validate units, Y-up, normals/material and sculpt/vertex elevations. Neither
   application import was executed here.
6. Finish distribution-rights review from Task 11 before public launch.

Changed source files: `App.jsx`, `EditorView.jsx`, `InputHUD.jsx`, `MeshMenu.jsx`,
`Landscape.jsx`, `MeshPlacementSystem.jsx`, `CloudField.jsx`, `CloudSettings.js`,
`terrainSettings.js`. Added `scripts/browser-demo-stability.mjs`,
`scripts/test-demo-stability.mjs`, and this single consolidated register.
Final source review confirms no assets, dependency manifests, scattering seeds,
controller algorithms or approved CSS design were changed. At Task 12 close,
all changes remained uncommitted; original four exclusions remained untouched.

## Task 12.1 preservation checkpoint

The owner authorizes committing and pushing these completed corrections to
`feat/terrain-export-ui-v2` to refresh Preview only. No further application
features or refactors are introduced. Fresh checks: production build PASS
(22.56 s, same `index-C31qLmFg.js` bundle), all six focused Node suites PASS,
and `git diff --check` PASS. Task 12 browser evidence above is retained; browser
suites were not rerun for this preservation-only checkpoint. Four original
exclusions and all ignored evidence remain outside the commit. Existing lint
limitations and release gates still apply. Preview authentication stays enabled;
online verification remains pending access. Production remains outside scope.
