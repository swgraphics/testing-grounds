# Testing Grounds 1.6.07.01 — Correction Pass 03

## 1. Canyon Edge — rebuilt
- Replaced the previous narrow edge calculation with a larger terrain-grid stamp.
- A mouse click now creates an immediately visible canyon edge aligned to the camera direction.
- Dragging creates/extends the edge along the drag axis.
- One side raises into a shoulder; the opposite side lowers into a canyon.
- Works on ordinary terrain and is not restricted to Canyon Wall geometry.

## 2. Dev Tools Xbox navigation
- D-pad Up/Down still navigates Dev Tools section headers.
- When an open header is focused, D-pad Down enters its controls.
- D-pad Up/Down then navigates controls inside that section; section boundaries move to adjacent headers.
- D-pad Left/Right adjusts focused range sliders.
- A tap toggles the focused section.
- Holding A locks/unlocks the focused section.

## 3. Vertex Edit controller interaction
- A selects the vertex under the reticle.
- Holding LT while pressing A toggles/adds the vertex to the selection, replacing Shift/Ctrl for controller multi-select.
- RT remains the ACTION button for moving selected vertices with the Left Stick.
- B undoes the most recent VERTEX EDIT history command.
- Controller vertex movement is now recorded as a single history transaction per RT hold.
- Mouse Shift/Ctrl/Command selection behavior remains intact.

## Verification
- Source patched from the tested 1.6.07.01 correction source.
- Production Vite build not claimed because dependencies are not installed in the archive.
