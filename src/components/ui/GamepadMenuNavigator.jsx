import { useEffect, useRef } from "react";
import { useEditorStore } from "../../systems/editor/editorStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex="0"]',
].join(",");

const MENU_ROOTS = [
  ".tg-dev-full-menu.open",
  ".tg-dev-panel",
  ".tg-interaction-panel",
  ".tg-editor-view",
  ".tg-mesh-menu",
  ".tg-mesh-edit-backdrop",
  ".tg-title-screen",
];

function visible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

function focusables(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(visible);
}

function activeMenuRoot() {
  const active = document.activeElement;
  const activeRoot = active?.closest?.(MENU_ROOTS.join(", "));
  if (activeRoot && visible(activeRoot)) return activeRoot;

  for (const selector of MENU_ROOTS) {
    const root = document.querySelector(selector);
    if (root && visible(root)) return root;
  }

  return null;
}

function isMenuOpen() {
  return Boolean(activeMenuRoot());
}

function isTitleScreen() {
  return Boolean(document.querySelector(".tg-title-screen"));
}

function focusElement(element) {
  if (!element || !visible(element)) return false;
  element.focus({ preventScroll: false });
  element.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  return document.activeElement === element;
}

function focusFirst(root) {
  const items = focusables(root);
  return focusElement(items[0]);
}

function devMenu() {
  return document.querySelector(".tg-dev-full-menu.open");
}

function devHeaders(menu) {
  return Array.from(menu?.querySelectorAll("[data-dev-section-header]") ?? []).filter(visible);
}

function sectionControls(header) {
  const section = header?.closest?.(".tg-dev-section");
  if (!section) return [];
  return focusables(section).filter((element) => !element.matches("[data-dev-section-header]"));
}

function moveDevFocus(direction) {
  const menu = devMenu();
  if (!menu) return false;

  const headers = devHeaders(menu);
  if (!headers.length) return false;

  const active = document.activeElement;
  const activeHeader = active?.matches?.("[data-dev-section-header]") ? active : null;
  const activeSection = active?.closest?.(".tg-dev-section");

  if (activeHeader) {
    if (direction === "down" && activeHeader.getAttribute("aria-expanded") === "true") {
      const controls = sectionControls(activeHeader);
      if (controls.length) return focusElement(controls[0]);
    }

    if (direction === "up" || direction === "down") {
      const index = headers.indexOf(activeHeader);
      const next = index + (direction === "down" ? 1 : -1);
      if (next >= 0 && next < headers.length) return focusElement(headers[next]);
      return true;
    }

    return true;
  }

  if (activeSection && (direction === "up" || direction === "down")) {
    const controls = sectionControls(activeSection.querySelector("[data-dev-section-header]"));
    const index = controls.indexOf(active);
    if (index >= 0) {
      const next = index + (direction === "down" ? 1 : -1);
      if (next >= 0 && next < controls.length) return focusElement(controls[next]);

      const header = activeSection.querySelector("[data-dev-section-header]");
      if (header) return focusElement(header);
    }
  }

  // If focus was lost for any reason, recover to the first header instead of
  // allowing D-pad input to leak into world movement.
  return focusElement(headers[0]);
}

function moveRange(direction) {
  const active = document.activeElement;
  if (!active?.matches?.('input[type="range"]')) return false;

  const min = Number(active.min || 0);
  const max = Number(active.max || 100);
  const step = Number(active.step || 1);
  const current = Number(active.value || 0);
  const next = Math.min(
    max,
    Math.max(min, current + (direction === "right" ? step : -step))
  );

  if (next === current) return true;
  active.value = String(next);
  active.dispatchEvent(new Event("input", { bubbles: true }));
  active.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function moveSpatialFocus(direction) {
  const root = activeMenuRoot();
  if (!root) return false;

  if (direction === "left" || direction === "right") {
    if (moveRange(direction)) return true;
  }

  const items = focusables(root);
  if (!items.length) return false;

  const active = items.includes(document.activeElement) ? document.activeElement : null;
  if (!active) return focusElement(items[0]);

  const currentRect = active.getBoundingClientRect();
  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;

  const candidates = items
    .filter((item) => item !== active)
    .map((item) => {
      const rect = item.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const primary = direction === "up" || direction === "down" ? Math.abs(dy) : Math.abs(dx);
      const secondary = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);
      const inDirection =
        direction === "up" ? dy < -2 :
        direction === "down" ? dy > 2 :
        direction === "left" ? dx < -2 :
        dx > 2;

      return { item, primary, secondary, distance: Math.hypot(dx, dy), inDirection };
    })
    .filter((candidate) => candidate.inDirection)
    .sort((a, b) => {
      return (
        a.primary * 3 +
        a.secondary * 1.15 +
        a.distance * 0.08 -
        (b.primary * 3 + b.secondary * 1.15 + b.distance * 0.08)
      );
    });

  return focusElement(candidates[0]?.item);
}

