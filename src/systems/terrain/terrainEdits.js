import * as THREE from "three";
import { terrainSettings } from "./terrainSettings";
import { useWorldStore } from "../world/worldStore";
import { getTerrainVertexEditDelta } from "./terrainVertexEditing";
import { beginHistoryTransaction, commitHistoryTransaction, cancelHistoryTransaction } from "../history/historyStore";

const EDIT_GRID = 4;
const MAX_EDIT = 48;

function keyFor(x, z) {
  return `${Math.round(x / EDIT_GRID)},${Math.round(z / EDIT_GRID)}`;
}

function readEdits() {
  return terrainSettings.terrainEdits ?? {};
}

function writeEdits(edits) {
  terrainSettings.terrainEdits = edits;
  terrainSettings.terrainEditVersion =
    Number(terrainSettings.terrainEditVersion || 0) + 1;

  const state = useWorldStore.getState();
  const currentChunk = state.world.chunks[state.world.currentChunkId];
  if (currentChunk) {
    state.updateCurrentChunk({
      terrain: {
        ...currentChunk.terrain,
        terrainEdits: edits,
        terrainEditVersion: terrainSettings.terrainEditVersion,
      },
    });
  }

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: {
        key: "terrainEditVersion",
        value: terrainSettings.terrainEditVersion,
      },
    })
  );
}

export function getTerrainEditDelta(x, z) {
  const edits = readEdits();
  const gx = x / EDIT_GRID;
  const gz = z / EDIT_GRID;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const tx = gx - x0;
  const tz = gz - z0;

  const sample = (ix, iz) => {
    const value = edits[`${ix},${iz}`];
    return Number(value) || 0;
  };

  const a = sample(x0, z0);
  const b = sample(x0 + 1, z0);
  const c = sample(x0, z0 + 1);
  const d = sample(x0 + 1, z0 + 1);

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, tx),
    THREE.MathUtils.lerp(c, d, tx),
    tz
  );
}

export function beginTerrainHistory(tool = "TERRAIN") {
  const chunkId = useWorldStore.getState().world.currentChunkId;
  beginHistoryTransaction(tool, getTerrainHistorySnapshot(), {
    paths: [["chunks", chunkId, "terrain", "terrainEdits"], ["chunks", chunkId, "terrain", "terrainEditVersion"]],
    terrain: true,
  });
}

export function commitTerrainHistory() {
  commitHistoryTransaction(getTerrainHistorySnapshot(), {
    paths: [["chunks", useWorldStore.getState().world.currentChunkId, "terrain", "terrainEdits"], ["chunks", useWorldStore.getState().world.currentChunkId, "terrain", "terrainEditVersion"]],
    terrain: true,
  });
}

export function cancelTerrainHistory() {
  cancelHistoryTransaction();
}

export function getTerrainHistorySnapshot() {
  const world = useWorldStore.getState().world;
  const chunk = world.chunks?.[world.currentChunkId];
  return { chunks: { [world.currentChunkId]: { terrain: { terrainEdits: { ...(terrainSettings.terrainEdits ?? {}) }, terrainEditVersion: Number(terrainSettings.terrainEditVersion || 0) } } } };
}

export function applyTerrainBrush({
  x,
  z,
  tool = "raise",
  radius = 14,
  strength = 0.7,
}) {
  const edits = { ...readEdits() };
  const minX = Math.floor((x - radius) / EDIT_GRID);
  const maxX = Math.ceil((x + radius) / EDIT_GRID);
  const minZ = Math.floor((z - radius) / EDIT_GRID);
  const maxZ = Math.ceil((z + radius) / EDIT_GRID);

  const centerBase = getTerrainEditDelta(x, z);
  const target = centerBase;

  for (let gx = minX; gx <= maxX; gx += 1) {
    for (let gz = minZ; gz <= maxZ; gz += 1) {
      const px = gx * EDIT_GRID;
      const pz = gz * EDIT_GRID;
      const distance = Math.hypot(px - x, pz - z);
      if (distance > radius) continue;

      const t = THREE.MathUtils.clamp(1 - distance / radius, 0, 1);
      const falloff = t * t * (3 - 2 * t);
      const key = `${gx},${gz}`;
      const current = Number(edits[key]) || 0;

      let next = current;
      if (tool === "raise") next = current + strength * falloff;
      if (tool === "lower") next = current - strength * falloff;

      if (tool === "flatten") {
        next = THREE.MathUtils.lerp(current, target, 0.35 * falloff);
      }

      if (tool === "smooth") {
        const neighborAverage = (
          (Number(edits[`${gx - 1},${gz}`]) || 0) +
          (Number(edits[`${gx + 1},${gz}`]) || 0) +
          (Number(edits[`${gx},${gz - 1}`]) || 0) +
          (Number(edits[`${gx},${gz + 1}`]) || 0)
        ) / 4;
        next = THREE.MathUtils.lerp(current, neighborAverage, 0.22 * falloff);
      }

      if (tool === "slope") {
        const direction = (px - x) / Math.max(radius, 1);
        next = current + direction * strength * 0.35 * falloff;
      }

      edits[key] = THREE.MathUtils.clamp(next, -MAX_EDIT, MAX_EDIT);
    }
  }

  writeEdits(edits);
}

