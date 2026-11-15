# Testing Grounds Change Report — UI/UX Revision 01, Pass 01

> Historical snapshot: [Pass 01.1](UI_UX_REVISION_01_PASS_01_1.md) supersedes the exclusive one-or-four visibility model and refines placement Back navigation described below.

2026-11-14. Worktree: `D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`.
Branch: `feat/terrain-export-ui-v2`; base/HEAD: `93d513c`. Changes are uncommitted.
Pass 01 implementation and automated validation are complete. Physical Xbox
hardware verification remains pending. Stop here for owner review before Pass 02A.

**ONE INTERFACE. TWO VIEWING MODES. FOUR SHARED PANELS.**

The Compass is the gateway to the interface. Its primary cardinal destinations
open NORTH, SOUTH, WEST or EAST. It is not a fifth directional panel.

| Direction | Shared content | Existing functionality retained |
| --- | --- | --- |
| NORTH | World / Map | Existing WorldMap, teleport, chunk rename, Add/Save/Load/Reset Chunk |
| SOUTH | Objects / Library | Real MeshMenu library, Upload Mesh, placement/edit/scatter entries, existing Animation Actions for Crash Testers |
| WEST | World Editor | Save/Load World, Terrain Export, Help, Undo/Redo, world guides and terrain/world tool access |
| EAST | Dev Tools | Existing full Character, Terrain, Camera, Physics, Atmosphere, World and Materials settings |

`DirectionalPanelLayout` renders one component registry in both modes. Each
direction uses the same frame, content component, stores and action handlers.
`editorStore` now owns only `viewMode` and `activeDirection` as layout state.
One active direction makes simultaneous World View directional panels impossible;
Editor View derives all four panels from the same registry.

The existing InputHUD and MeshMenu controllers stay mounted. React portals place
their real controls inside EAST and SOUTH, retaining settings, selected objects,
pagination and open Dev Tools sections. The separate compact Dev Tools variant
was removed in favor of the existing full settings interface. Tool state, history,
world data and persistence remain with their existing owners.

World View starts with only the Compass as persistent desktop menu chrome.
The persistent PANELS switcher, old editor bars and directional HUD ribbon are
removed from the live shell. A chosen panel appears at its assigned edge;
choosing another direction replaces it. Its X returns to clear World View.
Existing contextual feedback, active-tool feedback, world-space guides and touch
movement/camera controls remain available. Closing interfaces preserves the tool.

Editor View places NORTH across the top, SOUTH across the bottom, WEST on the
left and EAST on the right. Each region scrolls internally. The central canvas
resizes to the remaining space and receives world pointer input. At 1440×1000
the observed center was 808×468; at 640×800 it was 253×353. All four panels and
central pointer access were also checked at 390×844.

Mode switching and tools use the existing navigation system:

- Mouse: Compass → cardinal panel, or its explicit **EDITOR VIEW** header action.
- Keyboard: Tab opens Compass; arrows navigate; Enter confirms. First Up selects
  North and second Up reaches the header; Right reaches **TOOLS** and **WORLD VIEW**.
- Xbox simulation: Menu opens Compass, D-pad/left stick select directions, A
  confirms, and B dismisses to World View. Header actions remain controller accessible.
- Editor View: **WORLD VIEW** is visible in the NORTH header; Escape/B also
  dismisses the interface without clearing the selected tool.
- Secondary **TOOLS → TERRAIN** navigation retains direct Raise/Lower/Smooth/
  Flatten/Slope/Vertex tool activation. River, lake, sun and cloud capabilities
  remain accessible. Tool activation returns directly to the world.
- Object capabilities use SOUTH's existing library/actions. Project actions have
  an empty registration point; no live, nonfunctional Project buttons were added.

Panel pointer guards were extended to the new shared panel boundary. The
active-tool feedback position explicitly clears the legacy top anchor, preventing
the exit button from stretching through the viewport. Save availability derives
from the existing world store so LOAD WORLD enables immediately after saving.

Files changed:

| Files | Purpose |
| --- | --- |
| `src/components/ui/DirectionalPanels.jsx` (new), `DirectionalPanels.css` (new) | Shared directional registry, frames, content and responsive region layout |
| `src/components/ui/EditorView.jsx` | One layout renderer and existing export overlay |
| `src/systems/editor/editorStore.js` | Viewing mode and exclusive active direction |
| `src/systems/ui/navigationStore.js`, `navigationActions.js` | Cardinal routes, mode/header navigation and existing tool actions |
| `src/components/ui/NavigationShell.jsx` | Compass Editor View/Tools actions and shared save availability |
| `src/components/ui/InputHUD.jsx` | Canonical EAST controls and SOUTH animation portal; existing input handlers retained |
| `src/components/ui/MeshMenu.jsx` | Existing library controller rendered into SOUTH |
| `src/components/ui/WorkspaceTools.jsx` | Existing terrain/world capabilities through shared actions |
| `src/components/ui/EditorPanelControls.jsx` | Remove persistent PANELS chrome; retain contextual tool feedback |
| `src/components/ui/GamepadMenuNavigator.jsx` | Shared layout focus root and focusable details summaries |
| `src/App.jsx` | Shared content hosts, layout-driven canvas class, ribbon removal and dismissal routing |
| `src/components/world/WorldInteractionSystem.jsx` | One UI pointer-exclusion selector change; terrain operations unchanged |
| `scripts/test-ui-navigation.mjs`, `test-world-first-tools.mjs` | New navigation/layout assertions, retained input/tool regressions |
| `scripts/browser-world-first-tools.mjs`, `browser-ui-smoke.mjs`, `browser-ui-regression.mjs` | Shared native-pointer/controller acceptance suite and screenshots |
| `scripts/browser-demo-stability.mjs` | Existing chunk/rename regression selectors updated to NORTH |
| `docs/codex/UI_UX_REVISION_01_PASS_01.md` (new) | This report |

