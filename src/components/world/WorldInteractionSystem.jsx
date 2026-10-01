import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { gamepadState } from "../../systems/input/gamepadState";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import {
  applyTerrainBrush,
  analyzeTerrainWallAt,
  applyCanyonWallExpansion,
  beginTerrainHistory,
  commitTerrainHistory,
} from "../../systems/terrain/terrainEdits";
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
  return ray.origin.clone().add(direction.multiplyScalar((low + high) / 2));
}

function toolToTerrainOperation(tool) {
  return ["SMOOTH", "FLATTEN", "SLOPE"].includes(tool) ? tool.toLowerCase() : null;
}

function controllerDirection(camera) {
  const x = Number(gamepadState.leftStickX) || 0;
  const y = Number(gamepadState.leftStickY) || 0;
  const length = Math.hypot(x, y);
  if (length < 0.12) return null;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
  forward.normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
  return forward.multiplyScalar(-y / length).add(right.multiplyScalar(x / length)).normalize();
}

export default function WorldInteractionSystem() {
  const { camera } = useThree();
  const paintingRef = useRef(false);
  const lastApplyRef = useRef(0);
  const lastWaterPointRef = useRef(null);
  const lastSpellRef = useRef(0);
  const [brushPoint, setBrushPoint] = useState(null);
  const [waterPreviewPoints, setWaterPreviewPoints] = useState([]);
  const [canyonPreviewPoints, setCanyonPreviewPoints] = useState([]);
  const [canyonExpansionPreviewPoints, setCanyonExpansionPreviewPoints] = useState([]);
  const heightDirectionRef = useRef(0);
  const heightPointerLastYRef = useRef(null);
  const lockedBrushPointRef = useRef(null);
  const canyonLastPointRef = useRef(null);
  const canyonSelectionRef = useRef(null);
  const controllerCanyonRef = useRef(null);
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

  function buildCanyonSelectionPreview(selection, cursorPoint = null) {
    if (!selection) {
      setCanyonPreviewPoints([]);
      setCanyonExpansionPreviewPoints([]);
      return;
    }

    const center = selection.point.clone();
    const span = selection.wallSpan;
    const start = center.clone().add(new THREE.Vector3(
      selection.normal.x * -span,
      0,
      selection.normal.y * -span,
    ));
    const end = center.clone().add(new THREE.Vector3(
      selection.normal.x * span,
      0,
      selection.normal.y * span,
    ));

    const points = [
      new THREE.Vector3(start.x, getTerrainHeightAt(start.x, start.z) + 0.22, start.z),
      new THREE.Vector3(center.x, center.y + 0.28, center.z),
      new THREE.Vector3(end.x, getTerrainHeightAt(end.x, end.z) + 0.22, end.z),
    ];

    if (cursorPoint) {
      const endPoint = projectCanyonExpansion(selection, cursorPoint);
      if (endPoint) {
        setCanyonExpansionPreviewPoints([
          new THREE.Vector3(center.x, center.y + 0.3, center.z),
          new THREE.Vector3(
            endPoint.x,
            getTerrainHeightAt(endPoint.x, endPoint.z) + 0.3,
            endPoint.z,
          ),
        ]);
      } else {
        setCanyonExpansionPreviewPoints([]);
      }
    } else {
      setCanyonExpansionPreviewPoints([]);
    }

    setCanyonPreviewPoints(points);
  }

  function getCanyonSelection(point) {
    if (!point) return null;
    return analyzeTerrainWallAt(point.x, point.z);
  }

  function projectCanyonExpansion(selection, point) {
    if (!selection || !point) return null;
    const relX = point.x - selection.point.x;
    const relZ = point.z - selection.point.z;
    const along = relX * selection.tangent.x + relZ * selection.tangent.y;
    if (Math.abs(along) < 5) return null;
    return selection.point.clone().add(new THREE.Vector3(
      selection.tangent.x * along,
      0,
      selection.tangent.y * along,
    ));
  }

  function commitCanyonExpansion(selection, endPoint) {
    if (!selection || !endPoint) return false;
    const length = selection.point.distanceTo(endPoint);
    if (length < 5) return false;

    beginTerrainHistory("CANYON EDGE");
    const changed = applyCanyonWallExpansion({
      anchor: selection.point,
      end: endPoint,
      normal: selection.normal,
      tangent: selection.tangent,
      height: 12,
      width: Math.max(10, selection.wallSpan * 0.55),
      irregularity: 0.24,
    });
    if (changed) commitTerrainHistory();
    else commitTerrainHistory();
    return changed;
  }

  function clearCanyonSelection() {
    canyonSelectionRef.current = null;
    canyonLastPointRef.current = null;
    controllerCanyonRef.current = null;
    setCanyonPreviewPoints([]);
    setCanyonExpansionPreviewPoints([]);
  }

  function beginPointerTool(state, event) {
    const point = findTerrainPoint(camera);
    if (!point) return false;

    if (state.activeTool === "CANYON_EDGE") {
      const existing = canyonSelectionRef.current;
      if (!existing) {
        const selection = getCanyonSelection(point);
        if (!selection) return false;
        canyonSelectionRef.current = selection;
        buildCanyonSelectionPreview(selection);
      } else {
        const endPoint = projectCanyonExpansion(existing, point);
        if (endPoint) commitCanyonExpansion(existing, endPoint);
        clearCanyonSelection();
      }
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

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
      if (event.button !== 0) return;
      const target = event.target;
      if (target?.closest?.("button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view")) return;
      beginPointerTool(useInteractionStore.getState(), event);
    }

    function onPointerMove(event) {
      const state = useInteractionStore.getState();
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

      if (state.activeTool === "CANYON_EDGE") {
        const selection = canyonSelectionRef.current;
        if (selection) {
          const endPoint = projectCanyonExpansion(selection, point);
          buildCanyonSelectionPreview(selection, point);
          canyonLastPointRef.current = endPoint;
        } else if (point) {
          const hover = getCanyonSelection(point);
          if (hover) buildCanyonSelectionPreview(hover);
          else setCanyonPreviewPoints([]);
        }
        return;
      }
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
      canyonLastPointRef.current = null;
      controllerCanyonRef.current = null;
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
      if (controllerCanyonRef.current) {
        controllerCanyonRef.current = null;
        canyonLastPointRef.current = null;
      }
    }
    controllerActionWasHeldRef.current = rightTriggerHeld;

    if (!rightTriggerHeld) return;
    const stickY = Number(gamepadState.leftStickY) || 0;
    const stickX = Number(gamepadState.leftStickX) || 0;
    if (Math.abs(stickX) < 0.12 && Math.abs(stickY) < 0.12) return;

    if (state.activeTool === "CANYON_EDGE") {
      const currentPoint = findTerrainPoint(camera);
      const direction = controllerDirection(camera);
      if (!currentPoint) return;

      if (!canyonSelectionRef.current) {
        const selection = getCanyonSelection(currentPoint);
        if (!selection) return;
        canyonSelectionRef.current = selection;
        controllerCanyonRef.current = { active: true };
        buildCanyonSelectionPreview(selection);
        return;
      }

      if (!direction) return;
      const projectedPoint = currentPoint.clone().add(direction.multiplyScalar(18));
      const endPoint = projectCanyonExpansion(canyonSelectionRef.current, projectedPoint);
      if (!endPoint) return;
      buildCanyonSelectionPreview(canyonSelectionRef.current, endPoint);
      canyonLastPointRef.current = endPoint;
      commitCanyonExpansion(canyonSelectionRef.current, endPoint);
      clearCanyonSelection();
      return;
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
    (activeTool === "HEIGHT" || toolToTerrainOperation(activeTool) || activeTool === "CANYON_EDGE")
  );

  return (
    <>
      {showBrush && activeTool !== "CANYON_EDGE" && (
        <mesh position={[brushPoint.x, brushPoint.y + 0.09, brushPoint.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10.5, 11, 48]} />
          <meshBasicMaterial color="#2a8fff" transparent opacity={0.78} depthWrite={false} />
        </mesh>
      )}
      {activeTool === "CANYON_EDGE" && canyonPreviewPoints.length > 1 && (
        <Line
          points={canyonPreviewPoints}
          color="#2a8fff"
          lineWidth={4}
          transparent
          opacity={0.98}
          depthWrite={false}
        />
      )}
      {activeTool === "CANYON_EDGE" && canyonExpansionPreviewPoints.length > 1 && (
        <Line
          points={canyonExpansionPreviewPoints}
          color="#2a8fff"
          lineWidth={3}
          transparent
          opacity={0.72}
          depthWrite={false}
        />
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
