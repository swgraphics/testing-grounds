# Testing Grounds | Task 07 | Terrain Export v1 - IMPLEMENT AND TEST

## Direct authorization / working agreement

Implement this task completely. Do NOT stop after an inspection report or ask for approval between normal implementation stages. Read the current `AGENTS.md` first and preserve its safeguards. Do not commit, push, deploy, install *new* dependencies, delete or overwrite preexisting work, or modify unrelated systems. You may run `npm.cmd ci` **only in a newly created clean worktree using the existing lockfile** to provision the already-declared dependencies. Use the standard concise final change report. The goal is one reviewable, working patch, not a sequence of inspection-only tasks.

## 0. Establish a clean and current source safely - REQUIRED

Original folder (may be dirty and behind GitHub):
`D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-current`

The last inspection found HEAD `ae81793` on `fix/player-terrain-lift`, seven modified source files, untracked animation files, and an obsolete nested Gitlink. The owner previously finished a cleanup/baseline commit on a different computer. **The old local `origin` pointer can be stale even if `git status` says up to date.**

1. In the ORIGINAL repository, check status and do `git fetch origin fix/player-terrain-lift` (fetch only; no pull/merge/rebase/reset). Verify the updated `origin/fix/player-terrain-lift` commit versus local HEAD. Do not modify the original dirty files.
2. For the development implementation, make a **clean sibling Git worktree** on this same external drive, rooted at:
   `D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`
   Create a new local feature branch from the freshly fetched `origin/fix/player-terrain-lift` with `git worktree add -b feat/terrain-export-ui-v2 <sibling-path> origin/fix/player-terrain-lift`. The owner authorizes creating this additional worktree and branch to avoid altering the original dirty copy. If the worktree directory/branch already exists, inspect it and STOP rather than overwrite it. If Git rejects ownership on this external drive, trust only the exact new worktree path through `safe.directory`; never turn ownership checking off globally.
3. Develop and run all tests in the new worktree only. Copy this handoff document and `docs/design/references/` from the original folder to the new worktree if present, **but no other uncommitted source code**. Keep all five reference SVG/PNG designs intact for Task 08.
4. If fetching GitHub fails, the remote branch is inaccessible, or the latest remote branch demonstrably lacks important active work needed for this feature, STOP with a precise blocker and the Git evidence. Never implement blindly on the stale source.
5. Existing `npm.cmd` works while PowerShell may block `npm.ps1`; use `npm.cmd` commands. If new worktree dependencies are missing, `npm.cmd ci` using its lockfile is authorized. Do not add packages without approval.

This single clean-worktree decision is a safety measure, NOT an authorization to clean up the old repository. Do not create giant backups or hashes, and do not touch the obsolete nested repository.

## 1. Terrain Export v1 required behavior

Implement an editor-accessible tool to export a **user-selected rectangular X/Z region of the terrain surface** to a portable **binary `.glb`** file. Region selection must support numerical min/max X/Z bounds and an unobtrusive visible preview in the world (reuse existing selection/overlay techniques). Validate nonzero area and confirm region dimensions. Support non-square regions and regions crossing existing terrain chunk boundaries.

Exporter options:
- Min X, Max X, Min Z, Max Z.
- Adjustable X and Z sampling segments (show what resolution means and enforce safe limits).
- Export origin option: **World Position** (original X/Z) or **Centered Origin** (X/Z centered on 0; preserve elevation datum).
- Descriptive/sanitized output filename and a clear `Export GLB` action.
- Friendly loading, validation and error feedback, and download cleanup.

## 2. Height fidelity and read-only guarantee - HIGHEST PRIORITY

Inspect the ACTUAL source implementing procedural terrain, committed sculpt/brush edits, vertex editing, chunk generation, and geology preview. Likely areas include `src/systems/terrain/terrainHeight.js`, terrain edits/vertex-edit modules, `GridTerrain.jsx`, and world store. Treat these as leads, not assumed APIs.

The existing `getTerrainHeightAt()` may add temporary geology preview changes. **Do not export that preview**. Add a reusable committed-only terrain-height sampling path that exactly includes procedural base terrain + saved sculpt/brush edits + committed vertex changes and other persisted elevation contributions, while excluding all temporary geology or tool previews. Do not duplicate terrain formulas unnecessarily. Ensure normal rendered terrain behavior, collision, object placement and camera systems remain unchanged. Never mutate the store, world edits, meshes, or persistence as a side-effect of export.

## 3. GLB geometry and material

- Build a standalone `THREE.BufferGeometry` sampling **both boundary endpoints**, with correct indexed triangles, upward-facing winding, normals, UV coordinates, and continuous rows/columns.
- Explicitly verify winding on a flat X/Z grid (triangle normals must point +Y).
- Correct Y-up orientation, world scale, and elevation; no rotation or unintended scaling.
- Export terrain surface **only**; no water, rivers as separate water meshes, waterfalls, vegetation, scatters, placed objects, characters, colliders, or UI gizmos. Persisted terrain channels/edits naturally reflected in terrain heights are fine.
- Create a portable glTF PBR material (`MeshStandardMaterial` or equivalent) with compatible properties. If application shader colors cannot be baked without a large new pipeline, use a clearly documented portable fallback rather than exporting unsupported shaders.
- Use the installed Three.js `GLTFExporter` (`three/examples/jsm/exporters/GLTFExporter.js`) with binary output; don't add dependencies. Download via Blob/object URL, revoke URLs, dispose temporary resources, and handle async failures. Do not detach or modify live scene objects.

## 4. UI integration

Integrate minimally into the existing editor, not the future compass redesign. Keep current button styling and focus/navigation intact. Do not modify player rotation/movement, intro camera, controller bindings, world persistence format, or global menus. Export options can stay transient for v1.

## 5. Validation and test evidence

Execute `npm.cmd run build`. Run existing relevant tests and `npm.cmd run lint` if present, distinguishing preexisting failures from new ones. Add focused automated assertions/tests where feasible WITHOUT introducing a new test framework:
- Bounds rejection and rectangle dimension handling.
- Vertex and triangle counts, endpoint sampling, upward normals/winding, UVs.
- Committed sculpt/vertex changes included; uncommitted geology preview excluded.
- Centered versus world origin, chunk-crossing continuity.
- Export path doesn't mutate authoritative world data.

If browser tools available, open local Vite app and confirm UI, a real `.glb` download, and absence of console errors. If a GLB can be round-tripped through `GLTFLoader` or verified structurally, do so. If Blender isn't installed, mark Blender visual import **NOT TESTED** (owner will inspect). Never claim runtime, Xbox, or Blender tests passed if they were not actually performed.

## Exit criteria & report

The result should be a usable feature, not just a planning document. Report in <=250 words:
1. Working directory + base Git commit; whether old folder remains untouched.
2. Files changed and feature behavior.
3. Build / lint / tests / browser GLB download / Blender import as PASS/FAIL/NOT TESTED.
4. How committed-only sampling excludes temporary preview effects.
5. One or two manual steps for the owner to test GLB export and bring it into Blender/CloudField.
6. Any remaining blockers and the location of the new worktree.

**Stop after Task 07** so the owner can review the terrain export before the substantial UI overhaul. DO NOT start Task 08, commit, push, or deploy automatically.
