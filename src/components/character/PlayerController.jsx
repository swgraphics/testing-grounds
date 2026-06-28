import { cameraConfig } from "../../config/cameraConfig";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl } from "ecctrl";
import { EcctrlCameraControls } from "ecctrl/camera";
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
  const cameraControlsRef = useRef();
  const { camera } = useThree();

  useFrame(() => {
    if (!controllerRef.current || !cameraControlsRef.current) return;

    const target = controllerRef.current.currPos;
    if (!target) return;

    cameraControlsRef.current.moveTo(
      target.x,
      target.y + 1.5,
      target.z,
      true
    );

    camera.position.lerp(
  {
    x: target.x,
    y: target.y + cameraConfig.height,
    z: target.z + cameraConfig.distance,
  },
  cameraConfig.smoothing
);

    camera.lookAt(target.x, target.y + cameraConfig.lookAtHeight, target.z);
  });

  return <EcctrlCameraControls ref={cameraControlsRef} makeDefault smoothTime={0.15} />;
}

export default function PlayerController() {
  const controllerRef = useRef();

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
    controllerRef.current?.setMovement({
      forward: keysPressed.forward,
      backward: keysPressed.backward,
      leftward: keysPressed.leftward,
      rightward: keysPressed.rightward,
      jump: keysPressed.jump,
      run: keysPressed.run,
    });
  });

  return (
    <>
      <Ecctrl ref={controllerRef} position={[0, 3, 0]} mode="FixedCamera">
        <Adventurer />
      </Ecctrl>

      <FollowCamera controllerRef={controllerRef} />
    </>
  );
}