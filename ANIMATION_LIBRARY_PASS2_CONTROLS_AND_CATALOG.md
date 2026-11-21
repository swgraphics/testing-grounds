# Testing Grounds Animation Library Overhaul — Pass 2

## What this pass adds

- An in-game **ANIMATION ACTIONS** panel for Crash Tester characters. Every one of the 84 catalogued Quaternius action clips can be triggered from the panel on desktop or touch devices.
- Additional keyboard shortcuts for frequently used actions.
- Xbox mappings for sword attack and dance, in addition to the existing attack, cross punch, and interact bindings.
- Correct playback classification: `*_Loop` clips repeat, while non-loop clips play once and return when the action timer ends.

## Important scope / limitations

- This action panel is currently enabled for Crash Tester characters only. The Adventurer still uses its existing FBX animation set and has not been retargeted to these 84 clips.
- The action picker triggers the selected clip on the existing Crash Tester rig. This is not a claim that every clip is visually perfect in all poses; please verify in-game.
- No changes are made to PlayerController camera, terrain, water, or physics movement logic.
- Build validation was not possible in the supplied working directory because dependencies are not installed (`vite: not found`).

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Space | Jump |
| Left Shift | Sprint |
| C | Crouch |
| Left Ctrl | Slide |
| Mouse left-click on the world | Quick attack (Crash Tester; ignored over UI/editor/tool panels) |
| E | Interact |
| R | Cross punch |
| T | Sword attack |
| F | Quick punch |
| G | Dance loop |
| V | Pistol aim |
| B | Pistol shoot |
| N | Pistol reload |
| J | Sitting enter |
| K | Swim forward action |
| L | Climb up 1m |
| H | Hit head reaction |
| Y | Yes / nod emote |
| U | Overhand throw |
| I | Interact clip |
| O | Open chest |
| P | Consume |
| On-screen ANIMATION ACTIONS panel | All catalogued clips, grouped by category; available on desktop and touch |
| Xbox A | Jump |
| Xbox B | Slide |
| Xbox X | Sword attack |
| Xbox Y | Dance loop |
| Xbox LB | Interact |
| Xbox RB | Cross punch |
| Xbox RT | Quick attack |
| Xbox left-stick click | Sprint |
| Xbox right-stick click | Crouch |
| Xbox LT | World-transform input (existing behavior) |

## Full action catalog

### Movement & traversal

- **Jog Fwd Loop** (`Jog_Fwd_Loop`; UAL1)
- **Jump Land** (`Jump_Land`; UAL1)
- **Jump Loop** (`Jump_Loop`; UAL1)
- **Jump Start** (`Jump_Start`; UAL1)
- **Roll** (`Roll`; UAL1)
- **Sprint Loop** (`Sprint_Loop`; UAL1)
- **Swim Fwd Loop** (`Swim_Fwd_Loop`; UAL1)
- **Swim Idle Loop** (`Swim_Idle_Loop`; UAL1)
- **Walk Formal Loop** (`Walk_Formal_Loop`; UAL1)
- **Walk Loop** (`Walk_Loop`; UAL1)
- **ClimbUp 1m** (`ClimbUp_1m`; UAL2)
- **NinjaJump Idle Loop** (`NinjaJump_Idle_Loop`; UAL2)
- **NinjaJump Land** (`NinjaJump_Land`; UAL2)
- **NinjaJump Start** (`NinjaJump_Start`; UAL2)
- **Shield Dash** (`Shield_Dash`; UAL2)
- **Slide Exit** (`Slide_Exit`; UAL2)
- **Slide Loop** (`Slide_Loop`; UAL2)
- **Slide Start** (`Slide_Start`; UAL2)
- **Sword Dash** (`Sword_Dash`; UAL2)
- **Walk Carry Loop** (`Walk_Carry_Loop`; UAL2)
- **Zombie Walk Fwd Loop** (`Zombie_Walk_Fwd_Loop`; UAL2)

### Combat & reactions

