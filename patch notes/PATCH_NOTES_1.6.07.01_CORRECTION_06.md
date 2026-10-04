# Testing Grounds — 1.6.07.01 Correction Pass 06

## Purpose

Repair Xbox UI navigation by removing the shortcut layer from active use and reducing controller navigation to one simple focus-based system. Rework Canyon Edge around the intended terrain-wall selection/expansion interaction.

## 1. Xbox D-pad navigation — architecture reset

The previous navigator had accumulated three competing behaviors:
- Dev Tools-specific navigation
- generic menu navigation
- Quick Shortcut/D-pad tool activation

Correction 06 removes Quick Shortcuts from the active application UI and from D-pad input handling. The D-pad is now reserved for UI navigation until the later UI overhaul.

The active navigator has two simple rules:

### Dev Tools
- Menu button opens Dev Tools.
- First section header receives focus after React renders the panel.
- D-pad Up/Down moves between section headers.
- A taps the focused header to open/close it.
- Hold A on a header locks/unlocks the section.
- D-pad Down from an open header enters its first control.
- D-pad Up/Down moves through controls in the open section.
- At a section boundary, D-pad returns to that section's header.
- D-pad Left/Right changes a focused range input.

### All other menus
- One spatial focus routine operates on visible buttons, inputs, selects, and tabindex=0 controls inside the active UI root.
- Up/Down/Left/Right chooses the nearest visible control in that direction using its screen position.
- This same routine handles Interaction Panel, Editor View, Object/Mesh menus, and dialogs.
- Editor View therefore gets grid-style D-pad navigation from the actual screen layout instead of a second menu system.

### D-pad compatibility

Standard browser gamepad buttons 12–15 remain the primary Xbox D-pad mapping. A secondary axes[4]/axes[5] fallback supports controller/browser combinations that expose the D-pad as axes.

Keyboard Arrow Keys use the exact same navigation routine as the controller D-pad.

## 2. Shortcuts removed from active use

`QuickInteractionSlots` is no longer rendered by `App.jsx`.

D-pad input no longer activates quick tools, opens the shortcut layer, or assigns shortcut slots. The existing shortcut store definitions remain dormant so the later UI overhaul can replace/remove them cleanly without affecting current tool architecture.

## 3. Canyon Edge — terrain-wall selection/expansion

The previous Canyon Edge behavior was a generic terrain stamp. That did not match the intended tool.

Correction 06 changes the interaction to a terrain-wall operation:

1. The tool samples the terrain height field around the reticle.
2. A sufficiently steep local height transition is treated as a terrain wall.
3. The local gradient establishes:
   - wall normal
   - wall tangent/length direction
4. If the wall continues on both sides of the reticle, the selection is classified as `CENTER`.
5. If the wall continues on only one side, it is classified as `END`.
6. A blue loop-cut preview is drawn across the wall.
7. After selection, moving the cursor previews an expansion along the wall tangent.
8. A second click commits the expansion.
9. The expansion creates a narrow raised wall section with procedural edge variation rather than a circular terrain brush.

The implementation is terrain-based. It does not require a Canyon Wall object.

The wall analysis includes both creator terrain edits and vertex edits when determining the local wall shape.

## 4. Deferred

- Dedicated persistent Canyon Wall selection objects.
- Advanced topology-aware loop-cut data structures.
- Multi-segment procedural canyon profiles.
- Canyon Edge controller gesture refinement beyond the initial RT/tangent expansion support.

## Verification

Source was checked with TypeScript JSX transpilation. Production Vite build remains unverified when dependencies are unavailable.
