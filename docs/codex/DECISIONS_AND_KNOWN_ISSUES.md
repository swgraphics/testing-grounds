# Decisions, Cautions, and Known Issues

## User-approved decisions

- UI/UX Revision 01, Pass 01.1 supersedes Pass 01's exclusive panel counts: World View starts with none open, Editor View starts with all four, and either starting layout permits any independent combination. Collapsing the last panel returns to clean World View with no edge tabs. Panel visibility preserves tools and settings. Escape/B during Library-origin object placement returns directly to the Library; other placement origins retain cancellation without assuming the Library.
- Task 08.01: World View is the primary editing surface; tool selection/settings and optional panel visibility are independent. Closing panels must preserve the active tool. B/Escape dismisses the compass to World View; Parent is a separate navigation action.
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
