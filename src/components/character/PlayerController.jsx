import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl } from "ecctrl";
import * as THREE from "three";

import { cameraConfig } from "../../config/cameraConfig";
import { inputState } from "../../systems/input/inputState";
import { gamepadState } from "../../systems/input/gamepadState";
import {
  characterRegistry,
  activeCharacterId,
} from "./characterRegistry";
import PlayableCharacter from "./PlayableCharacter";
import { devSettings } from "../../systems/dev/devSettings";
import {
  getCameraSettings,
} from "../../systems/camera/cameraSettings";

function FollowCamera({ controllerRef, character, fpvMode }) {
  const { camera, gl } = useThree();

  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(0.25);
  const fpvAltitudeRef = useRef(0);

  const mobileCameraInputRef = useRef({
    x: 0,
    y: 0,
  });

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

      const deltaX =
        event.clientX - lastPointerRef.current.x;

      const deltaY =
        event.clientY - lastPointerRef.current.y;

      const sensitivity =
        event.pointerType === "touch"
          ? cameraConfig.touchOrbitSensitivity
          : cameraConfig.orbitSensitivity;

      yawRef.current -= deltaX * sensitivity;
      pitchRef.current -= deltaY * sensitivity;

      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current,
        fpvMode ? -1.25 : cameraConfig.minPitch,
        fpvMode ? 1.25 : cameraConfig.maxPitch
      );

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    function handlePointerUp() {
      isOrbitingRef.current = false;
    }

    canvas.addEventListener(
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
      canvas.removeEventListener(
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
  }, [gl, fpvMode]);

  useEffect(() => {
    if (!fpvMode) {
      fpvAltitudeRef.current = 0;
    }
  }, [fpvMode]);