function calculateGeologyDelta({ x, z, rotation = 0, type = "canyon-wall", width = 36, height = 12, depth = 10, irregularity = 0.18 }) {
  const cos = Math.cos(-rotation), sin = Math.sin(-rotation);
  const halfWidth = Math.max(4, width / 2), halfDepth = Math.max(3, depth / 2);
  const localX = x * cos - z * sin, localZ = x * sin + z * cos;
  const longitudinal = Math.abs(localX) / halfWidth, lateral = Math.abs(localZ) / halfDepth;
  if (longitudinal > 1 || lateral > 1) return 0;
  const edgeFalloff = Math.max(0, 1 - longitudinal), thicknessFalloff = Math.max(0, 1 - lateral);
  const ridge = edgeFalloff * edgeFalloff * (0.55 + 0.45 * thicknessFalloff);
  const wave = 1 + irregularity * Math.sin(localX * 0.18 + localZ * 0.11);
  const shoulder = type === "cliff-face" ? 0.9 : type === "giant-rock" ? 0.72 : 1;
  return Math.max(0, height * ridge * wave * shoulder);
}

export function getGeologyTerrainPreviewDelta(x, z) {
  const stamp = terrainSettings.terrainPreviewStamp;
  if (!stamp) return 0;
  return calculateGeologyDelta({ x: x - stamp.x, z: z - stamp.z, rotation: stamp.rotation, type: stamp.type, width: stamp.width, height: stamp.height, depth: stamp.depth, irregularity: stamp.irregularity });
}

export function setTerrainPreviewStamp(stamp = null) {
  terrainSettings.terrainPreviewStamp = stamp;
  terrainSettings.terrainPreviewVersion = Number(terrainSettings.terrainPreviewVersion || 0) + 1;
  window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key: "terrainPreviewVersion", value: terrainSettings.terrainPreviewVersion } }));
}

export function applyGeologyTerrainStamp(options = {}) {
  const { x, z, rotation = 0, type = "canyon-wall", width = 36, height = 12, depth = 10, irregularity = 0.18 } = options;
  const edits = { ...readEdits() };
  const halfWidth = Math.max(4, width / 2), halfDepth = Math.max(3, depth / 2);
  const minX = Math.floor((x - halfWidth - halfDepth) / EDIT_GRID), maxX = Math.ceil((x + halfWidth + halfDepth) / EDIT_GRID);
  const minZ = Math.floor((z - halfWidth - halfDepth) / EDIT_GRID), maxZ = Math.ceil((z + halfWidth + halfDepth) / EDIT_GRID);
  for (let gx = minX; gx <= maxX; gx += 1) for (let gz = minZ; gz <= maxZ; gz += 1) {
    const delta = calculateGeologyDelta({ x: gx * EDIT_GRID - x, z: gz * EDIT_GRID - z, rotation, type, width, height, depth, irregularity });
    if (delta <= 0) continue;
    const key = `${gx},${gz}`, current = Number(edits[key]) || 0;
    edits[key] = THREE.MathUtils.clamp(current + delta, -MAX_EDIT, MAX_EDIT);
  }
  writeEdits(edits);
}

export function clearTerrainEdits() {
  writeEdits({});
}

