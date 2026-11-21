// FluidVolume — the living heart of a CloudField cloud.
//
// One FluidVolume is ONE cloud. It owns a small 3D grid (default 32 x 32 x 32 cells)
// holding five things per cell:
//   d  = vapor density   (what you see)
//   t  = heat            (makes fresh vapor rise and billow, then fades quickly)
//   u,v,w = velocity     (how the vapor is moving)
//
// Every step the simulation: pushes the air around (buoyancy, a slow ambient swirl,
// vorticity "curl" boost for billows, a soft cage wall), makes the air swirl instead of
// compress (pressure projection), then carries density and heat along with the air
// (semi-Lagrangian advection). Density slowly fades at a rate set by `persistence`.
//
// Pure JavaScript with no imports, so it runs in the browser, in Node tests, and in the
// render harness exactly the same way.
//
// Coordinates: the cage is the cube [-1, 1]^3 in "cage space" ("normalized" below).
// Internally velocities are measured in grid cells per second.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SIM_GRID = 32; // cells per side, per cloud
export const SIM_STEP = 1 / 24; // the app advances every cloud at a fixed 24 steps per second
export const EMPTY_EPS = 0.004; // below this a cell counts as empty
const MARGIN = 3; // cells of padding around the active region

export const CLOUD_FAMILIES = {
  // dims are the half-sizes of the cage in world units (before the user's Scale tool).
  // flow tunes how the vapor behaves, so families differ in motion, not only in shape.
  cumulus: { label: 'Cumulus · billowing', dims: [7.5, 6, 6], buoyancy: 3.6, vort: 3.2, swirl: 1.5, drag: 0.9, heatDecay: 0.34, lift: 1, spread: 1, vdrag: 0, wind: 0 },
  stratus: { label: 'Stratus · layered', dims: [10.5, 3, 7.5], buoyancy: 0.9, vort: 0.8, swirl: 0.9, drag: 1.5, heatDecay: 0.9, lift: 0.1, spread: 1.7, vdrag: 3.2, wind: 0.3 },
  cirrus: { label: 'Cirrus · wispy', dims: [11, 3.4, 5.3], buoyancy: 0.5, vort: 2.2, swirl: 2.2, drag: 0.55, heatDecay: 1.1, lift: 0.3, spread: 0.8, vdrag: 1.4, wind: 2.6 },
};

export class FluidVolume {
  constructor(n = SIM_GRID, seed = 1) {
    this.n = n;
    const size = n * n * n;
    this.size = size;
    this.d = new Float32Array(size);
    this.t = new Float32Array(size);
    this.u = new Float32Array(size);
    this.v = new Float32Array(size);
    this.w = new Float32Array(size);
    this.d2 = new Float32Array(size);
    this.d3 = new Float32Array(size);
    this.t2 = new Float32Array(size);
    this.u2 = new Float32Array(size);
    this.v2 = new Float32Array(size);
    this.w2 = new Float32Array(size);
    this.p = new Float32Array(size);
    this.div = new Float32Array(size);
    this.ox = new Float32Array(size);
    this.oy = new Float32Array(size);
    this.oz = new Float32Array(size);
    this.om = new Float32Array(size);

    this.persistence = 110; // seconds for vapor to fade to ~37%
    this.family = 'cumulus';
    this.time = 0;
    this.version = 0; // bumps whenever the density changes (so the renderer knows to re-upload)
    this.rand = mulberry32(seed * 7919 + 13);

    // Active region: only this box is simulated, so small clouds are cheap.
    this.box = { x0: 1, x1: 0, y0: 1, y1: 0, z0: 1, z1: 0 }; // empty
    this.stepCount = 0;
    this._massAfter = 0;
    this.retainedDensity = new Float32Array(size);
    this.retainedMass = null;

    // Per-axis lookup tables used by the cage wall and the ambient swirl.
    this.axis = new Float32Array(n);
    for (let i = 0; i < n; i += 1) this.axis[i] = ((i + 0.5) / n) * 2 - 1;
    this.modes = [];
    const r = this.rand;
    for (let m = 0; m < 4; m += 1) {
      this.modes.push({
        k: [0, 1, 2].map(() => (0.9 + r() * 1.7) * (r() < 0.5 ? -1 : 1)),
        phase: [0, 1, 2].map(() => r() * Math.PI * 2),
        speed: [0, 1, 2].map(() => 0.12 + r() * 0.22),
        amp: [0, 1, 2].map(() => (r() - 0.5) * 2),
      });
    }
    this.tabs = [];
    for (let m = 0; m < 4; m += 1) this.tabs.push({ v: [0, 1, 2].map(() => new Float32Array(n)), g: [0, 1, 2].map(() => new Float32Array(n)) });
  }

