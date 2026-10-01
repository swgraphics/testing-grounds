import { create } from "zustand";
import * as THREE from "three";
import { terrainSettings } from "./terrainSettings";
import { useWorldStore } from "../world/worldStore";
import { beginHistoryTransaction, commitHistoryTransaction } from "../history/historyStore";

export const TERRAIN_VERTEX_GRID = 5;
export const TERRAIN_VERTEX_MIN = -300;
export const TERRAIN_VERTEX_MAX = 300;
export const TERRAIN_VERTEX_MAX_EDIT = 48;

function vertexKey(x, z) {
  return `${x},${z}`;
}

export const useTerrainVertexStore = create((set) => ({
  selected: {},
  hovered: null,

  setHovered(vertex) {
    set({ hovered: vertex });
  },

  toggleSelected(vertex) {
    if (!vertex) return;
    set((state) => {
      const key = vertexKey(vertex.x, vertex.z);
      const selected = { ...state.selected };
      if (selected[key]) {
        delete selected[key];
      } else {
        selected[key] = { x: vertex.x, z: vertex.z };
      }
      return { selected };
    });
  },

  selectOnly(vertex) {
    if (!vertex) return;
    set({
      selected: {
        [vertexKey(vertex.x, vertex.z)]: { x: vertex.x, z: vertex.z },
      },
    });
  },

  clearSelection() {
    set({ selected: {}, hovered: null });
  },
}));

export function snapTerrainVertex(value) {
  return THREE.MathUtils.clamp(
    Math.round(value / TERRAIN_VERTEX_GRID) * TERRAIN_VERTEX_GRID,
    TERRAIN_VERTEX_MIN,
    TERRAIN_VERTEX_MAX
  );
}

export function makeTerrainVertex(x, z) {
  return {
    x: snapTerrainVertex(x),
    z: snapTerrainVertex(z),
  };
}

function readVertexEdits() {
  const world = useWorldStore.getState().world;
  return world.terrainVertexEdits ?? terrainSettings.terrainVertexEdits ?? {};
}

function vertexEditKey(x, z) {
  return vertexKey(
    snapTerrainVertex(x),
    snapTerrainVertex(z)
  );
}

export function getTerrainVertexEdit(x, z) {
  return Number(readVertexEdits()[vertexEditKey(x, z)]) || 0;
}

export function getTerrainVertexEditDelta(x, z) {
  const edits = readVertexEdits();
  const gx = x / TERRAIN_VERTEX_GRID;
  const gz = z / TERRAIN_VERTEX_GRID;
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const tx = gx - x0;
  const tz = gz - z0;

  const sample = (ix, iz) => {
    const px = THREE.MathUtils.clamp(ix * TERRAIN_VERTEX_GRID, TERRAIN_VERTEX_MIN, TERRAIN_VERTEX_MAX);
    const pz = THREE.MathUtils.clamp(iz * TERRAIN_VERTEX_GRID, TERRAIN_VERTEX_MIN, TERRAIN_VERTEX_MAX);
    return Number(edits[vertexKey(px, pz)]) || 0;
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

function writeVertexEdits(edits) {
  terrainSettings.terrainVertexEdits = edits;
  terrainSettings.terrainVertexEditVersion =
    Number(terrainSettings.terrainVertexEditVersion || 0) + 1;

  const state = useWorldStore.getState();
  // The world-level registry is authoritative. This prevents two chunks
  // from ever holding different heights for the same shared vertex.
  state.replaceWorld({
    ...state.world,
    terrainVertexEdits: { ...edits },
  });

  const currentChunk = state.world.chunks[state.world.currentChunkId];
  if (currentChunk) {
    state.updateCurrentChunk({
      terrain: {
        ...currentChunk.terrain,
        terrainVertexEdits: { ...edits },
        terrainVertexEditVersion: terrainSettings.terrainVertexEditVersion,
      },
    });
  }

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: {
        key: "terrainVertexEditVersion",
        value: terrainSettings.terrainVertexEditVersion,
      },
    })
  );
}

export function beginTerrainVertexHistory() {
  const world = useWorldStore.getState().world;
  beginHistoryTransaction("VERTEX EDIT", { terrainVertexEdits: { ...(world.terrainVertexEdits ?? {}) } }, {
    paths: [["terrainVertexEdits"]],
    terrain: true,
  });
}

export function commitTerrainVertexHistory() {
  const world = useWorldStore.getState().world;
  commitHistoryTransaction({ terrainVertexEdits: { ...(world.terrainVertexEdits ?? {}) } }, {
    paths: [["terrainVertexEdits"]],
    terrain: true,
  });
}

export function moveSelectedTerrainVertices(deltaY) {
  const selected = Object.values(useTerrainVertexStore.getState().selected);
  if (!selected.length || !Number.isFinite(deltaY) || deltaY === 0) return;

  const edits = { ...readVertexEdits() };
  selected.forEach((vertex) => {
    const key = vertexKey(vertex.x, vertex.z);
    const current = Number(edits[key]) || 0;
    edits[key] = THREE.MathUtils.clamp(
      current + deltaY,
      -TERRAIN_VERTEX_MAX_EDIT,
      TERRAIN_VERTEX_MAX_EDIT
    );
  });

  writeVertexEdits(edits);
}

export function setTerrainVertexEdit(x, z, deltaY) {
  const vertex = makeTerrainVertex(x, z);
  const edits = { ...readVertexEdits() };
  edits[vertexKey(vertex.x, vertex.z)] = THREE.MathUtils.clamp(
    Number(deltaY) || 0,
    -TERRAIN_VERTEX_MAX_EDIT,
    TERRAIN_VERTEX_MAX_EDIT
  );
  writeVertexEdits(edits);
}

export function clearTerrainVertexEdits() {
  writeVertexEdits({});
}

export function loadTerrainVertexEdits(edits = {}) {
  const sanitized = {};
  Object.entries(edits ?? {}).forEach(([key, value]) => {
    const [x, z] = key.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const vertex = makeTerrainVertex(x, z);
    sanitized[vertexKey(vertex.x, vertex.z)] = THREE.MathUtils.clamp(
      Number(value) || 0,
      -TERRAIN_VERTEX_MAX_EDIT,
      TERRAIN_VERTEX_MAX_EDIT
    );
  });
  writeVertexEdits(sanitized);
}

export function serializeTerrainVertexEdits() {
  return { ...readVertexEdits() };
}
