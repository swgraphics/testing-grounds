# UI/UX Revision 01 - Task 03

2026-11-15 (America/Chicago). Worktree: D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08.
Branch: feat/terrain-export-ui-v2.

## Owner review update

2026-11-15: The owner considers Task 03 locally validated, pending physical Xbox review. Its existing changes are the baseline to carry into Task 04. This supersedes the earlier awaiting-review status; the recorded test evidence and remaining hardware limitations still apply.

## Checkpoint and scope

With explicit owner approval after the read-only inspection, committed the 37 files from Passes 01, 01.1, 02A and 02B as **b2230de**, `feat: checkpoint shared directional UI and object workflows`.
The commit succeeded; Git's subsequent automatic geometric-repack/multi-pack-index maintenance reported a permission error. No repair, cleanup, push, merge, deployment or branch switch was attempted.

All Task 03 changes remain **uncommitted**. The four exclusions remain untracked and SHA-256-identical to their starting bytes:

- TG_CODEX_TASK_07.md
- public/images/TG_ICON (1).svg
- src/components/ui/TitleMedia.jsx
- src/config/titleMedia.js

No dependencies, backup directories, persistence schemas, title composition, Compass design, directional assignments or chunk-generation implementations were changed. Task 04 was not started. Existing chunk tests exercise their existing operation; they do not certify the deferred Add Chunk terrain-visibility defect.

## Findings and classification

| Finding | Classification | Current evidence |
| --- | --- | --- |
| Left stick worked in Compass but was absent from panel navigation | FIXED and verified | Simulated analog traversal reaches scrolling Dev Tools controls; same navigator serves both starting views |
| Dev Tools and Library roots constrained focus to a subtree | FIXED and verified | Shared layout navigation, ordered scrolling traversal, horizontal gallery navigation, LB/RB across open panels |
| Slider adjustment and B dismissal competed | FIXED and verified | A starts adjustment, A/B ends it, subsequent navigation/dismissal works; keyboard slider arrows remain native-compatible |
| Single world click/controller selection opened Tree Interaction | FIXED and verified | Selection leaves gameplay enabled and exposes an explicit Edit action; X/Edit opens inspector |
| Tree/leaf B/Escape handling competed with shell dismissal | FIXED and verified | Shared dismissal priority, repeated B/Escape/Close cycles, nested leaf closes first, actual movement resumes |
| Selection could outlive a scene-local tree reference on reload | FIXED and verified | Explicit Edit resolves the current world object; repeated save/load reopening regression included |
| Secondary count ignored ordinary procedural branches | FIXED and verified | Real world branch geometry changes from 50 segments/600 vertices to 450/5,400 at count 0/8 |
| Secondary length/thickness/randomness | UNIMPLEMENTED / planned | Existing disabled shared controls remain disabled and described accurately; no invented consumers |
| FPV speed used obsolete ecctrl props | FIXED and verified | Native slider settings produce contrasting measured Rapier-driven travel |
| Physics speed presets used obsolete ecctrl props | FIXED and verified | Each existing preset produces a different measured travel distance; NORMAL restores baseline |
| InputHUD kept stale local copies of externally changed Dev settings | FIXED and verified | Existing dev-settings-changed event now updates displayed mode, speed and inversion |
| Physics lock and mode-specific speed ownership | WORKING as designed | Lock disables presets; FPV uses Camera speed, with Physics presets explicitly disabled in FPV |
| Session-only debug settings | WORKING as designed | Retained across panel/view changes; not added to World save schema |
| Further unspecified intermittent Physics failures | NOT REPRODUCED | No additional exception, nonfinite value or unexplained reversion in exercised cases; no blanket engine guarantee |
| High-speed travel outside finite terrain | DEFERRED due to larger architectural scope | Supported debug speed can travel past the base collider; extending terrain/collision is outside this task |

## Controller navigation and input ownership

The existing GamepadMenuNavigator still polls the same browser gamepad and dispatches existing actions. No separate Editor View navigator was introduced.

