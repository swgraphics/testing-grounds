import { useEffect, useRef } from "react";
import { gamepadState } from "../../systems/input/gamepadState";

function getFocusable() {
  return Array.from(document.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled])'
  )).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  });
}

export default function GamepadMenuNavigator() {
  const previousRef = useRef({});

  useEffect(() => {
    function edge(index) {
      const gamepad = navigator.getGamepads?.().find((entry) => entry?.connected);
      if (!gamepad) return false;
      const pressed = Boolean(gamepad.buttons[index]?.pressed);
      const previous = Boolean(previousRef.current[index]);
      previousRef.current[index] = pressed;
      return pressed && !previous;
    }

    function moveFocus(delta) {
      const items = getFocusable();
      if (!items.length) return;
      const active = document.activeElement;
      const index = Math.max(0, items.indexOf(active));
      const next = (index + delta + items.length) % items.length;
      items[next].focus({ preventScroll: false });
    }

    function adjustRange(delta) {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || active.type !== "range") return false;
      const step = Number(active.step) || 1;
      const value = Number(active.value) + step * delta;
      const min = active.min === "" ? -Infinity : Number(active.min);
      const max = active.max === "" ? Infinity : Number(active.max);
      active.value = String(Math.max(min, Math.min(max, value)));
      active.dispatchEvent(new Event("input", { bubbles: true }));
      active.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    const timer = window.setInterval(() => {
      const connected = gamepadState.connected;
      if (!connected) return;

      const placementMode = Boolean(document.querySelector(".tg-place-mode-exit"));
      const menuOpen = placementMode || Boolean(document.querySelector(
        ".tg-interaction-panel, .tg-editor-view, .tg-side-panel.open, .tg-dev-panel, .tg-mesh-menu"
      ));
      if (!menuOpen) {
        previousRef.current = {};
        return;
      }

      if (document.activeElement === document.body) {
        getFocusable()[0]?.focus({ preventScroll: false });
      }

      if (edge(0)) {
        if (placementMode) {
          window.dispatchEvent(new CustomEvent("tg-gamepad-place"));
        } else if (!gamepadState.connected || !document.body.classList.contains("tg-tool-active")) {
          document.activeElement?.click?.();
        }
      }

      if (edge(1)) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
      }

      if (edge(12)) moveFocus(-1);
      if (edge(13)) moveFocus(1);
      if (edge(14)) {
        if (!adjustRange(-1)) moveFocus(-1);
      }
      if (edge(15)) {
        if (!adjustRange(1)) moveFocus(1);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
