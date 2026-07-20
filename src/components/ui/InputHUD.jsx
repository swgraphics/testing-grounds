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

function DevSlider({
  settingKey,
  label,
  min,
  max,
  step,
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

  const [speedMultiplier, setSpeedMultiplier] = useState(
    devSettings.speedMultiplier
  );

  const joystickRef = useRef({
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
});

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
    window.dispatchEvent(
      new CustomEvent("change-character", {
        detail: { characterId },
      })
    );
  }

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
                  {TERRAIN_SLIDERS.map(
                    ([key, label, min, max, step]) => (
                      <DevSlider
                        key={key}
                        settingKey={key}
                        label={label}
                        min={min}
                        max={max}
                        step={step}
                        onRefresh={refresh}
                      />
                    )
                  )}

                  <button
                    className="tg-side-panel-button"
                    onClick={() => {
                      reshuffleScatter();
                      refresh();
                    }}
                  >
                    Reshuffle Scatter
                  </button>
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
                  <button
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
                    FPV Mode: {fpvMode ? "ON" : "OFF"}
                  </button>

                  <div className="tg-dev-placeholder">
                    In FPV: Sprint raises view, Crouch
                    lowers view
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
                  <div className="tg-dev-button-row">
                    {[1, 50, 100, 500].map(
                      (multiplier) => (
                        <button
                          key={multiplier}
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
                    Debug speed affects character movement
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
                  {ATMOSPHERE_SLIDERS.map(
                    ([key, label, min, max, step]) => (
                      <DevSlider
                        key={key}
                        settingKey={key}
                        label={label}
                        min={min}
                        max={max}
                        step={step}
                        onRefresh={refresh}
                      />
                    )
                  )}
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
      <button
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
        className="tg-side-panel-button"
        onClick={() => {
          runWithLoadingOverlay(
            async () => {
              loadWorldSettings();
              refresh();

              await new Promise((resolve) => {
                window.setTimeout(resolve, 250);
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