# Testing Grounds 1.6.04.05 — Add Water + FPV Corrections

## Included
- Adds an **ADD WATER** tool alongside Draw River.
- Adds a diameter slider (8–120 m) while Add Water is active.
- Creates a saved, chunk-local circular pond surface and applies a soft multi-ring terrain-lowering basin.
- Stores pond bodies in the existing chunk `water` object, which already participates in world normalization/persistence and water history snapshots.
- Adds a First-Person View control to Terrain Control below World Guides and above Dev Tools.
- Makes PlayerController refresh its active camera profile when camera settings change, so an updated FPV speed value is read by the movement controller.
- Leaves the existing global water shader, subdivisions, wind response, and Draw River tool intact.

## Apply
Copy the included `src/` files over the same paths in the active project. Do not replace the entire project or delete unrelated files.

## Test checklist
1. Run `npm run build`.
2. Open Terrain Control; verify First-Person View is below World Guides and above Open Dev Tools.
3. Toggle FPV on/off and verify the mode changes.
4. In Dev Tools > Camera, change FPV Move Speed while FPV is active and verify the movement speed changes immediately.
5. Select Add Water; adjust diameter; click terrain. Confirm the basin and pond surface appear.
6. Save/reload the world and confirm pond bodies remain.
7. Use Draw River and verify the existing global water reveal behavior remains unchanged.
8. Undo/redo the Add Water action and verify both terrain and pond data restore together.

## Scope note
This pass provides discrete saved pond surfaces and basin shaping. Automatic hydrological connection detection and gravity-oriented waterfalls are deliberately deferred to 1.6.04.06. Underwater movement/swimming remains a 1.7 item.
