# Testing Grounds 1.5.0.06.05

## Correction Pass
- Blank Canvas now uses the same procedural terrain shape controls as the authored world, without the authored spawn-area flattening.
- Water remains mounted in Blank Canvas and becomes visible when raised above the starting dry level or when a river exists.
- Placed objects now follow terrain height changes and persist their corrected Y position. Building blocks preserve their stack height above the new terrain.
- Block measurement labels use the Oswald brand font.
- Add Object X closes the menu after placement cancellation.
- Arrow-key shortcut handling and the on-screen quick-arrow shortcut UI were removed pending a later feature definition.
- Controller jump is suppressed while the Adaptive Reticle is targeting Sun Control; the Sun control implementation itself was not modified.
- Add Object placement preview for loaded meshes is restored.
- Add Chunk captures the player's position when the player is outside the original 600m terrain and creates a snapped 100m creator terrain chunk there, carrying the current terrain settings into the new chunk.
- GridTerrain renders persisted creator chunks beyond the original 600m terrain as literal 100m terrain patches with Rapier collision.
- The flat fallback floor now ends at the original 600m world boundary, so walking beyond the starting terrain reaches actual void until a creator chunk is added.
- World Map expands its cartographic grid as creator chunks are added and its topographic layer samples the expanded physical terrain bounds.
- Sun control files were not modified in this pass.
