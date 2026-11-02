# Roadmap Snapshot

This is historical project context, not a live issue tracker. Confirm status before implementation.

## 1. Crash Tester model upgrades
Update Crash Tester models using enhanced Meshy models. Inspect current asset loading, registration, scale/placement, format, and performance before replacing anything. Clarify mapping and rollback first.

## 2. Terrain Export v1 — user-approved direction
- Export a user-defined region; terrain surface only.
- Primary format GLB, with portable material, intended for Blender, CloudField, and compatible tools.
- Do not mutate the source world.
- Include committed terrain sculpt and vertex edits; exclude transient preview effects.
- Region defined by two opposite world-space X/Z corners; configurable resolution.
- Y-up; default world-coordinate origin with optional centered origin.
- Standard glTF PBR material; optional committed vertex colors only if reliable.

Historical notes to verify: an earlier source archive did not appear to contain a general exporter; terrain height evaluation appeared to combine committed edits with geology preview deltas. Do not apply an old patch blindly. Validate bounds, geometry, normals, scale/orientation, material, edits, GLB compatibility, and source-world immutability.

## 3. Codex workflow in VS Code
Install/configure Codex, seed project instructions, run read-only orientation test, review its report, then authorize implementation separately.

## 4. Broader roadmap
Return to the broader TG roadmap after priorities are clarified. Do not mark tasks complete without evidence/user confirmation.
