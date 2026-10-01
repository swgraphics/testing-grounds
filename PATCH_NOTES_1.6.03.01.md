# Testing Grounds 1.6.03.01 — Tree interaction + controller integration

Built from the passed **1.6.02.02** source snapshot.

## Included

### Crimson Tree branch interaction
- Added explicit TRUNK / BRANCHES / LEAVES interaction domains.
- Branch mode can anchor a new branch directly on the trunk.
- Pointer movement previews/extrudes the anchored branch.
- Second click commits the branch segment without leaving Tree Edit.
- ESC backs out of the current branch draft or exits Tree Edit.
- Existing procedural branch taper now respects the branch taper control.
- Secondary branch generation continues to follow the existing procedural definition.

### Crimson Tree leaves + vertex foundation
- Added canonical leaf vertex offsets to the procedural tree definition.
- Leaf geometry is regenerated from those offsets rather than destructively modifying instances.
- Leaf interaction recognizes a canonical leaf vertex and supports direct drag editing.
- The same leaf editing foundation is available to the Object Editor preview.
- Existing leaf size/density controls remain procedural.

### Tree recognition / UI
- Adaptive Tree reticle now communicates TRUNK / BRANCHES / LEAVES as the available domains before entering Tree Edit.
- Tree interaction HUD uses `OBJECT // TREE`.
- Blue remains reserved for active interaction.

### Shortcut panel / D-pad behavior
- Added a dedicated SHORTCUTS button.
- Shortcut panel is hidden by default and does not permanently occupy screen space.
- When SHORTCUTS is open, D-pad selects the assigned shortcut.
- When SHORTCUTS is closed and another panel is open, D-pad navigates that panel.
- When no panel is open, D-pad no longer silently activates the old quick-tool assignments.
- Added ADD TO SHORTCUT flow for the currently active tool/object state.

### Xbox controls
- VIEW button opens the World Editor.
- MENU button opens/toggles the modular Dev Tools panel.

### Crash Tester movement
- Reduced Crash Tester turn velocity multiplier to damp rapid left/right facing oscillation while walking/sprinting.

## Intentionally not included in this patch
- Full tree persistence/scatter architecture (1.6.04).
- Undo / Redo (1.6.05).
- Generalized Scatter (1.6.06).
- Object rotation widget / universal block collision layer (1.6.07).
- Canyon edge extrusion/expansion (1.6.08).

## Verification
- Source was taken from the Library's exact `Testing-Grounds-1.6.02.02.zip` snapshot.
- A production Vite build could not be run in the isolated environment because dependency installation timed out and the local Vite binary was unavailable afterward.
- Local browser/controller testing remains authoritative.
