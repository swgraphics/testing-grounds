import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl } from "ecctrl";
import * as THREE from "three";

import { cameraConfig } from "../../config/cameraConfig";
import Adventurer from "./Adventurer";

const keysPressed = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  jump: false,
  run: false,
};

const mobileInput = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  jump: false,
  run: false,
};

function FollowCamera({ controllerRef }) {
  const { camera, gl } = useThree();

  const yawRef = useRef(0);
  const pitchRef = useRef(0.25);
  const isOrbitingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    function handlePointerDown(event) {
      const isRightSide = event.clientX > window.innerWidth / 2;

      if (event.pointerType === "mouse" || isRightSide) {
        isOrbitingRef.current = true;
        lastPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    }

    function handlePointerMove(event) {
      if (!isOrbitingRef.current) return;

      const deltaX = event.clientX - lastPointerRef.current.x;
      const deltaY = event.clientY - lastPointerRef.current.y;

      const sensitivity =
        event.pointerType === "touch"
          ? cameraConfig.touchOrbitSensitivity
          : cameraConfig.orbitSensitivity;

      yawRef.current -= deltaX * sensitivity;
      pitchRef.current += deltaY * sensitivity;

      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current,
        cameraConfig.minPitch,
        cameraConfig.maxPitch
      );

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    function handlePointerUp() {
      isOrbitingRef.current = false;
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl]);

  useFrame(() => {
    if (!controllerRef.current) return;

    const target = controllerRef.current.currPos;
    if (!target) return;

    const cameraOffset = new THREE.Vector3(
      Math.sin(yawRef.current) * cameraConfig.distance,
      cameraConfig.height + Math.sin(pitchRef.current) * 2,
      Math.cos(yawRef.current) * cameraConfig.distance
    );

    const desiredPosition = new THREE.Vector3(
      target.x + cameraOffset.x,
      target.y + cameraOffset.y,
      target.z + cameraOffset.z
    );

    camera.position.lerp(desiredPosition, cameraConfig.smoothing);

    camera.lookAt(target.x, target.y + cameraConfig.lookAtHeight, target.z);
  });

  return null;
}

function MobileControls() {
  const joystickRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
  });

  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
  const [sprintOn, setSprintOn] = useState(false);

  useEffect(() => {
    mobileInput.run = sprintOn;
  }, [sprintOn]);

  useEffect(() => {
    function resetMovement() {
      mobileInput.forward = false;
      mobileInput.backward = false;
      mobileInput.leftward = false;
      mobileInput.rightward = false;
      setStickPosition({ x: 0, y: 0 });
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

      const clampedX = THREE.MathUtils.clamp(deltaX, -45, 45);
      const clampedY = THREE.MathUtils.clamp(deltaY, -45, 45);

      setStickPosition({
        x: clampedX,
        y: clampedY,
      });

      mobileInput.forward = clampedY < -20;
      mobileInput.backward = clampedY > 20;
      mobileInput.leftward = clampedX < -20;
      mobileInput.rightward = clampedX > 20;
    }

    function handlePointerUp() {
      joystickRef.current.active = false;
      resetMovement();
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

  function handleJumpPress() {
    mobileInput.jump = true;

    setTimeout(() => {
      mobileInput.jump = false;
    }, 120);
  }

  return (
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
          onPointerDown={handleJumpPress}
        >
          <span>▲</span>
          <small>Jump</small>
        </button>

        <button
          className={`tg-action-button ${sprintOn ? "active" : ""}`}
          onPointerDown={() => setSprintOn((current) => !current)}
        >
          <span>››</span>
          <small>Sprint</small>
        </button>
      </div>
    </div>
  );
}

export default function PlayerController() {
  const controllerRef = useRef();
  const [animationState, setAnimationState] = useState("idle");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === "KeyW") keysPressed.forward = true;
      if (event.code === "KeyS") keysPressed.backward = true;
      if (event.code === "KeyA") keysPressed.leftward = true;
      if (event.code === "KeyD") keysPressed.rightward = true;
      if (event.code === "Space") keysPressed.jump = true;
      if (event.code === "ShiftLeft") keysPressed.run = true;
    }

    function handleKeyUp(event) {
      if (event.code === "KeyW") keysPressed.forward = false;
      if (event.code === "KeyS") keysPressed.backward = false;
      if (event.code === "KeyA") keysPressed.leftward = false;
      if (event.code === "KeyD") keysPressed.rightward = false;
      if (event.code === "Space") keysPressed.jump = false;
      if (event.code === "ShiftLeft") keysPressed.run = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const inputForward = keysPressed.forward || mobileInput.forward;
    const inputBackward = keysPressed.backward || mobileInput.backward;
    const inputLeftward = keysPressed.leftward || mobileInput.leftward;
    const inputRightward = keysPressed.rightward || mobileInput.rightward;
    const inputJump = keysPressed.jump || mobileInput.jump;
    const inputRun = keysPressed.run || mobileInput.run;

    const isMoving =
      inputForward || inputBackward || inputLeftward || inputRightward;

    if (!isMoving) {
      setAnimationState("idle");
    } else if (inputRun) {
      setAnimationState("run");
    } else {
      setAnimationState("walk");
    }

    controllerRef.current?.setMovement({
      forward: inputForward,
      backward: inputBackward,
      leftward: inputLeftward,
      rightward: inputRightward,
      jump: inputJump,
      run: inputRun,
    });
  });

  return (
    <>
      <Ecctrl ref={controllerRef} position={[0, 3, 0]} mode="FixedCamera">
        <Adventurer animationState={animationState} />
      </Ecctrl>

      <FollowCamera controllerRef={controllerRef} />
    </>
  );
}