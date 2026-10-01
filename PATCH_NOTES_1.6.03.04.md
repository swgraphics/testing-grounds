TESTING GROUNDS — PATCH 1.6.03.04
CRIMSON TREE / LEAF VERTEX / SHORTCUTS / BLOCK STACK POLISH

SOURCE OF TRUTH
Testing Grounds 1.6.03.03.

USER-REQUESTED CHANGES
- Block stack labels now derive from the live vertical stack so three blocks read 3M / 2M / 1M.
- SHORTCUTS button centered at the bottom of the screen to avoid competing with controller buttons.
- PLACE button is dark/disabled until an object is selected; selected Place Mode is blue (#2a8fff); clicking active PLACE exits Place Mode and returns it to dark.
- Leaf Vertex Editor is now a real editing window rather than a static-looking preview.
- Selectable leaf vertices highlight blue and can be dragged with the mouse.
- Xbox left stick moves the selected leaf vertex while the Leaf Vertex Editor is open.
- B or ESC commits the current leaf shape and backs out; CANCEL explicitly restores the original shape.
- Added three vertex-driven leaf presets: OAK, MAPLE, BIRCH.
- Preset selection and vertex manipulation immediately update the canonical leaf vertices used by every procedural leaf on the edited tree.
- SHORTCUTS assignment workflow restored:
  V / hold D-pad Up opens the panel.
  ADD TO SHORTCUT enters assignment mode.
  Selecting an arrow slot highlights that slot.
  The next selected function is stored in that slot.
  The highlight is then cleared.
  Physical D-pad / arrow keys operate the stored function when the shortcut context is active.
- Generic interaction actions (including TREE and SUN) can now be assigned through the same shortcut mechanism because the assignment stores target/tool/mode rather than relying only on the old terrain-tool map.

PRESERVED
- Gesture-editing global branch mode remains the default.
- Single branch mode remains available.
- Terrain and object systems from 1.6.03.03 were not otherwise redesigned.
- Sun rendering/control implementation was not modified.

VERIFICATION
- ZIP/archive integrity checked.
- Plain JavaScript syntax checked where Node supports the file type.
- JSX production compilation was not available in the isolated environment because dependencies/node_modules are absent; local Vite build remains authoritative.
