import { useWorldStore } from '../world/worldStore';
import { compileGeologyField } from './geologyField';
import { boundsIntersect } from './geologyDefinition';

const TILE = 64;
let source = null, tiles = new Map();
function index(features) {
  const next = new Map();
  for (const record of Object.values(features)) {
    const field = compileGeologyField(record), b = field.bounds;
    for (let z = Math.floor(b.minZ / TILE); z <= Math.floor(b.maxZ / TILE); z++) for (let x = Math.floor(b.minX / TILE); x <= Math.floor(b.maxX / TILE); x++) {
      const key = `${x},${z}`;
      if (!next.has(key)) next.set(key, []);
      next.get(key).push({ record, field });
    }
  }
  source = features; tiles = next;
}
export function getGeologyTerrainDelta(x, z, excludeId = null) {
  const features = useWorldStore.getState().world.geology?.features;
  if (!features) return 0;
  if (source !== features) index(features);
  let delta = 0;
  for (const { record, field } of tiles.get(`${Math.floor(x / TILE)},${Math.floor(z / TILE)}`) ?? []) {
    if (record.id !== excludeId) delta += field.heightAt(x, z);
  }
  return delta;
}
export function geologyAffectsBounds(bounds) {
  const features = useWorldStore.getState().world.geology?.features;
  if (!features) return false;
  if (source !== features) index(features);
  for (let z = Math.floor(bounds.minZ / TILE); z <= Math.floor(bounds.maxZ / TILE); z++) for (let x = Math.floor(bounds.minX / TILE); x <= Math.floor(bounds.maxX / TILE); x++) {
    if ((tiles.get(`${x},${z}`) ?? []).some(({field}) => boundsIntersect(field.bounds, bounds))) return true;
  }
  return false;
}
