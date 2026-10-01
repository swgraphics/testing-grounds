# TESTING GROUNDS — PATCH 1.6.04.01
## CRIMSON TREE — PERSISTENCE + SCATTER REFINEMENT

SOURCE OF TRUTH
Testing Grounds 1.6.04.

FIXES
- Custom saved/scattered Crimson Trees no longer render the legacy Crimson canopy on top of their customized procedural canopy.
- Added SCATTER EDIT SCOPE: ALL SCATTERED is the default for scattered tree instances; SINGLE TREE provides granular instance editing.
- Global scattered-tree edits update the source tree definition and existing per-instance overrides.
- Leaf vertex edits carry the same scatter edit scope.
- SAVE WORLD writes a dedicated scatter-profile backup; LOAD WORLD recovers that backup when needed.
- Block stack level detection now uses the actual block footprint instead of an overly strict 0.08m XY tolerance.

PERFORMANCE BOOKMARK
The visible lag while adding a saved/custom tree profile to Scatter is intentionally not optimized here. Bookmark for a future 1.8/1.9 rendering/performance pass.

PRESERVED
- Gesture-editing behavior.
- Passed terrain/object behavior.
- Shortcut workflow.
- Sun controls.
