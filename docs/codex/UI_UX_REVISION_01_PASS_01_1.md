# Testing Grounds Change Report — UI/UX Revision 01, Pass 01.1

2026-11-14. Worktree: `D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`.
Branch: `feat/terrain-export-ui-v2`; HEAD remains `93d513c`. All prior Pass 01
work is retained. Pass 01.1 implementation and automated validation are complete.
Physical Xbox verification remains pending. Stop here for owner review before
Pass 02A or Pass 02B.

The interface still has four shared panel components. World View and Editor View
now define starting visibility, rather than enforcing panel counts. No hybrid
mode or separate editing implementation was introduced.

| Starting action | Initial visibility | Subsequent behavior |
| --- | --- | --- |
| World View | All closed | Compass toggles any combination independently |
| Editor View | All four open | Each panel can collapse or reopen independently |
| Collapse final open panel | All closed | Returns to clean World View; all [+] tabs disappear |

`editorStore.visiblePanels` holds one shared boolean map. `openPanel`,
`closePanel`, `togglePanel`, `openAllPanels` and `closeAllPanels` operate on it.
The existing `open`/`close` entry points remain compatible with existing callers.
The exclusive `activeDirection` state was removed.

The same `DirectionalPanelLayout` and component registry render both starting
layouts. Content remains mounted behind native `hidden` panels when collapsed;
Dev Tools, Library selection/page/scroll, map presentation and other local editor
state survive visibility changes. No second copy of panel controls or feature
state is created.

Each expanded panel has a compact [−] control. A collapsed panel leaves a [+]
tab at its edge while any panel remains open. Collapse moves focus to its tab;
reopen moves focus back to its collapse control. Both actions preserve active
tools. The canvas and panel grid derive their region sizes from the same shared
visibility map, so hidden panels give space back to the world. The small tab
region remains available for reopening; clean World View reserves no tab space.

Panel headings now contain only their actual names: **WORLD // MAP**,
**OBJECTS // LIBRARY**, **WORLD EDITOR**, and **DEV TOOLS**. Direction identifiers
remain internal to the store, grid and Compass routing.

Library-origin placement now has a contextual return path:

1. Selecting an object or starting Place from the Library records `south` as
   transient navigation metadata on the existing placement request.
2. The Library controller retains the selected object and page, and records the
   browsing section and scroll position before hiding the interface.
3. Escape, Xbox B or **BACK TO LIBRARY** cancels the preview through the existing
   cancellation event, clears gameplay input and restores the Library directly.
4. The selected card regains controller/keyboard focus without scrolling away
   from the remembered browsing position. A different object can be chosen
   immediately. The following Back closes the focused Library panel.
5. Placement requests from other sources carry no Library origin and use normal
   cancellation. Raw Library-origin cancellation, including the existing mouse
   context-menu route, also restores the Library.

Xbox B is handled before world placement input. A simultaneous B/RT edge is
consumed during the return transition. No placement geometry, object transforms,
undo implementation, object schema or saved-world format was changed.

Incremental files changed from the completed Pass 01 working state:

| Files | Purpose |
| --- | --- |
| `src/systems/editor/editorStore.js` | Independent shared visibility and derived region sizes |
| `src/systems/ui/navigationStore.js` | Transient placement-origin metadata |
| `src/systems/ui/navigationActions.js` | Independent Compass toggles, contextual placement Back and Library restore requests |
| `src/App.jsx` | Visibility-driven canvas size; contextual Escape and placement-origin tracking |
| `src/components/ui/DirectionalPanels.jsx`, `DirectionalPanels.css` | Mounted shared content, [−]/[+] controls, removed direction headings and expanding center |
| `src/components/ui/EditorView.jsx`, `EditorPanelControls.jsx` | Shared visibility rendering and contextual Back feedback |
| `src/components/ui/MeshMenu.jsx` | Retained browsing section/page/selection/scroll and selected-card focus restoration |
| `src/components/ui/GamepadMenuNavigator.jsx` | World-placement B handling and safe input transition |
| `src/components/ui/NavigationShell.jsx` | Help text for independent panels and contextual placement Back |
| `scripts/test-world-first-tools.mjs` | All 16 combinations from both presets, retained tool state and origin-sensitive cancellation |
| `scripts/browser-world-first-tools.mjs` | Native panel/placement/controller acceptance tests, custom-tree fixture and screenshots |
| `scripts/browser-demo-stability.mjs` | Canonical Library selector for existing placement/drag regressions; optional test URL |
| `docs/codex/DECISIONS_AND_KNOWN_ISSUES.md` | Confirmed owner correction to the panel model |
| `docs/codex/UI_UX_REVISION_01_PASS_01.md` | Historical-report supersession note |
| `docs/codex/UI_UX_REVISION_01_PASS_01_1.md` | This report |

Observed validation:

