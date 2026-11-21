import { create } from 'zustand';
import { useWorldStore } from '../../world/worldStore';
import { useHistoryStore } from '../../history/historyStore';
import { FluidVolume, SIM_STEP } from './fluidVolume.js';
import { encodeVapor, normalizeCloud } from './cloudPersistence.js';
import { MAX_CLOUDS, DEFAULT_CLOUD } from './settings.js';

export const runtimeClouds = new Map(); // Live Three.js resources never enter world JSON.
export const useCloudUI = create(() => ({ selectedId: null, creationFamily: 'cumulus', tool: 'emit', gesture: 'pull', panelOpen: false, placement: null, message: '', supported: true, limited: false }));
export const cloudRecords = world => world.livingVapor?.objects ?? EMPTY;
const EMPTY = Object.freeze({});
const announce = message => useCloudUI.setState({ message });
export function selectCloud(id) { useCloudUI.setState({ selectedId: id }); }
export function setCloudTool(tool) {
  useCloudUI.setState({ tool });
  window.dispatchEvent(new CustomEvent('tg-cloud-tool-selected'));
}

function replaceRecords(objects) {
  const state = useWorldStore.getState();
  state.replaceWorld({ ...state.world, livingVapor: { version: 1, objects } });
}

function recordHistory(label, id, before, after, fields = null) {
  const snapshot = value => ({ livingVapor: { objects: { [id]: fields && value ? Object.fromEntries(fields.map(key => [key, value[key]])) : value } } });
  const history = useHistoryStore.getState();
  const paths = fields ? fields.map(key => ['livingVapor', 'objects', id, key]) : [['livingVapor', 'objects', id]];
  history.record({ label, before: snapshot(before), after: snapshot(after), metadata: { cloud: true, paths } });
  // Bound cloud history by both command count and serialized bytes. Other tool
  // commands remain intact. Fluid frames themselves never enter Undo history.
  let count = 0, bytes = 0;
  const keep = new Set();
  for (const entry of [...useHistoryStore.getState().undoStack].reverse()) {
    if (!entry.metadata.cloud) { keep.add(entry.id); continue; }
    const size = JSON.stringify(entry).length;
    if (count < 24 && bytes + size < 12 * 1024 * 1024) { keep.add(entry.id); count++; bytes += size; }
  }
  useHistoryStore.setState(state => ({ undoStack: state.undoStack.filter(e => keep.has(e.id)) }));
}

export function cloudWithLiveVapor(id) {
  const record = cloudRecords(useWorldStore.getState().world)[id];
  const runtime = runtimeClouds.get(id);
  return record && runtime ? { ...record, fillPoint: [...runtime.fillPoint], opticalScale: runtime.opticalScale ?? 1, vapor: encodeVapor(runtime.sim) } : record;
}

export function checkpointCloud(id) {
  const record = cloudWithLiveVapor(id);
  if (!record) return;
  const runtime = runtimeClouds.get(id);
  if (runtime) runtime.savedVapor = record.vapor;
  replaceRecords({ ...cloudRecords(useWorldStore.getState().world), [id]: record });
}

export function changeCloud(id, patch, history = true) {
  const objects = cloudRecords(useWorldStore.getState().world);
  if (!objects[id]) return;
  const before = objects[id];
  const after = normalizeCloud({ ...before, ...patch, id });
  replaceRecords({ ...objects, [id]: after });
  if (history) recordHistory('EDIT CLOUD', id, before, after, Object.keys(patch).filter(key => key !== 'id'));
}

export function recordCloudTransform(id, before) {
  const after = cloudRecords(useWorldStore.getState().world)[id];
  if (before && after) recordHistory('TRANSFORM CLOUD', id, before, after, ['position', 'quaternion', 'scale']);
}

export function createCloud(family, position) {
  const objects = cloudRecords(useWorldStore.getState().world);
  if (!useCloudUI.getState().supported) { announce('Living Vapor requires WebGL2 and 3D texture support.'); return null; }
  if (Object.keys(objects).length >= MAX_CLOUDS) { announce(`Cloud limit reached (${MAX_CLOUDS}). Delete a cloud to place another.`); return null; }
  const id = `cloud-${crypto.randomUUID()}`, seed = Math.floor(Math.random() * 100000) + 1;
  const sim = new FluidVolume(32, seed); sim.family = family;
  // A placed object starts with real emitted vapor. No continuous source is enabled.
  for (let i = 0; i < 24; i++) { sim.emit(0, -0.25, 0, 0.42, 0.8, SIM_STEP); sim.step(SIM_STEP); }
  const record = normalizeCloud({ id, family, position, seed, ...DEFAULT_CLOUD, vapor: encodeVapor(sim) });
  replaceRecords({ ...objects, [id]: record });
  recordHistory('PLACE CLOUD', id, undefined, record);
  useCloudUI.setState({ selectedId: id, message: '', placement: null });
  return id;
}

export function deleteCloud(id) {
  const before = cloudWithLiveVapor(id);
  if (!before) return;
  const objects = { ...cloudRecords(useWorldStore.getState().world) };
  delete objects[id];
  replaceRecords(objects);
  recordHistory('DELETE CLOUD', id, before, undefined);
  useCloudUI.setState({ selectedId: Object.keys(objects)[0] ?? null, panelOpen: false });
  window.dispatchEvent(new CustomEvent('tg-cloud-close'));
}
