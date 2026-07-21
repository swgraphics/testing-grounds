export const devSettings = {
  fpvMode: false,
  invertCameraY: true,
  speedMultiplier: 1,
};

export function updateDevSetting(key, value) {
  devSettings[key] = value;

  window.dispatchEvent(
    new CustomEvent("dev-settings-changed", {
      detail: { key, value },
    })
  );
}