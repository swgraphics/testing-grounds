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
  const previousButtonsRef = useRef({});

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
      previousButtonsRef.current = {};
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
      previousButtonsRef.current = {};
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
    const aPressedNow = gamepad.buttons[0]?.pressed ?? false;
    const bPressedNow = gamepad.buttons[1]?.pressed ?? false;
    gamepadState.jump = aPressedNow;
    gamepadState.aPressed = aPressedNow && !Boolean(previousButtonsRef.current[0]);
    gamepadState.bPressed = bPressedNow && !Boolean(previousButtonsRef.current[1]);
    previousButtonsRef.current[0] = aPressedNow;
    previousButtonsRef.current[1] = bPressedNow;

    gamepadState.slide = bPressedNow;

    gamepadState.sprint =
      gamepad.buttons[10]?.pressed ?? false;

    gamepadState.crouch =
      gamepad.buttons[11]?.pressed ?? false;

    const buttonPressed = (index) => Boolean(gamepad.buttons[index]?.pressed);
    const wasPressed = (index) => Boolean(previousButtonsRef.current[index]);
    const dispatchEdgeAction = (index, action, duration) => {
      const pressed = buttonPressed(index);
      if (pressed && !wasPressed(index)) {
        window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action, duration } }));
      }
      previousButtonsRef.current[index] = pressed;
      return pressed;
    };

    dispatchEdgeAction(7, "attack", 620);
    dispatchEdgeAction(5, "attackCross", 700);
    dispatchEdgeAction(4, "interact", 700);
    // Standard mapping: 6 = left trigger, 7 = right trigger.
    gamepadState.leftTrigger = buttonPressed(6);
    previousButtonsRef.current[6] = gamepadState.leftTrigger;
    gamepadState.worldTransform = gamepadState.leftTrigger;

    // RT remains the universal world-tool ACTION button.
    gamepadState.rightTrigger = buttonPressed(7);
    previousButtonsRef.current[7] = gamepadState.rightTrigger;

    gamepadState.connected = true;
    gamepadState.id = gamepad.id;
    gamepadState.mapping = gamepad.mapping;
  });

  return null;
}