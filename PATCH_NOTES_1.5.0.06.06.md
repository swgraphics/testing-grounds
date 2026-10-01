# Testing Grounds 1.5.0.06.06

## Correction Pass — Procedural Objects + Scatter Foundation

### Fixed
- Saved procedural objects are now recognized by their `modelType`, not only their original `source`.
  - Restores Fireflies Save -> Place.
  - Restores Crimson Tree Save -> Place.
  - Restores procedural placement preview for saved TG objects.
- Crimson Tree placement rules now continue to recognize saved Crimson Tree objects.
- Ordinary placed objects continue to follow terrain height changes.
- Geology terrain objects remain excluded from ordinary terrain-follow so Canyon Wall / Giant Rock behavior is unchanged.
- Block measurements remain face-attached and use the Oswald font path.

### Scatter foundation
- Added removal of individual scatter profiles.
- Added per-object Scatter controls in the Mesh Menu for enabled scatter assets:
  - Density
  - Coverage
  - Remove From Scatter
- Scatter profiles now retain asset metadata needed by the renderer.
- Added generic deterministic GLTF scatter rendering for library/upload-compatible model paths.
- Quaternius foliage assets can now be added to Scatter and rendered independently.
- Crimson Tree's existing specialized scatter remains separate and is not duplicated by the generic renderer.

### Scope
- No Sun control files were changed.
- Canyon Wall, Giant Rock, and other geology generation behavior was not modified.
- Arrow-key shortcut removal remains in place.
- Full Crimson Tree cursor-driven procedural editing is planned as a later vertical slice; this pass does not attempt to implement it.

### Verification
- Archive integrity checked.
- No production Vite build run because the development archive intentionally excludes `node_modules` and `public`.