export function analyzeTerrainWallAt(x, z, sample = 5) {
  const px = Number(x);
  const pz = Number(z);
  if (![px, pz].every(Number.isFinite)) return null;

  const step = Math.max(2, Number(sample) || 5);
  const hL = getTerrainHeightAtSafe(px - step, pz);
  const hR = getTerrainHeightAtSafe(px + step, pz);
  const hD = getTerrainHeightAtSafe(px, pz - step);
  const hU = getTerrainHeightAtSafe(px, pz + step);

  const dx = (hR - hL) / (step * 2);
  const dz = (hU - hD) / (step * 2);
  const gradient = Math.hypot(dx, dz);
  const editL = getTerrainEditOnlyDelta(px - step, pz);
  const editR = getTerrainEditOnlyDelta(px + step, pz);
  const editD = getTerrainEditOnlyDelta(px, pz - step);
  const editU = getTerrainEditOnlyDelta(px, pz + step);
  const editGradient = Math.hypot(
    (editR - editL) / (step * 2),
    (editU - editD) / (step * 2),
  );
  if (gradient < 1.0 && editGradient < 0.55) return null;

  const normal = new THREE.Vector2(dx, dz).normalize();
  const tangent = new THREE.Vector2(-normal.y, normal.x).normalize();

  const continuationDistance = 20;
  const leftGradient = sampleGradientAlong(px, pz, tangent, continuationDistance, step);
  const rightGradient = sampleGradientAlong(px, pz, tangent, -continuationDistance, step);
  const leftContinues = leftGradient >= 1.1;
  const rightContinues = rightGradient >= 1.1;

  const mode = leftContinues && rightContinues
    ? "CENTER"
    : leftContinues || rightContinues
      ? "END"
      : "EDGE";

  return {
    point: new THREE.Vector3(px, getTerrainHeightAtSafe(px, pz), pz),
    normal,
    tangent,
    gradient,
    mode,
    leftContinues,
    rightContinues,
    wallSpan: Math.min(34, Math.max(12, gradient * 8)),
  };
}

function getTerrainEditOnlyDelta(x, z) {
  const edits = readEdits();
  const gx = x / EDIT_GRID;
  const gz = z / EDIT_GRID;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const tx = gx - x0;
  const tz = gz - z0;
  const sample = (ix, iz) => Number(edits[`${ix},${iz}`]) || 0;
  const a = sample(x0, z0);
  const b = sample(x0 + 1, z0);
  const c = sample(x0, z0 + 1);
  const d = sample(x0 + 1, z0 + 1);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, tx),
    THREE.MathUtils.lerp(c, d, tx),
    tz
  );
}

function getTerrainHeightAtSafe(x, z) {
  const edits = readEdits();
  const gx = x / EDIT_GRID;
  const gz = z / EDIT_GRID;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const tx = gx - x0;
  const tz = gz - z0;
  const sampleEdit = (ix, iz) => Number(edits[`${ix},${iz}`]) || 0;

  const a = sampleEdit(x0, z0);
  const b = sampleEdit(x0 + 1, z0);
  const c = sampleEdit(x0, z0 + 1);
  const d = sampleEdit(x0 + 1, z0 + 1);
  const editDelta = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, tx),
    THREE.MathUtils.lerp(c, d, tx),
    tz
  );

  // Avoid recursive getTerrainHeightAt() calls while inspecting the terrain
  // edit field. This helper is intentionally limited to the creator-edit
  // component plus the procedural terrain height already sampled by the
  // caller's raycast in WorldInteractionSystem.
  const rolling = Math.sin(x * 0.018) * 10 * terrainSettings.rollingHills
    + Math.cos(z * 0.022) * 8 * terrainSettings.rollingHills
    + Math.sin((x + z) * 0.012) * 6 * terrainSettings.rollingHills;
  const mountainDistance = Math.sqrt((x - 160) ** 2 + (z + 170) ** 2);
  const mountain = Math.max(0, 70 * terrainSettings.mountainHeight - mountainDistance * 0.35);
  const ridge = Math.max(0, Math.sin((x - 80) * 0.025 * terrainSettings.cliffSharpness) * 22) * terrainSettings.ridgeStrength;
  const distance = Math.sqrt(x * x + z * z);
  const terrainBlend = smoothStepSafe(95, 190, distance);
  let base = (rolling + mountain + ridge) * terrainBlend * terrainSettings.heightMultiplier;
  const plateauLevel = 42 * terrainSettings.heightMultiplier;
  if (base > plateauLevel) {
    const flattenedHeight = plateauLevel + (base - plateauLevel) * 0.16;
    base = THREE.MathUtils.lerp(base, flattenedHeight, (terrainSettings.plateauAmount ?? 0) / 100);
  }
  const geometryStrength = THREE.MathUtils.clamp((terrainSettings.geometryStrength ?? 0) / 100, 0, 1);
  if (geometryStrength > 0) {
    const geometryStep = THREE.MathUtils.lerp(0.25, 8, geometryStrength);
    base = THREE.MathUtils.lerp(base, Math.round(base / geometryStep) * geometryStep, geometryStrength);
  }
  if (Math.abs(x) < 90 && Math.abs(z) < 90) base = 0;
  return base + editDelta + getTerrainVertexEditDelta(x, z);
}

