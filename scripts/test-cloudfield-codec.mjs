import assert from 'node:assert/strict';
import { FluidVolume, SIM_GRID } from '../src/systems/atmosphere/livingVapor/fluidVolume.js';
import { encodeVapor, restoreVapor, normalizeLivingVapor } from '../src/systems/atmosphere/livingVapor/cloudPersistence.js';
const source = new FluidVolume(SIM_GRID, 7);
source.emit(0, 0, 0, 0.35, 0.8, 1 / 24);
for (let i = 0; i < source.size; i++) {
  source.d[i] *= 1e-8;
  source.u[i] = (i % 25 - 12) * 0.8;
  source.v[i] = (i % 17 - 8) * 0.7;
  source.w[i] = (i % 13 - 6) * 0.6;
}
const snapshot = encodeVapor(source), restored = new FluidVolume(SIM_GRID, 7);
restoreVapor(restored, snapshot);
assert.ok(restored.maxDensity() > 0, 'tiny retained vapor survives quantization');
assert.ok(Math.abs(restored.mass() / source.mass() - 1) < 0.001, 'relative mass preserved even for tiny retained fields');
for (const field of ['u', 'v', 'w']) assert.ok(restored[field].every((value, i) => Math.abs(value - source[field][i]) < 0.001));
const before = restored.d.slice();
assert.throws(() => restoreVapor(restored, { ...snapshot, fields: { ...snapshot.fields, w: 'AA==' } }));
assert.deepEqual(restored.d, before, 'malformed later fields cannot partially mutate a live solver');
assert.throws(() => restoreVapor(restored, { ...snapshot, version: 2 }));
assert.throws(() => restoreVapor(restored, { ...snapshot, grid: 4096 }));
assert.throws(() => normalizeLivingVapor({ version: 2, objects: {} }));
assert.throws(() => normalizeLivingVapor({ version: 1, objects: Object.fromEntries(Array.from({ length: 7 }, (_, i) => ['cloud-' + i, {}])) }));
const oldSource = new FluidVolume(32, 1);
for (let i = 0; i < 40; i++) oldSource.emit(0, 0, 0, 0.35, 0.8, 1 / 24);
const oldSnapshot = encodeVapor(oldSource);
const old = { version: 1, grid: 32, time: 0, fields: oldSnapshot.fields };
// Legacy unsigned-density snapshots without scaling retain their interpretation.
const legacy = new FluidVolume(32, 1); restoreVapor(legacy, old);
assert.ok(Math.abs(legacy.mass() / oldSource.mass() - 1) < 0.001);
const empty = new FluidVolume(32, 1); restoreVapor(empty, encodeVapor(empty));
assert.equal(empty.isEmpty(), true, 'empty saved volumes retain the idle optimization');
const normalized = normalizeLivingVapor({version:1,objects:{faint:{vapor:snapshot,opticalScale:17}}});
assert.equal(normalized.objects.faint.opticalScale,17,'the optical sampling scale survives record normalization');
console.log(JSON.stringify({ pass: true, tinyMass: source.mass(), restoredMass: restored.mass(), snapshotBytes: JSON.stringify(snapshot).length, checks: 'relative density precision, velocity precision, atomic decoding, version/grid/limit rejection, legacy compatibility' }));
