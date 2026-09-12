import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gamepadState } from "../../systems/input/gamepadState";
import { terrainSettings, updateTerrainSetting } from "../../systems/terrain/terrainSettings";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

export default function AdaptiveReticle() {
  const [sunTarget, setSunTarget] = useState(false);
  const [held, setHeld] = useState(false);
  const targetRef = useRef(false);
  const pointerHeldRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const lastGamepadActiveRef = useRef(false);

  useEffect(() => {
    function handleTargetChange(event) {
      const active = Boolean(event.detail?.active);
      targetRef.current = active;
      setSunTarget((current) => (current === active ? current : active));

      /* If the player looks away while holding the sun, release the tool. */
      if (!active && useInteractionStore.getState().activeTool === "SUN") {
        pointerHeldRef.current = false;
        setHeld(false);
        useInteractionStore.getState().deactivate();
      }
    }

    window.addEventListener("sun-reticle-target-changed", handleTargetChange);
    return () => window.removeEventListener("sun-reticle-target-changed", handleTargetChange);
  }, []);

  /*
   * Controller polling belongs to the DOM/UI layer now. It does not call any
   * React Three Fiber hooks, preventing the reticle from participating in the
   * Canvas render/update cycle.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const controllerHolding = Boolean(
        gamepadState.connected && gamepadState.jump && targetRef.current
      );

      if (controllerHolding && !lastGamepadActiveRef.current) {
        pointerHeldRef.current = true;
        setHeld(true);
        useInteractionStore.getState().activate({
          target: "sun",
          tool: "SUN",
          mode: "grab",
        });
      }

      if (!controllerHolding && lastGamepadActiveRef.current) {
        pointerHeldRef.current = false;
        setHeld(false);
        if (useInteractionStore.getState().activeTool === "SUN") {
          useInteractionStore.getState().deactivate();
        }
      }

      lastGamepadActiveRef.current = controllerHolding;

      if (!controllerHolding) return;

      const x = Number(gamepadState.rightStickX) || 0;
      const y = Number(gamepadState.rightStickY) || 0;
      if (Math.abs(x) > 0.01) {
        updateTerrainSetting(
          "sunRotation",
          THREE.MathUtils.clamp(
            (terrainSettings.sunRotation ?? 50) + x * 1.8,
            0,
            100
          )
        );
      }
      if (Math.abs(y) > 0.01) {
        updateTerrainSetting(
          "sunHeight",
          THREE.MathUtils.clamp(
            (terrainSettings.sunHeight ?? 100) - y * 1.8,
            0,
            100
          )
        );
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onPointerDown(event) {
      if (!targetRef.current || event.button !== 0) return;
      const target = event.target;
      if (target?.closest?.("button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view")) return;

      event.preventDefault();
      event.stopPropagation();
      pointerHeldRef.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      setHeld(true);
      useInteractionStore.getState().activate({
        target: "sun",
        tool: "SUN",
        mode: "grab",
      });
    }

    function onPointerMove(event) {
      if (!pointerHeldRef.current || useInteractionStore.getState().activeTool !== "SUN") return;

      const dx = event.clientX - lastPointerRef.current.x;
      const dy = event.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };

      updateTerrainSetting(
        "sunRotation",
        THREE.MathUtils.clamp(
          (terrainSettings.sunRotation ?? 50) + dx * 0.16,
          0,
          100
        )
      );
      updateTerrainSetting(
        "sunHeight",
        THREE.MathUtils.clamp(
          (terrainSettings.sunHeight ?? 100) - dy * 0.16,
          0,
          100
        )
      );
    }

    function release() {
      if (!pointerHeldRef.current) return;
      pointerHeldRef.current = false;
      setHeld(false);
      if (useInteractionStore.getState().activeTool === "SUN") {
        useInteractionStore.getState().deactivate();
      }
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
    };
  }, []);

  return (
    <div className={`tg-adaptive-reticle ${sunTarget ? "sun-target" : ""} ${held ? "held" : ""}`} aria-hidden="true">
      {!sunTarget ? (
        <span className="tg-reticle-dot" />
      ) : (
        <span className="tg-sun-reticle">
          <span className="tg-sun-reticle-orbit" />
          <span className="tg-sun-reticle-node node-a" />
          <span className="tg-sun-reticle-node node-b" />
          <span className="tg-sun-reticle-node node-c" />
          <span className="tg-sun-reticle-center" />
          {held && <span className="tg-sun-reticle-rotation" />}
          {held && <span className="tg-sun-reticle-height" />}
        </span>
      )}
    </div>
  );
}
