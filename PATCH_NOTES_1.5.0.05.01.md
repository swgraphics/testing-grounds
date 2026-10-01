# Testing Grounds 1.5.0.05.01 — Sun Control Restoration

## Purpose
Restore the previously approved Adaptive Reticle Sun interaction that regressed during the 1.5.0 world-construction overhaul.

## Restored behavior
- Adaptive Reticle recognizes when the camera is pointing at the Sun.
- Sun acquisition uses an expanded sky-control region so the Sun is easier to acquire naturally.
- The Sun reticle remains usable while the user drags the Sun through the sky; leaving the original Sun disc does not cancel an active drag.
- Mouse Sun manipulation is available whenever the Adaptive Reticle has recognized the Sun; selecting SUN in the Interaction Panel is not required.
- Controller Left Stick Sun manipulation is available whenever the Adaptive Reticle has recognized the Sun; selecting SUN in the Interaction Panel is not required.
- Selecting SUN in the Interaction Panel remains supported and continues to provide the dedicated Sun-control state, including control when the physical Sun is not directly targeted.
- Sun icon uses `mix-blend-mode: difference` so the white reticle remains legible over the bright/white Sun and darkens against a light background.
- Existing Sun height and rotation controls remain unchanged.

## Important distinction
The Interaction Panel SUN tool remains available as an explicit/manual Sun-control mode. It is no longer the gate that determines whether the Adaptive Reticle can interact with the Sun.

## Version
1.5.0.05.01

## Verification
Changed JavaScript files were syntax-checked. A production Vite build was not run because the development archive intentionally excludes `node_modules` and `public`.
