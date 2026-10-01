import { useWorldStore } from "../world/worldStore";
import {
  loadWorldSnapshot,
  resetSavedWorld,
  saveWorldSnapshot,
  saveChunkSnapshot,
  loadChunkSnapshot,
  resetChunkSnapshot,
  hasSavedChunk,
} from "../world/worldPersistence";

export const DEFAULT_TERRAIN_SETTINGS = {
  heightMultiplier: 0.5,
  mountainHeight: 2.0,
  cliffSharpness: 1.5,
  rollingHills: 1.5,
  ridgeStrength: 1.5,
  plateauAmount: 50,
  geometryStrength: 55,
  waterHeight: -4,
  waterWaveStrength: 20,
  waterSubdivisions: 48,
  treeDensity: 16,
  treeCoverage: 50,
  foliageDensity: 50,
  rockDensity: 50,
  windStrength: 25,
  windSpeed: 35,
  boulderAmount: 0,
  boulderHeight: 50,
  scatterSeed: 1,
  cloudAmount: 0.57,
  cloudHeight: 40,
  cloudSpeed: 2.25,
  cloudColor: 65,
  fogDensity: 15,
  sunHeight: 100,
  sunRotation: 50,
  skyHaze: 50,
  stars: 50,
  atmosphereMode: "normal",
  rainbowEnabled: false,
  rainbowIntensity: 0,
  rainbowWidth: 28,
  auroraEnabled: false,
  auroraIntensity: 0,
  auroraSpeed: 0.45,
  auroraHeight: 82,
  groundFogDensity: 0,
  groundFogSpeed: 0.35,
  groundFogHeight: 3.5,
  groundFogCoverage: 55,
  sunCycleEnabled: 0,
  sunCycleMinutes: 1,
  terrainEditVersion: 0,
  terrainEdits: {},
  terrainPreviewVersion: 0,
  terrainPreviewStamp: null,
  terrainVertexEditVersion: 0,
  terrainVertexEdits: {},
  windDirection: 0,
};

export const terrainSettings = { ...DEFAULT_TERRAIN_SETTINGS };

function getCurrentChunk() {
  const world = useWorldStore.getState().world;
  return world.chunks?.[world.currentChunkId] ?? null;
}

function syncTerrainToWorldStore() {
  const state = useWorldStore.getState();
  const currentChunk = state.world.chunks[state.world.currentChunkId];
  if (!currentChunk) return;
  state.updateCurrentChunk({
    terrain: {
      ...currentChunk.terrain,
      ...terrainSettings,
    },
  });
}

export function loadChunkTerrainSettings(chunkId = useWorldStore.getState().world.currentChunkId) {
  const world = useWorldStore.getState().world;
  const chunk = world.chunks?.[chunkId];
  const savedTerrain = chunk?.terrain ?? {};

  Object.assign(terrainSettings, DEFAULT_TERRAIN_SETTINGS, savedTerrain);
  terrainSettings.terrainPreviewStamp = null;
  terrainSettings.terrainPreviewVersion = 0;
  terrainSettings.terrainVertexEditVersion = 0;
  terrainSettings.terrainVertexEdits = { ...(world.terrainVertexEdits ?? savedTerrain.terrainVertexEdits ?? {}) };

  useWorldStore.getState().replaceWorld({
    ...useWorldStore.getState().world,
    terrainVertexEdits: { ...terrainSettings.terrainVertexEdits },
  });

  broadcastAllTerrainSettings(false);
}

export function updateTerrainSetting(key, value) {
  terrainSettings[key] = value;
  syncTerrainToWorldStore();
  window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key, value } }));
}

export function broadcastAllTerrainSettings(sync = true) {
  if (sync) syncTerrainToWorldStore();
  Object.entries(terrainSettings).forEach(([key, value]) => {
    window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key, value } }));
  });
}

export function saveWorldSettings() {
  syncTerrainToWorldStore();
  saveWorldSnapshot();
}

export function saveCurrentChunk() {
  syncTerrainToWorldStore();
  return saveChunkSnapshot();
}

export function loadCurrentChunk() {
  const chunkId = useWorldStore.getState().world.currentChunkId;
  if (!hasSavedChunk(chunkId)) return null;
  const loaded = loadChunkSnapshot(chunkId);
  if (loaded) loadChunkTerrainSettings(chunkId);
  return loaded;
}

export function resetCurrentChunk() {
  const chunkId = useWorldStore.getState().world.currentChunkId;
  const reset = resetChunkSnapshot(chunkId);
  if (reset) loadChunkTerrainSettings(chunkId);
  return reset;
}

export function loadWorldSettings() {
  const loadedWorld = loadWorldSnapshot();
  if (!loadedWorld) return null;
  loadChunkTerrainSettings(loadedWorld.currentChunkId);
  return loadedWorld;
}

export function initializeBlankCanvasTerrain() {
  const blankSettings = {};
  Object.entries(DEFAULT_TERRAIN_SETTINGS).forEach(([key, value]) => {
    blankSettings[key] = typeof value === "number" ? 0 : value;
  });

  Object.assign(terrainSettings, blankSettings, {
    atmosphereMode: "normal",
    terrainEdits: {},
    terrainVertexEdits: {},
    terrainEditVersion: 0,
    terrainVertexEditVersion: 0,
    terrainPreviewVersion: 0,
    terrainPreviewStamp: null,
  });

  syncTerrainToWorldStore();
  const state = useWorldStore.getState();
  state.replaceWorld({
    ...state.world,
    terrainVertexEdits: {},
  });
  broadcastAllTerrainSettings(false);
}


export function resetWorldSettings() {
  Object.assign(terrainSettings, DEFAULT_TERRAIN_SETTINGS);
  terrainSettings.terrainPreviewStamp = null;
  terrainSettings.terrainPreviewVersion = 0;
  terrainSettings.terrainVertexEditVersion = 0;
  const currentChunk = getCurrentChunk();
  if (currentChunk) {
    useWorldStore.getState().updateCurrentChunk({ terrain: { ...DEFAULT_TERRAIN_SETTINGS } });
  }
  resetSavedWorld();
  broadcastAllTerrainSettings(false);
}

export function reshuffleScatter() {
  terrainSettings.scatterSeed += 1;
  syncTerrainToWorldStore();
  window.dispatchEvent(new CustomEvent("terrain-settings-changed", {
    detail: { key: "scatterSeed", value: terrainSettings.scatterSeed },
  }));
}

if (typeof window !== "undefined") {
  window.addEventListener("tg-current-chunk-changed", (event) => {
    loadChunkTerrainSettings(event.detail?.chunkId);
  });

  window.addEventListener("tg-world-history-applied", () => {
    const world = useWorldStore.getState().world;
    const chunk = world.chunks?.[world.currentChunkId];
    const savedTerrain = chunk?.terrain ?? {};
    terrainSettings.terrainEdits = { ...(savedTerrain.terrainEdits ?? {}) };
    terrainSettings.terrainVertexEdits = { ...(world.terrainVertexEdits ?? {}) };
    terrainSettings.terrainEditVersion = Number(terrainSettings.terrainEditVersion || 0) + 1;
    terrainSettings.terrainVertexEditVersion = Number(terrainSettings.terrainVertexEditVersion || 0) + 1;
    window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key: "terrainEditVersion", value: terrainSettings.terrainEditVersion } }));
    window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key: "terrainVertexEditVersion", value: terrainSettings.terrainVertexEditVersion } }));
  });
}
