# Testing Grounds 1.4.4.02.01 — Multi-Selection Drag Correction

## Correction
- Fixed terrain vertex manipulation collapsing a multi-selection when the drag begins on an already-selected vertex.
- Clicking an already-selected vertex now preserves the full selection and moves all selected vertices together.
- Clicking an unselected vertex without a modifier still selects only that vertex.
- Shift/Ctrl/Cmd selection behavior remains unchanged.

## Verification
- Corrected source block inspected after modification.
- Full Vite production build not run because the supplied project intentionally excludes `node_modules` and `public`.
