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

function FollowCamera({ controllerRef, character }) {
  const { camera, gl } = useThree();

  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(0.25);
  const isOrbitingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const isPortraitMobile =
  window.matchMedia("(max-width: 899px) and (orientation: portrait)").matches;

const cameraHeight = character.cameraHeight ?? cameraConfig.height;
const cameraDistance = character.cameraDistance ?? cameraConfig.distance;

const portraitHeightBoost = isPortraitMobile ? 2.8 : 0;
const portraitLookAtDrop = isPortraitMobile ? 1.6 : 0;
const portraitDistanceBoost = isPortraitMobile ? 2.5 : 0;

  useFrame(() => {
    if (!controllerRef.current) return;

    const target = controllerRef.current.currPos;
    if (!target) return;

    const cameraOffset = new THREE.Vector3(
  Math.sin(yawRef.current) * (cameraDistance + portraitDistanceBoost),
  cameraHeight + portraitHeightBoost + Math.sin(pitchRef.current) * 2,
  Math.cos(yawRef.current) * (cameraDistance + portraitDistanceBoost)
);

    const desiredPosition = new THREE.Vector3(
      target.x + cameraOffset.x,
      target.y + cameraOffset.y,
      target.z + cameraOffset.z
    );

    camera.position.lerp(desiredPosition, cameraConfig.smoothing);

    camera.lookAt(
      target.x,
      target.y + cameraConfig.lookAtHeight + portraitLookAtDrop,
      target.z
    );
  });

  gl.domElement.onpointerdown = (event) => {
    const isRightSide = event.clientX > window.innerWidth / 2;

    if (event.pointerType === "mouse" || isRightSide) {
      isOrbitingRef.current = true;
      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }
  };

  window.onpointermove = (event) => {
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
  };

  window.onpointerup = () => {
    isOrbitingRef.current = false;
  };

  return null;
}

export default function PlayerController() {
  const controllerRef = useRef();
  const [animationState, setAnimationState] = useState("idle");
  const [currentCharacterId, setCurrentCharacterId] = useState(activeCharacterId);
  const activeCharacter = characterRegistry[currentCharacterId];
  useEffect(() => {
  function handleCharacterChange(event) {
    setCurrentCharacterId(event.detail.characterId);
  }

  window.addEventListener("change-character", handleCharacterChange);

  return () => {
    window.removeEventListener("change-character", handleCharacterChange);
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
    } else if (inputState.jump && inputState.run && isMoving) {
      setAnimationState("runJump");
    } else if (inputState.jump) {
      setAnimationState("jump");
    } else if (inputState.crouch && isMoving) {
      setAnimationState("crouchWalk");
    } else if (!isMoving) {
      setAnimationState("idle");
    } else if (inputState.run) {
      setAnimationState("run");
    } else {
      setAnimationState("walk");
    }

    controllerRef.current?.setMovement({
      forward: inputState.forward,
      backward: inputState.backward,
      leftward: inputState.leftward,
      rightward: inputState.rightward,
      jump: inputState.jump,
      run: inputState.run,
    });
  });

  return (
    <>
      <Ecctrl 
        key={activeCharacter.id} 
        ref={controllerRef} 
        position={[0, 3, 0]} 
        mode="FixedCamera">
          
        <PlayableCharacter
          character={activeCharacter}
          animationState={animationState}
        />
      </Ecctrl>

      <FollowCamera
        controllerRef={controllerRef}
        character={activeCharacter}
      />
    </>
  );
}