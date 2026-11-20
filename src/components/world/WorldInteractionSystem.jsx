import { useWorldStore } from "../../systems/world/worldStore";
import { hasTerrainAt } from "../../systems/world/terrainRegions";
import { gameplayInputAllowed } from "../../systems/input/inputOwnership";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { gamepadState } from "../../systems/input/gamepadState";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import {
  applyTerrainBrush,
  beginTerrainHistory,
  commitTerrainHistory,
} from "../../systems/terrain/terrainEdits";
import { addWaterBody, beginWaterHistory, commitWaterHistory } from "../../systems/water/waterEdits";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2(0, 0);

function findTerrainPoint(camera) {
  raycaster.setFromCamera(ndc, camera);
  const ray = raycaster.ray;
  const direction = ray.direction.clone();
  let low = 0;
  let high = 900;
  const evaluate = (distance) => {
    const point = ray.origin.clone().add(direction.clone().multiplyScalar(distance));
    return point.y - getTerrainHeightAt(point.x, point.z);
  };
  let lowValue = evaluate(low);
  let highValue = evaluate(high);
  if (lowValue * highValue > 0) return null;
  for (let i = 0; i < 20; i += 1) {
    const middle = (low + high) / 2;
    const middleValue = evaluate(middle);
    if (lowValue * middleValue <= 0) {
      high = middle;
      highValue = middleValue;
    } else {
      low = middle;
      lowValue = middleValue;
    }
  }
  const hit=ray.origin.clone().add(direction.multiplyScalar((low + high) / 2));
  return hasTerrainAt(hit.x,hit.z,useWorldStore.getState().world)?hit:null;
}

function toolToTerrainOperation(tool) {
  return ["RAISE", "LOWER", "SMOOTH", "FLATTEN", "SLOPE"].includes(tool) ? tool.toLowerCase() : null;
}

