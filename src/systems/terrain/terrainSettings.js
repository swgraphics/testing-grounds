import { useWorldStore } from "../world/worldStore";

export const DEFAULT_TERRAIN_SETTINGS = {
  heightMultiplier: 1.5,
  mountainHeight: 1.5,
  cliffSharpness: 1.5,
  rollingHills: 1.5,
  ridgeStrength: 1.5,
  plateauAmount: 0,
  geometryStrength: 55,
  
  waterHeight: -4,
  waterWaveStrength: 20,
  
  treeDensity: 50,
  treeCoverage: 50,
  foliageDensity: 50,
  rockDensity: 50,
  
  windStrength: 25,
  windSpeed: 35,
  
  boulderAmount: 0,
  boulderHeight: 50,

  scatterSeed: 1,

  cloudAmount: 45,
  cloudHeight: 55,
  cloudSpeed: 30,
  cloudColor: 65,

  fogDensity: 50,
  sunHeight: 50,
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
};

export const terrainSettings = {
  ...DEFAULT_TERRAIN_SETTINGS,
};

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

export function updateTerrainSetting(key, value) {
  terrainSettings[key] = value;

  const state = useWorldStore.getState();
  const currentChunk = state.world.chunks[state.world.currentChunkId];
  if (currentChunk) {
    state.updateCurrentChunk({
      terrain: {
        ...currentChunk.terrain,
        [key]: value,
      },
    });
  }

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: { key, value },
    })
  );
}

export function broadcastAllTerrainSettings() {
  syncTerrainToWorldStore();

  Object.entries(terrainSettings).forEach(([key, value]) => {
    window.dispatchEvent(
      new CustomEvent("terrain-settings-changed", {
        detail: { key, value },
      })
    );
  });
}

export function saveWorldSettings() {
  localStorage.setItem(
    "testingGroundsWorldSettings",
    JSON.stringify(terrainSettings)
  );
}

export function loadWorldSettings() {
  const saved = localStorage.getItem("testingGroundsWorldSettings");
  if (!saved) return;

  const parsed = JSON.parse(saved);
  Object.assign(terrainSettings, parsed);
  broadcastAllTerrainSettings();
}

export function resetWorldSettings() {
  Object.assign(terrainSettings, DEFAULT_TERRAIN_SETTINGS);
  broadcastAllTerrainSettings();
}

export function reshuffleScatter() {
  terrainSettings.scatterSeed += 1;

  const state = useWorldStore.getState();
  const currentChunk = state.world.chunks[state.world.currentChunkId];
  if (currentChunk) {
    state.updateCurrentChunk({
      terrain: {
        ...currentChunk.terrain,
        scatterSeed: terrainSettings.scatterSeed,
      },
    });
  }

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: {
        key: "scatterSeed",
        value: terrainSettings.scatterSeed,
      },
    })
  );
}