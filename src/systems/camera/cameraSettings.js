const CAMERA_STORAGE_KEY =
  "testing-grounds-camera-presets";

export const defaultCameraSettings = {
  adventurer: {
    height: 2.4,
    distance: 4.8,
    lookAtHeight: 2.1,
    shoulderOffset: 0.65,
    lookAheadDistance: 3,
    pitchHeightStrength: 1.4,
    smoothing: 0.08,
    fov: 55,
    fpvMoveSpeed: 15,
  },

  velociraptor: {
    height: 0.9,
    distance: 4.8,
    lookAtHeight: 1.2,
    shoulderOffset: 0,
    lookAheadDistance: 0,
    pitchHeightStrength: 2,
    smoothing: 0.08,
    fov: 55,
    fpvMoveSpeed: 15,
  },
};

function cloneProfile(profile) {
  return {
    ...profile,
  };
}

export const cameraSettings = {
  adventurer: cloneProfile(
    defaultCameraSettings.adventurer
  ),

  velociraptor: cloneProfile(
    defaultCameraSettings.velociraptor
  ),
};

function dispatchCameraChange(
  characterId,
  key = null,
  value = null
) {
  window.dispatchEvent(
    new CustomEvent("camera-settings-changed", {
      detail: {
        characterId,
        key,
        value,
        settings: {
          ...cameraSettings[characterId],
        },
      },
    })
  );
}

export function getCameraSettings(characterId) {
  if (!cameraSettings[characterId]) {
    const fallback =
      defaultCameraSettings[characterId] ??
      defaultCameraSettings.adventurer;

    cameraSettings[characterId] =
      cloneProfile(fallback);
  }

  return cameraSettings[characterId];
}

export function updateCameraSetting(
  characterId,
  key,
  value
) {
  const profile = getCameraSettings(characterId);

  profile[key] = Number(value);

  dispatchCameraChange(
    characterId,
    key,
    profile[key]
  );
}

export function saveCameraPreset(characterId) {
  const savedPresets = JSON.parse(
    window.localStorage.getItem(
      CAMERA_STORAGE_KEY
    ) || "{}"
  );

  savedPresets[characterId] = {
    ...getCameraSettings(characterId),
  };

  window.localStorage.setItem(
    CAMERA_STORAGE_KEY,
    JSON.stringify(savedPresets)
  );

  dispatchCameraChange(characterId);
}

export function loadCameraPreset(characterId) {
  const savedPresets = JSON.parse(
    window.localStorage.getItem(
      CAMERA_STORAGE_KEY
    ) || "{}"
  );

  const savedProfile =
    savedPresets[characterId];

  if (!savedProfile) {
    return false;
  }

  Object.assign(
    getCameraSettings(characterId),
    defaultCameraSettings[characterId] ??
      defaultCameraSettings.adventurer,
    savedProfile
  );

  dispatchCameraChange(characterId);

  return true;
}

export function resetCameraPreset(characterId) {
  const defaultProfile =
    defaultCameraSettings[characterId] ??
    defaultCameraSettings.adventurer;

  Object.assign(
    getCameraSettings(characterId),
    cloneProfile(defaultProfile)
  );

  dispatchCameraChange(characterId);
}