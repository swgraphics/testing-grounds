# Testing Grounds 1.6.06 — Canyon Edge Extrusion / Expansion

## Focus
A direct terrain interaction for creating and expanding canyon edges procedurally from a cursor drag.

## Included
- Added `CANYON_EDGE` as a direct Terrain Control tool.
- A drag defines the canyon axis instead of using a circular terrain brush.
- One side of the dragged edge is procedurally extruded upward into a canyon shoulder.
- The opposite side is procedurally recessed downward into the canyon.
- Edge profile is sharp near the centerline and softer farther from the edge.
- Deterministic irregularity adds variation to the edge rather than producing a perfectly straight wall.
- Continued dragging expands the canyon along the cursor path.
- One continuous canyon gesture is recorded as one Undo/Redo command through the existing history system.
- Active interaction remains blue only while the Canyon Edge tool is active.
- Existing terrain, vertex, water, object, tree, and Sun systems were not redesigned in this pass.

## Interaction
1. Open WORLD // CONTROL / TERRAIN CONTROL.
2. Select CANYON EDGE.
3. Click and drag across the terrain.
4. The drag direction becomes the canyon direction.
5. Drag along an existing edge to expand it.
6. Release to finish the gesture.
7. Undo/Redo treats the entire gesture as one terrain edit.

## Deliberate scope
This is the first procedural edge-deformation pass. It does not yet add a dedicated Canyon Edge parameter panel, vertex-level edge handles, or controller-specific Canyon Edge gestures. Those can be layered onto the interaction once the physical terrain behavior is confirmed.

## Verification
- JavaScript syntax checks passed for the new terrain and interaction-store logic.
- JSX syntax was inspected but a full Vite build could not be run because the development archive does not contain installed Vite dependencies.
