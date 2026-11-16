import { useNavigationStore } from "../ui/navigationStore";
import { inputState } from "./inputState";
import { resetGamepadState } from "./gamepadState";
import { useInteractionStore } from "../interaction/interactionStore";

export const TEXT_INPUT = 'input,textarea,select,[contenteditable="true"]';
const MODALS = '.tg-tree-interaction-panel,.tg-leaf-editor-window,.tg-chunk-dialog-backdrop,.tg-mesh-edit-backdrop:not([data-world-object-editor]),[aria-modal="true"]:not([data-compass]),.tg-help-dialog';
const PANELS = '.tg-dev-full-menu.open,.tg-dev-panel,.tg-interaction-panel,.tg-mesh-menu,.tg-terrain-export,.tg-leaf-editor-window,.tg-animation-library-panel';
export function isTextInput(target) { return Boolean(target?.closest?.(TEXT_INPUT)); }
export function getInputContext(doc = typeof document === "undefined" ? null : document) {
  const state = useNavigationStore.getState();
  if (doc?.querySelector(".tg-title-screen")) return "title";
  if (useInteractionStore.getState().gestureOwner) return "gesture";
  if (state.helpOpen || doc?.querySelector(MODALS)) return "modal";
  if (state.compassOpen) return state.menu === "world" ? "compass" : "submenu";
  if (isTextInput(doc?.activeElement)) return "text";
  if (doc?.activeElement?.closest?.(PANELS + ',[data-input-context="panel"]')) return "panel";
  return "world";
}
export function clearGameplayInput() {
  for (const key of Object.keys(inputState)) inputState[key] = false;
  resetGamepadState();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mobile-camera-input", { detail: { x: 0, y: 0 } }));
  }
}
export function gameplayInputAllowed() { return getInputContext() === "world"; }

// Once a menu has consumed a gamepad, wait for neutral before returning ownership.
export function createGamepadOwnershipGate() {
  let awaitingNeutral = false;
  return (gamepad, context) => {
    if (context !== "world") { awaitingNeutral = true; return false; }
    if (awaitingNeutral) {
      const neutral = gamepad.axes.slice(0, 4).every(value => Math.abs(value) < 0.2) &&
        gamepad.buttons.every(button => !button.pressed);
      if (!neutral) return false;
      awaitingNeutral = false;
    }
    return true;
  };
}