function smoothStepSafe(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sampleGradientAlong(x, z, direction, distance, step) {
  const center = getTerrainHeightAtSafe(x, z);
  const px = x + direction.x * distance;
  const pz = z + direction.y * distance;
  return Math.abs(getTerrainHeightAtSafe(px, pz) - center) / Math.max(distance, step);
}

export function applyCanyonWallExpansion({
  anchor,
  end,
  normal,
  tangent,
  height = 12,
  width = 10,
  irregularity = 0.22,
} = {}) {
  if (!anchor || !end || !normal || !tangent) return false;

  const ax = Number(anchor.x);
  const az = Number(anchor.z);
  const bx = Number(end.x);
  const bz = Number(end.z);
  const nx = Number(normal.x);
  const nz = Number(normal.y);
  const tx = Number(tangent.x);
  const tz = Number(tangent.y);
  if (![ax, az, bx, bz, nx, nz, tx, tz].every(Number.isFinite)) return false;

  const length = Math.hypot(bx - ax, bz - az);
  if (length < EDIT_GRID) return false;

  const halfWidth = Math.max(5, width * 0.5);
  const minX = Math.floor((Math.min(ax, bx) - halfWidth - EDIT_GRID) / EDIT_GRID);
  const maxX = Math.ceil((Math.max(ax, bx) + halfWidth + EDIT_GRID) / EDIT_GRID);
  const minZ = Math.floor((Math.min(az, bz) - halfWidth - EDIT_GRID) / EDIT_GRID);
  const maxZ = Math.ceil((Math.max(az, bz) + halfWidth + EDIT_GRID) / EDIT_GRID);
  const edits = { ...readEdits() };
  let changed = false;

  for (let gx = minX; gx <= maxX; gx += 1) {
    for (let gz = minZ; gz <= maxZ; gz += 1) {
      const px = gx * EDIT_GRID;
      const pz = gz * EDIT_GRID;
      const relX = px - ax;
      const relZ = pz - az;
      const along = relX * tx + relZ * tz;
      if (along < -EDIT_GRID || along > length + EDIT_GRID) continue;

      const across = relX * nx + relZ * nz;
      const distance = Math.abs(across);
      if (distance > halfWidth) continue;

      const acrossT = THREE.MathUtils.clamp(1 - distance / halfWidth, 0, 1);
      const sideFalloff = acrossT * acrossT * (3 - 2 * acrossT);
      const endFade = Math.min(
        THREE.MathUtils.clamp((along + EDIT_GRID) / Math.max(EDIT_GRID, EDIT_GRID * 2), 0, 1),
        THREE.MathUtils.clamp((length + EDIT_GRID - along) / Math.max(EDIT_GRID, EDIT_GRID * 2), 0, 1)
      );
      const edgeWave = 1 + (Number(irregularity) || 0) * Math.sin(along * 0.24 + across * 0.31);
      const capProfile = Math.pow(Math.max(0, sideFalloff), 1.7) * endFade;
      if (capProfile < 0.02) continue;

      const key = `${gx},${gz}`;
      const current = Number(edits[key]) || 0;
      const delta = (Number(height) || 12) * capProfile * edgeWave;
      const next = THREE.MathUtils.clamp(current + delta, -MAX_EDIT, MAX_EDIT);
      if (Math.abs(next - current) > 0.01) {
        edits[key] = next;
        changed = true;
      }
    }
  }

  if (changed) writeEdits(edits);
  return changed;
}

/**
 * 1.6.06 — Procedural Canyon Edge
 *
 * A drag is treated as an edge extrusion rather than a circular terrain
 * brush. The drag direction becomes the canyon axis. One side of the edge
 * is raised into an irregular shoulder while the opposite side is lowered
 * into the canyon. The profile is sharp at the edge and softer farther away,
 * which makes repeated drags useful for expanding or reshaping the canyon.
 */
export function applyCanyonEdgeDeformation({
  from,
  to,
  width = 34,
  height = 12,
  depth = 16,
  irregularity = 0.12,
} = {}) {
  if (!from || !to) return false;

  const ax = Number(from.x);
  const az = Number(from.z);
  const bx = Number(to.x);
  const bz = Number(to.z);
  if (![ax, az, bx, bz].every(Number.isFinite)) return false;

  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  if (length < 0.5) return false;

  const ux = dx / length;
  const uz = dz / length;
  const nx = -uz;
  const nz = ux;
  const halfWidth = Math.max(8, Number(width) || 34) * 0.5;
  const capLength = Math.min(6, Math.max(2, length * 0.35));
  const minX = Math.floor((Math.min(ax, bx) - halfWidth - EDIT_GRID) / EDIT_GRID);
  const maxX = Math.ceil((Math.max(ax, bx) + halfWidth + EDIT_GRID) / EDIT_GRID);
  const minZ = Math.floor((Math.min(az, bz) - halfWidth - EDIT_GRID) / EDIT_GRID);
  const maxZ = Math.ceil((Math.max(az, bz) + halfWidth + EDIT_GRID) / EDIT_GRID);
  const edits = { ...readEdits() };
  let changed = false;

  for (let gx = minX; gx <= maxX; gx += 1) {
    for (let gz = minZ; gz <= maxZ; gz += 1) {
      const px = gx * EDIT_GRID;
      const pz = gz * EDIT_GRID;
      const relX = px - ax;
      const relZ = pz - az;
      const along = relX * ux + relZ * uz;
      if (along < -EDIT_GRID || along > length + EDIT_GRID) continue;

      const clampedAlong = THREE.MathUtils.clamp(along, 0, length);
      const closestX = ax + ux * clampedAlong;
      const closestZ = az + uz * clampedAlong;
      const side = (px - closestX) * nx + (pz - closestZ) * nz;
      const distance = Math.abs(side);
      if (distance > halfWidth) continue;

      const sideT = THREE.MathUtils.clamp(1 - distance / halfWidth, 0, 1);
      const sideFalloff = sideT * sideT * (3 - 2 * sideT);
      const startFade = along <= capLength ? THREE.MathUtils.clamp(along / capLength, 0, 1) : 1;
      const endDistance = length - along;
      const endFade = endDistance <= capLength ? THREE.MathUtils.clamp(endDistance / capLength, 0, 1) : 1;
      const alongFalloff = Math.min(startFade, endFade);
      const edgeProfile = Math.pow(sideFalloff, 1.35);
      const sideSign = side >= 0 ? 1 : -1;
      const baseAmount = sideSign > 0 ? Number(height) || 12 : -(Number(depth) || 16);
      const wave = 1 + (Number(irregularity) || 0) * Math.sin(px * 0.17 + pz * 0.13);
      const delta = baseAmount * edgeProfile * alongFalloff * wave;
      if (Math.abs(delta) < 0.05) continue;

      const key = `${gx},${gz}`;
      const current = Number(edits[key]) || 0;
      const next = THREE.MathUtils.clamp(current + delta, -MAX_EDIT, MAX_EDIT);
      if (next !== current) {
        edits[key] = next;
        changed = true;
      }
    }
  }

  if (changed) writeEdits(edits);
  return changed;
}

export function serializeTerrainEdits() {
  return { ...readEdits() };
}

export function loadTerrainEdits(edits = {}) {
  writeEdits({ ...edits });
}
