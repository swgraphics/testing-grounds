import * as THREE from "three";
import { terrainSettings } from "./terrainSettings";
import { useWorldStore } from "../world/worldStore";

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

export function clearTerrainEdits() {
  writeEdits({});
}

export function serializeTerrainEdits() {
  return { ...readEdits() };
}

export function loadTerrainEdits(edits = {}) {
  writeEdits({ ...edits });
}
