const STORAGE_KEY = "testing-grounds-dev-slider-locks";

function readLocks() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export const devSliderLocks = readLocks();

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(devSliderLocks));
}

export function isDevSliderLocked(sliderId) {
  return Boolean(devSliderLocks[sliderId]);
}

export function toggleDevSliderLock(sliderId) {
  devSliderLocks[sliderId] = !isDevSliderLocked(sliderId);
  persist();
  window.dispatchEvent(
    new CustomEvent("dev-slider-lock-changed", {
      detail: { sliderId, locked: devSliderLocks[sliderId] },
    })
  );
}