- Compass retains Menu/Start, D-pad/analog direction selection, A confirmation and B dismissal.
- Ordered Up/Down traversal reaches controls outside scroll viewports and scrolls them into view. Closed details and hidden panel contents are excluded by visibility.
- Left/Right retains spatial navigation, with horizontal Library cards kept in their gallery. LB/RB cycles currently expanded panels, including configurations with fewer than four open.
- A activates once on release, and only if focus still matches the control where the press began. Existing long-A Dev section locking remains.
- On sliders/select lists, A enters adjustment. Direction input changes the value through the existing native input/change handlers. A/B exits adjustment before dismissing a surrounding context. Existing ranges and stored values are unchanged.
- Panel dismissal moves focus to another open panel, or returns ownership to the world. Collapsed edge tabs retain the established reopen workflow.
- Tree Interaction and leaf windows own modal input even if focus is temporarily lost. clearGameplayInput plus the existing neutral-release gate prevents held menu input leaking into gameplay.
- Direct tree editing retains RT + left-stick gestures via raw, explicitly owned controller input. The world gamepad state remains gated; ordinary UI stick navigation and direct gestures are separated. Leaf direct motion likewise requires RT.

Help text documents panel switching and adjustment mode. No slider styling, Compass color/rotation or panel redesign was introduced.

## Tree activation, dismissal and shared properties

A native world click selects the tree at the actual pointer ray. Controller A can select the reticle target. Selection sets only the existing activeTarget, without activating a blocking TREE edit tool. Approaching or crossing a tree with the reticle does not open an inspector.

The selected-tree contextual control explicitly offers **EDIT TREE (E / X)**. X is handled only in world ownership; existing Compass and movement mappings remain. Clicking Edit or using the contextual keyboard action resolves the current world target and enters the existing tree tool. Other active world tools keep their pointer ownership.

Dismissal order is active value adjustment, nested leaf editor, Tree Interaction, then the underlying panel/world context. B, Escape and visible Close use the same exit path. Exiting commits the existing tree history transaction, clears gameplay state, removes inspector focus and restores an available previous panel context or the world. Entering focused Edit Object exits Tree Interaction first, preventing two concurrent object inspectors and ensuring history commits.

Both presentations still render TreeProperties and use editObjectTarget. Colors, gradients, instance scopes, transforms, zero/false values, overrides and world persistence retain the Pass 02B backend. The forest regression verifies single scattered trees, multiple trees, legacy colors, live vertex-color gradients and saved restoration.

## Secondary Branches root cause and implementation

Confirmed baseline: count 0 and 8 both produced 50 primary branch records and 600 branch vertices on an ordinary editable Crimson tree. Only createCustomBranchData consumed secondary.count.

The existing custom-branch attachment model is now also applied to generated primary branches, bounded to eight children per primary. Children are appended after existing primary/custom records, preserving their indices and overrides. Existing secondary.enabled=false is respected. Children remain in the existing merged branch geometry/material path; no extra branch mesh or renderer was added.

New structural children do not receive additional canopy/floating-leaf populations. Focused Node tests compare the complete primary, canopy and floating-leaf data at minimum/maximum settings and verify exact equality. This avoids multiplying foliage work. More branch vertices are an intentional geometry cost, not a performance improvement claim.

Observed live world results through Tree Interaction:

| Count | Branch records | Branch vertices |
| --- | ---: | ---: |
| 0 | 50 | 600 |
| 8 | 450 | 5,400 |

Focused Edit Object edits the same count and geometry. Undo/Redo and World save/load restore it. Shared secondary length/thickness/randomness remain disabled because they still have no generator consumers.

## FPV and Physics root causes

The locally installed ecctrl is **2.0.0**. Its source and type definitions consume **maxWalkVel/maxRunVel**; maxVelLimit and sprintMult are obsolete props. Previously FPV slider changes and debug presets updated React state but did not replace the library's default velocity limits. The application also sends hold-style run input, while the library defaults to toggle-run.

PlayerController changes are restricted to those prop connections: supported velocity limits plus enableToggleRun=false. Existing NORMAL third-person effective limits remain **2 walk / 5 sprint**, rather than unintentionally enabling the dormant legacy 12/24 values. FPV uses its existing per-character profile value for both limits; debug third-person presets use their already configured 50/100/500 limits. No movement algorithm, character facing, camera transition, jump, collision or intro-camera algorithm was rewritten.

