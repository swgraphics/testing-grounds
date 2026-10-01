# Testing Grounds 1.4.4.05 — Chunk-Boundary Continuity

## Scope
This patch moves terrain vertex overrides to one authoritative world-level registry so the same global terrain vertex cannot acquire different heights when logical chunks meet or change.

## Changes
- Added `world.terrainVertexEdits` as the canonical terrain vertex override registry.
- Terrain vertex sampling now reads the canonical world registry first.
- Vertex writes update the world registry and retain a mirrored current-chunk copy for compatibility with existing saved worlds.
- World persistence serializes the canonical registry and mirrors it into chunk terrain data for backward compatibility.
- Migration collects existing vertex edits from older chunk-local records without discarding them.
- Existing 5 m vertex keys remain deterministic across the full 600 m terrain.
- This prevents split-brain vertex heights at logical chunk boundaries and provides the persistence foundation for future truly chunked terrain geometry.

## Not Changed
- No new terrain sculpting tools.
- No water, weather, grass, or object geometry editing.
- No changes to vertex selection or manipulation controls.
- No redesign of the existing chunk navigation system.

## Verification
- JavaScript syntax checked across `src`.
- Production Vite build not run because the supplied development archive intentionally excludes `node_modules` and `public`.
