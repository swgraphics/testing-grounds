# Task 10 — owner review candidate

Crash Tester 2.0 is default after staged browser validation. Source:
`../CrashTester_2_Quaternius.glb` (actual filename); installed byte-identically as
`public/models/characters/crash-testers/CrashTester_02_Quaternius.glb`.
Original assets and all five existing variant mappings remain intact.

Changed: `src/config/crashTesterConfig.js`,
`src/components/character/{characterRegistry.js,PlayableCharacter.jsx,characterAnimations.js}`,
`src/components/ui/InputHUD.jsx`, `src/systems/camera/cameraSettings.js`,
`scripts/{test-crash-tester.mjs,browser-crash-tester.mjs}`, new GLB, this report.

Configuration: `crashTester20`, scale 1.5, height -0.80, zero rotation,
original Crash Tester camera defaults. Flat-ground foot error: approximately
0.8 mm. Movement/controller source is unchanged.

All 66 joint names/parents match; maximum rest-matrix difference 0.00000128.
Weights, inverse binds and three 2048×2048 textures validate. One existing mixer
reuses embedded/UAL1/UAL2 clips; duplicate `.001` exports are ignored. Raw library
names and gameplay aliases share immutable tracks. Reselection shares geometry,
materials and textures; skeletons remain independently owned.

Runtime-tested clips: `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`,
`Jump_Start`, `Jump_Loop`, `Jump_Land`, `Interact`, `Punch_Jab`, `Punch_Cross`,
`Roll`, `PickUp_Table`, `Dance_Loop`, `Sword_Heavy_Combo`, `ClimbUp_1m`,
`TreeChopping_Loop`, `Zombie_Walk_Fwd_Loop`, `Yes`.

PASS: production build; character, navigation, world-first, terrain-export and
forest Node tests; final character browser test; UI smoke suite. Native movement,
turning, jumping/landing, camera orbit, FPV, fallback switching and persistence
passed. No runtime errors. Legacy FBX lint diagnostics remain unchanged (15).

Triangles: 90,562 → 10,403. Same-camera Blank Canvas samples: original
57.6–62.6 ms/frame; new 12.3–13.2 ms/frame. These are isolated local observations.
File grows 11.0 → 14.7 MB; first staged selection took ~2 seconds. Cold loading
varied; no general loading-speed claim. Repeated switching held texture counts
stable. Evidence: ignored `task-10-assets.local/`, `task-10-browser.local/`.

No major deformation observed in sampled clips. Other clips and physical Xbox
remain untested; existing airborne and steep-slope behavior is retained.

Manual: enter; walk/sprint/jump; play library actions; orbit/toggle FPV; select
Crash Tester 01 and return to 2.0; save/load and sculpt/export.

No commit, push, deployment, dependency changes or backup changes.
