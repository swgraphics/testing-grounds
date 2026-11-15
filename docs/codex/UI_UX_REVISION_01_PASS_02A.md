# Testing Grounds Change Report — UI/UX Revision 01, Pass 02A

2026-11-14. Worktree: `D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`.
Branch: `feat/terrain-export-ui-v2`; HEAD remains `93d513c`.
Pass 02A implementation and automated validation are complete. Physical Xbox
verification remains pending. Stop for owner review before Pass 02B.

## Result and scope

The four existing shared panels now have organized content and responsive region
sizes. The Object Library fills the bottom region with a horizontal gallery.
Editor View has a compact PANELS disclosure in the top header. Existing feature
handlers, shared settings and independent visibility remain in place.

**One interface. Two starting views. Four independently configurable panels.**

World View starts with all panels closed and the Compass as its only persistent
interface button. Editor View starts with all four open. Either starting view
allows any subsequent combination. Opening a panel does not close another.
Closing the last panel removes all edge tabs and returns the full canvas area.
The Compass remains the gateway, including when the top panel is hidden.

This pass extends the completed Pass 01.1 architecture. Its earlier references
to Library pages describe the previous presentation; this pass replaces that
presentation with continuous horizontal browsing.

## Panel organization

| Region | Visible title | Organization |
| --- | --- | --- |
| Top | WORLD // MAP | Compact mini-map beside teleport destinations, area navigation/World Guides, and grouped chunk management |
| Bottom | OBJECTS // LIBRARY | Library/Scatter/Animation entry points, compact object actions, full-width horizontal gallery, selection and concise upload/placement guidance |
| Left | WORLD EDITOR | World save/load and Undo/Redo; disabled Project actions marked PLANNED; Terrain Export, Help/Controls and existing Terrain Tools |
| Right | DEV TOOLS | The canonical CHARACTER, TERRAIN, CAMERA, PHYSICS, ATMOSPHERE, WORLD and MATERIALS interface, with internal vertical scrolling |

Panel headings display actual titles without cardinal direction text. Directions
remain internal routing concepts. Map, teleport, chunk operations, direct
World-first tools, export, Help and existing object workflows retain their
handlers. World Guides moved to the map navigation group.

PANELS appears only in the Editor starting layout's top header. Its show/hide
buttons use the existing registry and `editorStore.visiblePanels`; World View
closes all panels through the existing action. Escape closes the disclosure and
returns focus to its summary. Hiding the top panel leaves the Compass and its
existing edge tab available. The disclosure is contained inside the top panel.

The Library no longer shares its width with a descriptive sidebar or six-item
pagination. All objects occupy one horizontally scrollable row. Native scroll,
named previous/next scroll buttons and keyboard focus can reach distant cards.
Cards keep existing names, selection, rename/delete and selection handlers.
Upload, Place, Edit and Add to Scatter stay alongside the gallery. Scatter and
Animation retain their current functional entry points and contextual views.

Library-origin placement still returns directly through Escape, simulated Xbox B
or BACK TO LIBRARY. It retains selected object, browsing mode, vertical scroll,
horizontal gallery position and selected-card focus. Immediate object switching
and the simultaneous B/RT safety behavior remain intact. Other placement
origins retain normal cancellation. GLB-only uploads and accurate session-only
feedback are preserved; no upload persistence was added.

## Shared state and implementation

Both starting views use the same mounted `DirectionalPanelLayout`, panel
registry, Library portal and Dev Tools portal. Hidden panels retain their
components and local state. Settings, object selection, tools and panel flags
are shared. Region sizes for the panel grid and canvas still derive from the
same visibility map. Collapsing a region releases its occupied size to the
world, retaining only the compact reopening tab while other panels remain open.

Dev Tools changes are limited to width containment and label/value wrapping.
Its settings, values, handlers, colors, typography and slider presentation are
retained. Project Load/Save entries are disabled and explicitly planned. No
Project implementation or world-save schema change was introduced.

Incremental files changed from the starting Pass 01.1 working state:

| File | Purpose |
| --- | --- |
| `src/components/ui/DirectionalPanels.jsx` | Grouped panel contents, shared Editor PANELS disclosure and compact South entry points |
| `src/components/ui/DirectionalPanels.css` | Responsive region sizing, full-width gallery, contained Dev Tools and compact controls |
| `src/components/ui/MeshMenu.jsx` | Continuous gallery, native scroll actions, horizontal-position restoration and concise feedback |
| `src/App.jsx` | Escape dismissal/focus restoration for the PANELS disclosure |
| `src/systems/ui/navigationActions.js` | Initial panel focus filters hidden disclosure controls; preserves the North World View entry focus |
| `scripts/browser-world-first-tools.mjs` | Layout/responsive evidence, real horizontal browsing/return regressions, settled captures and asynchronous canvas-resize readiness |
| `scripts/browser-demo-stability.mjs` | Wait for fresh world frames after title entry and visible map controls before exercising the existing regressions |
| `docs/codex/UI_UX_REVISION_01_PASS_02A.md` | This report |

