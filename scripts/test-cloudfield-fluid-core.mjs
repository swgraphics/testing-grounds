// Behavior tests for the fluid core. Run: node tests/fluid-core.mjs
import assert from 'node:assert/strict';
import { FluidVolume, SIM_GRID, SIM_STEP } from '../src/systems/atmosphere/livingVapor/fluidVolume.js';

const DT = SIM_STEP;
const N = SIM_GRID;
const results = {};
const finite = (f) => { for (let i = 0; i < f.size; i += 1) if (!Number.isFinite(f.d[i]) || !Number.isFinite(f.u[i]) || !Number.isFinite(f.v[i]) || !Number.isFinite(f.w[i])) return false; return true; };
function grow(seed, seconds, { density = 0.8, persistence = 110, radius = 0.34, at = [0, -0.3, 0] } = {}) {
  const f = new FluidVolume(N, seed); f.persistence = persistence;
  for (let i = 0; i < seconds / DT; i += 1) { f.emit(at[0], at[1], at[2], radius, density, DT); f.step(DT); }
  return f;
}
function centroid(f) { let s = 0, x = 0, y = 0, z = 0; const n = f.n; for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const d = f.d[i + n * (j + n * k)]; s += d; x += d * i; y += d * j; z += d * k; } return [x / s, y / s, z / s]; }

// 1. Emission is immediate and visible.
{
  const f = new FluidVolume(N, 1);
  f.emit(0, 0, 0, 0.34, 0.8, DT);
  assert.ok(f.mass() > 5, 'one emission call writes vapor straight away');
  assert.ok(f.maxDensity() > 0.1);
}

// 2. Holding the emitter makes a growing, cohesive body (not scattered specks).
{
  const f = grow(2, 2);
  let cells = 0; for (let i = 0; i < f.size; i++) if (f.d[i] > 0.05) cells++;
  results.voxelsAfterTwoSecondHold = cells;
  assert.ok(cells > 1500, 'a 2-second hold fills a substantial volume');
  assert.ok(finite(f), 'no NaN / Infinity');
}

// 3. NEW-vapor density slider: sets the density of what is emitted, never rescales what exists.
{
  const f = new FluidVolume(N, 3);
  for (let i = 0; i < 40; i++) f.emit(-0.5, 0, 0, 0.25, 0.3, DT); // thin vapor on the left, slider at 30%
  const leftMax = f.maxDensity();
  assert.ok(leftMax <= 0.3 + 1e-6, 'emitted density never exceeds the slider value at emit time');
  const snapshot = f.d.slice();
  for (let i = 0; i < 40; i++) f.emit(0.5, 0, 0, 0.25, 1.0, DT); // slider moved to 100%, emit on the right
  let leftChanged = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N / 3; x++) { const i = x + N * (y + N * z); if (f.d[i] !== snapshot[i]) leftChanged++; }
  assert.equal(leftChanged, 0, 'raising the slider does not change vapor emitted earlier (left side untouched)');
  assert.ok(f.maxDensity() > 0.8, 'new vapor does use the new, higher density');
  results.sliderIsolation = 'pass';
}

// 4. Persistence: a slider that really changes the fade rate, and changing it never rescales instantly.
{
  const slow = grow(4, 2), fast = grow(4, 2), long = grow(4, 2); // identical clouds; only the slider differs afterwards
  const m0 = slow.mass();
  assert.ok(Math.abs(fast.mass() - m0) / m0 < 0.02, 'same cloud before fading starts');
  fast.persistence = 8; long.persistence = 240; slow.persistence = 110;
  const before = slow.d.slice(); slow.persistence = 240; slow.persistence = 110;
  assert.deepEqual(slow.d, before, 'moving the persistence slider does not touch stored density');
  for (let i = 0; i < 8 / DT; i++) { slow.step(DT); fast.step(DT); long.step(DT); }
  const r = (f) => f.mass() / m0;
  results.retainedAfter8s = { 'persistence 8s': +r(fast).toFixed(3), 'persistence 110s': +r(slow).toFixed(3), 'persistence 240s': +r(long).toFixed(3) };
  assert.ok(r(slow) > 0.85, 'default persistence keeps most of the vapor over 8 s');
  assert.ok(r(fast) < 0.6 && r(fast) > 0.2, '8 s persistence fades clearly faster');
  assert.ok(r(long) > r(slow) - 0.001, 'longer persistence never fades faster');
}

