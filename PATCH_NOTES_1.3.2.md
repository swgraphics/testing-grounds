# Testing Grounds 1.3.2

## Patch focus
1. Clean World Editor rendering: the World Editor frame is explicitly sharp and no longer owns a backdrop blur. Blur remains available only on UI surfaces that intentionally use it.
2. Terrain deformation grounding: terrain-setting changes trigger a calculated ground reacquisition from the active terrain function so the player is re-seated against the updated surface instead of remaining at the old height.
3. Interaction state foundation: interaction state now has explicit panel-open semantics, and character locomotion is frozen while the World Editor or Dev Tools panel is active.
4. Place Mode completion: placing an object now exits placement mode cleanly and returns control to the object workflow.
5. Ground Fog: replaced the large flat vertical sheets with layered, smaller world-space mist patches using multi-scale noise and soft radial breakup.
6. Splash: 1.5-second guide-card rotation, 1.3.2 version label, and removal of the white-background Unit 01 card.
7. Area labels: C1 is Village and D1 is Arena.
8. Removed the duplicate Aerial Map wrapper in the Editor view.

## Intentionally deferred to 1.4
- Full direct Sun / Terrain / Water cursor manipulation.
- River drawing and water deformation.
- Per-object Scatter authoring and saved-object expansion.
- Full minimap/chunk persistence architecture.
- High-cliff starting viewpoint overhaul.