useEffect(() => {
  function handleMobileCameraInput(event) {
    mobileCameraInputRef.current = {
      x: Number(event.detail?.x) || 0,
      y: Number(event.detail?.y) || 0,
    };
  }

  window.addEventListener(
    "mobile-camera-input",
    handleMobileCameraInput
  );

  return () => {
    window.removeEventListener(
      "mobile-camera-input",
      handleMobileCameraInput
    );
  };
}, []);

  useFrame((_, delta) => {
      const controllerYawSpeed = 2.4;
const controllerPitchSpeed = 1.8;

const gamepadCameraX = gamepadState.connected
  ? gamepadState.rightStickX
  : 0;

const gamepadCameraY = gamepadState.connected
  ? gamepadState.rightStickY
  : 0;

const cameraInputX =
  gamepadCameraX +
  mobileCameraInputRef.current.x;

const mobileCameraY = devSettings.invertCameraY
  ? -mobileCameraInputRef.current.y
  : mobileCameraInputRef.current.y;

const cameraInputY =
  gamepadCameraY +
  mobileCameraY;

yawRef.current -=
  cameraInputX *
  controllerYawSpeed *
  delta;

pitchRef.current -=
  cameraInputY *
  controllerPitchSpeed *
  delta;

pitchRef.current = THREE.MathUtils.clamp(
  pitchRef.current,
  fpvMode ? -1.25 : cameraConfig.minPitch,
  fpvMode ? 1.25 : cameraConfig.maxPitch
);

    if (!controllerRef.current) return;

    const target = controllerRef.current.currPos;

    if (!target) return;

    if (fpvMode) {
      const verticalSpeed = 15;

      const raiseCamera =
        inputState.run || gamepadState.sprint;

      const lowerCamera =
       inputState.crouch || gamepadState.crouch;

if (raiseCamera) {
  fpvAltitudeRef.current +=
    verticalSpeed * delta;
}

if (lowerCamera) {
  fpvAltitudeRef.current -=
    verticalSpeed * delta;
}

      fpvAltitudeRef.current =
        THREE.MathUtils.clamp(
          fpvAltitudeRef.current,
          -1.1,
          250
        );

      const normalEyeHeight =
        character.fpvHeight ??
        Math.max(
          1.5,
          (character.height ?? 0) + 1.7
        );

      const desiredPosition =
        new THREE.Vector3(
          target.x,
          target.y +
            normalEyeHeight +
            fpvAltitudeRef.current,
          target.z
        );

      camera.position.lerp(
        desiredPosition,
        0.22
      );

      const lookDirection =
        new THREE.Vector3(
          -Math.sin(yawRef.current) *
            Math.cos(pitchRef.current),

          Math.sin(pitchRef.current),

          -Math.cos(yawRef.current) *
            Math.cos(pitchRef.current)
        );

      const lookTarget =
        camera.position
          .clone()
          .add(
            lookDirection.multiplyScalar(20)
          );

      camera.lookAt(lookTarget);

      return;
    }

    const isPortraitMobile =
      window.innerWidth < 900 &&
      window.innerHeight > window.innerWidth;

    const cameraProfile =
  getCameraSettings(character.id);

const baseHeight =
  cameraProfile.height ??
  cameraConfig.height;

const baseDistance =
  cameraProfile.distance ??
  cameraConfig.distance;

const baseLookAtHeight =
  cameraProfile.lookAtHeight ??
  cameraConfig.lookAtHeight;

const pitchHeightStrength =
  cameraProfile.pitchHeightStrength ?? 2;

const shoulderOffset =
  cameraProfile.shoulderOffset ?? 0;

const lookAheadDistance =
  cameraProfile.lookAheadDistance ?? 0;

const finalHeight =
  isPortraitMobile
    ? baseHeight + 3.2
    : baseHeight;

const finalDistance =
  isPortraitMobile
    ? baseDistance + 2.6
    : baseDistance;

const finalLookAtHeight =
  isPortraitMobile
    ? baseLookAtHeight - 1.35
    : baseLookAtHeight;

/*
  Right-facing vector based on camera yaw.

  A positive shoulderOffset moves the camera to the
  character's right, which places the character slightly
  left of screen center.
*/
const cameraRightX =
  Math.cos(yawRef.current);

const cameraRightZ =
  -Math.sin(yawRef.current);

/*
  Forward-facing vector used to aim farther into the world
  instead of always aiming directly at the character.
*/
const cameraForwardX =
  -Math.sin(yawRef.current);

const cameraForwardZ =
  -Math.cos(yawRef.current);

const cameraOffset =
  new THREE.Vector3(
    Math.sin(yawRef.current) *
      finalDistance +
      cameraRightX * shoulderOffset,

    finalHeight +
      Math.sin(pitchRef.current) *
        pitchHeightStrength,

    Math.cos(yawRef.current) *
      finalDistance +
      cameraRightZ * shoulderOffset
  );

const desiredPosition =
  new THREE.Vector3(
    target.x + cameraOffset.x,
    target.y + cameraOffset.y,
    target.z + cameraOffset.z
  );

  const desiredFov =
  cameraProfile.fov ?? 55;

if (
  Math.abs(camera.fov - desiredFov) >
  0.01
) {
  camera.fov = desiredFov;
  camera.updateProjectionMatrix();
}
camera.position.lerp(
  desiredPosition,
  cameraProfile.smoothing ??
    cameraConfig.smoothing
);

camera.lookAt(
  target.x +
    cameraForwardX * lookAheadDistance,

  target.y + finalLookAtHeight,

  target.z +
    cameraForwardZ * lookAheadDistance
);
  });

  return null;
}
const SPEED_PROFILES = {
  1: {
    maxVelLimit: 12,
    sprintMult: 2,
    accDeltaTime: 8,
    turnVelMultiplier: 0.2,
  },

  50: {
    maxVelLimit: 50,
    sprintMult: 1,
    accDeltaTime: 35,
    turnVelMultiplier: 0.5,
  },

  100: {
    maxVelLimit: 100,
    sprintMult: 1,
    accDeltaTime: 60,
    turnVelMultiplier: 0.75,
  },

  500: {
    maxVelLimit: 500,
    sprintMult: 1,
    accDeltaTime: 120,
    turnVelMultiplier: 1,
  },
};

