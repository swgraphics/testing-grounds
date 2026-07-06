import { useEffect, useRef, useState } from "react";
import { inputState } from "../../systems/input/inputState";
import {
  terrainSettings,
  updateTerrainSetting,
} from "../../systems/terrain/terrainSettings";
function KeyBox({ label, active }) {
  return <div className={`tg-key-box ${active ? "active" : ""}`}>{label}</div>;
}

export default function InputHUD() {
  const [, forceUpdate] = useState(0);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
  const [sprintOn, setSprintOn] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  const joystickRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
  });

  function refresh() {
    forceUpdate((value) => value + 1);
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
      if (event.code === "KeyW") inputState.forward = true;
      if (event.code === "KeyS") inputState.backward = true;
      if (event.code === "KeyA") inputState.leftward = true;
      if (event.code === "KeyD") inputState.rightward = true;
      if (event.code === "Space") inputState.jump = true;
      if (event.code === "ShiftLeft") inputState.run = true;
      if (event.code === "KeyC") inputState.crouch = true;
      if (event.code === "ControlLeft") inputState.slide = true;

      refresh();
    }

    function handleKeyUp(event) {
      if (event.code === "KeyW") inputState.forward = false;
      if (event.code === "KeyS") inputState.backward = false;
      if (event.code === "KeyA") inputState.leftward = false;
      if (event.code === "KeyD") inputState.rightward = false;
      if (event.code === "Space") inputState.jump = false;
      if (event.code === "ShiftLeft") inputState.run = false;
      if (event.code === "KeyC") inputState.crouch = false;
      if (event.code === "ControlLeft") inputState.slide = false;

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
      setStickPosition({ x: 0, y: 0 });
      refresh();
    }

    function handlePointerDown(event) {
      const isLeftSide = event.clientX < window.innerWidth / 2;
      if (!isLeftSide || event.pointerType !== "touch") return;

      joystickRef.current.active = true;
      joystickRef.current.startX = event.clientX;
      joystickRef.current.startY = event.clientY;
    }

    function handlePointerMove(event) {
      if (!joystickRef.current.active) return;

      const deltaX = event.clientX - joystickRef.current.startX;
      const deltaY = event.clientY - joystickRef.current.startY;

      const clampedX = Math.max(-45, Math.min(45, deltaX));
      const clampedY = Math.max(-45, Math.min(45, deltaY));

      setStickPosition({ x: clampedX, y: clampedY });

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

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
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
  onClick={() => setDevToolsOpen((current) => !current)}
  aria-label="Toggle Dev Tools"
>
  <img
    src="/images/TG_ICON.svg"
    alt="Testing Grounds"
    className="tg-dev-toggle-icon"
  />
</button>

<div className={`tg-side-panel ${devToolsOpen ? "open" : ""}`}>

        {devToolsOpen && (
          <>
            <div className="tg-side-panel-title">DEV TOOLS</div>

            <div className="tg-dev-section">
              <div className="tg-dev-section-title">CHARACTER</div>

              <button
                className="tg-side-panel-button"
                onClick={() => changeCharacter("adventurer")}
              >
                Human
              </button>

              <button
                className="tg-side-panel-button"
                onClick={() => changeCharacter("velociraptor")}
              >
                Raptor
              </button>

              <button className="tg-side-panel-button disabled">Upload</button>
            </div>

            <div className="tg-dev-section">
  <div className="tg-dev-section-title">TERRAIN</div>

  <label className="tg-dev-slider-label">
    Terrain Height
  </label>

  <input
    className="tg-dev-slider"
    type="range"
    min="0"
    max="3"
    step="0.1"
    defaultValue={terrainSettings.heightMultiplier}
    onChange={(event) => {
      updateTerrainSetting(
        "heightMultiplier",
        Number(event.target.value)
      );
    }}
  />
</div>

            <div className="tg-dev-section">
              <div className="tg-dev-section-title">CAMERA</div>
              <div className="tg-dev-placeholder">Controls coming soon</div>
            </div>

            <div className="tg-dev-section">
              <div className="tg-dev-section-title">PHYSICS</div>
              <div className="tg-dev-placeholder">
                Debug tools coming soon
              </div>
            </div>

            <div className="tg-dev-section">
              <div className="tg-dev-section-title">MATERIALS</div>
              <div className="tg-dev-placeholder">
                TG / Original / Wireframe
              </div>
            </div>
          </>
        )}
      </div>

      <div className="tg-keyboard-hud">
        <div className="tg-key-row">
          <KeyBox label="W" active={inputState.forward} />
        </div>

        <div className="tg-key-row">
          <KeyBox label="A" active={inputState.leftward} />
          <KeyBox label="S" active={inputState.backward} />
          <KeyBox label="D" active={inputState.rightward} />
        </div>
      </div>

      <div className="tg-mobile-controls">
        <div className="tg-joystick">
          <div className="tg-joystick-ring">
            <div
              className="tg-joystick-thumb"
              style={{
                transform: `translate(${stickPosition.x}px, ${stickPosition.y}px)`,
              }}
            />
          </div>
        </div>

        <div className="tg-action-buttons">
          <button
            className="tg-action-button"
            onPointerDown={() => tapAction("jump")}
          >
            <span>JUMP</span>
          </button>

          <button
            className={`tg-action-button ${sprintOn ? "active" : ""}`}
            onPointerDown={() => setSprintOn((current) => !current)}
          >
            <span>SPRINT</span>
          </button>

          <button
            className="tg-action-button"
            onPointerDown={() => {
              inputState.crouch = true;
              refresh();
            }}
            onPointerUp={() => {
              inputState.crouch = false;
              refresh();
            }}
          >
            <span>CROUCH</span>
          </button>

          <button
            className="tg-action-button"
            onPointerDown={() => {
              inputState.slide = true;
              refresh();
            }}
            onPointerUp={() => {
              inputState.slide = false;
              refresh();
            }}
          >
            <span>SLIDE</span>
          </button>
        </div>
      </div>
    </>
  );
}