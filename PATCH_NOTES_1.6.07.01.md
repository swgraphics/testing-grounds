# Testing Grounds — Correction Patch 1.6.07.01

Built from the tested **1.6.07** source. This is a correction pass, not an extension of the previous waterfall experiment.

## 1. Water rollback / Draw Water

- Rolled back the river-surface/path geometry and current-direction behavior from the 1.6.07 water additions.
- The world water layer remains the primary water surface.
- **Water Subdivision** remains unchanged and stays in the Dev Tools terrain controls.
- Removed the **CURRENT** tool from the Interaction Panel.
- Renamed the existing river gesture presentation to **DRAW WATER**.
- Draw Water now lowers terrain only; it does not create persistent river geometry/state.
- Draw Water has a visible blue path preview while the user is drawing.
- Increased Draw Water lowering strength and tightened point spacing so fewer passes are needed.
- Existing saved `water.rivers` / `riverPoints` / current data is ignored by the renderer rather than being deleted by this patch, preserving compatibility with older saved worlds.

## 2. Canyon Edge correction

- Canyon Edge now responds to direct click and drag.
- It also responds to Xbox RT + left-stick direction.
- The reticle remains visible whenever Canyon Edge is active.
- The tool operates on the **terrain edit field itself**; it is not limited to the procedurally placed CANYON WALL object. There is no height-gate in the current terrain implementation.
- A click creates a short camera-aligned edge deformation so the tool has a visible action even without a long drag.

## 3. Xbox action contract

- Standard Xbox **Right Trigger (button 7)** is now exposed as `gamepadState.rightTrigger`.
- Terrain HEIGHT / sculpt operations require RT + left-stick input.
- Terrain vertex deformation requires RT + left-stick input.
- Tree editing requires RT + left-stick input.
- Object placement accepts the same RT action contract when no UI panel is open.
- A remains the UI confirm/open action; it is no longer the world-tool action button.

## 4. Xbox UI navigation

- START on the title screen enters the world using the currently selected start mode.
- D-pad navigation works inside open panels/editor containers.
- D-pad up/down in the full Dev Tools menu moves between section headers.
- D-pad left/right on a focused range slider changes its value by its native step.
- A on a Dev Tools section header opens/closes it.
- Holding A on a focused Dev Tools section header locks/unlocks that section.
- Existing keyboard/pointer navigation remains available.

## Verification

- Source was copied from the tested 1.6.07 archive, then patched.
- JavaScript/JSX syntax was checked with the installed TypeScript compiler after patching.
- ZIP integrity was checked.
- A production Vite build is not claimed unless dependencies are available and the build actually completes.
