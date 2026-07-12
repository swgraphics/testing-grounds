import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import {
  gamepadState,
  resetGamepadState,
} from "./gamepadState";

const LEFT_STICK_DEAD_ZONE = 0.18;
const RIGHT_STICK_DEAD_ZONE = 0.14;

function applyDeadZone(value, deadZone) {
  const safeValue = Number(value) || 0;

  if (Math.abs(safeValue) <= deadZone) {
    return 0;
  }

  const direction = Math.sign(safeValue);

  const adjustedValue =
    (Math.abs(safeValue) - deadZone) /
    (1 - deadZone);

  return direction * adjustedValue;
}

function findConnectedGamepad() {
  const gamepads = navigator.getGamepads?.();

  if (!gamepads) {
    return null;
  }

  for (const gamepad of gamepads) {
    if (gamepad?.connected) {
      return gamepad;
    }
  }

  return null;
}

export default function XboxController() {
  const loggedControllerRef = useRef("");

  useEffect(() => {
    function handleConnected(event) {
      console.log("Gamepad connected:", {
        id: event.gamepad.id,
        mapping: event.gamepad.mapping,
        buttons: event.gamepad.buttons.length,
        axes: event.gamepad.axes.length,
      });
    }

    function handleDisconnected(event) {
      console.log("Gamepad disconnected:", event.gamepad.id);
      resetGamepadState();
      loggedControllerRef.current = "";
    }

    window.addEventListener(
      "gamepadconnected",
      handleConnected
    );

    window.addEventListener(
      "gamepaddisconnected",
      handleDisconnected
    );

    return () => {
      window.removeEventListener(
        "gamepadconnected",
        handleConnected
      );

      window.removeEventListener(
        "gamepaddisconnected",
        handleDisconnected
      );

      resetGamepadState();
    };
  }, []);

  useFrame(() => {
    const gamepad = findConnectedGamepad();

    if (!gamepad) {
      resetGamepadState();
      return;
    }

    if (loggedControllerRef.current !== gamepad.id) {
      loggedControllerRef.current = gamepad.id;

      console.log("Reading controller:", {
        id: gamepad.id,
        mapping: gamepad.mapping,
      });

      if (gamepad.mapping !== "standard") {
        console.warn(
          "Controller does not report the standard browser mapping. " +
            "Xbox button indexes may need adjustment."
        );
      }
    }

    /*
     * Standard gamepad axes:
     * 0 = left stick horizontal
     * 1 = left stick vertical
     * 2 = right stick horizontal
     * 3 = right stick vertical
     */
    gamepadState.leftStickX = applyDeadZone(
      gamepad.axes[0],
      LEFT_STICK_DEAD_ZONE
    );

    gamepadState.leftStickY = applyDeadZone(
      gamepad.axes[1],
      LEFT_STICK_DEAD_ZONE
    );

    gamepadState.rightStickX = applyDeadZone(
      gamepad.axes[2],
      RIGHT_STICK_DEAD_ZONE
    );

    gamepadState.rightStickY = applyDeadZone(
      gamepad.axes[3],
      RIGHT_STICK_DEAD_ZONE
    );

    /*
     * Standard Xbox-style button indexes:
     * 0  = A
     * 1  = B
     * 10 = left-stick click
     * 11 = right-stick click
     */
    gamepadState.jump =
      gamepad.buttons[0]?.pressed ?? false;

    gamepadState.slide =
      gamepad.buttons[1]?.pressed ?? false;

    gamepadState.sprint =
      gamepad.buttons[10]?.pressed ?? false;

    gamepadState.crouch =
      gamepad.buttons[11]?.pressed ?? false;

    gamepadState.connected = true;
    gamepadState.id = gamepad.id;
    gamepadState.mapping = gamepad.mapping;
  });

  return null;
}