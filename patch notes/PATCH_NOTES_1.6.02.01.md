# Testing Grounds 1.6.02.01

## Direct Tree Edit toggle refinement

- Fixed world Direct Tree Edit so CLICK/A enters the persistent TREE edit state instead of using A as an exit toggle.
- Once TREE edit is active, pointer down begins an adjustment gesture but does not exit the mode.
- ESC and the Tree Interaction panel close action remain explicit exit points.
- Preserved controller A jump suppression while TREE is active.
- Updated the Tree Editor preview effect dependencies so its interactive handlers stay synchronized with the current tree definition/mode.
- Sun control implementation was not modified.

No production Vite build was run.
