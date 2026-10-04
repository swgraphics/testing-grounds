# Testing Grounds 1.4.0

## Universal World Interaction
- Added a dedicated Interaction Panel for direct world tools.
- Added an Adaptive Reticle system.
- Added a Sun Control Reticle inspired by the supplied visual reference.
- Looking toward the sun changes the normal dot reticle into an orbital control reticle.
- Holding the sun interaction supports mouse and Xbox input for sun rotation and height.
- Active interaction uses Royal Blue `#2a8fff` while preserving the white control geometry.

## Character Control
- Removed the 1.3.2 terrain re-seat/player-Y reset behavior.
- Removed the rule that locked movement merely because the World Editor was open.
- Character movement now locks only while an active interaction tool is selected (`EDIT`, `PLACE`, `SCULPT`, or `GRAB`).
- Browsing the World Editor or Interaction Panel alone does not lock the character.

## Terrain
- Added a persistent terrain-edit layer on top of procedural terrain.
- Added direct Raise, Lower, Smooth, Flatten, and Slope brush operations.
- Terrain geometry and Rapier collision rebuild from the edited terrain state.
- Avoids continuous player-position overrides and camera grounding hacks.

## Water
- Added direct River interaction.
- River drawing records a persistent river path in the current world state.
- River drawing lowers terrain along the path to begin exposing the existing water system.
- Added an organic tube-like river surface representation.

## Objects
- Added direct object drag interaction for placed objects.
- Added object rotation and scale keyboard controls (`R`, `[` and `]`).
- Added object deletion with `Delete`.
- Added persisted object transforms.
- Added initial procedural building pieces: Block, Wall, Platform, Floor, Ramp.
- Saved Object library now persists generated saved objects locally.

## Place Mode
- Placement now remains active after each successful placement.
- Users can place the same object repeatedly without re-entering Place Mode.
- The existing X overlay exits Place Mode and returns to the Object menu.
- ESC is now owned globally by the application and closes menus/actions/placement before returning to world control.
- Xbox A can place objects during active Place Mode; Xbox B acts as back/escape.

## World State / Save Load
- World schema advanced to version 2.
- Added persisted scatter profile state.
- World object transforms and river data are included in the saved world state.
- World state is stored separately from the procedural generation function.

## Scatter
- Added a persistent Crimson Tree scatter profile when Add to Scatter is used.
- Tree density and coverage can use the saved per-object profile instead of only the global values.

## World Editor / Map
- Added a live top-down world map foundation derived from the same terrain function used by the 3D world.
- Map includes terrain elevation, water-level areas, and player position.
- No separate world representation was introduced.
- Removed the artificial SpawnPad from the starting experience.
- Start area moved to a high natural cliff position.

## Atmosphere
- Locked 1.4 terrain and atmosphere defaults.
- Cloud defaults updated to the locked 1.4 values.
- Cloud height offset restored.
- Wind controls moved into Atmosphere in the Dev Tools UI.
- Added wind direction control foundation.
- Aurora rendering strengthened and enlarged for visibility.

## Splash
- Version updated to 1.4.0.
- Crash Tester guide cards now rotate every 3 seconds.
- Clicking the active guide card advances immediately.

## Controller
- Added a global Xbox menu navigator for visible UI controls.
- D-pad navigates menus.
- A confirms/clicks focused controls.
- B performs ESC/back behavior.
- D-pad left/right can adjust focused range sliders.
- Place Mode has dedicated controller placement support.

## Architecture Notes
- Interaction state remains centralized in `interactionStore`.
- Terrain edits are centralized in `terrainEdits.js` and layered onto the existing procedural terrain function.
- World state remains centralized in `worldStore`.
- The World Editor remains a precision/configuration layer.
- The Interaction Panel remains the direct manipulation layer.
- PLAY/WORLD remains the primary exploration layer.

## Verification
- Source was implemented against the current 1.3.2 overlay applied to the 1.3.1 source tree.
- A production Vite build could not be completed in the isolated build environment because the npm registry packages were not available locally and network package installation timed out.
- The user's local `npm run build` remains the authoritative final verification step.
