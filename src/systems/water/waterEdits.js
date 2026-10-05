import { useWorldStore } from "../world/worldStore";
import { terrainSettings } from "../terrain/terrainSettings";
import { beginHistoryTransaction, commitHistoryTransaction, cancelHistoryTransaction } from "../history/historyStore";

function currentChunkId() {
  return useWorldStore.getState().world.currentChunkId;
}

export function getWaterHistorySnapshot() {
  const world = useWorldStore.getState().world;
  const id = world.currentChunkId;
  const chunk = world.chunks?.[id];
  return {
    chunks: {
      [id]: {
        water: JSON.parse(JSON.stringify(chunk?.water ?? {})),
        terrain: {
          terrainEdits: JSON.parse(JSON.stringify(terrainSettings.terrainEdits ?? {})),
          terrainEditVersion: Number(terrainSettings.terrainEditVersion || 0),
        },
      },
    },
  };
}

function historyPaths() {
  const id = currentChunkId();
  return [
    ["chunks", id, "water"],
    ["chunks", id, "terrain", "terrainEdits"],
    ["chunks", id, "terrain", "terrainEditVersion"],
  ];
}

export function beginWaterHistory(label = "WATER") {
  beginHistoryTransaction(label, getWaterHistorySnapshot(), {
    paths: historyPaths(),
    water: true,
    terrain: true,
  });
}

export function commitWaterHistory() {
  return commitHistoryTransaction(getWaterHistorySnapshot(), {
    paths: historyPaths(),
    water: true,
    terrain: true,
  });
}

export function cancelWaterHistory() {
  cancelHistoryTransaction();
}


export function addWaterBody(body) {
  const state = useWorldStore.getState();
  const chunkId = state.world.currentChunkId;
  const chunk = state.world.chunks?.[chunkId];
  if (!chunk) return null;
  const bodies = Array.isArray(chunk.water?.bodies) ? chunk.water.bodies : [];
  const next = { id: `pond-${Date.now()}-${Math.round(Math.random()*9999)}`, ...body };
  state.updateChunk(chunkId, { water: { ...(chunk.water ?? {}), bodies: [...bodies, next] } });
  window.dispatchEvent(new CustomEvent("tg-water-bodies-changed", { detail: { chunkId } }));
  return next;
}
