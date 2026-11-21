import assert from 'node:assert/strict';
import { rayHitCloud, worldToLocal, localToWorld, pointerLocal, rayPlane, clampToCage, skyElevation, quatRotate } from '../src/systems/atmosphere/livingVapor/cloudMath.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const s = Math.SQRT1_2;
const cloud = { pos: [0, 10, -24], quat: [0, 0, 0, 1], axes: [7.5, 6, 6] };

// local <-> world roundtrip, including a rotated cloud
const rot = { pos: [3, 8, -20], quat: [0, s, 0, s], axes: [7.5, 6, 3] }; // 90 degrees about Y
for (const l of [[0, 0, 0], [0.5, -0.2, 0.7], [-1, 1, 0.3]]) {
  const back = worldToLocal(rot, localToWorld(rot, l));
  l.forEach((v, i) => close(v, back[i]));
}
const v = quatRotate([0, s, 0, s], [1, 0, 0]); close(v[0], 0); close(v[2], -1); // +x turned 90 about +y -> -z

// A ray from the origin at the cloud centre hits the cage in front, not the back
const dir = [0, 10 / Math.hypot(10, 24), -24 / Math.hypot(10, 24)];
const hit = rayHitCloud([0, 0, 0], dir, cloud);
assert.ok(hit && hit.t > 0 && hit.t < Math.hypot(10, 24));
close(Math.hypot(...hit.local), 0.95, 1e-6);
// Ray that passes well beside the cage misses
assert.equal(rayHitCloud([0, 0, 0], [1, 0, 0], cloud), null);
// Ray pointing away misses
assert.equal(rayHitCloud([0, 0, 0], [0, 0, 1], cloud), null);
// Camera inside the cage still picks it
assert.ok(rayHitCloud([0, 10, -24], [0, 0, -1], cloud));
// A rotated/scaled cloud is hit where its ellipsoid actually is (long x axis turned toward the camera)
assert.ok(rayHitCloud([0, 8, 0], norm([3, 0, -20]), rot));

// Pointer position on the camera-facing plane through the cloud centre
const f = [0, 0, -1];
const pl = pointerLocal([0, 10, 0], [0.1, 0, -1].map((x, i, a) => x / Math.hypot(...a)), cloud, f);
assert.ok(pl && pl[0] > 0 && Math.abs(pl[1]) < 1e-9, 'pointer to the right of centre gives +x local');
assert.equal(rayPlane([0, 0, 0], [0, 0, 1], [0, 0, -5], [0, 0, -1]), null, 'plane behind the ray is not hit');

// clamps and sky test
close(Math.hypot(...clampToCage([2, 0, 0])), 0.82);
assert.deepEqual(clampToCage([0.1, 0.1, 0.1]), [0.1, 0.1, 0.1]);
assert.ok(skyElevation([0, 1, 0]) > 1.5 && skyElevation([0, -1, 0]) < -1.5);
function norm(a) { const l = Math.hypot(...a); return a.map((x) => x / l); }
console.log(JSON.stringify({ pass: true }));