// 5. The cloud keeps living after input stops (no dirty flag): it keeps moving and stays alive.
{
  const f = grow(5, 2);
  for (let i = 0; i < 3 / DT; i++) f.step(DT);
  const c1 = centroid(f); const d1 = f.d.slice();
  for (let i = 0; i < 4 / DT; i++) f.step(DT);
  const c2 = centroid(f);
  let diff = 0; for (let i = 0; i < f.size; i++) diff += Math.abs(f.d[i] - d1[i]);
  results.fieldChangeWhileIdle = +diff.toFixed(1);
  assert.ok(diff > 25, 'density field keeps evolving with no input');
  assert.ok(Math.hypot(c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]) > 0.05, 'cloud body keeps drifting');
  assert.ok(f.mass() > 100 && finite(f));
}

// 6. Gestures move the AIR, never create or remove vapor.
{
  const f = grow(6, 2);
  const m = f.mass(), dens = f.d.slice();
  f.gesture('pull', 0, 0, 0, 0.9, 0.1, 0, 0.4, 1, DT);
  f.gesture('push', 0, 0, 0, 0, 0, 0, 0.4, 1, DT);
  f.gesture('pinch', 0, 0, 0, 0, 0, 0, 0.4, 1, DT);
  assert.deepEqual(f.d, dens, 'gesture alone leaves density exactly untouched');
  assert.equal(f.mass(), m);
  let speed = 0; for (let i = 0; i < f.size; i++) speed += Math.abs(f.u[i]);
  assert.ok(speed > 0, 'gesture does change velocity');
}

// 7. A pull drags the vapor along: centroid shifts in the swipe direction and keeps going briefly.
{
  const a = grow(7, 3), b = grow(7, 3); // identical twins
  const c0 = centroid(a);
  for (let i = 0; i < 12; i++) { a.gesture('pull', 0, -0.1, 0, 1.2, 0, 0, 0.5, 1, DT); a.step(DT); b.step(DT); }
  for (let i = 0; i < 30; i++) { a.step(DT); b.step(DT); }
  const ca = centroid(a), cb = centroid(b);
  results.pullShiftCells = +(ca[0] - cb[0]).toFixed(2);
  assert.ok(ca[0] - cb[0] > 0.5, 'swipe to +x moves vapor to +x relative to an untouched twin');
  void c0;
}

// 8. Mass bookkeeping: with no emission, mass only falls by the fade, never grows.
{
  const f = grow(8, 2, { persistence: 240 });
  let prev = f.mass();
  for (let i = 0; i < 6 / DT; i++) { f.step(DT); const m = f.mass(); assert.ok(m <= prev * 1.0005, 'vapor is never created by the simulation'); prev = m; }
}

// 9. Different families behave differently (not just a different cage size).
{
  const stats = {};
  for (const fam of ['cumulus', 'stratus', 'cirrus']) {
    const f = new FluidVolume(N, 9); f.family = fam;
    for (let i = 0; i < 90; i++) { f.emit(0, -0.3, 0, 0.3, 0.8, DT); f.step(DT); }
    for (let i = 0; i < 90; i++) f.step(DT);
    const c = centroid(f); let sy = 0, m = 0; const n = f.n;
    for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const d = f.d[i + n * (j + n * k)]; sy += d * (j - c[1]) ** 2; m += d; }
    stats[fam] = { height: +c[1].toFixed(1), verticalSpread: +Math.sqrt(sy / m).toFixed(2), driftX: +c[0].toFixed(1) };
  }
  results.families = stats;
  assert.ok(stats.stratus.verticalSpread < stats.cumulus.verticalSpread * 0.8, 'stratus stays flat and layered');
  assert.ok(stats.stratus.height < stats.cumulus.height - 1, 'stratus sits lower than rising cumulus');
  assert.ok(stats.cirrus.driftX > stats.cumulus.driftX + 1.0, 'cirrus streams sideways');
}

// 10. Cost.
{
  const f = grow(10, 3); const t0 = performance.now(); const n = 90;
  for (let i = 0; i < n; i++) f.step(DT);
  results.msPerStepSettledCloud = +((performance.now() - t0) / n).toFixed(2);
  const g = new FluidVolume(N, 11); const t1 = performance.now();
  for (let i = 0; i < 60; i++) { g.emit(0, -0.3, 0, 0.45, 0.9, DT); g.step(DT); }
  results.msPerStepWhileEmittingLarge = +((performance.now() - t1) / 60).toFixed(2);
}

console.log(JSON.stringify({ pass: true, ...results }, null, 2));
