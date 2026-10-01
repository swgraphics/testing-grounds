# Testing Grounds 1.6.03.03

## Focus
Crimson Tree gesture-first branch editing, global branch response by default, single-branch precision mode, leaf vertex regeneration, and shortcut input hardening.

## Tree branch interaction
- Branch edit defaults to ALL BRANCHES.
- Clicking a branch supplies the physical gesture handle; the operation is applied to the procedural branch population.
- Default gesture: horizontal drag controls LENGTH; strong vertical drag controls VERTICALITY.
- Gesture modes: LENGTH, VERTICALITY, THICKNESS, FREQUENCY, TAPER.
- Keyboard modifiers: Shift=THICKNESS, Ctrl=FREQUENCY, Alt=TAPER.
- G toggles ALL BRANCHES / SINGLE BRANCH.
- Number keys 1-5 select gesture modes.
- Xbox: Left Stick is the gesture; X modifier=THICKNESS, Y modifier=FREQUENCY, B modifier=TAPER.
- Single branch overrides are stored by procedural branch index.
- Branch geometry now respects per-branch taper overrides.

## Leaf editing
- Leaf vertex edits now invalidate/rebuild canopy geometry when canonical vertices change.

## Shortcuts
- V listener hardened to capture phase.
- QuickInteractionSlots is now mounted in the active world HUD so the shortcut panel/state is actually visible and usable.
- D-pad shortcut context: closed panel = menu navigation; hold D-pad Up for 260ms = shortcut panel; release closes the modal shortcut state. Keyboard V toggles it.

## Protected
- Terrain and object systems from 1.6.03.02 are unchanged.
- Sun controls unchanged.
