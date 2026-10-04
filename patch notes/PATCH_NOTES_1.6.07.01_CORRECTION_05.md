# Testing Grounds 1.6.07.01 — Correction Pass 05

## Dev Tools Xbox navigation
- DEV TOOLS now owns the D-pad whenever the full Dev Tools menu is open.
- Opening Dev Tools explicitly closes shortcut mode so D-pad input cannot remain routed to shortcuts.
- D-pad Up/Down continues to navigate section headers.
- Opening a section with A and pressing Down enters that section's controls.
- Left/Right adjusts focused range sliders.

## Canyon Edge runtime fix
The previous correction passes changed the deformation function but missed the actual tool identifier conversion in InteractionPanel. `terrain-canyon-edge` was being converted to `CANYON-EDGE`, while WorldInteractionSystem listens for `CANYON_EDGE`. The tool therefore never entered the Canyon Edge code path.

The selector now explicitly maps `terrain-canyon-edge` → `CANYON_EDGE`. The existing Canyon Edge terrain deformation implementation is retained.
