# Testing Grounds — 1.4.6.05 Undo / Redo

## Purpose
Establish the first command/history foundation without cloning the entire world on every input frame.

## Included
- Runtime undo/redo history store with compact path-based command snapshots.
- Transaction grouping so continuous terrain and vertex gestures become one undo step.
- Terrain sculpting history for Height, Smooth, Flatten, Slope, and Draw River interactions.
- Terrain vertex drag history as one command per drag.
- Object drag, rotation/scale, and deletion history.
- Ctrl/Cmd+Z undo.
- Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo.
- Editor header UNDO / REDO controls.
- History cleared when starting/loading/replacing a world through the normal App flows.

## Intentionally deferred
- Tree edit transaction grouping.
- Water/atmosphere-specific commands beyond the existing terrain-compatible river state.
- Chunk create/delete commands.
- Persistent history across browser reloads.

## Verification
Source-level checks were performed. A production Vite build was not run because the uploaded project intentionally omits `node_modules`.