The library clamps the old accDeltaTime preset values, so the old text promising independently increasing acceleration was inaccurate. Guidance now states the actual speed ownership. Existing preset names (50X, 100X, 500X) are retained; their configured limits are nominal speeds, not literal multiples of NORMAL walk speed.

### Inventory of every current Physics control

There are **no gravity/mass/friction/bounce sliders** in the current Physics section.

| Control | Existing intent/state source | Actual consumer/live behavior | Reset/mode and persistence |
| --- | --- | --- | --- |
| PHYSICS disclosure | InputHUD.openDevSections.physics | UI visibility only | Survives mounted shared panel/view changes; no simulation reset |
| Lock/Unlock Physics (and header long-A lock) | devSectionLocks physics entry and change event | Disables preset buttons; leaves current simulation setting running | No body reset; existing lock persistence unchanged |
| NORMAL | devSettings.speedMultiplier=1, existing event | PlayerController supported limits 2 walk/5 sprint; sprint follows held input | Live; restores normal after a debug preset; session diagnostic |
| 50X | Same source, value 50 | Live third-person walk/run limit 50 | No reset required; disabled in FPV; session diagnostic |
| 100X | Same source, value 100 | Live third-person walk/run limit 100 | Same |
| 500X | Same source, value 500 | Live third-person walk/run limit 500 | Same; extreme diagnostic speed can leave finite terrain |

Camera's FPV Move Speed is 1..50 and edits cameraSettings for the active character through updateCameraSetting/camera-settings-changed. Existing Save/Load/Reset Camera Preset operations remain. World Save/Load does not gain a new Dev-setting persistence contract.

### Measured behavior

Baseline identical 2.2-second input: FPV 1 **10.58 units**, FPV 50 **10.42 units**. Debug presets 50/100/500 were approximately **10.31/10.64/10.64 units**, demonstrating the disconnected velocity limits.

Native-control acceptance run, same 2.2-second simulated left-stick input, actual player-position telemetry:

| Setting | Horizontal travel (world units) |
| --- | ---: |
| FPV 1 | 2.07 |
| FPV 50 | 105.83 |
| Physics NORMAL | 4.30 |
| Physics 50X | 106.67 |
| Physics 100X | 206.66 |
| Physics 500X | 1,074.33 |
| Physics NORMAL again | 4.33 |

A separate equivalent-input probe also measured FPV **2.08 vs 105.00**, and third-person **4.23/105.00/211.67/1,050.00** for NORMAL/50/100/500. Frame timing, acceleration/contact and ground coverage affect distance; these are observable movement checks, not frame-independent timing benchmarks.

At 500X, the 2.2-second input travels well beyond the base terrain's 600-unit footprint (GridTerrain uses TERRAIN_SIZE=600). The final endpoint had Y=69.38; an earlier native-control run ended at about Y=-25. The subsequent NORMAL/teleport checks restored grounded movement. Extreme-speed vertical/contact behavior outside normal terrain coverage is **not certified** by this correction. No new supporting terrain, boundary/recovery mechanic or collision subsystem was introduced; further isolation or architectural corrections there are deferred. These measurements certify that the existing speed presets now affect movement, not robust traversal at 500 units/sec.

## Validation and evidence

