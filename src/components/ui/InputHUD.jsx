import { useEffect, useRef, useState } from "react";

import { inputState } from "../../systems/input/inputState";
import {
  runWithLoadingOverlay,
} from "../../systems/ui/loadingOverlay";
import {
  terrainSettings,
  updateTerrainSetting,
  saveWorldSettings,
  loadWorldSettings,
  resetWorldSettings,
  reshuffleScatter,
} from "../../systems/terrain/terrainSettings";

import {
  devSettings,
  updateDevSetting,
} from "../../systems/dev/devSettings";
import {
  cameraSettings,
  updateCameraSetting,
  saveCameraPreset,
  loadCameraPreset,
  resetCameraPreset,
} from "../../systems/camera/cameraSettings";

import {
  isDevSectionLocked,
  toggleDevSectionLock,
} from "../../systems/dev/devSectionLocks";

function KeyBox({ label, active }) {
  return (
    <div className={`tg-key-box ${active ? "active" : ""}`}>
      {label}
    </div>
  );
}

function DevSectionHeader({
  label,
  sectionName,
  isOpen,
  onToggle,
}) {
  return (
    <button
      type="button"
      className={`tg-dev-section-header ${isOpen ? "open" : ""}`}
      onClick={() => onToggle(sectionName)}
      aria-expanded={isOpen}
    >
      <span>{label}</span>

      <span className="tg-dev-section-arrow">
        {isOpen ? "−" : "+"}
      </span>
    </button>
  );
}

const TERRAIN_SLIDERS = [
  ["heightMultiplier", "Terrain Height", 0, 3, 0.1],
  ["mountainHeight", "Mountain Height", 0, 3, 0.1],
  ["cliffSharpness", "Cliff Sharpness", 0, 3, 0.1],
  ["rollingHills", "Rolling Hills", 0, 3, 0.1],
  ["ridgeStrength", "Ridge Strength", 0, 3, 0.1],
  ["plateauAmount", "Plateau / Flat Tops", 0, 100, 1],
  ["geometryStrength", "Geometry Strength", 0, 100, 1,],

  ["waterHeight", "Water Height", -20, 20, 0.5,],
  ["waterWaveStrength", "Wave Strength", 0, 100, 1,],
  
  ["treeDensity", "Tree Density", 0, 100, 1],
  ["treeCoverage", "Tree Coverage", 0, 100, 1],
  ["foliageDensity", "Foliage Scatter", 0, 100, 1],
  ["rockDensity", "Rock Scatter", 0, 100, 1],

  ["windStrength", "Wind Strength", 0, 100, 1],
  ["windSpeed", "Wind Speed", 0, 100, 1],

  ["boulderAmount", "Boulder Amount", 0, 100, 1],
  ["boulderHeight", "Boulder Height", 0, 100, 1],
];

const ATMOSPHERE_SLIDERS = [
  ["fogDensity", "Fog Density", 0, 100, 1],
  ["sunHeight", "Sun Height", 0, 100, 1],
  ["sunRotation", "Sun Rotation", 0, 100, 1],
  ["skyHaze", "Sky Haze", 0, 100, 1],
  ["stars", "Stars", 0, 100, 1],
  ["sunCycleEnabled", "Sun Cycle On / Off", 0, 1, 1],
  ["sunCycleMinutes", "Cycle Minutes", 1, 10, 1],
];
const CAMERA_SLIDERS = [
  [
    "height",
    "Camera Height",
    0.2,
    12,
    0.1,
  ],
  [
    "distance",
    "Camera Distance",
    1,
    20,
    0.1,
  ],
  [
    "lookAtHeight",
    "Look-at Height",
    -2,
    8,
    0.1,
  ],
  [
    "shoulderOffset",
    "Shoulder Offset",
    -5,
    5,
    0.05,
  ],
  [
    "lookAheadDistance",
    "Look Ahead",
    0,
    15,
    0.1,
  ],
  [
    "pitchHeightStrength",
    "Pitch Strength",
    0,
    8,
    0.1,
  ],
  [
    "smoothing",
    "Smoothing",
    0.01,
    0.35,
    0.01,
  ],
  [
    "fov",
    "Field of View",
    30,
    100,
    1,
  ],
  [
  "fpvMoveSpeed",
  "FPV Move Speed",
  1,
  50,
  1,
],
];

