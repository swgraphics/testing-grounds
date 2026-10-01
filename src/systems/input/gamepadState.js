export const gamepadState = {
  connected: false,
  id: "",
  mapping: "",

  leftStickX: 0,
  leftStickY: 0,

  rightStickX: 0,
  rightStickY: 0,

  jump: false,
  aPressed: false,
  slide: false,
  sprint: false,
  crouch: false,
  worldTransform: false,
  rightTrigger: false,
  leftTrigger: false,
  bPressed: false,
};

export function resetGamepadState() {
  gamepadState.connected = false;
  gamepadState.id = "";
  gamepadState.mapping = "";

  gamepadState.leftStickX = 0;
  gamepadState.leftStickY = 0;

  gamepadState.rightStickX = 0;
  gamepadState.rightStickY = 0;

  gamepadState.jump = false;
  gamepadState.aPressed = false;
  gamepadState.slide = false;
  gamepadState.sprint = false;
  gamepadState.crouch = false;
  gamepadState.worldTransform = false;
  gamepadState.rightTrigger = false;
  gamepadState.leftTrigger = false;
  gamepadState.bPressed = false;
}