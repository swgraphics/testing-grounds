import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Ecctrl } from "ecctrl";
import Adventurer from "./Adventurer";

const keysPressed = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  jump: false,
  run: false,
};

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
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[0];

    let gamepadForward = false;
    let gamepadBackward = false;
    let gamepadLeft = false;
    let gamepadRight = false;
    let gamepadJump = false;
    let gamepadRun = false;

    if (gamepad) {
      const leftStickX = gamepad.axes[0] || 0;
      const leftStickY = gamepad.axes[1] || 0;

      gamepadForward = leftStickY < -0.3;
      gamepadBackward = leftStickY > 0.3;
      gamepadLeft = leftStickX < -0.3;
      gamepadRight = leftStickX > 0.3;

      gamepadJump = gamepad.buttons[0]?.pressed || false;
      gamepadRun = gamepad.buttons[1]?.pressed || false;
    }

    controllerRef.current?.setMovement({
      forward: keysPressed.forward || gamepadForward,
      backward: keysPressed.backward || gamepadBackward,
      leftward: keysPressed.leftward || gamepadLeft,
      rightward: keysPressed.rightward || gamepadRight,
      jump: keysPressed.jump || gamepadJump,
      run: keysPressed.run || gamepadRun,
    });
  });

  return (
    <Ecctrl ref={controllerRef} position={[0, 3, 0]} mode="FixedCamera" debug>
      <Adventurer />
    </Ecctrl>
  );
}