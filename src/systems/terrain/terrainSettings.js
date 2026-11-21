import { TERRAIN_SHAPE_KEYS, terrainShape } from "../world/terrainRegions";
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
  if (state.world.terrainSurface) {
    const surface=state.world.terrainSurface,settings={...terrainSettings};
    delete settings.terrainEdits;delete settings.terrainVertexEdits;delete settings.terrainPreviewStamp;delete settings.terrainPreviewVersion;
    const local=Boolean(currentChunk.terrainRegion);
    const previousShape=local?{...surface.settings,...currentChunk.terrain}:surface.settings;
    const changed=TERRAIN_SHAPE_KEYS.some(key=>previousShape[key]!==terrainSettings[key]);
    if(local)Object.assign(settings,terrainShape(surface.settings));
    const chunks=local&&changed?{...state.world.chunks,[currentChunk.id]:{...currentChunk,terrain:{...currentChunk.terrain,...terrainShape(terrainSettings)},dirty:true}}:state.world.chunks;
    useWorldStore.setState({world:{...state.world,chunks,terrainSurface:{...surface,settings,terrainEdits:{...terrainSettings.terrainEdits},revision:Number(surface.revision||0)+(changed?1:0)}}});return;
  }
  state.updateCurrentChunk({
    terrain: {
      ...currentChunk.terrain,
      ...terrainSettings,
    },
  });
}

export function loadChunkTerrainSettings(chunkId = useWorldStore.getState().world.currentChunkId, force = false) {
  const world = useWorldStore.getState().world;
  const chunk = world.chunks?.[chunkId];
  if (world.terrainSurface) {
    const next={...DEFAULT_TERRAIN_SETTINGS,...world.terrainSurface.settings,...(chunk?.terrainRegion?terrainShape({...world.terrainSurface.settings,...chunk.terrain}):{}),terrainEdits:world.terrainSurface.terrainEdits ?? {},terrainVertexEdits:world.terrainVertexEdits ?? {},terrainPreviewStamp:null,terrainPreviewVersion:0};
    next.terrainEditVersion=Number(terrainSettings.terrainEditVersion||0)+(force?1:0);
    next.terrainVertexEditVersion=Number(terrainSettings.terrainVertexEditVersion||0)+(force?1:0);
    const changed=Object.entries(next).filter(([key,value])=>JSON.stringify(terrainSettings[key])!==JSON.stringify(value));
    Object.assign(terrainSettings,next);
    for(const [key,value] of changed) window.dispatchEvent(new CustomEvent('terrain-settings-changed',{detail:{key,value}}));
    // Selection changes the controls, while the coordinate sampler keeps geometry stable.
    // Release the existing controller lock after the unchanged colliders are confirmed.
    if(!force&&changed.some(([key])=>TERRAIN_SHAPE_KEYS.includes(key)))window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('terrain-physics-rebuilt',{detail:{key:'chunk-selection'}}))));
    return;
  }
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
  if (loaded) loadChunkTerrainSettings(chunkId, true);
  return loaded;
}

export function resetCurrentChunk() {
  const chunkId = useWorldStore.getState().world.currentChunkId;
  const reset = resetChunkSnapshot(chunkId);
  const state=useWorldStore.getState();
  if(reset&&state.world.terrainSurface&&!reset.terrainRegion)useWorldStore.setState({world:{...state.world,terrainSurface:{...state.world.terrainSurface,settings:{...state.world.terrainSurface.settings,...terrainShape(DEFAULT_TERRAIN_SETTINGS)},revision:Number(state.world.terrainSurface.revision||0)+1}}});
  if (reset) loadChunkTerrainSettings(chunkId, true);
  return reset;
}

export function loadWorldSettings() {
  const loadedWorld = loadWorldSnapshot();
  if (!loadedWorld) return null;
  loadChunkTerrainSettings(loadedWorld.currentChunkId, true);
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
  if(useWorldStore.getState().world.terrainSurface){syncTerrainToWorldStore();const state=useWorldStore.getState();useWorldStore.setState({world:{...state.world,terrainSurface:{...state.world.terrainSurface,revision:Number(state.world.terrainSurface.revision||0)+1}}});}
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

  window.addEventListener("tg-world-history-applied", (event) => {
    const paths = event.detail?.paths;
    // Object-only Undo/Redo must not trigger terrain-follow against stale render
    // positions while placed objects are being rehydrated from the restored world.
    if (Array.isArray(paths) && !paths.some(path =>
      path[0] === "terrainSurface" || path[0] === "terrainVertexEdits" || (path[0] === "chunks" && path[2] === "terrain")
    )) return;
    const world = useWorldStore.getState().world;
    const chunk = world.chunks?.[world.currentChunkId];
    if(world.terrainSurface)useWorldStore.setState({world:{...world,terrainSurface:{...world.terrainSurface,revision:Number(world.terrainSurface.revision||0)+1}}});
    const savedTerrain = world.terrainSurface ? { terrainEdits:world.terrainSurface.terrainEdits } : chunk?.terrain ?? {};
    terrainSettings.terrainEdits = { ...(savedTerrain.terrainEdits ?? {}) };
    terrainSettings.terrainVertexEdits = { ...(world.terrainVertexEdits ?? {}) };
    terrainSettings.terrainEditVersion = Number(terrainSettings.terrainEditVersion || 0) + 1;
    terrainSettings.terrainVertexEditVersion = Number(terrainSettings.terrainVertexEditVersion || 0) + 1;
    window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key: "terrainEditVersion", value: terrainSettings.terrainEditVersion } }));
    window.dispatchEvent(new CustomEvent("terrain-settings-changed", { detail: { key: "terrainVertexEditVersion", value: terrainSettings.terrainVertexEditVersion } }));
  });
}
