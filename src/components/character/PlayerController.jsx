import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl } from "ecctrl";
import * as THREE from "three";

import { cameraConfig } from "../../config/cameraConfig";
import { inputState } from "../../systems/input/inputState";
import {
  characterRegistry,
  activeCharacterId,
} from "./characterRegistry";
import PlayableCharacter from "./PlayableCharacter";
import { devSettings } from "../../systems/dev/devSettings";

function FollowCamera({ controllerRef, character, fpvMode }) {
  const { camera, gl } = useThree();

  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(0.25);
  const fpvAltitudeRef = useRef(0);

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

  useFrame((_, delta) => {
    if (!controllerRef.current) return;

    const target = controllerRef.current.currPos;

    if (!target) return;

    if (fpvMode) {
      const verticalSpeed = 15;

      if (inputState.run) {
        fpvAltitudeRef.current +=
          verticalSpeed * delta;
      }

      if (inputState.crouch) {
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

    const baseHeight =
      character.cameraHeight ??
      cameraConfig.height;

    const baseDistance =
      character.cameraDistance ??
      cameraConfig.distance;

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
        ? cameraConfig.lookAtHeight - 1.35
        : cameraConfig.lookAtHeight;

    const cameraOffset =
      new THREE.Vector3(
        Math.sin(yawRef.current) *
          finalDistance,

        finalHeight +
          Math.sin(pitchRef.current) * 2,

        Math.cos(yawRef.current) *
          finalDistance
      );

    const desiredPosition =
      new THREE.Vector3(
        target.x + cameraOffset.x,
        target.y + cameraOffset.y,
        target.z + cameraOffset.z
      );

    camera.position.lerp(
      desiredPosition,
      cameraConfig.smoothing
    );

    camera.lookAt(
      target.x,
      target.y + finalLookAtHeight,
      target.z
    );
  });

  return null;
}

export default function PlayerController() {
  const controllerRef = useRef();

  const [animationState, setAnimationState] =
    useState("idle");

  const [
    currentCharacterId,
    setCurrentCharacterId,
  ] = useState(activeCharacterId);

  const [fpvMode, setFpvMode] =
    useState(devSettings.fpvMode);

  const [
    speedMultiplier,
    setSpeedMultiplier,
  ] = useState(
    devSettings.speedMultiplier
  );

  const activeCharacter =
    characterRegistry[currentCharacterId];

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

  useFrame(() => {
    const isMoving =
      inputState.forward ||
      inputState.backward ||
      inputState.leftward ||
      inputState.rightward;

    if (inputState.slide && isMoving) {
      setAnimationState("slide");
    } else if (
      inputState.jump &&
      inputState.run &&
      isMoving
    ) {
      setAnimationState("runJump");
    } else if (inputState.jump) {
      setAnimationState("jump");
    } else if (
      inputState.crouch &&
      isMoving
    ) {
      setAnimationState("crouchWalk");
    } else if (!isMoving) {
      setAnimationState("idle");
    } else if (inputState.run) {
      setAnimationState("run");
    } else {
      setAnimationState("walk");
    }

const developerSpeedActive = speedMultiplier > 1;

controllerRef.current?.setMovement({
  forward: inputState.forward,
  backward: inputState.backward,
  leftward: inputState.leftward,
  rightward: inputState.rightward,
  jump: inputState.jump,

  // Developer speed modes activate Ecctrl's sprint multiplier.
  // In Normal mode, regular Sprint still works outside FPV.
  run: developerSpeedActive
    ? true
    : fpvMode
      ? false
      : inputState.run,
  });
});
  return (
    <>
      <Ecctrl
  key={activeCharacter.id}
  ref={controllerRef}
  position={[0, 3, 0]}
  mode="FixedCamera"
  maxVelLimit={12 * Math.max(speedMultiplier, 1)}
  sprintMult={speedMultiplier > 1 ? speedMultiplier : 2}
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