// Pure geometry helpers for picking and moving clouds. No Three.js here, so these are easy
// to test. Vectors are [x, y, z] arrays; quaternions are [x, y, z, w] (same order as Three.js).
//
// A cloud is described by { pos: [x,y,z], quat: [x,y,z,w], axes: [ax,ay,az] } where `axes`
// are the cage's half-sizes in world units (family size x the Scale tool).

export const CAGE_PICK_RADIUS = 0.95; // in cage space (cage edge is ~1.0)

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export const quatConj = (q) => [-q[0], -q[1], -q[2], q[3]];
export function quatRotate(q, v) {
  const [x, y, z, w] = q;
  // t = 2 * cross(q.xyz, v); v' = v + w * t + cross(q.xyz, t)
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

export function worldToLocal(c, p) {
  const r = quatRotate(quatConj(c.quat), sub(p, c.pos));
  return [r[0] / c.axes[0], r[1] / c.axes[1], r[2] / c.axes[2]];
}
export function localToWorld(c, l) {
  const r = quatRotate(c.quat, [l[0] * c.axes[0], l[1] * c.axes[1], l[2] * c.axes[2]]);
  return add(r, c.pos);
}
// A world-space direction expressed in cage space (not normalized).
export function worldDirToLocal(c, d) {
  const r = quatRotate(quatConj(c.quat), d);
  return [r[0] / c.axes[0], r[1] / c.axes[1], r[2] / c.axes[2]];
}

// Does the ray pass through the cloud's cage? Returns { t, local } (local = cage-space hit) or null.
export function rayHitCloud(origin, dir, c, radius = CAGE_PICK_RADIUS) {
  const o = worldToLocal(c, origin);
  const d = worldDirToLocal(c, dir);
  const a = dot(d, d);
  const b = 2 * dot(o, d);
  const k = dot(o, o) - radius * radius;
  const disc = b * b - 4 * a * k;
  if (disc < 0 || a < 1e-12) return null;
  const sq = Math.sqrt(disc);
  let t = (-b - sq) / (2 * a);
  if (t < 0) t = (-b + sq) / (2 * a); // camera inside the cage
  if (t < 0) return null;
  return { t, local: [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t] };
}

// Where does the ray meet the plane through `planePoint` with normal `normal`?
export function rayPlane(origin, dir, planePoint, normal) {
  const denom = dot(dir, normal);
  if (Math.abs(denom) < 1e-6) return null;
  const t = dot(sub(planePoint, origin), normal) / denom;
  if (t < 0) return null;
  return add(origin, scale(dir, t));
}

// Cage-space position the pointer is "pointing at", on the plane through the cloud's centre
// facing the camera. This is what places the emitter and gestures inside the cloud.
export function pointerLocal(origin, dir, c, viewForward) {
  const hit = rayPlane(origin, dir, c.pos, viewForward);
  return hit ? worldToLocal(c, hit) : null;
}

export function clampToCage(l, radius = 0.82) {
  const m = len(l);
  return m > radius ? scale(l, radius / m) : l;
}

// Is this ray aimed at the sky (above the horizon by at least `minElevation` radians)?
export function skyElevation(dir) {
  return Math.asin(Math.max(-1, Math.min(1, norm(dir)[1])));
}
