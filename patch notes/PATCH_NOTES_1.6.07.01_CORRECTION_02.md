# Testing Grounds — Correction Patch 1.6.07.01 / Pass 02

This pass responds to browser/controller testing feedback from the first 1.6.07.01 correction patch.

## 1. DRAW WATER / RIVER — two-point terrain path

The tool is now a two-tap interaction instead of continuous painting.

1. Activate DRAW WATER.
2. Aim at terrain with the mouse cursor / reticle.
3. First mouse click or Xbox Right Trigger tap locks an anchor point.
4. A blue sphere marks the anchor.
5. Move the mouse or aim with the Xbox right stick.
6. A thick blue line connects the anchor to the current cursor/reticle point.
7. The line is sampled against the terrain height so it visually follows the terrain surface.
8. Second mouse click or Right Trigger tap commits the path.
9. The terrain is lowered along the entire anchor-to-final-point path in one edit transaction.

The existing underlying water layer remains the only water surface. No river mesh, current field, or persistent river path is created.

Water Subdivision remains unchanged.

## 2. CANYON EDGE

The Canyon Edge tool now has an explicit active reticle treatment and a stronger terrain deformation profile.

- Mouse click creates a visible canyon-edge deformation immediately.
- Dragging continues the deformation.
- Xbox RT + left-stick input continues the controller action contract.
- The deformation works on terrain directly; it is not limited to placed Canyon Wall geometry and does not require a minimum terrain height.
- The previous short/weak click profile was replaced with a longer, stronger edge stamp so the result is visually obvious.

## 3. XBOX ACTION BUTTON

Right Trigger remains the universal world ACTION button.

- Held RT = continuous action for tools that use continuous manipulation.
- DRAW WATER uses RT as a discrete two-tap action: first tap = anchor, second tap = commit.
- Added an explicit `rightTriggerPressed` edge state so discrete RT actions do not need to infer a tap from the held state.

## 4. XBOX UI NAVIGATION

- Gamepad navigator is now mounted while the title screen is visible, allowing START to trigger ENTER WORLD.
- D-pad navigation is constrained to the currently open panel/editor rather than jumping to unrelated UI outside that scope.
- Dev Tools full-menu section headers are navigated vertically with D-pad up/down.
- When a Dev Tools section is open, A tap opens/closes the section and moves focus to its first slider when available.
- Holding A on a section header triggers the existing section-lock behavior.
- D-pad left/right adjusts focused range sliders.
- Compact Dev Tools section buttons are navigated vertically with D-pad up/down.

## Verification

- 79 JS/JSX source files transpile with zero TypeScript diagnostics.
- No production Vite build is claimed because the snapshot does not contain installed `node_modules` / Vite.
- Browser/controller testing remains the authoritative verification step.