function getSpeedProfile(speedMultiplier) {
  return (
    SPEED_PROFILES[speedMultiplier] ??
    SPEED_PROFILES[1]
  );
}
export default function PlayerController() {
  const controllerRef = useRef();
  const positionBroadcastTimeRef = useRef(0);
  const [animationState, setAnimationState] = useState("idle");
  const animationStateRef = useRef("idle");
  const [currentCharacterId, setCurrentCharacterId] =
    useState(activeCharacterId);

  const [fpvMode, setFpvMode] =
    useState(devSettings.fpvMode);

  const [speedMultiplier, setSpeedMultiplier] =
    useState(devSettings.speedMultiplier);
const [, refreshCameraSettings] =
  useState(0);
  const activeCharacter =
    characterRegistry[currentCharacterId];
  
    const speedProfile =
  getSpeedProfile(speedMultiplier);
const activeCameraProfile =
  getCameraSettings(currentCharacterId);

const fpvMoveSpeed =
  activeCameraProfile.fpvMoveSpeed ?? 15;
  
useEffect(() => {
  function handleCharacterChange(event) {
    setCurrentCharacterId(
      event.detail.characterId
    );
  }

  window.addEventListener(
    "change-character",
    handleCharacterChange
  );

  return () => {
    window.removeEventListener(
      "change-character",
      handleCharacterChange
    );
  };
}, []);

useEffect(() => {
  function handleDevSettingsChange(event) {
    if (event.detail.key === "fpvMode") {
      setFpvMode(
        Boolean(event.detail.value)
      );
    }

    if (
      event.detail.key ===
      "speedMultiplier"
    ) {
      setSpeedMultiplier(
        Number(event.detail.value) || 1
      );
    }
  }

  window.addEventListener(
    "dev-settings-changed",
    handleDevSettingsChange
  );

  return () => {
    window.removeEventListener(
      "dev-settings-changed",
      handleDevSettingsChange
    );
  };
}, []);

useEffect(() => {
  function handleCameraSettingsChange(event) {
    if (
      event.detail?.characterId ===
      currentCharacterId
    ) {
      refreshCameraSettings(
        (value) => value + 1
      );
    }
  }

  window.addEventListener(
    "camera-settings-changed",
    handleCameraSettingsChange
  );

  return () => {
    window.removeEventListener(
      "camera-settings-changed",
      handleCameraSettingsChange
    );
  };
}, [currentCharacterId]);
  useFrame((state) => {
        const currentPosition =
      controllerRef.current?.currPos;

    const currentTime =
      state.clock.elapsedTime;

    if (
      currentPosition &&
      currentTime -
        positionBroadcastTimeRef.current >=
        0.1
    ) {
      positionBroadcastTimeRef.current =
        currentTime;

      window.dispatchEvent(
        new CustomEvent(
          "player-position-changed",
          {
            detail: {
              x: currentPosition.x,
              y: currentPosition.y,
              z: currentPosition.z,
            },
          }
        )
      );
    }
    
    const controllerForward =
      gamepadState.leftStickY < -0.2;

    const controllerBackward =
      gamepadState.leftStickY > 0.2;

    const controllerLeft =
      gamepadState.leftStickX < -0.2;

    const controllerRight =
      gamepadState.leftStickX > 0.2;

    const forward =
      inputState.forward || controllerForward;

    const backward =
      inputState.backward || controllerBackward;

    const leftward =
      inputState.leftward || controllerLeft;

    const rightward =
      inputState.rightward || controllerRight;

    const jump =
      inputState.jump || gamepadState.jump;

    const slide =
      inputState.slide || gamepadState.slide;

    const crouch =
      inputState.crouch || gamepadState.crouch;

    const sprint =
      inputState.run || gamepadState.sprint;

    const isMoving =
      forward ||
      backward ||
      leftward ||
      rightward;

   let nextAnimationState = "idle";

if (slide && isMoving) {
  nextAnimationState = "slide";
} else if (
  jump &&
  sprint &&
  isMoving
) {
  nextAnimationState = "runJump";
} else if (jump) {
  nextAnimationState = "jump";
} else if (
  crouch &&
  isMoving
) {
  nextAnimationState = "crouchWalk";
} else if (isMoving && sprint) {
  nextAnimationState = "run";
} else if (isMoving) {
  nextAnimationState = "walk";
}

if (
  animationStateRef.current !==
  nextAnimationState
) {
  animationStateRef.current =
    nextAnimationState;

  setAnimationState(nextAnimationState);
}

    const developerSpeedActive =
      speedMultiplier > 1;

    controllerRef.current?.setMovement({
      forward,
      backward,
      leftward,
      rightward,
      jump,

    run: fpvMode
  ? true
  : developerSpeedActive
    ? true
    : sprint,
    });
  });

  return (
    <>
<Ecctrl
  ref={controllerRef}
  position={[0, 3, 0]}
  mode="FixedCamera"
  maxVelLimit={
    fpvMode
      ? fpvMoveSpeed
      : speedProfile.maxVelLimit
  }
  sprintMult={
    fpvMode
      ? 1
      : speedProfile.sprintMult
  }
  accDeltaTime={
    fpvMode
      ? 35
      : speedProfile.accDeltaTime
  }
  turnVelMultiplier={
    speedProfile.turnVelMultiplier
  }
>
        <PlayableCharacter
          character={activeCharacter}
          animationState={animationState}
          hidden={fpvMode}
        />
      </Ecctrl>

      <FollowCamera
        controllerRef={controllerRef}
        character={activeCharacter}
        fpvMode={fpvMode}
      />
    </>
  );
}