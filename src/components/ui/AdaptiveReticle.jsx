import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gamepadState } from "../../systems/input/gamepadState";
import { terrainSettings, updateTerrainSetting } from "../../systems/terrain/terrainSettings";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

export default function AdaptiveReticle() {
  const [sunTarget, setSunTarget] = useState(false);
  const [treeTarget, setTreeTarget] = useState(false);
  const [held, setHeld] = useState(false);
  const sunMode = useInteractionStore((state) => state.activeTool === "SUN");
  const sunInteractable = sunMode || sunTarget;
  const treeMode = useInteractionStore((state) => state.activeTool === "TREE");
  const treeInteractable = !sunInteractable && (treeTarget || treeMode);
  const targetRef = useRef(false);
  const pointerHeldRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const lastGamepadActiveRef = useRef(false);
  const lastSpellRef = useRef(0);

  useEffect(() => {
    function handleTargetChange(event) {
      const active = Boolean(event.detail?.active);
      targetRef.current = active;
      setSunTarget((current) => (current === active ? current : active));

      /* Once Sun Interaction is held, leaving the original sun disc does not
       * cancel the tool. The user is intentionally free to move the cursor
       * through the sky while the sun follows it. */
      // Explicit SUN activation remains active even when the physical sun leaves the original target.

    }

    window.addEventListener("sun-reticle-target-changed", handleTargetChange);
    return () => window.removeEventListener("sun-reticle-target-changed", handleTargetChange);
  }, []);

  useEffect(() => {
    function handleTreeTargetChange(event) {
      setTreeTarget(Boolean(event.detail?.active));
    }

    window.addEventListener("crimson-tree-reticle-target-changed", handleTreeTargetChange);
    return () => window.removeEventListener("crimson-tree-reticle-target-changed", handleTreeTargetChange);
  }, []);

  /*
   * Controller polling belongs to the DOM/UI layer now. It does not call any
   * React Three Fiber hooks, preventing the reticle from participating in the
   * Canvas render/update cycle.
   */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const controllerHolding = Boolean(
        gamepadState.connected &&
        sunInteractable
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

      const x = Number(gamepadState.leftStickX) || 0;
      const y = Number(gamepadState.leftStickY) || 0;
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
      if ((Math.abs(x) > 0.01 || Math.abs(y) > 0.01) && performance.now() - lastSpellRef.current > 500) {
        lastSpellRef.current = performance.now();
        window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: "worldTransform", duration: 520 } }));
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
  }, [sunInteractable]);

  useEffect(() => {
    function onPointerDown(event) {
      if (!sunInteractable || event.button !== 0) return;
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

      if (performance.now() - lastSpellRef.current > 500) {
        lastSpellRef.current = performance.now();
        window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: "worldTransform", duration: 520 } }));
      }

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
  }, [sunInteractable]);

  const sunHeight = Number(terrainSettings.sunHeight ?? 100);
  const sunRotation = Number(terrainSettings.sunRotation ?? 50);
  const heightScale = 0.68 + (sunHeight / 100) * 0.72;
  const rotationDegrees = (sunRotation / 100) * 360;

  return (
    <div className={`tg-adaptive-reticle ${sunInteractable ? "sun-target" : ""} ${treeInteractable ? "tree-target" : ""} ${treeMode ? "tree-active" : ""} ${held ? "held" : ""}`} aria-hidden="true">
      {sunInteractable || held ? (
        <span
          className="tg-sun-reticle"
          style={{
            "--sun-height-scale": heightScale,
            "--sun-rotation": `${rotationDegrees}deg`,
          }}
        >
          <span className="tg-sun-reticle-orbit" />
          <span className="tg-sun-reticle-node node-a" />
          <span className="tg-sun-reticle-node node-b" />
          <span className="tg-sun-reticle-node node-c" />
          <span className="tg-sun-reticle-center" />
          <span className="tg-sun-reticle-sun-icon" />
          {held && <span className="tg-sun-reticle-rotation" />}
          {held && <span className="tg-sun-reticle-height" />}
        </span>
      ) : treeInteractable ? (
        <span className="tg-tree-reticle">
          <span className="tg-tree-reticle-ring" />
          <span className="tg-tree-reticle-leaf leaf-a" />
          <span className="tg-tree-reticle-leaf leaf-b" />
          <span className="tg-tree-reticle-leaf leaf-c" />
        </span>
      ) : (
        <span className="tg-reticle-dot" />
      )}
    </div>
  );
}
