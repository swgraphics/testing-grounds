export const terrainSettings = {
  heightMultiplier: 1.5,
  mountainHeight: 1.5,
  cliffSharpness: 1.5,
  rollingHills: 1.5,
  ridgeStrength: 1.5,

  treeDensity: 50,
  foliageDensity: 50,
  rockDensity: 50,

  fogDensity: 0.012,
};

export function updateTerrainSetting(key, value) {
  terrainSettings[key] = value;

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: { key, value },
    })
  );
}