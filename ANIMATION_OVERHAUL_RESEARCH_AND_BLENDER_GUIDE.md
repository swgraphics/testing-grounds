# Testing Grounds Animation Overhaul — Pass 1

## What this patch changes
- Adds a catalog generated from the two supplied Quaternius GLBs: 86 named source clips (excluding the A-pose/T-pose reference clips).
- Crash Tester playback combines its authored model clips with clips from both Universal Animation Library GLBs, and maps source clip names into animation action names.
- Adds initial keyboard shortcuts for several extra actions. This is a foundation pass, not the finished user-editable control-mapping panel.
- Does not modify PlayerController, physics, camera, terrain, or water.

## Important compatibility note
The Adventurer still uses its separate FBX animations and a different rig. This patch does not retarget Quaternius clips to Adventurer. Retarget a representative subset in Blender first, validate it, then expand to the complete library.

## Automatic rigging research (checked 2026-10-19)
1. **Meshy auto-rigging is the strongest immediate candidate for upgraded humanoid Crash Testers.** Official docs say its Rigging API accepts textured humanoid GLB input (or a prior Meshy task) and returns rigged GLB/FBX, optionally with basic walk/run animations. It is intended for standard humanoids with clear limbs; non-humanoids, untextured meshes, or unclear limb structure are unsuitable. Models supplied by URL must face +Z; inputs above 300,000 faces via task ID need remeshing. https://docs.meshy.ai/en/api/rigging and https://docs.meshy.ai/en/webapp/guides/animate
2. **Meshy Animation API** can apply preset action IDs to a completed rigging task and merge up to 10 clips in one output. This is useful as a comparison/fallback, but does not guarantee identical skeleton naming/rest pose to Quaternius. https://docs.meshy.ai/en/api/animation
3. **UniMate is not an auto-rigger.** Its `rig_preprocess` starts from an already-rigged GLB/glTF/FBX, labels and canonicalizes its skeleton, and prepares it for motion generation. It does not create a skeleton or skin weights from a raw mesh. https://github.com/Friedrich-M/UniMate/blob/main/data_process/rig_preprocess/README.md
4. **Architecture recommendation:** offline asset import → auto-rig → validate/normalize rig → retarget clips → preview → register in TG. Start with humanoids; add creature rig families later. No purchase, account action, API call, or financial action was taken.

## Blender refresher for Meshy Crash Testers
1. Generate/export a textured humanoid in a neutral T-pose or A-pose; keep a copy of the original GLB.
2. In Meshy, run auto-rigging and export FBX or GLB. Preview walk/run first.
3. In Blender, import the rigged character FBX. Import the Quaternius `UAL1_Standard.fbx` or `UAL2_Standard.fbx` as the source armature/action. Check scale, facing direction, rest pose, and frame range.
4. Retarget to the target armature using Blender's Action/constraint workflow or a compatible retarget add-on. Match hips/root, spine, head, upper/lower arms, hands, thighs, shins, and feet; ensure source/target rest poses are aligned. Resolve object transforms before baking.
5. Bake the action onto the target armature. Inspect foot sliding, root motion, arm twisting, and extreme poses (overhead reach, crouch, jump, weapon pose). Adjust rest-pose offsets/bone roll if needed.
6. Export target mesh + baked actions as GLB, with animation and skinning enabled. Reimport to verify materials, scale, armature, and clips.
7. Register the new model and clip map only after validation. Prefer in-place locomotion by default because TG movement is driven by Ecctrl; root-motion clips need separate integration.

## Next pass
- Build an Animation Library panel with category filters, preview/play/stop, user-editable per-action mappings, and saved mappings.
- Make the same action map usable by keyboard/mouse, mobile touch, and Xbox; use an action wheel/list for the long tail of clips.
- Retarget idle/walk/run/jump/crouch/attack/interact to Adventurer first, then scale up.
- Test new Meshy Crash Tester exports against this representative subset before replacing production models.