  get flow() {
    return CLOUD_FAMILIES[this.family] || CLOUD_FAMILIES.cumulus;
  }

  clear() {
    this.retainedMass = null;
    for (const f of [this.d, this.t, this.u, this.v, this.w, this.d2, this.t2, this.u2, this.v2, this.w2, this.p, this.div]) f.fill(0);
    this.box = { x0: 1, x1: 0, y0: 1, y1: 0, z0: 1, z1: 0 };
    this.version += 1;
  }

  // ---- helpers -------------------------------------------------------------------------
  idx(x, y, z) {
    return x + this.n * (y + this.n * z);
  }

  toGrid(a) {
    return ((a + 1) / 2) * this.n - 0.5;
  }

  mass() {
    let s = 0;
    const d = this.d;
    const b = this.box;
    if (b.x1 < b.x0) return 0;
    const n = this.n;
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      const row = n * (y + n * z);
      for (let x = b.x0; x <= b.x1; x += 1) s += d[row + x];
    }
    return s;
  }

  maxDensity() {
    let m = 0;
    for (let i = 0; i < this.size; i += 1) if (this.d[i] > m) m = this.d[i];
    return m;
  }

  isEmpty() {
    return this.box.x1 < this.box.x0;
  }

  _touch(x0, x1, y0, y1, z0, z1) {
    const n = this.n;
    const lo = (v) => clamp(Math.floor(v) - MARGIN, 1, n - 2);
    const hi = (v) => clamp(Math.ceil(v) + MARGIN, 1, n - 2);
    const b = this.box;
    if (b.x1 < b.x0) {
      b.x0 = lo(x0); b.x1 = hi(x1); b.y0 = lo(y0); b.y1 = hi(y1); b.z0 = lo(z0); b.z1 = hi(z1);
    } else {
      b.x0 = Math.min(b.x0, lo(x0)); b.x1 = Math.max(b.x1, hi(x1));
      b.y0 = Math.min(b.y0, lo(y0)); b.y1 = Math.max(b.y1, hi(y1));
      b.z0 = Math.min(b.z0, lo(z0)); b.z1 = Math.max(b.z1, hi(z1));
    }
  }

  // ---- input: emission -------------------------------------------------------------------
  // Adds NEW vapor around (x,y,z) in cage space. `density` (0..1) is the ceiling for the vapor
  // emitted by this call: it is written into the cells at that moment and is never rescaled
  // later. Existing vapor is not touched by changes to `density`.
  emit(x, y, z, radius, density, dt) {
    const n = this.n;
    const r = this.rand;
    const d = this.d;
    const heatGain = 1.0;
    const fl = this.flow;
    const blobs = 3;
    for (let b = 0; b < blobs; b += 1) {
      // Each blob is a slightly different size and position -> a lumpy, irregular body.
      const jr = radius * (0.35 + r() * 0.45);
      const ox = x + (r() - 0.5) * radius * 1.3;
      const oy = y + (r() - 0.5) * radius * 1.0 + radius * 0.15;
      const oz = z + (r() - 0.5) * radius * 1.3;
      const cx = this.toGrid(ox);
      const cy = this.toGrid(oy);
      const cz = this.toGrid(oz);
      const rc = (jr * n) / 2; // radius in cells
      const reach = Math.ceil(rc * 2.0);
      const x0 = Math.max(1, Math.floor(cx - reach)); const x1 = Math.min(n - 2, Math.ceil(cx + reach));
      const y0 = Math.max(1, Math.floor(cy - reach)); const y1 = Math.min(n - 2, Math.ceil(cy + reach));
      const z0 = Math.max(1, Math.floor(cz - reach)); const z1 = Math.min(n - 2, Math.ceil(cz + reach));
      if (x1 < x0 || y1 < y0 || z1 < z0) continue;
      this._touch(x0, x1, y0, y1, z0, z1);
      const rate = clamp(5.5 * dt, 0, 1);
      const jx = (r() - 0.5) * 5; const jy = (r() - 0.5) * 3; const jz = (r() - 0.5) * 5;
      const inv = 1 / (rc * rc + 1e-6);
      for (let zz = z0; zz <= z1; zz += 1) for (let yy = y0; yy <= y1; yy += 1) for (let xx = x0; xx <= x1; xx += 1) {
        const dx = xx - cx; const dy = yy - cy; const dz = zz - cz;
        const q = (dx * dx + dy * dy + dz * dz) * inv;
        if (q > 4) continue;
        const wgt = Math.exp(-q * 1.2);
        const i = xx + n * (yy + n * zz);
        // Raise toward the ceiling only; vapor that is already denser is left alone.
        if (d[i] < density) d[i] += (density - d[i]) * rate * wgt;
        this.t[i] = Math.min(1.5, this.t[i] + heatGain * wgt * dt * 3.2);
        // Expanding, lifting, slightly random push -> immediate visible motion.
        const dist = Math.sqrt(q) + 1e-3;
        const blend = clamp(wgt * 0.22 * (dt * 60), 0, 0.5);
        this.u[i] += (dx / dist * 2.6 * fl.spread + jx - this.u[i]) * blend;
        this.v[i] += (3.4 * fl.lift + dy / dist * 1.2 + jy * fl.lift - this.v[i]) * blend;
        this.w[i] += (dz / dist * 2.6 * fl.spread + jz - this.w[i]) * blend;
      }
    }
    this.retainedMass = this.persistence === Infinity ? this.mass() : null;
    this.version += 1;
  }

  // ---- input: gestures -------------------------------------------------------------------
  // Gestures push the AIR, never the vapor directly. They change velocity only and cannot
  // create or remove density. mode: 'pull' | 'push' | 'pinch'.
  // (x,y,z) is the pointer position in cage space. (vx,vy,vz) is the pointer's own
  // velocity in cage units per second. `strength` scales the effect.
  gesture(mode, x, y, z, vx, vy, vz, radius, strength, dt) {
    const n = this.n;
    const cx = this.toGrid(x); const cy = this.toGrid(y); const cz = this.toGrid(z);
    const rr = mode === 'pinch' ? radius * 0.6 : mode === 'push' ? radius * 1.5 : radius;
    const rc = (rr * n) / 2;
    const reach = Math.ceil(rc * 2);
    const x0 = Math.max(1, Math.floor(cx - reach)); const x1 = Math.min(n - 2, Math.ceil(cx + reach));
    const y0 = Math.max(1, Math.floor(cy - reach)); const y1 = Math.min(n - 2, Math.ceil(cy + reach));
    const z0 = Math.max(1, Math.floor(cz - reach)); const z1 = Math.min(n - 2, Math.ceil(cz + reach));
    if (x1 < x0 || y1 < y0 || z1 < z0) return;
    // Only touch cells that already hold vapor or lie close to it.
    this._touch(x0, x1, y0, y1, z0, z1);
    const half = n / 2;
    const tvx = vx * half; const tvy = vy * half; const tvz = vz * half; // cells / s
    const inv = 1 / (rc * rc + 1e-6);
    const k = clamp(dt * 7 * strength, 0, 0.9);
    for (let zz = z0; zz <= z1; zz += 1) for (let yy = y0; yy <= y1; yy += 1) for (let xx = x0; xx <= x1; xx += 1) {
      const dx = xx - cx; const dy = yy - cy; const dz = zz - cz;
      const q = (dx * dx + dy * dy + dz * dz) * inv;
      if (q > 4) continue;
      const wgt = Math.exp(-q * 1.4);
      const i = xx + n * (yy + n * zz);
      const dist = Math.sqrt(q * rc * rc) + 1e-3;
      if (mode === 'pull') {
        // Entrain: air near the pointer is dragged toward the pointer's velocity.
        const blend = clamp(k * wgt, 0, 0.9);
        this.u[i] += (tvx * 1.1 - this.u[i]) * blend;
        this.v[i] += (tvy * 1.1 - this.v[i]) * blend;
        this.w[i] += (tvz * 1.1 - this.w[i]) * blend;
      } else if (mode === 'push') {
        const a = 26 * strength * dt * wgt;
        this.u[i] += (dx / dist) * a; this.v[i] += (dy / dist) * a; this.w[i] += (dz / dist) * a;
        this.u[i] += tvx * 0.15 * wgt * k; this.v[i] += tvy * 0.15 * wgt * k; this.w[i] += tvz * 0.15 * wgt * k;
      } else {
        // pinch: pull air in toward the pointer, with a little lift and twist so it gathers into a tuft
        const a = 34 * strength * dt * wgt;
        this.u[i] += (-dx / dist) * a - (dz / dist) * a * 0.35;
        this.v[i] += (-dy / dist) * a + a * 0.25;
        this.w[i] += (-dz / dist) * a + (dx / dist) * a * 0.35;
      }
    }
    this.version += 1;
  }

  // ---- stepping ----------------------------------------------------------------------------
  step(dt) {
    if (this.isEmpty()) { this.time += dt; return; }
    dt = Math.min(dt, 0.08);
    this.time += dt;
    this.stepCount += 1;
    const f = this.flow;
    const massBefore = this.mass();
    const retain = this.persistence === Infinity;
    // Keep one invariant target between emissions, so floating-point rounding
    // cannot accumulate into a slow, unintended lifetime over long sessions.
    if (retain && this.retainedMass === null) this.retainedMass = massBefore;
    if (!retain) this.retainedMass = null;
    if (retain) this.retainedDensity.set(this.d);
    this._buildSwirlTables();
    this._forces(dt, f);
    this._project();
    this._advect(dt);
    // Mass correction: advection on a grid slowly gains or loses a little vapor. Rescale so the
    // only way vapor leaves the cloud is the fade you chose with `persistence` (bounded, so a
    // bad frame can never blow the field up).
    const scale = this._massAfter > 1e-6 ? clamp(massBefore / this._massAfter, 0.9, 1.1) : 1;
    this._finish(dt, f, scale);
    if (retain) this._retainMass(this.retainedMass);
    this.version += 1;
  }

  _buildSwirlTables() {
    const n = this.n; const t = this.time; const ax = this.axis;
    for (let m = 0; m < 3; m += 1) {
      const mode = this.modes[m]; const tab = this.tabs[m];
      for (let a = 0; a < 3; a += 1) {
        const k = mode.k[a] * Math.PI * 0.55; const ph = mode.phase[a] + mode.speed[a] * t * (a === 1 ? 0.7 : 1);
        const val = tab.v[a]; const grad = tab.g[a];
        for (let i = 0; i < n; i += 1) { const arg = k * ax[i] + ph; val[i] = Math.sin(arg); grad[i] = k * Math.cos(arg); }
      }
    }
  }

  _forces(dt, f) {
    const n = this.n; const n2 = n * n; const b = this.box;
    const { u, v, w, t } = this;
    const ax = this.axis;
    const buoy = f.buoyancy * dt;
    const swirlAmp = f.swirl * 0.7 * f.drag * dt; // accel so terminal swirl speed is ~ a few cells/s
    const drag = Math.exp(-dt * f.drag);
    const vdrag = Math.exp(-dt * f.vdrag);
    const windA = f.wind * dt;
    const R0 = 0.70;
    const wallK = 26 * dt;
    const tabs = this.tabs;
    const sFx = [tabs[0].v[0], tabs[1].v[0], tabs[2].v[0]]; const sFy = [tabs[0].v[1], tabs[1].v[1], tabs[2].v[1]]; const sFz = [tabs[0].v[2], tabs[1].v[2], tabs[2].v[2]];
    const sGx = [tabs[0].g[0], tabs[1].g[0], tabs[2].g[0]]; const sGy = [tabs[0].g[1], tabs[1].g[1], tabs[2].g[1]]; const sGz = [tabs[0].g[2], tabs[1].g[2], tabs[2].g[2]];
    const amps = [this.modes[0].amp, this.modes[1].amp, this.modes[2].amp];
    const dens = this.d;
    const motionThreshold = this.persistence === Infinity ? 0 : EMPTY_EPS;
    for (let z = b.z0; z <= b.z1; z += 1) {
      const zq = ax[z] * ax[z];
      for (let y = b.y0; y <= b.y1; y += 1) {
        const yq = ax[y] * ax[y];
        let i = b.x0 + n * (y + n * z);
        for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
          // ambient swirl: velocity = sum of grad(f) x A  (divergence-free, so it only stirs)
          let su = 0; let sv = 0; let sw = 0;
          for (let m = 0; m < 3; m += 1) {
            const fx = sFx[m][x]; const fy = sFy[m][y]; const fz = sFz[m][z];
            const gx = sGx[m][x] * fy * fz; const gy = fx * sGy[m][y] * fz; const gz = fx * fy * sGz[m][z];
            const a0 = amps[m][0]; const a1 = amps[m][1]; const a2 = amps[m][2];
            su += gy * a2 - gz * a1;
            sv += gz * a0 - gx * a2;
            sw += gx * a1 - gy * a0;
          }
          const mask = dens[i] > motionThreshold ? 1 : 0.0;
          let nu = u[i] + su * swirlAmp * mask + windA * (0.3 + 0.35 * (ax[y] + 1));
          let nv = (v[i] + sv * swirlAmp * mask + buoy * t[i]) * vdrag;
          let nw = w[i] + sw * swirlAmp * mask;
          // soft cage wall: a gentle spring pushes air back inside and calms it near the edge;
          // outside the cage the air does not move at all.
          const rq = ax[x] * ax[x] + yq + zq;
          if (rq > 1) {
            nu = 0; nv = 0; nw = 0;
          } else if (rq > R0 * R0) {
            const r = Math.sqrt(rq);
            const s = (r - R0) / (1 - R0);
            const push = wallK * s;
            nu -= (ax[x] / r) * push; nv -= (ax[y] / r) * push; nw -= (ax[z] / r) * push;
            const calm = 1 - s * 0.10;
            nu *= calm; nv *= calm; nw *= calm;
          }
          u[i] = nu * drag; v[i] = nv * drag; w[i] = nw * drag;
        }
      }
    }
    // Vorticity confinement: finds the little whirls and strengthens them -> cauliflower billows.
    if (f.vort > 0) this._vorticity(dt * f.vort * 1.1);
    void n2;
  }

  _vorticity(eps) {
    const n = this.n; const n2 = n * n; const b = this.box;
    const { u, v, w, ox, oy, oz, om } = this;
    const x0 = b.x0 + 1; const x1 = b.x1 - 1; const y0 = b.y0 + 1; const y1 = b.y1 - 1; const z0 = b.z0 + 1; const z1 = b.z1 - 1;
    if (x1 < x0 || y1 < y0 || z1 < z0) return;
    for (let z = z0; z <= z1; z += 1) for (let y = y0; y <= y1; y += 1) {
      let i = x0 + n * (y + n * z);
      for (let x = x0; x <= x1; x += 1, i += 1) {
        const wx = 0.5 * ((w[i + n] - w[i - n]) - (v[i + n2] - v[i - n2]));
        const wy = 0.5 * ((u[i + n2] - u[i - n2]) - (w[i + 1] - w[i - 1]));
        const wz = 0.5 * ((v[i + 1] - v[i - 1]) - (u[i + n] - u[i - n]));
        ox[i] = wx; oy[i] = wy; oz[i] = wz; om[i] = Math.sqrt(wx * wx + wy * wy + wz * wz);
      }
    }
    for (let z = z0 + 1; z <= z1 - 1; z += 1) for (let y = y0 + 1; y <= y1 - 1; y += 1) {
      let i = x0 + 1 + n * (y + n * z);
      for (let x = x0 + 1; x <= x1 - 1; x += 1, i += 1) {
        const gx = 0.5 * (om[i + 1] - om[i - 1]); const gy = 0.5 * (om[i + n] - om[i - n]); const gz = 0.5 * (om[i + n2] - om[i - n2]);
        const len = Math.sqrt(gx * gx + gy * gy + gz * gz) + 1e-5;
        const nx = gx / len; const ny = gy / len; const nz = gz / len;
        u[i] += eps * (ny * oz[i] - nz * oy[i]);
        v[i] += eps * (nz * ox[i] - nx * oz[i]);
        w[i] += eps * (nx * oy[i] - ny * ox[i]);
      }
    }
  }

  // Pressure projection: removes the "squeeze" from the velocity so the air swirls like a fluid.
  _project() {
    const n = this.n; const n2 = n * n; const b = this.box;
    const { u, v, w, p, div } = this;
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      let i = b.x0 + n * (y + n * z);
      for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
        div[i] = 0.5 * ((u[i + 1] - u[i - 1]) + (v[i + n] - v[i - n]) + (w[i + n2] - w[i - n2]));
      }
    }
    for (let it = 0; it < 5; it += 1) {
      for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
        let i = b.x0 + n * (y + n * z);
        for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
          p[i] = (p[i - 1] + p[i + 1] + p[i - n] + p[i + n] + p[i - n2] + p[i + n2] - div[i]) / 6;
        }
      }
    }
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      let i = b.x0 + n * (y + n * z);
      for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
        u[i] -= 0.5 * (p[i + 1] - p[i - 1]);
        v[i] -= 0.5 * (p[i + n] - p[i - n]);
        w[i] -= 0.5 * (p[i + n2] - p[i - n2]);
      }
    }
  }

  // Semi-Lagrangian advection: "where did the air at this cell come from?" then copy it.
  _advect(dt) {
    const n = this.n; const n2 = n * n; const b = this.box;
    const { u, v, w, d, t, u2, v2, w2, d2, t2 } = this;
    const hi = n - 1.001;
    const maxV = 36;
    // 1) velocity advects itself
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      let i = b.x0 + n * (y + n * z);
      for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
        let px = x - dt * clamp(u[i], -maxV, maxV); let py = y - dt * clamp(v[i], -maxV, maxV); let pz = z - dt * clamp(w[i], -maxV, maxV);
        px = px < 0 ? 0 : px > hi ? hi : px; py = py < 0 ? 0 : py > hi ? hi : py; pz = pz < 0 ? 0 : pz > hi ? hi : pz;
        const ix = px | 0; const iy = py | 0; const iz = pz | 0;
        const fx = px - ix; const fy = py - iy; const fz = pz - iz;
        const j = ix + n * iy + n2 * iz;
        const w000 = (1 - fx) * (1 - fy) * (1 - fz); const w100 = fx * (1 - fy) * (1 - fz);
        const w010 = (1 - fx) * fy * (1 - fz); const w110 = fx * fy * (1 - fz);
        const w001 = (1 - fx) * (1 - fy) * fz; const w101 = fx * (1 - fy) * fz;
        const w011 = (1 - fx) * fy * fz; const w111 = fx * fy * fz;
        u2[i] = w000 * u[j] + w100 * u[j + 1] + w010 * u[j + n] + w110 * u[j + n + 1] + w001 * u[j + n2] + w101 * u[j + n2 + 1] + w011 * u[j + n2 + n] + w111 * u[j + n2 + n + 1];
        v2[i] = w000 * v[j] + w100 * v[j + 1] + w010 * v[j + n] + w110 * v[j + n + 1] + w001 * v[j + n2] + w101 * v[j + n2 + 1] + w011 * v[j + n2 + n] + w111 * v[j + n2 + n + 1];
        w2[i] = w000 * w[j] + w100 * w[j + 1] + w010 * w[j + n] + w110 * w[j + n + 1] + w001 * w[j + n2] + w101 * w[j + n2 + 1] + w011 * w[j + n2 + n] + w111 * w[j + n2 + n + 1];
      }
    }
    this._copyBack(u, u2); this._copyBack(v, v2); this._copyBack(w, w2);
    // 2) heat rides the (new) velocity (plain semi-Lagrangian is fine for heat)
    this._advectField(t, t2, dt);
    this._copyBack(t, t2);
    // 3) density rides it too, with MacCormack correction so billow edges stay crisp instead of
    //    blurring away: advect forward, advect that result backward, and use the difference to
    //    cancel the smoothing error. The result is clamped so it can never overshoot.
    this._advectField(d, d2, dt);
    this._advectField(d2, this.d3, -dt);
    this._maccormackFinish(dt);
    this._copyBack(d, t2);
  }

  // dst = src carried along the velocity for time dt (negative dt carries it backwards)
  _advectField(src, dst, dt) {
    const n = this.n; const n2 = n * n; const b = this.box;
    const { u, v, w } = this;
    const hi = n - 1.001;
    const maxV = 36;
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      let i = b.x0 + n * (y + n * z);
      for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
        let px = x - dt * clamp(u[i], -maxV, maxV); let py = y - dt * clamp(v[i], -maxV, maxV); let pz = z - dt * clamp(w[i], -maxV, maxV);
        px = px < 0 ? 0 : px > hi ? hi : px; py = py < 0 ? 0 : py > hi ? hi : py; pz = pz < 0 ? 0 : pz > hi ? hi : pz;
        const ix = px | 0; const iy = py | 0; const iz = pz | 0;
        const fx = px - ix; const fy = py - iy; const fz = pz - iz;
        const j = ix + n * iy + n2 * iz;
        dst[i] = (1 - fz) * ((1 - fy) * ((1 - fx) * src[j] + fx * src[j + 1]) + fy * ((1 - fx) * src[j + n] + fx * src[j + n + 1]))
          + fz * ((1 - fy) * ((1 - fx) * src[j + n2] + fx * src[j + n2 + 1]) + fy * ((1 - fx) * src[j + n2 + n] + fx * src[j + n2 + n + 1]));
      }
    }
  }

  // t2 receives the final density (so d is not overwritten while it is still being read)
  _maccormackFinish(dt) {
    const n = this.n; const n2 = n * n; const b = this.box;
    const { u, v, w, d, d2, d3, t2 } = this;
    const hi = n - 1.001;
    const maxV = 36;
    let sum = 0;
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      let i = b.x0 + n * (y + n * z);
      for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
        let px = x - dt * clamp(u[i], -maxV, maxV); let py = y - dt * clamp(v[i], -maxV, maxV); let pz = z - dt * clamp(w[i], -maxV, maxV);
        px = px < 0 ? 0 : px > hi ? hi : px; py = py < 0 ? 0 : py > hi ? hi : py; pz = pz < 0 ? 0 : pz > hi ? hi : pz;
        const j = (px | 0) + n * (py | 0) + n2 * (pz | 0);
        const a = d[j]; const b1 = d[j + 1]; const c = d[j + n]; const e = d[j + n + 1];
        const f = d[j + n2]; const g = d[j + n2 + 1]; const h = d[j + n2 + n]; const k = d[j + n2 + n + 1];
        const lo = Math.min(a, b1, c, e, f, g, h, k); const up = Math.max(a, b1, c, e, f, g, h, k);
        let val = d2[i] + 0.5 * (d[i] - d3[i]);
        val = val < lo ? lo : val > up ? up : val;
        t2[i] = val;
        sum += val;
      }
    }
    this._massAfter = sum;
  }

  _copyBack(dst, src) {
    const n = this.n; const b = this.box;
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      const a = b.x0 + n * (y + n * z);
      dst.set(src.subarray(a, a + (b.x1 - b.x0 + 1)), a);
    }
  }

  // Fade, tidy up, and recompute the active region from what actually holds vapor.
  _finish(dt, f, scale = 1) {
    const n = this.n; const b = this.box;
    const { d, t, u, v, w, p } = this;
    const retain = this.persistence === Infinity;
    const fade = (retain ? 1 : Math.exp(-dt / Math.max(1, this.persistence))) * scale;
    const heatFade = Math.exp(-dt * f.heatDecay);
    let x0 = n; let x1 = -1; let y0 = n; let y1 = -1; let z0 = n; let z1 = -1;
    const ax = this.axis;
    for (let z = b.z0; z <= b.z1; z += 1) for (let y = b.y0; y <= b.y1; y += 1) {
      let i = b.x0 + n * (y + n * z);
      const yz = ax[y] * ax[y] + ax[z] * ax[z];
      for (let x = b.x0; x <= b.x1; x += 1, i += 1) {
        let dv = d[i] * fade;
        // stray vapor that escapes the cage wall evaporates
        const rq = ax[x] * ax[x] + yz;
        if (!retain && rq > 1) dv *= Math.exp(-dt * 3);
        // Retention uses a closed cage: escaped transport is redistributed
        // into the remaining interior field by _retainMass, never evaporated.
        if (retain && rq > 1) dv = 0;
        if (!retain && dv < EMPTY_EPS * 0.25) dv = 0;
        d[i] = dv;
        let tv = t[i] * heatFade;
        if (tv < 0.01) tv = 0;
        t[i] = tv;
        if (dv > (retain ? 0 : EMPTY_EPS) || tv > 0.02) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (z < z0) z0 = z; if (z > z1) z1 = z;
        }
      }
    }
    const old = { ...b };
    if (x1 < x0) {
      // nothing left: wipe velocity in the old region and go idle
      this._zeroOutside(old, { x0: 1, x1: 0, y0: 1, y1: 0, z0: 1, z1: 0 });
      this.box = { x0: 1, x1: 0, y0: 1, y1: 0, z0: 1, z1: 0 };
      return;
    }
    const lo = (a) => clamp(a - MARGIN, 1, n - 2);
    const hi = (a) => clamp(a + MARGIN, 1, n - 2);
    const nb = { x0: lo(x0), x1: hi(x1), y0: lo(y0), y1: hi(y1), z0: lo(z0), z1: hi(z1) };
    this._zeroOutside(old, nb);
    this.box = nb;
    void u; void v; void w; void p;
  }

  // At 100%, account for ALL numerical transport loss, including the finite
  // active box. Redistribute existing mass only, never call emit or add a source.
  // Density stays bounded by one. An exceptional empty/unstable transport step
  // rolls density back, leaving the evolving velocity/heat fields intact.
  _retainMass(target) {
    const n = this.n;
    this.box = { x0: 1, x1: n - 2, y0: 1, y1: n - 2, z0: 1, z1: n - 2 };
    // Enforce the per-cell bound even when the global mass is already close
    // enough to the target for the proportional correction to stop early.
    for (let i = 0; i < this.size; i++) this.d[i] = clamp(this.d[i], 0, 1);
    let mass = this.mass();
    if (!(mass > 1e-20) || !Number.isFinite(mass)) {
      this.d.set(this.retainedDensity);
      return;
    }
    // Saturated cells are excluded from subsequent redistribution passes.
    for (let pass = 0; pass < 5; pass++) {
      const delta = target - mass;
      if (Math.abs(delta) < Math.max(1e-10, target * 1e-9)) break;
      let eligible = 0;
      for (let i = 0; i < this.size; i++) if (delta < 0 || this.d[i] < 1) eligible += this.d[i];
      if (eligible <= 1e-20) break;
      for (let i = 0; i < this.size; i++) {
        if (delta < 0 || this.d[i] < 1) this.d[i] = clamp(this.d[i] * (1 + delta / eligible), 0, 1);
      }
      mass = this.mass();
    }
    // Saturated Float32 cells can leave a small residual after proportional
    // correction. Absorb that rounding remainder in existing vapor cells,
    // without opening an empty cell or adding an emission source.
    let remainder = target - mass;
    const tolerance = Math.max(1e-12, target * 1e-9);
    if (Math.abs(remainder) > tolerance && Math.abs(remainder) <= target * 1e-5) {
      for (let i = 0; i < this.size; i++) {
        const previous = this.d[i];
        if (previous <= 0 || (remainder > 0 && previous >= 1)) continue;
        this.d[i] = clamp(previous + remainder, 0, 1);
        remainder -= this.d[i] - previous;
        if (Math.abs(remainder) <= tolerance) break;
      }
      mass = this.mass();
    }
    if (Math.abs(mass - target) > Math.max(1e-8, target * 1e-6)) this.d.set(this.retainedDensity);
  }

  // zero velocity/pressure in cells that were active but are no longer, keeping the idle
  // region clean so it cannot leak stale motion when the box grows back.
  _zeroOutside(old, nb) {
    const n = this.n;
    const { u, v, w, p, t } = this;
    for (let z = old.z0; z <= old.z1; z += 1) for (let y = old.y0; y <= old.y1; y += 1) {
      const inYZ = z >= nb.z0 && z <= nb.z1 && y >= nb.y0 && y <= nb.y1;
      for (let x = old.x0; x <= old.x1; x += 1) {
        if (inYZ && x >= nb.x0 && x <= nb.x1) continue;
        const i = x + n * (y + n * z);
        u[i] = 0; v[i] = 0; w[i] = 0; p[i] = 0; t[i] = 0;
      }
    }
  }

  // ---- output --------------------------------------------------------------------------------
  // Writes density as bytes (0..255) for the GPU 3D texture.
  fillBytes(bytes) {
    const d = this.d; const s = this.size;
    for (let i = 0; i < s; i += 1) {
      const val = d[i] * 255 + 0.5;
      bytes[i] = val > 255 ? 255 : val;
    }
  }
}