The browser smoke/regression aliases share this harness. Test custom objects are
created through the existing saved-object API in isolated Chrome profiles. No
application data or production fixtures are changed. Pass 02A evidence uses a
new ignored artifact directory, preserving earlier passes' evidence.

## Preservation and deferred work

- All four excluded files match their starting SHA-256 hashes:
  `TG_CODEX_TASK_07.md`, `public/images/TG_ICON (1).svg`,
  `src/components/ui/TitleMedia.jsx`, `src/config/titleMedia.js`.
- Fourteen unrelated pre-existing tracked patches match the captured starting
  diff exactly. Existing Pass 01/01.1 work is retained.
- Player/controller algorithms, intro camera, physics, generation, placement
  geometry/transforms, history, persistence formats, title composition and
  dependency manifests retain their existing implementations.
- **Pass 02B:** full Add New Mesh/Object Menu/Edit/Scatter/Animation consolidation
  and object/tree property parity remain deferred. Existing separate editors
  and world rotation/scale controls remain accessible.
- **Pass 03A:** comprehensive Full Editor Xbox focus work remains deferred.
  Existing spatial navigation can move from a gallery card into a nearby
  toolbar row. Native Tab/Shift+Tab reaches far-end gallery controls and scrolls
  them into view. No controller mappings were added or refactored.
- **Pass 03B:** Add Chunk terrain visibility is **not repaired by this pass**.
  Tests verify the existing dialog, chunk creation and saved data, not the
  reported terrain-rendering issue.
- Compass redesign, Quick Tools, shortcuts, white Special Gothic Dev Tools
  headers, reduced orange, slider restyling, compact Crash Tester arrows and
  FPV Speed correction remain assigned to later passes.
- Physical Xbox and real touch testing remain unverified. Automated controller
  tests use simulated standard-mapping input; mobile tests cover layout and
  pointer routing. No performance benchmark is claimed.
- No dependencies, commits, pushes, merges, deployments, branch changes or
  designated-backup modifications.

## Validation evidence

| Exact command/check | Observed result |
| --- | --- |
| `npm.cmd run build` | PASS on final application source; existing bundle-size and plugin-timing warnings |
| `node scripts/test-ui-navigation.mjs` | PASS: routing, input contexts, analog hysteresis and neutral handoff |
| `node scripts/test-world-first-tools.mjs` | PASS: all 16 visibility combinations from both presets, tool retention and origin-sensitive Back |
| `node scripts/test-terrain-export.mjs` | PASS: committed sampling, real GLB round-trip and cleanup |
| `node scripts/test-forest-renderer.mjs` | PASS: transforms, outlines, bounds, shapes and palettes |
| `node scripts/test-crash-tester.mjs` | PASS: model/skeleton/textures/fallbacks and 106 animation actions |
| `node scripts/test-demo-stability.mjs` | PASS: persistence and object-history isolation |
| `node scripts/browser-ui-smoke.mjs --url=http://127.0.0.1:5183/ --panel-layout` | PASS on final application source: four check groups, zero console errors/HTTP failures |
| `node scripts/browser-ui-smoke.mjs --url=http://127.0.0.1:5183/` | PASS on final application source: all ten groups, zero console errors/HTTP failures |
| Targeted `browser-demo-stability.mjs` command below | PASS on final application source: all eight cases, zero console errors/HTTP failures |
| `npm.cmd run lint -- --format json --output-file ui-revision-02a.local/lint-after.json` | FAIL at existing debt: 58 errors, 29 warnings; starting baseline 59 errors, 29 warnings; no added diagnostics |
| `node --check scripts/browser-world-first-tools.mjs` | PASS |
| `node --check scripts/browser-demo-stability.mjs` | PASS |
| `git -c core.safecrlf=false diff --check` | PASS |
| Excluded-file SHA-256 comparison | PASS: all four unchanged |

The six Node suites ran after the application logic changes. Subsequent
application adjustments were CSS spacing/containment and presentation text.

All four panels were expanded for the following measurements; canvas sizes are
rounded CSS pixels. No panel overlap, unintended horizontal panel overflow or
Dev Tools control clipping was found. Gallery cards and their horizontal
scrollbar fit fully in view at the tested desktop sizes. Smaller/mobile content
retains internal scrolling rather than requiring full-size panels.

| Viewport | Central canvas | Pointer access |
| --- | --- | --- |
| 1920 × 1080 | 1308 × 523 | PASS |
| 1440 × 900 | 828 × 418 | PASS |
| 1280 × 720 | 723 × 293 | PASS |
| 960 × 720 | 478 × 293 | PASS |
| 640 × 800 | 248 × 373 | PASS |
| 390 × 844 | 124 × 448 | PASS |

Only the existing 900px, 500px and short-height responsive breakpoints are used.
Actual world sculpting was verified with two, three and four panels visible.
The layout tests also verify the Editor PANELS flags, Escape dismissal, Compass
recovery after hiding the top panel, canonical Dev Tools sections, planned
Project entries, gallery width/scrolling and far-end keyboard reachability.
The gallery test profile contains 96 existing/fixture objects, including 18
custom trees created through the saved-object API.