Observed validation:

| Exact command/check | Result |
| --- | --- |
| `npm.cmd run build` | PASS on final application source; existing large-bundle and plugin-timing warnings remain |
| `node scripts/test-ui-navigation.mjs` | PASS: hierarchy, root directions, input contexts, analog hysteresis and neutral handoff |
| `node scripts/test-world-first-tools.mjs` | PASS: exclusive directional visibility, shared Editor View, repeated cycles, tool/settings retention and no accidental placement/cancellation |
| `node scripts/test-terrain-export.mjs` | PASS: committed sampling, preview exclusion, geometry, real GLB loader round-trip and cleanup |
| `node scripts/test-forest-renderer.mjs` | PASS: leaf transforms/outlines, bounds, shapes and palette overrides |
| `node scripts/test-crash-tester.mjs` | PASS: model/skeleton/bind checks, textures, fallbacks and 106 animation actions |
| `node scripts/test-demo-stability.mjs` | PASS: cloud restoration, legacy save defaults, object history and terrain invalidation isolation |
| `node scripts/browser-ui-smoke.mjs` | PASS on final source: all nine check groups, zero console errors and HTTP failures; native LOAD WORLD restored an object removed after saving |
| `node scripts/browser-demo-stability.mjs 'World map\|Area rename\|Chunk save\|Help dialog\|Saved title'` | PASS: all five selected regressions; zero console errors and HTTP failures |
| `npm.cmd run lint -- --format json --output-file ui-revision-01.local/lint-after.json` | FAIL at existing baseline: 60 errors, 29 warnings. Per-file/rule/message comparison found no added diagnostics |
| `git -c core.safecrlf=false diff --check` | PASS |
| SHA-256 comparison of all four excluded files | PASS: all unchanged |

The main browser suite checks the default and Blank Canvas title routes; clean
World View; all four individual panels; Editor View; native central sculpting;
Undo/Redo; a live EAST slider shared across modes; repeated simulated Menu,
D-pad, analog, A/B and header navigation; actual GLB download/preview cleanup;
object placement; Scatter entry; saved object restoration through the native
LOAD WORLD button; compact layouts; native movement and camera input.
`browser-ui-regression.mjs` imports this same suite and was not run a second time.
The targeted demo harness retains its existing DOM-activated toolbar actions.

Screenshot artifacts are local and ignored by Git:

| Capture | File |
| --- | --- |
| Clean World View | [02-world-clean.png](../../ui-revision-01.local/02-world-clean.png) |
| Compass | [03-compass.png](../../ui-revision-01.local/03-compass.png) |
| NORTH | [04-panel-north.png](../../ui-revision-01.local/04-panel-north.png) |
| SOUTH | [04-panel-south.png](../../ui-revision-01.local/04-panel-south.png) |
| WEST | [04-panel-west.png](../../ui-revision-01.local/04-panel-west.png) |
| EAST | [04-panel-east.png](../../ui-revision-01.local/04-panel-east.png) |
| Editor View, desktop | [05-editor-desktop.png](../../ui-revision-01.local/05-editor-desktop.png) |
| Editor View, 640px | [06-editor-640.png](../../ui-revision-01.local/06-editor-640.png) |
| Editor View, mobile dimensions | [07-editor-mobile.png](../../ui-revision-01.local/07-editor-mobile.png) |
| Title, desktop / small | [01-title-desktop.png](../../ui-revision-01.local/01-title-desktop.png), [08-title-small.png](../../ui-revision-01.local/08-title-small.png) |

Machine-readable evidence:
[browser results](../../ui-revision-01.local/browser-results.json),
[targeted demo results](../../task-12-qa.local/browser-World_map_Area_rename_Chunk_save_Help_dialog_Saved_title/results.json),
[lint comparison](../../ui-revision-01.local/lint-comparison.json), and
[excluded-file hashes](../../ui-revision-01.local/excluded-comparison.json).
Earlier failure captures may remain in the artifact directory; the latest
`browser-results.json` is authoritative for the completed run.

Preservation and limitations:

- No changes to character movement algorithms, physics, terrain/tree generation,
  persistence formats, animation systems, object schemas, title components or
  dependency manifests. The world-interaction source change is only a UI guard.
- All four intentionally excluded files remain byte-identical and untracked.
  No commits, pushes, merges, deployments, branch changes or backup modifications.
- Physical Xbox hardware verification is **pending**. Browser gamepad input was
  simulated. Mobile checks cover layout/pointer routing; physical touch hardware
  and a comprehensive controller-focus audit remain manual.
- Exhaustive water/vertex/object-transform gestures and all animation clips were
  not replayed in the browser. Relevant data/model/export Node regressions passed.
- Existing separate object/tree/leaf property editors remain. SOUTH retains both
  library controls and its workflow entry buttons; Dev Tools retains its existing
  World actions alongside WEST. Panel-content consolidation and property parity
  are deferred; both viewing modes use the same current implementations.
- `WorkspaceTools.css` remains as an unused legacy stylesheet; the active editor
  shell no longer imports it. Old selector rules also remain in `brand.css`.
  Compass styling/animations, Quick Tools redesign,
  shortcuts, and the explicitly deferred functional bugs remain outside this pass.

Owner review is the next step. Do not proceed to Pass 02A automatically.
