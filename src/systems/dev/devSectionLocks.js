const LOCK_STORAGE_KEY =
  "testing-grounds-dev-section-locks";

function loadStoredLocks() {
  try {
    return JSON.parse(
      window.localStorage.getItem(
        LOCK_STORAGE_KEY
      ) || "{}"
    );
  } catch {
    return {};
  }
}

export const devSectionLocks = {
  camera: false,
  ...loadStoredLocks(),
};

function saveLocks() {
  window.localStorage.setItem(
    LOCK_STORAGE_KEY,
    JSON.stringify(devSectionLocks)
  );
}

export function isDevSectionLocked(sectionName) {
  return Boolean(
    devSectionLocks[sectionName]
  );
}

export function setDevSectionLocked(
  sectionName,
  locked
) {
  devSectionLocks[sectionName] =
    Boolean(locked);

  saveLocks();

  window.dispatchEvent(
    new CustomEvent(
      "dev-section-lock-changed",
      {
        detail: {
          sectionName,
          locked:
            devSectionLocks[sectionName],
        },
      }
    )
  );
}

export function toggleDevSectionLock(
  sectionName
) {
  setDevSectionLocked(
    sectionName,
    !isDevSectionLocked(sectionName)
  );
}