function moveFocus(direction) {
  const menu = devMenu();
  if (menu) {
    if ((direction === "left" || direction === "right") && moveRange(direction)) return true;
    return moveDevFocus(direction);
  }
  return moveSpatialFocus(direction);
}

function readDpad(gamepad) {
  const buttons = gamepad?.buttons ?? [];
  const axes = gamepad?.axes ?? [];

  // Standard browser mapping: 12/13/14/15 = D-pad Up/Down/Left/Right.
  const buttonState = {
    up: Boolean(buttons[12]?.pressed),
    down: Boolean(buttons[13]?.pressed),
    left: Boolean(buttons[14]?.pressed),
    right: Boolean(buttons[15]?.pressed),
  };

  // Some desktop/browser/controller combinations expose the D-pad as axes
  // instead. Support that representation without changing the normal Xbox
  // mapping used by the rest of TG.
  const axisX = Number(axes[4]);
  const axisY = Number(axes[5]);
  const axisState = {
    up: Number.isFinite(axisY) && axisY < -0.55,
    down: Number.isFinite(axisY) && axisY > 0.55,
    left: Number.isFinite(axisX) && axisX < -0.55,
    right: Number.isFinite(axisX) && axisX > 0.55,
  };

  return {
    up: buttonState.up || axisState.up,
    down: buttonState.down || axisState.down,
    left: buttonState.left || axisState.left,
    right: buttonState.right || axisState.right,
  };
}

export default function GamepadMenuNavigator() {
  const previousButtonsRef = useRef({});
  const aHoldRef = useRef({ startedAt: 0, locked: false });

  useEffect(() => {
    const edge = (key, pressed) => {
      const previous = Boolean(previousButtonsRef.current[key]);
      previousButtonsRef.current[key] = pressed;
      return pressed && !previous;
    };

    const timer = window.setInterval(() => {
      const gamepad = navigator.getGamepads?.().find((entry) => entry?.connected);
      if (!gamepad) {
        previousButtonsRef.current = {};
        aHoldRef.current = { startedAt: 0, locked: false };
        return;
      }

      const title = isTitleScreen();
      const menuOpen = isMenuOpen();
      const active = document.activeElement;
      const now = performance.now();

      if (edge("start", Boolean(gamepad.buttons[9]?.pressed))) {
        if (title) {
          window.dispatchEvent(new CustomEvent("tg-gamepad-start"));
        } else {
          useEditorStore.getState().openDevToolsMenu();
          // The menu is rendered by React after the store update. Focus the
          // first header after that render; the next D-pad press is then a
          // normal navigation action, not a special open-menu action.
          window.requestAnimationFrame(() => {
            const menu = devMenu();
            const header = menu?.querySelector("[data-dev-section-header]");
            focusElement(header);
          });
        }
      }

      // A = select/open. Hold A on a Dev Tools header = lock/unlock.
      const aPressed = Boolean(gamepad.buttons[0]?.pressed);
      if (aPressed && !aHoldRef.current.startedAt) {
        aHoldRef.current = { startedAt: now, locked: false };
      }
      if (
        aPressed &&
        active?.matches?.("[data-dev-section-header]") &&
        !aHoldRef.current.locked &&
        now - aHoldRef.current.startedAt >= 650
      ) {
        aHoldRef.current.locked = true;
        active.dispatchEvent(new CustomEvent("tg-gamepad-section-lock", { bubbles: true }));
      }
      if (!aPressed && aHoldRef.current.startedAt) {
        if (!aHoldRef.current.locked && active && menuOpen) {
          active.click();
        }
        aHoldRef.current = { startedAt: 0, locked: false };
      }

      // B = back/close when a UI surface is open.
      if (edge("b", Boolean(gamepad.buttons[1]?.pressed)) && menuOpen) {
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
        }));
      }

      if (menuOpen) {
        const dpad = readDpad(gamepad);
        if (edge("dpad-up", dpad.up)) moveFocus("up");
        if (edge("dpad-down", dpad.down)) moveFocus("down");
        if (edge("dpad-left", dpad.left)) moveFocus("left");
        if (edge("dpad-right", dpad.right)) moveFocus("right");
      } else {
        // Keep D-pad navigation out of the world entirely unless a UI surface
        // is open. Quick shortcuts are intentionally removed until the UI
        // overhaul; D-pad is now reserved for navigation.
        previousButtonsRef.current["dpad-up"] = false;
        previousButtonsRef.current["dpad-down"] = false;
        previousButtonsRef.current["dpad-left"] = false;
        previousButtonsRef.current["dpad-right"] = false;
      }

      // RT remains the world ACTION button. Placement uses the same contract.
      if (edge("rt", Boolean(gamepad.buttons[7]?.pressed)) && !menuOpen) {
        window.dispatchEvent(new CustomEvent("tg-gamepad-place"));
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.target?.closest?.("input, textarea, select")) {
        if (!event.target.matches?.('input[type="range"]')) return;
      }

      const direction = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      }[event.code];
      if (!direction || !isMenuOpen()) return;

      event.preventDefault();
      event.stopPropagation();
      moveFocus(direction);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
}
