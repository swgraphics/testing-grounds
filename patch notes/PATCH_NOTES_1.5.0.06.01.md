# Testing Grounds 1.5.0.06.01

## Chunk Creation Dialog Interaction Fix

### Bug
The 1.5.0.06 Editor frame intentionally disables pointer events at the outer `.tg-editor-view` level so the live world remains interactive. The new chunk-creation modal was rendered inside that frame but did not explicitly re-enable pointer events. As a result, the dialog was visible but mouse/touch interaction could not reach its select, input, Cancel, or Create controls.

### Fix
`.tg-chunk-dialog-backdrop` now explicitly sets `pointer-events: auto`. The existing form-level `stopPropagation()` behavior remains in place so clicks inside the dialog do not trigger the backdrop's close handler.

### Result
- Grid `[+]` opens the dialog normally.
- ADD CHUNK opens the dialog normally.
- Grid coordinate select is interactive.
- Chunk name input is interactive.
- CANCEL closes the dialog.
- CREATE CHUNK is interactive when a coordinate is selected.

No world/chunk data architecture or map behavior was changed.