- **Death01** (`Death01`; UAL1)
- **Hit Chest** (`Hit_Chest`; UAL1)
- **Hit Head** (`Hit_Head`; UAL1)
- **Pistol Aim Down** (`Pistol_Aim_Down`; UAL1)
- **Pistol Aim Neutral** (`Pistol_Aim_Neutral`; UAL1)
- **Pistol Aim Up** (`Pistol_Aim_Up`; UAL1)
- **Pistol Idle Loop** (`Pistol_Idle_Loop`; UAL1)
- **Pistol Reload** (`Pistol_Reload`; UAL1)
- **Pistol Shoot** (`Pistol_Shoot`; UAL1)
- **Punch Cross** (`Punch_Cross`; UAL1)
- **Punch Jab** (`Punch_Jab`; UAL1)
- **Sword Attack** (`Sword_Attack`; UAL1)
- **Sword Idle** (`Sword_Idle`; UAL1)
- **Hit Knockback** (`Hit_Knockback`; UAL2)
- **Idle Shield Break** (`Idle_Shield_Break`; UAL2)
- **Idle Shield Loop** (`Idle_Shield_Loop`; UAL2)
- **Melee Hook** (`Melee_Hook`; UAL2)
- **Melee Hook Rec** (`Melee_Hook_Rec`; UAL2)
- **OverhandThrow** (`OverhandThrow`; UAL2)
- **Shield OneShot** (`Shield_OneShot`; UAL2)
- **Sword Block** (`Sword_Block`; UAL2)
- **Sword Heavy Combo** (`Sword_Heavy_Combo`; UAL2)
- **Sword Regular A** (`Sword_Regular_A`; UAL2)
- **Sword Regular A Rec** (`Sword_Regular_A_Rec`; UAL2)
- **Sword Regular B** (`Sword_Regular_B`; UAL2)
- **Sword Regular B Rec** (`Sword_Regular_B_Rec`; UAL2)
- **Sword Regular C** (`Sword_Regular_C`; UAL2)
- **Sword Regular Combo** (`Sword_Regular_Combo`; UAL2)
- **Zombie Idle Loop** (`Zombie_Idle_Loop`; UAL2)
- **Zombie Scratch** (`Zombie_Scratch`; UAL2)

### Interactions

- **Driving Loop** (`Driving_Loop`; UAL1)
- **Fixing Kneeling** (`Fixing_Kneeling`; UAL1)
- **Interact** (`Interact`; UAL1)
- **PickUp Table** (`PickUp_Table`; UAL1)
- **Chest Open** (`Chest_Open`; UAL2)
- **Consume** (`Consume`; UAL2)
- **Farm Harvest** (`Farm_Harvest`; UAL2)
- **Farm PlantSeed** (`Farm_PlantSeed`; UAL2)
- **Farm Watering** (`Farm_Watering`; UAL2)
- **TreeChopping Loop** (`TreeChopping_Loop`; UAL2)

### Idles & emotes

- **Crouch Fwd Loop** (`Crouch_Fwd_Loop`; UAL1)
- **Crouch Idle Loop** (`Crouch_Idle_Loop`; UAL1)
- **Dance Loop** (`Dance_Loop`; UAL1)
- **Idle Loop** (`Idle_Loop`; UAL1)
- **Idle Talking Loop** (`Idle_Talking_Loop`; UAL1)
- **Idle Torch Loop** (`Idle_Torch_Loop`; UAL1)
- **Push Loop** (`Push_Loop`; UAL1)
- **Sitting Enter** (`Sitting_Enter`; UAL1)
- **Sitting Exit** (`Sitting_Exit`; UAL1)
- **Sitting Idle Loop** (`Sitting_Idle_Loop`; UAL1)
- **Sitting Talking Loop** (`Sitting_Talking_Loop`; UAL1)
- **Spell Simple Enter** (`Spell_Simple_Enter`; UAL1)
- **Spell Simple Exit** (`Spell_Simple_Exit`; UAL1)
- **Spell Simple Idle Loop** (`Spell_Simple_Idle_Loop`; UAL1)
- **Spell Simple Shoot** (`Spell_Simple_Shoot`; UAL1)
- **Idle FoldArms Loop** (`Idle_FoldArms_Loop`; UAL2)
- **Idle Lantern Loop** (`Idle_Lantern_Loop`; UAL2)
- **Idle No Loop** (`Idle_No_Loop`; UAL2)
- **Idle Rail Call** (`Idle_Rail_Call`; UAL2)
- **Idle Rail Loop** (`Idle_Rail_Loop`; UAL2)
- **Idle TalkingPhone Loop** (`Idle_TalkingPhone_Loop`; UAL2)
- **LayToIdle** (`LayToIdle`; UAL2)
- **Yes** (`Yes`; UAL2)

## Install

1. Back up the current project or commit your current state first.
2. Extract this ZIP into the project root, preserving the included `src/` paths.
3. Allow overwriting only the files included in this patch.
4. Run `npm install` if dependencies are absent, then `npm run build`.
5. Run the app and select a Crash Tester. Open **ANIMATION ACTIONS**, then test a looping action, a one-shot action, and the keyboard/Xbox bindings.