Local Vite server: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5193 --strictPort` (hidden process, native watching). Browser tests use independent Chrome profiles. Headless Chrome initially disconnected inside the sandbox; authorized runs outside the sandbox completed. No package installation was needed.

| Exact check | Observed result |
| --- | --- |
| npm.cmd run build | PASS; existing bundle-size/plugin timing warnings |
| node scripts/test-ui-navigation.mjs | PASS |
| node scripts/test-world-first-tools.mjs | PASS; all 16 visibility combinations from both presets, tools and contextual Back |
| node scripts/test-object-workflows.mjs | PASS; shared property/default/override/history/persistence and scatter operations |
| node scripts/test-forest-renderer.mjs | PASS; transforms, bounds, shape/palette/outline parity |
| node scripts/test-crash-tester.mjs | PASS; skeleton/binds/textures/fallbacks and 106 actions |
| node scripts/test-terrain-export.mjs | PASS; committed sampling, real GLB round-trip and cleanup |
| node scripts/test-demo-stability.mjs | PASS; cloud restoration/history isolation |
| node scripts/test-task03.mjs | PASS; branch geometry endpoints/finite normals, stable primary/custom indices, deterministic serialization and unchanged canopy/floating leaves |
| node scripts/browser-task03.mjs --stage-a | PASS before Stage B |
| node scripts/browser-task03.mjs --stage-b | PASS before Stage C |
| node scripts/browser-task03.mjs | PASS; all four final acceptance groups, no console errors or failed HTTP requests |
| node scripts/browser-task03.mjs --settings-probe | PASS; equivalent-input physical travel probe |
| node scripts/browser-task03.mjs --tree-direct --stage-b | PASS; retained RT gesture changes live height without character displacement; repeated Edit/B after save/load |
| node scripts/browser-task03.mjs --title-default | PASS; Xbox A enters the default World, followed by working Menu/B; zero console errors/HTTP failures |
| node scripts/browser-world-first-tools.mjs --url=http://127.0.0.1:5193/ | PASS; all 11 groups, no console errors/HTTP failures |
| node scripts/browser-forest.mjs task03 | PASS; 144 trees, selection/Edit, properties/colors/gradients, persistence and bounded repeated-edit resources |
| node scripts/browser-crash-tester.mjs final | PASS; real walk/sprint/jump/landing, camera/FPV, 18 clips, grounding and reselection resources; no captured runtime errors |
| node scripts/browser-demo-stability.mjs --url=http://127.0.0.1:5193/ | PASS; all 17 scenarios, zero console errors/HTTP failures |
| npm.cmd run lint -- --format json --output-file ui-revision-03.local/lint-final.json | FAIL at existing baseline: 57 errors / 29 warnings; no added file/rule/severity occurrence counts versus Pass 02B |
| git -c core.safecrlf=false diff --check | PASS |
| Four excluded-file SHA-256 comparisons | PASS; all unchanged |

Browser environment variables used for separate evidence: TG_TEST_URL=http://127.0.0.1:5193/, TG_FOREST_ARTIFACT=ui-revision-03.local/forest, TG_CHARACTER_ARTIFACT=ui-revision-03.local/character, TG_DEMO_ARTIFACT=ui-revision-03.local/demo. World-first output was copied into the Task 03 evidence directory; its harness now also accepts TG_UI_ARTIFACT for subsequent runs. The smoke/regression aliases use this same world-first harness and were not redundantly rerun.

Useful ignored local artifacts:

- [Retained direct gesture and repeated post-load editing](../../ui-revision-03.local/tree-direct-results.json)
- [Default World controller startup](../../ui-revision-03.local/title-controller-results.json)
- [Validation summary](../../ui-revision-03.local/validation-summary.json)
- [Final Task 03 browser results](../../ui-revision-03.local/task03-results.json)
- [Controller focus in Editor View](../../ui-revision-03.local/01-controller-editor.png)
- [Tree selected, inspector closed](../../ui-revision-03.local/02-tree-selected.png)
- [Tree Interaction open](../../ui-revision-03.local/03-tree-interaction.png)
- [Measured secondary geometry before/after](../../ui-revision-03.local/secondary-geometry.json)
- [FPV low](../../ui-revision-03.local/06-fpv-low-setting.png) / [FPV high](../../ui-revision-03.local/07-fpv-high-setting.png)
- [Native-control speed measurements](../../ui-revision-03.local/speed-results.json)
- [Baseline probe](../../ui-revision-03.local/settings-baseline.json) / [corrected probe](../../ui-revision-03.local/settings-after.json)
- [World-first results](../../ui-revision-03.local/world-first/browser-results.json)
- [Forest results](../../ui-revision-03.local/forest/task03.json)
- [Character/camera results](../../ui-revision-03.local/character/final-results.json)
- [Demo results](../../ui-revision-03.local/demo/browser/results.json)
- [Node suites](../../ui-revision-03.local/node-suites.log), [build log](../../ui-revision-03.local/build-final.log), [lint comparison](../../ui-revision-03.local/lint-comparison.json), [excluded hashes](../../ui-revision-03.local/excluded-comparison.json)

Forest repeated-edit geometry counts remain 4,794; demo repeated panel/tool/save/load cycles remain 86 geometries / 8 textures. This is bounded resource evidence, not a speedup or long-duration leak guarantee.

Test development failures are retained as diagnostic history: a transient patching syntax error was corrected before successful runs; native placement needed the established fixed-camera ground fixture; DOM wait predicates were changed to booleans for CDP serialization; reopening after Save/Load now waits for the loading transition before pressing X. An RT compatibility check was added after final code review and passed; its initial expected-value assertion was corrected to read the initial UI value because fresh placed records may not yet have a top-level treeDefinition. Earlier failed attempts are not reported as passing tests.

## Changed files

| Files | Purpose |
| --- | --- |
| src/components/ui/GamepadMenuNavigator.jsx | Shared panel/scroll/analog navigation, value adjustment, panel switching, modal roots and explicit selected-tree X |
| src/systems/ui/controlAdjustment.js (new) | One adjustment owner/cancellation shared with shell Escape |
| src/App.jsx | Dismissal priority and remaining-panel focus |
| src/systems/input/inputOwnership.js | Focus-independent tree/leaf modal ownership |
| src/components/ui/CrimsonTreeInteractionPanel.jsx | Nonblocking selected-tree Edit affordance, focus restoration and focused-editor transfer |
| src/components/world/CrimsonTreeInteractionSystem.jsx | Selection vs Edit, pointer ray, current-world target resolution and retained explicitly owned direct gestures |
| src/components/ui/LeafVertexEditorWindow.jsx | Shared dismissal event, removal of competing B poll, explicit RT vertex motion |
| src/components/ui/NavigationShell.jsx | Controller navigation/adjustment help |
| src/components/world/treeBranches.js | Bounded secondary children on generated primaries |
| src/components/world/treeCanopy.js | Preserve existing canopy/floating-leaf population |
| src/components/ui/TreeProperties.jsx | Accurate implemented/planned secondary guidance |
| src/components/character/PlayerController.jsx | Supported ecctrl velocity/run-mode props only |
| src/components/ui/InputHUD.jsx | Dev-setting event synchronization and mode-accurate Physics availability/guidance |
| scripts/browser-task03.mjs (new), scripts/test-task03.mjs (new) | Focused controller/tree/geometry/speed regressions and evidence |
| scripts/browser-forest.mjs, scripts/browser-object-workflows.mjs | Existing tests follow intentional Select/Edit; separate artifact support |
| scripts/browser-crash-tester.mjs | Current South Animation selector and separate evidence directory |
| scripts/browser-world-first-tools.mjs, scripts/browser-demo-stability.mjs | Configurable Task 03 evidence locations |
| docs/codex/UI_UX_REVISION_01_TASK_03.md (new) | This report |

## Remaining limits and owner checks

- Physical Xbox validation remains pending: actual device dead zones/repeat timing, Menu/D-pad/stick/A/B/LB/RB, RT direct gestures, UI value adjustment and world handoff.
- Native OS color/file/text entry dialogs are not certified as fully operable by an Xbox controller. Application controls are focusable; browser/OS entry behavior needs hardware testing. No virtual keyboard/color-picker subsystem was introduced.
- Secondary length/thickness/randomness remain explicitly disabled/planned. No large generator rewrite or independent secondary foliage system was introduced.
- Extreme speed terrain/contact behavior and long uneven-ground sessions remain manual checks. The short upright/grounding tests do not prove intermittent skeletal tilt can never recur.
- Global lint debt remains outside this task; build warnings remain. No claim of deployment/production validation or device-performance improvement.
- Owner review update (2026-11-15): Task 03 is locally validated pending physical Xbox review, and its changes are ready to incorporate into Task 04. Task 03 remains uncommitted; no further commit, push or deployment is authorized.
