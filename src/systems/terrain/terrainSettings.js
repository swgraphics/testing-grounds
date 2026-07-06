export const terrainSettings = {
  heightMultiplier: 1,
};

export function updateTerrainSetting(key, value) {
  terrainSettings[key] = value;

  window.dispatchEvent(
    new CustomEvent("terrain-settings-changed", {
      detail: { key, value },
    })
  );
}