export default function WorldInteractionSystem() {
  const { camera } = useThree();
  const paintingRef = useRef(false);
  const lastApplyRef = useRef(0);
  const lastWaterPointRef = useRef(null);
  const lastSpellRef = useRef(0);
  const [brushPoint, setBrushPoint] = useState(null);
  const [waterPreviewPoints, setWaterPreviewPoints] = useState([]);
  const heightDirectionRef = useRef(0);
  const heightPointerLastYRef = useRef(null);
  const lockedBrushPointRef = useRef(null);
  const controllerActionWasHeldRef = useRef(false);

  function signalWorldAction() {
    const now = performance.now();
    if (now - lastSpellRef.current > 450) {
      lastSpellRef.current = now;
      window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: "worldTransform", duration: 520 } }));
    }
  }

  function applyActiveTerrainTool(force = false, stickOverride = null) {
    const state = useInteractionStore.getState();
    const point = lockedBrushPointRef.current ?? findTerrainPoint(camera);
    if (!point) return;

    const now = performance.now();
    if (!force && now - lastApplyRef.current < 45) return;
    lastApplyRef.current = now;
    signalWorldAction();

    if (state.activeTool === "HEIGHT") {
      const stickY = stickOverride ?? (Number(gamepadState.leftStickY) || 0);
      const y = heightDirectionRef.current || stickY;
      if (Math.abs(y) < 0.12) return;
      applyTerrainBrush({
        x: point.x,
        z: point.z,
        tool: y < 0 ? "raise" : "lower",
        radius: 14,
        strength: Math.max(0.18, Math.abs(y) * 0.95),
      });
      return;
    }

    const tool = toolToTerrainOperation(state.activeTool);
    if (!tool) return;
    applyTerrainBrush({ x: point.x, z: point.z, tool, radius: 14, strength: 0.75 });
  }

  function appendWaterPoint(point) {
    if (!point) return;
    const previous = lastWaterPointRef.current;
    if (previous && previous.distanceTo(point) < 2.2) return;
    lastWaterPointRef.current = point.clone();
    signalWorldAction();
    // Draw Water is intentionally just a terrain lowering gesture. The base
    // water surface is already underneath the terrain, so no river mesh/state
    // is created here. The stronger brush reduces the number of passes needed.
    applyTerrainBrush({
      x: point.x,
      z: point.z,
      tool: "lower",
      radius: 13,
      strength: 2.75,
    });
  }

  function beginPointerTool(state, event) {
    const point = findTerrainPoint(camera);
    if (!point) return false;



    if (toolToTerrainOperation(state.activeTool) || state.activeTool === "HEIGHT") {
      beginTerrainHistory(state.activeTool === "HEIGHT" ? "TERRAIN HEIGHT" : `${state.activeTool} TERRAIN`);
      paintingRef.current = true;
      lockedBrushPointRef.current = point;
      heightPointerLastYRef.current = state.activeTool === "HEIGHT" ? event.clientY : null;
      event.preventDefault();
      event.stopPropagation();
      if (state.activeTool !== "HEIGHT") applyActiveTerrainTool(true);
      return true;
    }

    if (state.activeTool === "POND") {
      const diameter = useInteractionStore.getState().waterDiameter || 24;
      beginWaterHistory("ADD WATER");
      // Gently form a basin beneath the water surface; the outer edge remains
      // higher so the circular surface reads as a shoreline rather than a decal.
      const radius = diameter / 2;
      for (let ring = 0; ring < 3; ring += 1) {
        const ringRadius = radius * (0.25 + ring * 0.28);
        const count = Math.max(12, Math.ceil((Math.PI * 2 * ringRadius) / 5));
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2;
          applyTerrainBrush({ x: point.x + Math.cos(angle) * ringRadius, z: point.z + Math.sin(angle) * ringRadius, tool: "lower", radius: Math.max(4, radius * 0.42), strength: 0.16 + ring * 0.06 });
        }
      }
      addWaterBody({ x: point.x, z: point.z, y: point.y - Math.max(0.8, diameter * 0.035), diameter, createdAt: Date.now() });
      commitWaterHistory();
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    if (state.activeTool === "RIVER") {
      beginTerrainHistory("DRAW WATER");
      paintingRef.current = true;
      lastWaterPointRef.current = null;
      setWaterPreviewPoints([[point.x, point.y + 0.16, point.z]]);
      appendWaterPoint(point);
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    return false;
  }

  useEffect(() => {
    function onPointerDown(event) {
      if (event.target?.tagName === "CANVAS") document.activeElement?.blur?.();
      if (event.button !== 0 || !gameplayInputAllowed()) return;
      const target = event.target;
      if (target?.closest?.("button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view, [data-input-context='panel']")) return;
      beginPointerTool(useInteractionStore.getState(), event);
    }

    function onPointerMove(event) {
      const state = useInteractionStore.getState();
      if (state.activeTool === "CANYON_EDGE") return;
      const point = findTerrainPoint(camera);
      if (state.activeTool === "RIVER" && point) {
        if (paintingRef.current) {
          appendWaterPoint(point);
          setWaterPreviewPoints((current) => {
            const last = current[current.length - 1];
            if (last && Math.hypot(last[0] - point.x, last[2] - point.z) < 2.2) return current;
            return [...current, [point.x, point.y + 0.16, point.z]].slice(-240);
          });
        } else {
          setWaterPreviewPoints([[point.x, point.y + 0.16, point.z]]);
        }
      }
      if (!paintingRef.current) return;


      if (state.activeTool === "HEIGHT") {
        const previousY = heightPointerLastYRef.current;
        heightPointerLastYRef.current = event.clientY;
        if (previousY == null) return;
        const dy = event.clientY - previousY;
        if (Math.abs(dy) < 1) return;
        heightDirectionRef.current = dy < 0 ? -1 : 1;
        applyActiveTerrainTool(true);
        heightDirectionRef.current = 0;
        return;
      }
      if (toolToTerrainOperation(state.activeTool)) applyActiveTerrainTool();
    }

    function onPointerUp() {
      if (paintingRef.current) commitTerrainHistory();
      paintingRef.current = false;
      lockedBrushPointRef.current = null;
      heightPointerLastYRef.current = null;
      lastWaterPointRef.current = null;
      setWaterPreviewPoints([]);
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
    };
  }, [camera]);

  useFrame(() => {
    const state = useInteractionStore.getState();
    if (state.activeTool === "CANYON_EDGE") return;
    const point = paintingRef.current
      ? (lockedBrushPointRef.current ?? findTerrainPoint(camera))
      : findTerrainPoint(camera);

    setBrushPoint((current) => {
      if (!point && !current) return current;
      if (!point) return null;
      if (current && current.distanceTo(point) < 0.01) return current;
      return point;
    });

    const rightTriggerHeld = Boolean(gamepadState.connected && gamepadState.rightTrigger);
    if (!rightTriggerHeld && controllerActionWasHeldRef.current) {
      if (paintingRef.current && !lockedBrushPointRef.current) {
        commitTerrainHistory();
        paintingRef.current = false;
        lastWaterPointRef.current = null;
        setWaterPreviewPoints([]);
      }

    }
    controllerActionWasHeldRef.current = rightTriggerHeld;

    if (!rightTriggerHeld) return;
    const stickY = Number(gamepadState.leftStickY) || 0;
    const stickX = Number(gamepadState.leftStickX) || 0;
    if (Math.abs(stickX) < 0.12 && Math.abs(stickY) < 0.12) return;



    if (state.activeTool === "POND") {
      const diameter = useInteractionStore.getState().waterDiameter || 24;
      beginWaterHistory("ADD WATER");
      // Gently form a basin beneath the water surface; the outer edge remains
      // higher so the circular surface reads as a shoreline rather than a decal.
      const radius = diameter / 2;
      for (let ring = 0; ring < 3; ring += 1) {
        const ringRadius = radius * (0.25 + ring * 0.28);
        const count = Math.max(12, Math.ceil((Math.PI * 2 * ringRadius) / 5));
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2;
          applyTerrainBrush({ x: point.x + Math.cos(angle) * ringRadius, z: point.z + Math.sin(angle) * ringRadius, tool: "lower", radius: Math.max(4, radius * 0.42), strength: 0.16 + ring * 0.06 });
        }
      }
      addWaterBody({ x: point.x, z: point.z, y: point.y - Math.max(0.8, diameter * 0.035), diameter, createdAt: Date.now() });
      commitWaterHistory();
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    if (state.activeTool === "RIVER") {
      const currentPoint = findTerrainPoint(camera);
      if (!currentPoint) return;
      if (!paintingRef.current) {
        beginTerrainHistory("DRAW WATER");
        paintingRef.current = true;
        lastWaterPointRef.current = null;
        setWaterPreviewPoints([[currentPoint.x, currentPoint.y + 0.16, currentPoint.z]]);
      }
      appendWaterPoint(currentPoint);
      setWaterPreviewPoints((current) => {
        const last = current[current.length - 1];
        if (last && Math.hypot(last[0] - currentPoint.x, last[2] - currentPoint.z) < 2.2) return current;
        return [...current, [currentPoint.x, currentPoint.y + 0.16, currentPoint.z]].slice(-240);
      });
      return;
    }

    if (state.activeTool === "HEIGHT" || toolToTerrainOperation(state.activeTool)) {
      applyActiveTerrainTool(false);
    }
  });

  const activeTool = useInteractionStore((state) => state.activeTool);
  const showBrush = Boolean(
    brushPoint &&
    activeTool &&
    (activeTool === "HEIGHT" || toolToTerrainOperation(activeTool))
  );

  return (
    <>
      {showBrush && activeTool !== "CANYON_EDGE" && (
        <mesh position={[brushPoint.x, brushPoint.y + 0.09, brushPoint.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10.5, 11, 48]} />
          <meshBasicMaterial color="#2a8fff" transparent opacity={0.78} depthWrite={false} />
        </mesh>
      )}
      {activeTool === "RIVER" && waterPreviewPoints.length > 1 && (
        <Line
          points={waterPreviewPoints}
          color="#2a8fff"
          lineWidth={2.5}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      )}
    </>
  );
}
