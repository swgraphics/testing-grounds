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
  sunCycleEnabled: 0,
  sunCycleMinutes: 1,
};

export const terrainSettings = {
  ...DEFAULT_TERRAIN_SETTINGS,
};

export function updateTerrainSetting(key, value) {
  terrainSettings[key] = value;

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: { key, value },
    })
  );
}

export function broadcastAllTerrainSettings() {
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

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: {
        key: "scatterSeed",
        value: terrainSettings.scatterSeed,
      },
    })
  );
}