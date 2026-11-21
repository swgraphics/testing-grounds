import { TERRAIN_SHAPE_KEYS } from '../world/terrainRegions';
import { terrainSettings } from './terrainSettings';

const HEIGHT_KEYS = new Set([...TERRAIN_SHAPE_KEYS, 'terrainEditVersion', 'terrainPreviewVersion', 'terrainVertexEditVersion']);
export function terrainHeightChanged(event) { return HEIGHT_KEYS.has(event.detail?.key); }

// Settings and history/load actions advance these versions when sampled heights change.
// Sun, clouds, water and other world metadata must not invalidate terrain-derived caches.
export function terrainHeightKey(world) {
  const settings = world.terrainSurface?.settings ?? terrainSettings;
  return [world.worldType, world.currentChunkId, ...TERRAIN_SHAPE_KEYS.map(key => settings[key]), terrainSettings.terrainEditVersion,
    terrainSettings.terrainPreviewVersion, terrainSettings.terrainVertexEditVersion, world.terrainSurface?.revision ?? 0, world.geology?.revision ?? 0].join(':');
}

// Guide coordinates use the same regular grid as the terrain mesh. Reuse its
// committed samples instead of evaluating procedural terrain/edits a second time.
export function terrainGridSampler(geometry, segments, originX = 0, originZ = 0) {
  const positions = geometry.attributes.position, width = segments + 1;
  const startX = positions.getX(0) + originX, startZ = positions.getZ(0) + originZ;
  const stepX = positions.getX(1) - positions.getX(0), stepZ = positions.getZ(width) - positions.getZ(0);
  return (x, z) => positions.getY(Math.round((z - startZ) / stepZ) * width + Math.round((x - startX) / stepX));
}
