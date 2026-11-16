# Decisions, Cautions, and Known Issues

## User-approved decisions

- Task 05.1 supersedes Task 04's explicit WORLD VIEW button: the persistent Compass icon derives orange/white/blue from real navigation, interface and tool state. Orange opens Compass; white or blue safely ends the active interaction and returns directly to clean World View, preserving committed edits. Contextual B/Escape and visibility-only internal transitions still preserve tools where appropriate. Deliberately reopened interfaces show white over a retained tool. Editor View and the expanded radial are exclusive; Menu from Editor first returns to World.
- Task 05.1 panel roles are North = World Editor toolbar, West = World Map, South = Objects Library, East = Dev Tools. Shared PANELS controls work in either layout. West can resize within viewport bounds; existing shortcut preferences migrate old North/West destinations by meaning. Live world Object Edit is nonmodal with focused-control/gesture ownership; Library drafts and leaf editors retain modal behavior.
- Task 05.1 explicitly authorizes committing the completed UI revision, pushing `feat/terrain-export-ui-v2` and verifying its Vercel Preview. It does not authorize production deployment, merging main, changing repository visibility or dependency changes. GitHub metadata showed the repository was already public before this delivery; no visibility change is part of this task.

- Task 05, confirmed in current code: Add Chunk extends the original 600 × 600 metre terrain with adjacent physical tiles using the configured chunk size (normally 100 metres). Legacy named areas remain bookmarks/presets over the original landscape. First expansion adds a versioned shared terrain surface; new tiles, edits, objects and supported Scatter populations persist with the world. Local tile Load/Reset preserves shared edge samples. Terrain Export remains a user-selected rectangle and rejects terrain-free gaps. See the [Task 05 report](UI_UX_REVISION_01_TASK_05.md) for save semantics, browser evidence and limits.
- 2026-11-15 owner review: Task 03 is locally validated pending physical Xbox review. Carry its existing changes into Task 04; this does not claim physical controller validation.
- Task 04 presentation, confirmed in current code and local browser acceptance: World View uses a full-bleed world with optional panel overlays; Editor View retains its structured docked arrangement of the same four shared panels; Compass is a HUD navigation overlay over the world. Panel independence and shared state remain. See the [Task 04 report](UI_UX_REVISION_01_TASK_04.md).
- Task 04 Back behavior supersedes the earlier Task 08.01 Compass-dismissal rule: B/Escape/BACK returns through secondary menus, then closes Compass at the root while preserving panels. Auxiliary focus first returns to the radial group; shortcut assignment first cancels. Explicit WORLD VIEW still closes panels without clearing the active tool. Physical Xbox review remains pending.
- The [combined Task 04 prompt](UI_UX_REVISION_01_TASK_04_PROMPT.md) contains the owner addendum first and the original prompt intact. The addendum takes priority for conflicting visual/layout requirements in Stage A; the existing Quick Tools and Shortcuts stages remain. Add Chunk terrain/world work is reserved for Task 05.

- UI/UX Revision 01, Pass 01.1 supersedes Pass 01's exclusive panel counts: World View starts with none open, Editor View starts with all four, and either starting layout permits any independent combination. Collapsing the last panel returns to clean World View with no edge tabs. Panel visibility preserves tools and settings. Escape/B during Library-origin object placement returns directly to the Library; other placement origins retain cancellation without assuming the Library.
- Task 08.01: World View is the primary editing surface; tool selection/settings and optional panel visibility are independent. Closing panels must preserve the active tool. Its earlier Compass dismissal/Parent behavior is superseded by Task 04 above.
- TG product direction distinguishes loading a World from loading a Project; a Project may include custom UI, menus, and game logic.
- Terrain Export v1 is a user-defined terrain region, surface only, portable material, primarily GLB; source world unchanged; committed terrain sculpt/vertex edits included; preview effects excluded.
- Research or discussion is not authorization to publish, deploy, push, or take financial action.

## Historical cautions — recheck current code
- Player-controller changes previously broke intro camera/player movement; the user restored `PlayerController.jsx`. Avoid unrelated edits there.
- Canyon Edge was intended to act like a loop cut when aiming at a terrain wall's center and like an edge operation when aiming at its end. A previous version behaved more like localized Object Canyon Wall deformation.
- CloudField's earlier Fluid Lab emitter was preferred over a later cloud-cage effect; desired behavior is billowing/flowing vapor, not isolated spots.
- Ultra-Water was previously researched as an ocean-rendering reference, not confirmed as a drop-in river/waterfall editor. No full source audit was established.

## Terrain-export caution
A historical terrain-height path may include geology-preview deltas alongside committed edits. Verify the current call graph and create/use committed-only sampling if needed. App-specific save serialization is not the same as portable export.

## Confidence labels for future notes
Use: Confirmed in current code; User-approved decision; Historical note; Proposal; or Unverified.
