export const terrainSettings = {
  heightMultiplier: 1,
  mountainHeight: 1,
  cliffSharpness: 1,
  rollingHills: 1,
  ridgeStrength: 1,

  treeDensity: 25,
  foliageDensity: 25,
  rockDensity: 20,
};

export function updateTerrainSetting(key, value) {
  terrainSettings[key] = value;

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: { key, value },
    })
  );
}