function DevSlider({
  settingKey,
  label,
  min,
  max,
  step,
  locked = false,
  onRefresh,
}) {
  return (
    <div className="tg-dev-slider-group">
      <label className="tg-dev-slider-label">
        {label}
      </label>

      <input
        className="tg-dev-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={terrainSettings[settingKey]}
        disabled={locked}
        onChange={(event) => {
          updateTerrainSetting(
            settingKey,
            Number(event.target.value)
          );

          onRefresh();
        }}
      />
    </div>
  );
}


function CameraSlider({
  characterId,
  settingKey,
  label,
  min,
  max,
  step,
  locked,
  onRefresh,
}) {
  const value =
    cameraSettings[characterId]?.[
      settingKey
    ] ?? min;

  return (
    <div className="tg-dev-slider-group">
      <div className="tg-dev-slider-heading">
        <label className="tg-dev-slider-label">
          {label}
        </label>

        <span className="tg-dev-slider-value">
          {Number(value).toFixed(
            step < 0.1 ? 2 : 1
          )}
        </span>
      </div>

      <input
        className="tg-dev-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={locked}
        onChange={(event) => {
          updateCameraSetting(
            characterId,
            settingKey,
            Number(event.target.value)
          );

          onRefresh();
        }}
      />
    </div>
  );
}

function DevSectionLockButton({
  sectionName,
  locked,
  onRefresh,
}) {
  const holdTimerRef = useRef(null);
  const longPressTriggeredRef =
    useRef(false);

  function toggleLock() {
    toggleDevSectionLock(sectionName);
    onRefresh();
  }

  function beginHold(event) {
    event.stopPropagation();

    longPressTriggeredRef.current =
      false;

    holdTimerRef.current =
      window.setTimeout(() => {
        longPressTriggeredRef.current =
          true;

        toggleLock();
      }, 800);
  }

  function cancelHold(event) {
    event.stopPropagation();

    if (holdTimerRef.current) {
      window.clearTimeout(
        holdTimerRef.current
      );

      holdTimerRef.current = null;
    }
  }

  function handleClick(event) {
    event.stopPropagation();

    if (
      longPressTriggeredRef.current
    ) {
      longPressTriggeredRef.current =
        false;

      return;
    }

    toggleLock();
  }

  return (
    <button
      type="button"
      className={`tg-dev-section-lock ${
        locked ? "locked" : ""
      }`}
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      onClick={handleClick}
      aria-label={
        locked
          ? `Unlock ${sectionName}`
          : `Lock ${sectionName}`
      }
    >
      <span>
        {locked ? "LOCKED" : "UNLOCKED"}
      </span>

      <span className="tg-dev-section-lock-icon">
        {locked ? "●" : "○"}
      </span>
    </button>
  );
}

