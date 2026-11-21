import { FluidVolume, SIM_GRID } from './fluidVolume.js';
import { MAX_CLOUDS, DEFAULT_CLOUD } from './settings.js';

const FIELDS = { d: 65535, t: 20000, u: 800, v: 800, w: 800 };
export const MAX_VAPOR_BYTES = SIM_GRID ** 3 * 20;
let snapshotProvider = null;
export function registerCloudSnapshotProvider(provider) {
  snapshotProvider = provider;
  return () => { if (snapshotProvider === provider) snapshotProvider = null; };
}
export function captureLivingVapor(world) { return snapshotProvider?.(world) ?? world.livingVapor; }

function encodeField(field, factor, unsigned = false) {
  const words = [];
  let zeros = 0;
  const flush = () => { if (zeros) { words.push(0, zeros); zeros = 0; } };
  for (const value of field) {
    const q = Math.max(unsigned ? 0 : -32767, Math.min(unsigned ? 65535 : 32767, Math.round(value * factor)));
    if (!q) { zeros++; if (zeros === 65535) flush(); }
    else { flush(); words.push(q & 65535); }
  }
  flush();
  const bytes = new Uint8Array(words.length * 2);
  const view = new DataView(bytes.buffer);
  words.forEach((value, i) => view.setUint16(i * 2, value, true));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

function decodeField(encoded, target, factor, unsigned = false) {
  if (typeof encoded !== 'string' || encoded.length > MAX_VAPOR_BYTES) throw Error('Invalid cloud field size');
  const binary = atob(encoded);
  if (binary.length % 2) throw Error('Truncated cloud field');
  let out = 0;
  for (let i = 0; i < binary.length; i += 2) {
    let word = binary.charCodeAt(i) | binary.charCodeAt(i + 1) << 8;
    if (!word) {
      i += 2;
      if (i + 1 >= binary.length) throw Error('Truncated cloud zero run');
      const count = binary.charCodeAt(i) | binary.charCodeAt(i + 1) << 8;
      if (!count || out + count > target.length) throw Error('Invalid cloud zero run');
      out += count;
    } else {
      if (out >= target.length) throw Error('Cloud field overflow');
      if (!unsigned && word > 32767) word -= 65536;
      target[out++] = word / factor;
    }
  }
  if (out !== target.length) throw Error('Incomplete cloud field');
}

export function encodeVapor(sim) {
  // Relative density precision preserves faint retained fields instead of
  // rounding an entire meaningful volume to zero. Older snapshots imply 1.
  const peak = sim.maxDensity();
  const densityScale = peak > 0 ? Math.min(1e12, Math.max(1, 0.3 / peak)) : 1;
  return { version: 1, grid: SIM_GRID, densityScale, time: sim.time, stepCount: sim.stepCount,
    fields: Object.fromEntries(Object.entries(FIELDS).map(([name, factor]) => [name, encodeField(sim[name], factor * (name === 'd' ? densityScale : 1), name === 'd')])) };
}

export function restoreVapor(sim, data) {
  if (!data) return;
  if (data.version !== 1 || data.grid !== SIM_GRID || JSON.stringify(data).length > MAX_VAPOR_BYTES) throw Error('Unsupported or oversized vapor snapshot');
  // Decode into a temporary solver so malformed input cannot partially mutate a live cloud.
  const densityScale = data.densityScale ?? 1;
  if (!Number.isFinite(densityScale) || densityScale < 1 || densityScale > 1e12) throw Error('Invalid cloud density scale');
  const decoded = new FluidVolume(SIM_GRID, 1);
  for (const [name, factor] of Object.entries(FIELDS)) decodeField(data.fields?.[name], decoded[name], factor * (name === 'd' ? densityScale : 1), name === 'd');
  for (const name of Object.keys(FIELDS)) sim[name].set(decoded[name]);
  sim.retainedMass = null;
  sim.time = Math.max(0, Math.min(1e9, Number(data.time) || 0));
  sim.stepCount = Math.max(0, Math.floor(Number(data.stepCount) || 0));
  const active = decoded.d.some(value => value > 0) || decoded.t.some(value => value > 0.02);
  sim.box = active ? { x0: 1, x1: SIM_GRID - 2, y0: 1, y1: SIM_GRID - 2, z0: 1, z1: SIM_GRID - 2 } : { x0: 1, x1: 0, y0: 1, y1: 0, z0: 1, z1: 0 };
  sim.version++;
}

const finite = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
const vector = (v, fallback, min, max) => fallback.map((value, i) => finite(v?.[i], value, min, max));
export function normalizeCloud(record) {
  const quaternion = vector(record.quaternion, [0, 0, 0, 1], -1, 1);
  const length = Math.hypot(...quaternion);
  return { id: String(record.id).slice(0, 100), family: ['cumulus', 'stratus', 'cirrus'].includes(record.family) ? record.family : 'cumulus',
    seed: finite(record.seed, 1, 1, 1e9), position: vector(record.position, [0, 20, 0], -100000, 100000),
    quaternion: length > 1e-6 ? quaternion.map(v => v / length) : [0, 0, 0, 1],
    scale: vector(Array.isArray(record.scale) ? record.scale : [record.scale, record.scale, record.scale], [1, 1, 1], 0.3, 3.5),
    density: finite(record.density, DEFAULT_CLOUD.density, 0.05, 1),
    persistencePercent: finite(record.persistencePercent, DEFAULT_CLOUD.persistencePercent, 0, 100),
    radius: finite(record.radius, DEFAULT_CLOUD.radius, 0.12, 0.65),
    opticalScale: finite(record.opticalScale, 1, 1, 1e12),
    fill: Boolean(record.fill), cage: record.cage !== false,
    fillPoint: vector(record.fillPoint, [0, -0.3, 0], -0.82, 0.82), vapor: record.vapor ?? null };
}

export function normalizeLivingVapor(data) {
  if (!data) return undefined;
  if (data.version !== 1 || !data.objects || typeof data.objects !== 'object') throw Error('Unsupported Living Vapor world data');
  const entries = Object.entries(data.objects);
  if (entries.length > MAX_CLOUDS) throw Error('Saved world exceeds the cloud limit');
  const objects = {};
  for (const [id, value] of entries) {
    if (!value || typeof value !== 'object' || id === '__proto__' || id === 'constructor') throw Error('Invalid cloud record');
    const record = normalizeCloud({ ...value, id });
    if (record.vapor) restoreVapor(new FluidVolume(SIM_GRID, record.seed), record.vapor);
    objects[id] = record;
  }
  return { version: 1, objects };
}
