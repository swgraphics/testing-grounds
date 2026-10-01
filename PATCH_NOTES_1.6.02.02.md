# Testing Grounds 1.6.02.02

## Direct Tree Edit regression + performance stabilization

This is a corrective pass. **1.6.02.01 is not considered passed.**

### Tree interaction fixes
- Fixed partial Crimson Tree definitions collapsing into trunk-only trees after a height/bend edit. Tree edits now merge against the full Crimson baseline before applying patches.
- Added synchronous tree target refresh on pointer-down so clicking a tree does not depend on a stale render-frame target.
- Prevented the generic Object drag handler from stealing clicks on Crimson Trees.
- Scatter-generated Crimson Trees now expose stable tree interaction IDs.
- Scatter trees remain in their lightweight legacy visual until actually edited; the targeted scatter tree can transition into the procedural editable tree representation.

### Editor Window reticle
- Replaced the CSS-only Tree Editor reticle with the same 3D torus interaction language used by the world reticle.
- The ring uses the hit point and tree/branch orientation, so tree geometry can visually occlude the back half.

### Performance stabilization
- Removed the full-scene Crimson Tree raycast from every render frame. Tree targeting is sampled every third frame, with an immediate refresh on click.
- The active world reticle is now updated directly through a mesh ref rather than triggering React state updates every render frame.
- Legacy scatter trees no longer build unused procedural branch geometry.

### HUD terminology
- Tree interaction now displays as `OBJECT // TREE` instead of `OBJECT // OBJECT` / `TREE // TREE`.
- This keeps TREE as the specific object interaction state while retaining OBJECT as the top-level category.

### Sun protection
- Sun control files and behavior were not modified.

### Not included
- River sensitivity tuning is intentionally separate so this corrective pass can be tested cleanly.
- Tree leaf vertex editing remains 1.6.03 work.
- Scatter persistence remains 1.6.04 work.

## Verification
- Source delimiter sanity checks completed.
- Production Vite build was **not verified** because dependency installation timed out in the isolated environment.
- Local browser testing remains authoritative.