The targeted regression command was:

```powershell
node scripts/browser-demo-stability.mjs 'World map|Area rename|Chunk save|Help dialog|Saved title|Object placement|Unsupported uploads|Local GLB' --url=http://127.0.0.1:5183/
```

It verifies Add Chunk's existing creation flow, rename cancellation, chunk
save/load/reset, Help input ownership, saved-title loading, native object drag
and grounding, Undo/Redo, rotation/scale persistence, unsupported-upload
feedback, and actual GLB import/placement with session-only metadata.

The first additional regression run reached the interface before fresh world
frames had rendered, causing cascading failures. Its title-frame counter could
already satisfy the world-readiness condition. The harness now resets a world
frame counter after title entry, waits for fresh live frames and confirms the
map panel is visible before use. The corrected rerun passed all eight cases;
no application operation was changed for these test failures.

The full interaction smoke passed all ten groups again on the final layout.
It verifies native Compass/Editor navigation, independent collapse and keyboard
restore, shared DOM/settings identity, live central sculpting and Undo/Redo,
real terrain GLB download and preview cleanup, actual placement, Scatter,
save/load, desktop/mobile pointer access, movement/camera and default/Blank
Canvas title entry.

Simulated Xbox checks passed Menu, D-pad, analog selection, A confirmation,
B dismissal, independent combinations, edge-tab restoration and neutral input
handoff. Placement tests passed Escape/B/mouse Back, retained selection and
horizontal/vertical scroll, immediate object switching, external-source
cancellation and simultaneous B/RT without accidental placement/history edits.
The broader spatial focus limitation described above remains assigned to 03A.

## Screenshot index

All captures are actual browser screenshots, generated locally and ignored by
Git. The clean capture waits for the existing discovery banner/camera transition
to settle. The fixture object count is specific to the isolated test profile.

| Capture | File |
| --- | --- |
| Clean World View | [01-clean-world.png](../../ui-revision-02a.local/layout/01-clean-world.png) |
| WORLD // MAP alone | [02-north.png](../../ui-revision-02a.local/layout/02-north.png) |
| OBJECTS // LIBRARY alone | [03-south.png](../../ui-revision-02a.local/layout/03-south.png) |
| WORLD EDITOR alone | [04-west.png](../../ui-revision-02a.local/layout/04-west.png) |
| DEV TOOLS alone | [05-east.png](../../ui-revision-02a.local/layout/05-east.png) |
| Two panels | [06-two-panels.png](../../ui-revision-02a.local/layout/06-two-panels.png) |
| Three panels | [07-three-panels.png](../../ui-revision-02a.local/layout/07-three-panels.png) |
| Four panels | [08-four-panels.png](../../ui-revision-02a.local/layout/08-four-panels.png) |
| Editor PANELS disclosure | [08a-panels-control.png](../../ui-revision-02a.local/layout/08a-panels-control.png) |
| Collapsed panel | [09-collapsed-panel.png](../../ui-revision-02a.local/layout/09-collapsed-panel.png) |
| Editor 1920 × 1080 | [editor-1920x1080.png](../../ui-revision-02a.local/layout/editor-1920x1080.png) |
| Editor 1440 × 900 | [editor-1440x900.png](../../ui-revision-02a.local/layout/editor-1440x900.png) |
| Editor 1280 × 720 | [editor-1280x720.png](../../ui-revision-02a.local/layout/editor-1280x720.png) |
| Narrow desktop 960 × 720 | [editor-960x720.png](../../ui-revision-02a.local/layout/editor-960x720.png) |
| Compact/mobile dimensions | [editor-640x800.png](../../ui-revision-02a.local/layout/editor-640x800.png), [editor-390x844.png](../../ui-revision-02a.local/layout/editor-390x844.png) |
| Placement / direct Library return | [09-object-placement.png](../../ui-revision-02a.local/09-object-placement.png), [10-returned-library.png](../../ui-revision-02a.local/10-returned-library.png) |

Machine-readable evidence:
[layout results](../../ui-revision-02a.local/layout/layout-results.json),
[full interaction results](../../ui-revision-02a.local/browser-results.json),
[targeted regressions](../../task-12-qa.local/browser-World_map_Area_rename_Chunk_save_Help_dialog_Saved_title_Object_placement_Unsupported_uploads_Local_GLB/results.json),
[lint comparison](../../ui-revision-02a.local/lint-comparison.json),
[excluded files](../../ui-revision-02a.local/excluded-comparison.json), and
[prior-patch preservation](../../ui-revision-02a.local/pass-01-1-preservation.json).

The linked JSON files record the final runs. Older failure captures remain
unlinked in the artifact directories; earlier passes' reports/evidence are
preserved. Validation used the local Vite server on port 5183.

Pass 02A is complete and stopped for owner review. Do not begin Pass 02B or later
passes automatically. No commit, push, merge or deployment was performed.
