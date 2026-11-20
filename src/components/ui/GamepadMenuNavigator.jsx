import { adjustmentState, endAdjustment } from "../../systems/ui/controlAdjustment";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { analogDirection, useNavigationStore } from "../../systems/ui/navigationStore";
import { navigateCompass, confirmCompassFocus, backCompassFocus, cycleCompassGroup } from "../../systems/ui/compassFocus";
import { getInputContext, isTextInput, clearGameplayInput } from "../../systems/input/inputOwnership";
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'summary',
  '[tabindex="0"]',
].join(",");

const MENU_ROOTS = [
  ".tg-help-dialog",
  ".tg-chunk-dialog",
  ".tg-terrain-export",
  ".tg-dev-full-menu.open",
  ".tg-dev-panel",
  ".tg-interaction-panel",
  ".tg-tree-interaction-panel",
  ".tg-cloud-interaction-panel",
  ".tg-geology-canyon-controls",
  ".tg-workspace-v2",
  ".tg-directional-layout",
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
  // Overlays own navigation even if the previously focused panel is mounted.
  const modal = ['.tg-help-dialog','.tg-chunk-dialog','.tg-leaf-editor-window','.tg-mesh-edit-backdrop','.tg-tree-interaction-panel','.tg-terrain-export'].map(selector => document.querySelector(selector)).find(visible);
  if (modal && visible(modal)) return modal;
  const active = document.activeElement;
  const layout = active?.closest?.('.tg-directional-layout');
  if (layout) return layout;
  const activeRoot = active?.closest?.(MENU_ROOTS.join(", "));
  if (activeRoot && visible(activeRoot)) return activeRoot;

  for (const selector of MENU_ROOTS) {
    const root = document.querySelector(selector);
    if (root && visible(root)) return root;
  }

  return null;
}