export default function InputHUD() {
  const [, forceUpdate] = useState(0);

  const [stickPosition, setStickPosition] = useState({
    x: 0,
    y: 0,
  });
  const [cameraPadPosition, setCameraPadPosition] =
  useState({
    x: 0,
    y: 0,
  });
  const [sprintOn, setSprintOn] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  const [openDevSections, setOpenDevSections] = useState({
    character: true,
    terrain: true,
    camera: false,
    physics: false,
    atmosphere: false,
    world: false,
    materials: false,
  });

  const [fpvMode, setFpvMode] = useState(
    devSettings.fpvMode
  );

  const [invertCameraY, setInvertCameraY] = useState(
  devSettings.invertCameraY
  );

  const [speedMultiplier, setSpeedMultiplier] = useState(
    devSettings.speedMultiplier
  );
const [
  currentCharacterId,
  setCurrentCharacterId,
] = useState("adventurer");

const [cameraLocked, setCameraLocked] =
  useState(
    isDevSectionLocked("camera")
  );
  const joystickRef = useRef({
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
});
const [terrainLocked, setTerrainLocked] =
  useState(
    isDevSectionLocked("terrain")
  );

const [physicsLocked, setPhysicsLocked] =
  useState(
    isDevSectionLocked("physics")
  );

const [
  atmosphereLocked,
  setAtmosphereLocked,
] = useState(
  isDevSectionLocked("atmosphere")
);

const [worldLocked, setWorldLocked] =
  useState(
    isDevSectionLocked("world")
  );
const cameraPadRef = useRef({
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
});

  function refresh() {
    forceUpdate((value) => value + 1);
  }
function updateStickFromKeyboard() {
  let x = 0;
  let y = 0;

  if (inputState.leftward) {
    x -= 1;
  }

  if (inputState.rightward) {
    x += 1;
  }

  if (inputState.forward) {
    y -= 1;
  }

  if (inputState.backward) {
    y += 1;
  }

  const length = Math.hypot(x, y);

  if (length === 0) {
    setStickPosition({
      x: 0,
      y: 0,
    });

    return;
  }

  const maximumDistance = 45;

    setStickPosition({
    x: (x / length) * maximumDistance,
    y: (y / length) * maximumDistance,
  });
}
function resetMovementJoystick() {
  joystickRef.current.active = false;
  joystickRef.current.pointerId = null;

  inputState.forward = false;
  inputState.backward = false;
  inputState.leftward = false;
  inputState.rightward = false;

  setStickPosition({
    x: 0,
    y: 0,
  });

  refresh();
}

function handleMovementJoystickPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();

  joystickRef.current.active = true;
  joystickRef.current.pointerId = event.pointerId;
  joystickRef.current.startX = event.clientX;
  joystickRef.current.startY = event.clientY;

  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleMovementJoystickPointerMove(event) {
  if (
    !joystickRef.current.active ||
    joystickRef.current.pointerId !== event.pointerId
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const maximumDistance = 45;

  const deltaX =
    event.clientX - joystickRef.current.startX;

  const deltaY =
    event.clientY - joystickRef.current.startY;

  const distance = Math.hypot(deltaX, deltaY);

  const scale =
    distance > maximumDistance
      ? maximumDistance / distance
      : 1;

  const clampedX = deltaX * scale;
  const clampedY = deltaY * scale;

  setStickPosition({
    x: clampedX,
    y: clampedY,
  });

  inputState.forward = clampedY < -12;
  inputState.backward = clampedY > 12;
  inputState.leftward = clampedX < -12;
  inputState.rightward = clampedX > 12;

  refresh();
}

function handleMovementJoystickPointerUp(event) {
  event.preventDefault();
  event.stopPropagation();

  if (
    event.currentTarget.hasPointerCapture(
      event.pointerId
    )
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId
    );
  }

  resetMovementJoystick();
}

function sendCameraInput(x, y) {
  window.dispatchEvent(
    new CustomEvent("mobile-camera-input", {
      detail: {
        x,
        y,
      },
    })
  );
}

function resetCameraPad() {
  cameraPadRef.current.active = false;
  cameraPadRef.current.pointerId = null;

  setCameraPadPosition({
    x: 0,
    y: 0,
  });

  sendCameraInput(0, 0);
}
function handleCameraPadPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();

  cameraPadRef.current.active = true;
  cameraPadRef.current.pointerId = event.pointerId;
  cameraPadRef.current.startX = event.clientX;
  cameraPadRef.current.startY = event.clientY;

  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleCameraPadPointerMove(event) {
  if (
    !cameraPadRef.current.active ||
    cameraPadRef.current.pointerId !== event.pointerId
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const maximumDistance = 32;

  const deltaX =
    event.clientX - cameraPadRef.current.startX;

  const deltaY =
    event.clientY - cameraPadRef.current.startY;

  const distance = Math.hypot(deltaX, deltaY);

  const scale =
    distance > maximumDistance
      ? maximumDistance / distance
      : 1;

  const clampedX = deltaX * scale;
  const clampedY = deltaY * scale;

  setCameraPadPosition({
    x: clampedX,
    y: clampedY,
  });

  sendCameraInput(
    clampedX / maximumDistance,
    clampedY / maximumDistance
  );
}

function handleCameraPadPointerUp(event) {
  event.preventDefault();
  event.stopPropagation();

  if (
    event.currentTarget.hasPointerCapture(
      event.pointerId
    )
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId
    );
  }

  resetCameraPad();
}

function toggleDevSection(sectionName) {
    setOpenDevSections((current) => ({
      ...current,
      [sectionName]: !current[sectionName],
    }));
  }

  function changeCharacter(characterId) {
  setCurrentCharacterId(characterId);

  window.dispatchEvent(
    new CustomEvent("change-character", {
      detail: { characterId },
    })
  );
}
useEffect(() => {
  function handleCharacterChange(event) {
    const characterId =
      event.detail?.characterId;

    if (characterId) {
      setCurrentCharacterId(
        characterId
      );
    }
  }

  function handleCameraSettingsChange(
    event
  ) {
    if (
      event.detail?.characterId ===
      currentCharacterId
    ) {
      refresh();
    }
  }

function handleSectionLockChange(event) {
  const sectionName =
    event.detail?.sectionName;

  const locked = Boolean(
    event.detail?.locked
  );

  if (sectionName === "camera") {
    setCameraLocked(locked);
  }

  if (sectionName === "terrain") {
    setTerrainLocked(locked);
  }

  if (sectionName === "physics") {
    setPhysicsLocked(locked);
  }

  if (sectionName === "atmosphere") {
    setAtmosphereLocked(locked);
  }

  if (sectionName === "world") {
    setWorldLocked(locked);
  }
}

  window.addEventListener(
    "change-character",
    handleCharacterChange
  );

  window.addEventListener(
    "camera-settings-changed",
    handleCameraSettingsChange
  );

  window.addEventListener(
    "dev-section-lock-changed",
    handleSectionLockChange
  );

  return () => {
    window.removeEventListener(
      "change-character",
      handleCharacterChange
    );

    window.removeEventListener(
      "camera-settings-changed",
      handleCameraSettingsChange
    );

    window.removeEventListener(
      "dev-section-lock-changed",
      handleSectionLockChange
    );
  };
}, [currentCharacterId]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === "KeyW") {
        inputState.forward = true;
      }

      if (event.code === "KeyS") {
        inputState.backward = true;
      }

      if (event.code === "KeyA") {
        inputState.leftward = true;
      }

      if (event.code === "KeyD") {
        inputState.rightward = true;
      }

      if (event.code === "Space") {
        inputState.jump = true;
      }

      if (event.code === "ShiftLeft") {
        inputState.run = true;
      }

      if (event.code === "KeyC") {
        inputState.crouch = true;
      }

      if (event.code === "ControlLeft") {
        inputState.slide = true;
      }

      updateStickFromKeyboard();
      refresh();
    }

    function handleKeyUp(event) {
      if (event.code === "KeyW") {
        inputState.forward = false;
      }

      if (event.code === "KeyS") {
        inputState.backward = false;
      }

      if (event.code === "KeyA") {
        inputState.leftward = false;
      }

      if (event.code === "KeyD") {
        inputState.rightward = false;
      }

      if (event.code === "Space") {
        inputState.jump = false;
      }

      if (event.code === "ShiftLeft") {
        inputState.run = false;
      }

      if (event.code === "KeyC") {
        inputState.crouch = false;
      }

      if (event.code === "ControlLeft") {
        inputState.slide = false;
      }

      updateStickFromKeyboard();
      refresh();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    inputState.run = sprintOn;
  }, [sprintOn]);

  useEffect(() => {
    function resetJoystick() {
      inputState.forward = false;
      inputState.backward = false;
      inputState.leftward = false;
      inputState.rightward = false;

      setStickPosition({
        x: 0,
        y: 0,
      });

      refresh();
    }

    function handlePointerDown(event) {
      const isLeftSide =
        event.clientX < window.innerWidth / 2;

      if (
        !isLeftSide ||
        event.pointerType !== "touch"
      ) {
        return;
      }

      joystickRef.current.active = true;
      joystickRef.current.startX = event.clientX;
      joystickRef.current.startY = event.clientY;
    }

    function handlePointerMove(event) {
      if (!joystickRef.current.active) {
        return;
      }

      const deltaX =
        event.clientX - joystickRef.current.startX;

      const deltaY =
        event.clientY - joystickRef.current.startY;

      const clampedX = Math.max(
        -45,
        Math.min(45, deltaX)
      );

      const clampedY = Math.max(
        -45,
        Math.min(45, deltaY)
      );

      setStickPosition({
        x: clampedX,
        y: clampedY,
      });

      inputState.forward = clampedY < -20;
      inputState.backward = clampedY > 20;
      inputState.leftward = clampedX < -20;
      inputState.rightward = clampedX > 20;

      refresh();
    }

    function handlePointerUp() {
      joystickRef.current.active = false;
      resetJoystick();
    }

    window.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );
    };
  }, []);

  function tapAction(actionName, duration = 140) {
    inputState[actionName] = true;
    refresh();

    setTimeout(() => {
      inputState[actionName] = false;
      refresh();
    }, duration);
  }

  return (
    <>
      <button
        className="tg-dev-toggle"
        onClick={() => {
          setDevToolsOpen((current) => !current);
        }}
        aria-label="Toggle Dev Tools"
      >
        <img
          src="/images/TG_ICON.svg"
          alt="Testing Grounds"
          className="tg-dev-toggle-icon"
        />
      </button>

      <div
        className={`tg-side-panel ${
          devToolsOpen ? "open" : ""
        }`}
      >
        {devToolsOpen && (
          <>
            <div className="tg-side-panel-title">
              DEV TOOLS
            </div>

            {/* CHARACTER */}
            <div className="tg-dev-section">
              <DevSectionHeader
                label="CHARACTER"
                sectionName="character"
                isOpen={openDevSections.character}
                onToggle={toggleDevSection}
              />

              {openDevSections.character && (
                <div className="tg-dev-section-content">
                  <button
                    className="tg-side-panel-button"
                    onClick={() => {
                      changeCharacter("adventurer");
                    }}
                  >
                    Human
                  </button>

                  <button
                    className="tg-side-panel-button"
                    onClick={() => {
                      changeCharacter("velociraptor");
                    }}
                  >
                    Raptor
                  </button>

                  <button className="tg-side-panel-button disabled">
                    Upload
                  </button>
                </div>
              )}
            </div>

{/* TERRAIN */}
<div className="tg-dev-section">
  <DevSectionHeader
    label="TERRAIN"
    sectionName="terrain"
    isOpen={openDevSections.terrain}
    onToggle={toggleDevSection}
  />

  {openDevSections.terrain && (
    <div className="tg-dev-section-content">
      <DevSectionLockButton
        sectionName="terrain"
        locked={terrainLocked}
        onRefresh={refresh}
      />

      <div
        className={`tg-dev-section-lockable ${
          terrainLocked ? "locked" : ""
        }`}
      >
        {TERRAIN_SLIDERS.map(
          ([key, label, min, max, step]) => (
            <DevSlider
              key={key}
              settingKey={key}
              label={label}
              min={min}
              max={max}
              step={step}
              locked={terrainLocked}
              onRefresh={refresh}
            />
          )
        )}

        <button
          type="button"
          disabled={terrainLocked}
          className="tg-side-panel-button"
          onClick={() => {
            reshuffleScatter();
            refresh();
          }}
        >
          Reshuffle Scatter
        </button>
      </div>
    </div>
  )}
</div>

{/* CAMERA */}
<div className="tg-dev-section">
  <DevSectionHeader
    label="CAMERA"
    sectionName="camera"
    isOpen={openDevSections.camera}
    onToggle={toggleDevSection}
  />

  {openDevSections.camera && (
    <div className="tg-dev-section-content">
      <DevSectionLockButton
        sectionName="camera"
        locked={cameraLocked}
        onRefresh={refresh}
      />

      <div
        className={`tg-dev-section-lockable ${
          cameraLocked ? "locked" : ""
        }`}
      >
        <div className="tg-dev-profile-label">
          ACTIVE PROFILE:{" "}
          {currentCharacterId ===
          "adventurer"
            ? "HUMAN"
            : "VELOCIRAPTOR"}
        </div>

        <button
          disabled={cameraLocked}
          className={`tg-side-panel-button ${
            fpvMode ? "active" : ""
          }`}
          onClick={() => {
            const nextValue = !fpvMode;

            setFpvMode(nextValue);

            updateDevSetting(
              "fpvMode",
              nextValue
            );
          }}
        >
          FPV Mode:{" "}
          {fpvMode ? "ON" : "OFF"}
        </button>

        <button
          disabled={cameraLocked}
          className={`tg-side-panel-button ${
            invertCameraY ? "active" : ""
          }`}
          onClick={() => {
            const nextValue =
              !invertCameraY;

            setInvertCameraY(nextValue);

            updateDevSetting(
              "invertCameraY",
              nextValue
            );
          }}
        >
          Invert Camera Y:{" "}
          {invertCameraY ? "ON" : "OFF"}
        </button>

        <div className="tg-dev-camera-sliders">
          {CAMERA_SLIDERS.map(
            ([
              key,
              label,
              min,
              max,
              step,
            ]) => (
              <CameraSlider
                key={key}
                characterId={
                  currentCharacterId
                }
                settingKey={key}
                label={label}
                min={min}
                max={max}
                step={step}
                locked={cameraLocked}
                onRefresh={refresh}
              />
            )
          )}
        </div>

        <div className="tg-dev-camera-preset-row">
          <button
            type="button"
            disabled={cameraLocked}
            className="tg-side-panel-button"
            onClick={() => {
              saveCameraPreset(
                currentCharacterId
              );

              refresh();
            }}
          >
            Save Preset
          </button>

          <button
            type="button"
            disabled={cameraLocked}
            className="tg-side-panel-button"
            onClick={() => {
              loadCameraPreset(
                currentCharacterId
              );

              refresh();
            }}
          >
            Load Preset
          </button>

          <button
            type="button"
            disabled={cameraLocked}
            className="tg-side-panel-button"
            onClick={() => {
              resetCameraPreset(
                currentCharacterId
              );

              refresh();
            }}
          >
            Reset Preset
          </button>
        </div>

        <div className="tg-dev-placeholder">
          Camera presets are saved separately
          for each character.
        </div>
      </div>
    </div>
  )}
</div>

            {/* PHYSICS */}
            <div className="tg-dev-section">
              <DevSectionHeader
                label="PHYSICS"
                sectionName="physics"
                isOpen={openDevSections.physics}
                onToggle={toggleDevSection}
              />

              {openDevSections.physics && (
  <div className="tg-dev-section-content">
    <DevSectionLockButton
      sectionName="physics"
      locked={physicsLocked}
      onRefresh={refresh}
    />

    <div
      className={`tg-dev-section-lockable ${
        physicsLocked ? "locked" : ""
      }`}
    >
      <div className="tg-dev-button-row">
        {[1, 50, 100, 500].map(
          (multiplier) => (
            <button
              key={multiplier}
              type="button"
              disabled={physicsLocked}
              className={`tg-dev-speed-button ${
                speedMultiplier === multiplier
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setSpeedMultiplier(multiplier);

                updateDevSetting(
                  "speedMultiplier",
                  multiplier
                );
              }}
            >
              {multiplier === 1
                ? "NORMAL"
                : `${multiplier}X`}
            </button>
          )
        )}
      </div>

      <div className="tg-dev-placeholder">
          Debug speed increases movement velocity and
  acceleration. Animation speed remains stable.
      </div>
    </div>
  </div>
)}
            </div>

            {/* ATMOSPHERE */}
            <div className="tg-dev-section">
              <DevSectionHeader
                label="ATMOSPHERE"
                sectionName="atmosphere"
                isOpen={openDevSections.atmosphere}
                onToggle={toggleDevSection}
              />

              {openDevSections.atmosphere && (
  <div className="tg-dev-section-content">
    <DevSectionLockButton
      sectionName="atmosphere"
      locked={atmosphereLocked}
      onRefresh={refresh}
    />

    <div
      className={`tg-dev-section-lockable ${
        atmosphereLocked ? "locked" : ""
      }`}
    >
      {ATMOSPHERE_SLIDERS.map(
        ([key, label, min, max, step]) => (
          <DevSlider
            key={key}
            settingKey={key}
            label={label}
            min={min}
            max={max}
            step={step}
            locked={atmosphereLocked}
            onRefresh={refresh}
          />
        )
      )}
    </div>
  </div>
)}
            </div>

{/* WORLD */}
<div className="tg-dev-section">
  <DevSectionHeader
    label="WORLD"
    sectionName="world"
    isOpen={openDevSections.world}
    onToggle={toggleDevSection}
  />

  {openDevSections.world && (
  <div className="tg-dev-section-content">
    <DevSectionLockButton
      sectionName="world"
      locked={worldLocked}
      onRefresh={refresh}
    />

    <div
      className={`tg-dev-section-lockable ${
        worldLocked ? "locked" : ""
      }`}
    >
      <button
        type="button"
        disabled={worldLocked}
        className="tg-side-panel-button"
        onClick={() => {
          runWithLoadingOverlay(
            async () => {
              saveWorldSettings();
              refresh();
            },
            {
              message: "SAVING WORLD",
              minimumDuration: 700,
            }
          );
        }}
      >
        Save World
      </button>

      <button
        type="button"
        disabled={worldLocked}
        className="tg-side-panel-button"
        onClick={() => {
          runWithLoadingOverlay(
            async () => {
              loadWorldSettings();
              refresh();

              await new Promise((resolve) => {
                window.setTimeout(
                  resolve,
                  250
                );
              });
            },
            {
              message: "LOADING WORLD",
              minimumDuration: 900,
            }
          );
        }}
      >
        Load World
      </button>

      <button
        type="button"
        disabled={worldLocked}
        className="tg-side-panel-button"
        onClick={() => {
          runWithLoadingOverlay(
            async () => {
              resetWorldSettings();
              refresh();
            },
            {
              message: "RESETTING WORLD",
              minimumDuration: 800,
            }
          );
        }}
      >
        Reset World
      </button>
    </div>
  </div>
)}
</div>
            {/* MATERIALS */}
            <div className="tg-dev-section">
              <DevSectionHeader
                label="MATERIALS"
                sectionName="materials"
                isOpen={openDevSections.materials}
                onToggle={toggleDevSection}
              />

              {openDevSections.materials && (
                <div className="tg-dev-section-content">
                  <div className="tg-dev-placeholder">
                    TG / Original / Wireframe
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* DESKTOP JOYSTICK HUD */}
<div
  className="tg-desktop-joystick"
  onPointerDown={handleMovementJoystickPointerDown}
  onPointerMove={handleMovementJoystickPointerMove}
  onPointerUp={handleMovementJoystickPointerUp}
  onPointerCancel={handleMovementJoystickPointerUp}
>
  <img
    src="/images/ui/joystick/joystick-base.svg"
    alt=""
    className="tg-joystick-base"
    draggable="false"
  />

  <img
    src="/images/ui/joystick/joystick-top.svg"
    alt=""
    className="tg-joystick-top"
    draggable="false"
    style={{
      transform: `translate(
        calc(-50% + ${stickPosition.x * 0.315}px),
        calc(-50% + ${stickPosition.y * 0.315}px)
      )`,
    }}
  />
</div>
{/* DESKTOP CAMERA PAD */}
<div
  className="tg-desktop-camera-pad"
  onPointerDown={handleCameraPadPointerDown}
  onPointerMove={handleCameraPadPointerMove}
  onPointerUp={handleCameraPadPointerUp}
  onPointerCancel={handleCameraPadPointerUp}
>
  <img
    src="/images/ui/dpad/dpad-base.svg"
    alt=""
    className="tg-camera-pad-base"
    draggable="false"
  />

  <img
    src="/images/ui/dpad/dpad-top.svg"
    alt=""
    className="tg-camera-pad-top"
    draggable="false"
    style={{
      transform: `translate(
        calc(-50% + ${cameraPadPosition.x * 0.55}px),
        calc(-50% + ${cameraPadPosition.y * 0.55}px)
      )`,
    }}
  />
</div>
{/* DESKTOP ACTION BUTTONS */}
<div className="tg-desktop-action-buttons">
  {/* A — Jump */}
  <button
    type="button"
    className={`tg-action-button ${
      inputState.jump ? "active" : ""
    }`}
    aria-label="Jump"
    onPointerDown={() => {
      inputState.jump = true;
      refresh();
    }}
    onPointerUp={() => {
      inputState.jump = false;
      refresh();
    }}
    onPointerCancel={() => {
      inputState.jump = false;
      refresh();
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">A</span>
  </button>

  {/* Y — Sprint */}
  <button
    type="button"
    className={`tg-action-button ${
      inputState.run ? "active" : ""
    }`}
    aria-label="Sprint"
    onPointerDown={() => {
      inputState.run = true;
      refresh();
    }}
    onPointerUp={() => {
      inputState.run = false;
      refresh();
    }}
    onPointerCancel={() => {
      inputState.run = false;
      refresh();
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">Y</span>
  </button>

  {/* X — Crouch */}
  <button
    type="button"
    className={`tg-action-button ${
      inputState.crouch ? "active" : ""
    }`}
    aria-label="Crouch"
    onPointerDown={() => {
      inputState.crouch = true;
      refresh();
    }}
    onPointerUp={() => {
      inputState.crouch = false;
      refresh();
    }}
    onPointerCancel={() => {
      inputState.crouch = false;
      refresh();
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">X</span>
  </button>

  {/* B — Slide */}
  <button
    type="button"
    className={`tg-action-button ${
      inputState.slide ? "active" : ""
    }`}
    aria-label="Slide"
    onPointerDown={() => {
      inputState.slide = true;
      refresh();
    }}
    onPointerUp={() => {
      inputState.slide = false;
      refresh();
    }}
    onPointerCancel={() => {
      inputState.slide = false;
      refresh();
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">B</span>
  </button>
</div>
      {/* MOBILE CONTROLS */}
      <div className="tg-mobile-controls">
        <div className="tg-joystick">
  <img
    src="/images/ui/joystick/joystick-base.svg"
    alt=""
    className="tg-joystick-base"
    draggable="false"
  />

  <img
    src="/images/ui/joystick/joystick-top.svg"
    alt=""
    className="tg-joystick-top"
    draggable="false"
    style={{
  transform: `translate(calc(-50% + ${stickPosition.x * 0.315}px), calc(-50% + ${stickPosition.y * 0.315}px))`,
}}
  />
</div>
<div
  className="tg-mobile-camera-pad"
  onPointerDown={handleCameraPadPointerDown}
  onPointerMove={handleCameraPadPointerMove}
  onPointerUp={handleCameraPadPointerUp}
  onPointerCancel={handleCameraPadPointerUp}
>
  <img
    src="/images/ui/dpad/dpad-base.svg"
    alt=""
    className="tg-camera-pad-base"
    draggable="false"
  />

  <img
    src="/images/ui/dpad/dpad-top.svg"
    alt=""
    className="tg-camera-pad-top"
    draggable="false"
    style={{
      transform: `translate(
        calc(-50% + ${cameraPadPosition.x * 0.55}px),
        calc(-50% + ${cameraPadPosition.y * 0.55}px)
      )`,
    }}
  />
</div>
<div className="tg-action-buttons">
  <button
    className="tg-action-button"
    aria-label="Jump"
    onPointerDown={() => {
      tapAction("jump");
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">A</span>
  </button>

  <button
    className={`tg-action-button ${
      sprintOn ? "active" : ""
    }`}
    aria-label="Sprint"
    onPointerDown={() => {
      setSprintOn((current) => !current);
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">Y</span>
  </button>

  <button
    className="tg-action-button"
    aria-label="Crouch"
    onPointerDown={() => {
      inputState.crouch = true;
      refresh();
    }}
    onPointerUp={() => {
      inputState.crouch = false;
      refresh();
    }}
    onPointerCancel={() => {
      inputState.crouch = false;
      refresh();
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">X</span>
  </button>

  <button
    className="tg-action-button"
    aria-label="Slide"
    onPointerDown={() => {
      inputState.slide = true;
      refresh();
    }}
    onPointerUp={() => {
      inputState.slide = false;
      refresh();
    }}
    onPointerCancel={() => {
      inputState.slide = false;
      refresh();
    }}
  >
    <img
      src="/images/ui/buttons/button-base.svg"
      alt=""
      className="tg-action-button-base"
      draggable="false"
    />

    <span className="tg-action-button-label">B</span>
  </button>
</div>
      </div>
    </>
  );
}