| Exact command/check | Result |
| --- | --- |
| `npm.cmd run build` | PASS on final application source; existing bundle-size/plugin-timing warnings remain |
| `node scripts/test-ui-navigation.mjs` | PASS: root routing, input contexts, analog hysteresis and neutral handoff |
| `node scripts/test-world-first-tools.mjs` | PASS: all 16 combinations from both presets, independent toggles, tool/settings retention and contextual cancellation |
| `node scripts/test-terrain-export.mjs` | PASS: committed sampling, GLB round-trip and cleanup |
| `node scripts/test-forest-renderer.mjs` | PASS: leaf transforms/outlines, bounds, shapes and palette overrides |
| `node scripts/test-crash-tester.mjs` | PASS: model/skeleton/textures/fallbacks and animation actions |
| `node scripts/test-demo-stability.mjs` | PASS: persistence and object-history isolation |
| `node scripts/browser-ui-smoke.mjs --url=http://127.0.0.1:5182/ --panel-focus` | PASS: mouse collapse and native Enter restore for all four edge controls, with correct focus |
| `node scripts/browser-ui-smoke.mjs --url=http://127.0.0.1:5182/` | PASS: all ten check groups; zero console errors and HTTP failures |
| Targeted `browser-demo-stability.mjs` command below | PASS: all six selected regressions; zero console errors and HTTP failures |
| `npm.cmd run lint -- --format json --output-file ui-revision-01-1.local/lint-after.json` | FAIL at existing lint debt: 59 errors, 29 warnings; baseline was 60 errors, 29 warnings. No added diagnostics |
| `git -c core.safecrlf=false diff --check` | PASS |
| SHA-256 comparison of the four excluded files | PASS: all unchanged |
| Comparison of six unrelated Pass 01 patches with the captured starting diff | PASS: retained exactly |

The targeted regression command was:

```powershell
node scripts/browser-demo-stability.mjs 'World map|Area rename|Chunk save|Help dialog|Saved title|Object placement' --url=http://127.0.0.1:5182/
```

Its object case verifies real placement, native dragging with unchanged grounding,
Undo/Redo, rotation, scale and save/load. The other cases verify Add Chunk, rename
cancellation, chunk save/load/reset, Help input ownership and saved-title loading.

The shared browser suite retains the title, map, direct terrain tools, central
sculpting, Undo/Redo, live settings, GLB download, actual object placement,
Scatter, save/load, compact layouts, movement and camera checks. It adds native
panel collapse/restore and viewport growth; mounted-content identity checks;
repeated simulated Xbox combinations and tab navigation; custom-tree placement
from Library page two; Escape/B/mouse return; selection/page/scroll/focus
restoration; immediate object switching; simultaneous B/RT safety; and cancellation
from an external placement source. Test trees are generated with the existing
saved-object API inside an isolated Chrome profile.

Screenshot evidence, generated locally and ignored by Git:

| Capture | File |
| --- | --- |
| Clean World View | [02-world-clean.png](../../ui-revision-01-1.local/02-world-clean.png) |
| Compass | [03-compass.png](../../ui-revision-01-1.local/03-compass.png) |
| Two panels | [04-two-panels.png](../../ui-revision-01-1.local/04-two-panels.png) |
| Three panels | [05-three-panels.png](../../ui-revision-01-1.local/05-three-panels.png) |
| Full Editor View | [06-editor-full.png](../../ui-revision-01-1.local/06-editor-full.png) |
| Collapsed / reopened | [07-editor-collapsed.png](../../ui-revision-01-1.local/07-editor-collapsed.png), [08-editor-reopened.png](../../ui-revision-01-1.local/08-editor-reopened.png) |
| Object Placement / direct Library return | [09-object-placement.png](../../ui-revision-01-1.local/09-object-placement.png), [10-returned-library.png](../../ui-revision-01-1.local/10-returned-library.png) |
| Compact / mobile dimensions | [11-editor-640.png](../../ui-revision-01-1.local/11-editor-640.png), [12-editor-mobile.png](../../ui-revision-01-1.local/12-editor-mobile.png) |

[Latest browser results](../../ui-revision-01-1.local/browser-results.json) are
authoritative; older failure captures may remain in the artifact directory.
Pass 01's earlier evidence remains in its original artifact directory.

Additional machine-readable evidence:
[targeted regressions](../../task-12-qa.local/browser-World_map_Area_rename_Chunk_save_Help_dialog_Saved_title_Object_placement/results.json),
[lint comparison](../../ui-revision-01-1.local/lint-comparison.json),
[excluded-file comparison](../../ui-revision-01-1.local/excluded-comparison.json), and
[Pass 01 preservation comparison](../../ui-revision-01-1.local/pass-01-preservation.json).

The isolated validation server used port 5182. The browser harness now supports
an explicit `--url=` option, waits for live scene frames before entering the world,
and sends Enter's character event as well as its key events. Those readiness and
input-fixture corrections were made after observed automation failures; they do
not change application behavior. Older failure screenshots remain unlinked.

Preservation and limits:

- Character movement, physics, terrain/tree generation, placement geometry,
  transforms, history, persistence formats, title composition and dependency
  manifests retain their existing implementations. No dependencies were added.
- Physical Xbox and physical touch verification remain **pending**. Controller
  checks use simulated standard-mapping Xbox input; mobile checks cover layout
  and pointer routing. No performance benchmark is claimed.
- Broader panel-content consolidation, object/tree property parity, Compass
  visual redesign, Quick Tools, shortcuts and the other deferred bugs remain
  outside this pass. Existing separate object/tree/leaf editors are retained.
- The four excluded files remain outside the change set. No commits, pushes,
  merges, deployments, branch changes or designated-backup modifications.

Stop for owner review before Pass 02A or Pass 02B.