function isMenuOpen() {
  return getInputContext() !== "world";
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

function activateControl(active) {
  if (active?.matches?.('input[type="range"],select')) {
    if (adjustmentState.current === active) endAdjustment();
    else { endAdjustment(); adjustmentState.current = active; active.setAttribute('data-gamepad-adjusting', 'true'); }
  } else active?.click?.();
}

function cyclePanel(delta) {
  const panels = [...document.querySelectorAll('[data-directional-panel]:not([hidden])')];
  const current = document.activeElement?.closest?.('[data-directional-panel]');
  const next = panels[(panels.indexOf(current) + delta + panels.length) % panels.length];
  endAdjustment();
  return focusFirst(next);
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
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(active, String(next));
  active.dispatchEvent(new Event("input", { bubbles: true }));
  active.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function moveSpatialFocus(direction, root = activeMenuRoot()) {
  if (!root) return false;

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

function moveFocus(direction, keyboard = false) {
  const active = document.activeElement;
  if (adjustmentState.current && (adjustmentState.current !== active || !visible(adjustmentState.current))) endAdjustment();
  if (adjustmentState.current === active) {
    if (active.matches('select')) {
      const options = [...active.options];
      const delta = ['right','down'].includes(direction) ? 1 : -1;
      let index = active.selectedIndex + delta;
      while (options[index]?.disabled) index += delta;
      if (options[index]) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(active, options[index].value);
        active.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }
    return moveRange(['right','up'].includes(direction) ? 'right' : 'left');
  }
  if (keyboard && ['left','right'].includes(direction) && moveRange(direction)) return true;
  const root = activeMenuRoot();
  if (root?.matches('.tg-title-screen')) return moveSpatialFocus(direction, root);
  const panel = active?.closest?.('[data-directional-panel],.tg-panel-region');
  // DOM order makes every control reachable, including content outside a scroller's viewport.
  if (direction === 'up' || direction === 'down') {
    const items = focusables(panel || root);
    const index = items.indexOf(active);
    if (index < 0) return focusElement(items[0]);
    const next = items[index + (direction === 'down' ? 1 : -1)];
    if (next) return focusElement(next);
  }
  if (panel && ['left','right'].includes(direction)) {
    // Horizontal galleries stay in their row instead of jumping into a nearby toolbar.
    const gallery = active?.closest?.('.tg-mesh-library');
    if (gallery && moveSpatialFocus(direction, gallery)) return true;
  }
  return moveSpatialFocus(direction, root);
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
  const repeatRef = useRef({ direction: null, next: 0 });

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
        endAdjustment();
        return;
      }

      const title = isTitleScreen();
      const menuOpen = isMenuOpen();
      const active = document.activeElement;
      const now = performance.now();

      const nav = useNavigationStore.getState();
      const confirm = edge("compass-a", Boolean(gamepad.buttons[0]?.pressed));
      const back = edge("compass-b", Boolean(gamepad.buttons[1]?.pressed));
      const editSelected = edge("tree-edit", Boolean(gamepad.buttons[2]?.pressed));
      if (edge("start", Boolean(gamepad.buttons[9]?.pressed))) {
        if (title) window.dispatchEvent(new CustomEvent("tg-gamepad-start"));
        else if (!["modal","text"].includes(getInputContext())) { clearGameplayInput(); nav.openCompass(); }
      }
      if(getInputContext()==='gesture') {
        if(back){window.dispatchEvent(new Event('pointercancel'));clearGameplayInput();}
        return;
      }
      if (useNavigationStore.getState().compassOpen) {
        aHoldRef.current = { startedAt: 0, locked: false, consumed: true };
        previousButtonsRef.current.rt = Boolean(gamepad.buttons[7]?.pressed);
        const dpad = readDpad(gamepad);
        for (const [key, direction] of Object.entries({ up:"north", right:"east", down:"south", left:"west" })) {
          if (edge("dpad-"+key, dpad[key])) navigateCompass(direction);
        }
        const direction = analogDirection(Number(gamepad.axes[0]) || 0, Number(gamepad.axes[1]) || 0, useNavigationStore.getState().selected);
        const auxiliary = document.querySelector('.tg-shortcut-picker') || document.activeElement?.closest('[data-compass-group]:not([data-compass-group="radial"])');
        if (direction && auxiliary) {
          const repeat = repeatRef.current;
          if (repeat.direction !== direction || now >= repeat.next) { navigateCompass(direction);repeatRef.current = { direction, next: now + (repeat.direction === direction ? 150 : 400) }; }
        } else if (direction) nav.select(direction);
        else repeatRef.current = { direction: null, next: 0 };
        if (edge('compass-lb', Boolean(gamepad.buttons[4]?.pressed))) cycleCompassGroup(-1);
        if (edge('compass-rb', Boolean(gamepad.buttons[5]?.pressed))) cycleCompassGroup(1);
        if (back) backCompassFocus(); else if (confirm) confirmCompassFocus();
        return;
      }
      // Contextual Back also works while placement owns the world input.
      if (back && (menuOpen || useInteractionStore.getState().activeMode === "place")) {
        if (!endAdjustment()) (document.activeElement || window).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
        previousButtonsRef.current.rt = Boolean(gamepad.buttons[7]?.pressed);
        aHoldRef.current = { startedAt: 0, locked: false, consumed: true };
        clearGameplayInput();
        return;
      }
      if (aHoldRef.current.consumed) {
        if (gamepad.buttons[0]?.pressed) return;
        aHoldRef.current = { startedAt: 0, locked: false };
      }

      // A = select/open. Hold A on a Dev Tools header = lock/unlock.
      const aPressed = Boolean(gamepad.buttons[0]?.pressed);
      if (aPressed && !aHoldRef.current.startedAt) {
        aHoldRef.current = { startedAt: now, locked: false, target: active };
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
        if (!aHoldRef.current.locked && active && active === aHoldRef.current.target && menuOpen) {
          activateControl(active);
        }
        aHoldRef.current = { startedAt: 0, locked: false };
      }

      if (!menuOpen && editSelected) document.querySelector('[data-cloud-edit-selected],[data-tree-edit-selected],[data-geology-edit-selected]')?.click();
      if (menuOpen) {
        if (document.querySelector('.tg-leaf-editor-window,.tg-tree-interaction-panel') && gamepad.buttons[7]?.pressed && !adjustmentState.current) return;
        const dpad = readDpad(gamepad);
        const analog = analogDirection(Number(gamepad.axes[0]) || 0, Number(gamepad.axes[1]) || 0);
        const direction = Object.keys(dpad).find(key => dpad[key]) || ({north:'up',south:'down',west:'left',east:'right'}[analog]);
        const repeat = repeatRef.current;
        if (direction && (repeat.direction !== direction || now >= repeat.next)) {
          moveFocus(direction);
          repeatRef.current = { direction, next: now + (repeat.direction === direction ? 150 : 400) };
        } else if (!direction) repeatRef.current = { direction: null, next: 0 };
        if (!title && activeMenuRoot()?.matches('.tg-directional-layout')) {
          if (edge('lb', Boolean(gamepad.buttons[4]?.pressed))) cyclePanel(-1);
          if (edge('rb', Boolean(gamepad.buttons[5]?.pressed))) cyclePanel(1);
        }
      } else {
        // Keep D-pad navigation out of the world entirely unless a UI surface
        // is open. Quick shortcuts are intentionally removed until the UI
        // overhaul; D-pad is now reserved for navigation.
        const dpad = readDpad(gamepad);
        const workspace = document.querySelector('.tg-cloud-interaction-panel') || document.querySelector(".tg-directional-layout");
        if (workspace && Object.values(dpad).some(Boolean)) focusFirst(workspace);
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
      if(event.target?.closest?.('[data-map-resize]'))return;
      if (useNavigationStore.getState().compassOpen || event.defaultPrevented) return;
      if (isTextInput(event.target)) {
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
      moveFocus(direction, true);
    }

    window.addEventListener("keydown", onKeyDown, true);
    const cancelAdjustment = event => {
      if (event.key === 'Escape' && endAdjustment()) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener('keydown', cancelAdjustment, true);
    return () => { window.removeEventListener("keydown", onKeyDown, true); window.removeEventListener('keydown', cancelAdjustment, true); endAdjustment(); };
  }, []);

  return null;
}
