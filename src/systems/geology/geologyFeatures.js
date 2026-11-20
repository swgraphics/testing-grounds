import { useWorldStore } from '../world/worldStore';
import { terrainSettings } from '../terrain/terrainSettings';
import { getTerrainRegions, hasTerrainAt, terrainChunkAt } from '../world/terrainRegions';
import { beginHistoryTransaction, commitHistoryTransaction, getHistoryPathSnapshot, useHistoryStore } from '../history/historyStore';
import { geologyDefinition, geologyBounds, unionBounds } from './geologyDefinition';
import { compileGeologyField, GEOLOGY_SHAPE_KEYS, MAX_GEOLOGY_FEATURES, normalizeGeologyRecord, sampleGeologyFoundation } from './geologyField';

export const geologyFeatures = (world = useWorldStore.getState().world) => world.geology?.features ?? {};
export function pickGeologyFeatureAt(x,z) {
  let selected=null,score=.1;
  for(const record of Object.values(geologyFeatures())){const value=Math.abs(compileGeologyField(record).heightAt(x,z));if(value>score){selected=record;score=value}}
  return selected;
}
const shape = settings => Object.fromEntries(GEOLOGY_SHAPE_KEYS.map(key => [key, settings[key]]));
export function captureGeologyFoundation(world = useWorldStore.getState().world) {
  const settings = shape(world.terrainSurface?.settings ?? terrainSettings);
  return { blank: world.worldType === 'blank', settings, regions: world.terrainSurface ? getTerrainRegions(world).slice(1).map(region => ({
    bounds: { minX: region.minX, maxX: region.maxX, minZ: region.minZ, maxZ: region.maxZ },
    settings: shape({ ...settings, ...world.chunks[region.id]?.terrain }),
  })) : [] };
}
export function draftGeologyFeature(type, definition, position, options = {}) {
  const world = useWorldStore.getState().world;
  const foundation = options.foundation ?? captureGeologyFoundation(world);
  const x = Number(position[0]), z = Number(position[2]);
  return normalizeGeologyRecord({ version: 1, id: options.id ?? 'geology-preview', name: options.name ?? type.toUpperCase().replaceAll('-', ' '),
    geologyType: type, chunkId: options.chunkId ?? terrainChunkAt(x, z, world)?.id ?? world.currentChunkId,
    position: [x, options.elevation ?? sampleGeologyFoundation(foundation, x, z), z],
    definition: geologyDefinition(type, definition), foundation, ...(options.refinement?{refinement:options.refinement}:{}) });
}

function pathsFor(id) { return [['geology', 'features', id], ['geology', 'revision']]; }
let gesture = null;
export function beginGeologyEdit(id, label = 'EDIT GEOLOGY') {
  if (gesture && gesture.transaction === useHistoryStore.getState().transaction) return gesture.id === id;
  gesture = null;
  const record = geologyFeatures()[id], paths = pathsFor(id);
  if (!beginHistoryTransaction(label, getHistoryPathSnapshot(paths), { paths, geology: true, geologyBounds: record ? geologyBounds(record) : null })) return false;
  gesture = { id, paths, before: record, bounds: record ? geologyBounds(record) : null, transaction: useHistoryStore.getState().transaction };
  return true;
}
export function commitGeologyEdit() {
  if (!gesture) return false;
  const active = gesture; gesture = null;
  if (active.transaction !== useHistoryStore.getState().transaction) return false;
  return commitHistoryTransaction(getHistoryPathSnapshot(active.paths), { metadata: { paths: active.paths, geology: true, geologyBounds: active.bounds } });
}
function publish(id, record) {
  const store = useWorldStore.getState(), world = store.world, old = geologyFeatures(world)[id];
  if (record) compileGeologyField(record); // Reject invalid/unbounded work before touching canonical data.
  const features = { ...geologyFeatures(world) };
  if (record) features[id] = record; else delete features[id];
  const bounds = unionBounds(old ? geologyBounds(old) : null, record ? geologyBounds(record) : null);
  if (gesture?.id === id) gesture.bounds = unionBounds(gesture.bounds, bounds);
  useWorldStore.setState({ world: { ...world, geology: { version: 1, revision: Number(world.geology?.revision ?? 0) + 1, features } } });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('geology-terrain-changed', { detail: { id, bounds } }));
  return record;
}
export function cancelGeologyEdit() {
  if (!gesture) return false;
  const active = gesture; gesture = null;
  if (active.transaction !== useHistoryStore.getState().transaction) return false;
  publish(active.id, active.before);
  useHistoryStore.getState().cancelTransaction();
  return true;
}
export function createGeologyFeature(type, definition, position, options = {}) {
  const world = useWorldStore.getState().world;
  if (!hasTerrainAt(position[0], position[2], world)) return null;
  if (Object.keys(geologyFeatures(world)).length >= MAX_GEOLOGY_FEATURES) throw Error('The world geology feature limit has been reached.');
  const id = options.id ?? `geology-${globalThis.crypto?.randomUUID?.() ?? Date.now() + '-' + Math.random().toString(36).slice(2)}`;
  if (geologyFeatures(world)[id]) throw Error('Geology feature ID already exists');
  const record = draftGeologyFeature(type, definition, position, { ...options, id });
  compileGeologyField(record);
  const started = beginGeologyEdit(id, 'PLACE GEOLOGY');
  if (!started) throw Error('Finish the active edit before placing geology.');
  publish(id, record); commitGeologyEdit();
  return id;
}
export function updateGeologyFeature(id, patch = {}, options = {}) {
  const previous = geologyFeatures()[id];
  if (!previous) return false;
  const input = patch.definition ?? patch.geologyDefinition ?? {};
  const definition = { ...previous.definition, ...input, sides: {
    left: { ...previous.definition.sides.left, ...input.sides?.left }, right: { ...previous.definition.sides.right, ...input.sides?.right },
  } };
  const record = normalizeGeologyRecord({ ...previous, ...patch, definition });
  if (JSON.stringify(record) === JSON.stringify(previous)) return false;
  compileGeologyField(record);
  const ownGesture = gesture?.id === id && gesture.transaction === useHistoryStore.getState().transaction;
  if (!ownGesture && !beginGeologyEdit(id)) return false;
  publish(id, record);
  if (!ownGesture && !options.continuous) commitGeologyEdit();
  return true;
}
export function removeGeologyFeature(id) {
  if (!geologyFeatures()[id] || !beginGeologyEdit(id, 'REMOVE GEOLOGY')) return false;
  publish(id, null); commitGeologyEdit();
  return true;
}
