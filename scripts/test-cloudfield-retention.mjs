import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { FluidVolume, SIM_STEP } from '../src/systems/atmosphere/livingVapor/fluidVolume.js';
import { persistenceSeconds } from '../src/systems/atmosphere/livingVapor/settings.js';
import { encodeVapor, restoreVapor } from '../src/systems/atmosphere/livingVapor/cloudPersistence.js';

const results = [];
await fs.mkdir('cloudfield-2.local/retention', { recursive: true });
for (const family of ['cumulus', 'stratus', 'cirrus']) {
  const sim = new FluidVolume(32, 42); sim.family = family;
  for (let i = 0; i < 48; i++) { sim.emit(0, -0.25, 0, 0.38, 0.8, SIM_STEP); sim.step(SIM_STEP); }
  sim.persistence = persistenceSeconds(100);
  sim.emit = () => { throw Error('Retention must never inject vapor'); };
  const initial = sim.mass(), before = sim.d.slice();
  let maxError = 0;
  for (let i = 0; i < 24 * 120; i++) {
    sim.step(SIM_STEP);
    maxError = Math.max(maxError, Math.abs(sim.mass() / initial - 1));
  }
  assert.ok(maxError < 0.00000001, `${family}: relative mass drift ${maxError} < 0.000001%`);
  assert.ok(sim.maxDensity() > 0, 'visible density remains available for optical normalization');
  assert.ok(sim.d.some((v, i) => Math.abs(v - before[i]) > 0.01), 'fluid evolves after emission stops');
  assert.ok(sim.d.every(v => Number.isFinite(v) && v >= 0 && v <= 1), `${family}: density bounded, peak ${sim.maxDensity()}`);
  const snapshot = encodeVapor(sim), restored = new FluidVolume(32, 42);
  await fs.writeFile(`cloudfield-2.local/retention/${family}.json`, JSON.stringify({ family, seed: 42, vapor: snapshot }));
  restoreVapor(restored, snapshot);
  assert.ok(Math.abs(restored.mass() / sim.mass() - 1) < 0.001, 'quantized mass restored within 0.1%');
  const unchanged = sim.d.slice(); sim.persistence = persistenceSeconds(30);
  assert.deepEqual(sim.d, unchanged, 'persistence changes do not rescale density');
  for (let i = 0; i < 240; i++) sim.step(SIM_STEP);
  assert.ok(sim.mass() < initial * 0.5, 'normal fading resumes');
  results.push({ family, simulatedSecondsWithoutEmission: 120, maxRelativeMassError: maxError, retainedPeak: restored.maxDensity(), snapshotBytes: JSON.stringify(snapshot).length });
}
console.log(JSON.stringify({ pass: true, results }, null, 2));
await fs.writeFile('cloudfield-2.local/retention/results.json', JSON.stringify({ pass: true, results }, null, 2));
