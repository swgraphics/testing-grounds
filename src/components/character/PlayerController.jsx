import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl } from "ecctrl";
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

function FollowCamera({ controllerRef }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!controllerRef.current) return;

    const rawTarget = controllerRef.current.currPos;
if (!rawTarget) return;

const target = {
  x: -rawTarget.x,
  y: rawTarget.y,
  z: -rawTarget.z,
};

    camera.position.lerp(
      {
        x: target.x,
        y: target.y + cameraConfig.height,
        z: target.z + cameraConfig.distance,
      },
      cameraConfig.smoothing
    );

    camera.lookAt(
      target.x,
      target.y + cameraConfig.lookAtHeight,
      target.z
    );
  });

  return null;
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
    const isMoving =
      keysPressed.forward ||
      keysPressed.backward ||
      keysPressed.leftward ||
      keysPressed.rightward;

    if (!isMoving) {
      setAnimationState("idle");
    } else if (keysPressed.run) {
      setAnimationState("run");
    } else {
      setAnimationState("walk");
    }

    controllerRef.current?.setMovement({
      forward: keysPressed.backward,
      backward: keysPressed.forward,
      leftward: keysPressed.rightward,
      rightward: keysPressed.leftward,
      jump: keysPressed.jump,
      run: keysPressed.run,
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