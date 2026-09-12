import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gamepadState } from "../../systems/input/gamepadState";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { applyTerrainBrush } from "../../systems/terrain/terrainEdits";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";
import { useWorldStore } from "../../systems/world/worldStore";

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
  return ["RAISE", "LOWER", "SMOOTH", "FLATTEN", "SLOPE"].includes(tool) ? tool.toLowerCase() : null;
}

export default function WorldInteractionSystem() {
  const { camera } = useThree();
  const paintingRef = useRef(false);
  const lastApplyRef = useRef(0);
  const lastRiverPointRef = useRef(null);

  function applyActiveTerrainTool() {
    const state = useInteractionStore.getState();
    const tool = toolToTerrainOperation(state.activeTool);
    if (!tool) return;
    const point = findTerrainPoint(camera);
    if (!point) return;
    const now = performance.now();
    if (now - lastApplyRef.current < 45) return;
    lastApplyRef.current = now;
    applyTerrainBrush({
      x: point.x,
      z: point.z,
      tool,
      radius: 14,
      strength: 0.75,
    });
  }

  function applyRiverPoint() {
    const state = useInteractionStore.getState();
    if (state.activeTool !== "RIVER") return;
    const point = findTerrainPoint(camera);
    if (!point) return;
    const previous = lastRiverPointRef.current;
    if (previous && previous.distanceTo(point) < 3) return;
    lastRiverPointRef.current = point;
    applyTerrainBrush({ x: point.x, z: point.z, tool: "lower", radius: 10, strength: 1.15 });
    const world = useWorldStore.getState();
    const chunk = world.world.chunks[world.world.currentChunkId];
    if (!chunk) return;
    const riverPoints = Array.isArray(chunk.water?.riverPoints) ? chunk.water.riverPoints : [];
    world.updateCurrentChunk({
      water: {
        ...chunk.water,
        riverPoints: [...riverPoints, [point.x, point.z]].slice(-180),
      },
    });
  }

  useEffect(() => {
    function onPointerDown(event) {
      if (event.button !== 0) return;
      const target = event.target;
      if (target?.closest?.("button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view")) return;
      const state = useInteractionStore.getState();
      if (toolToTerrainOperation(state.activeTool)) {
        paintingRef.current = true;
        event.preventDefault();
        event.stopPropagation();
        applyActiveTerrainTool();
      } else if (state.activeTool === "RIVER") {
        paintingRef.current = true;
        lastRiverPointRef.current = null;
        event.preventDefault();
        event.stopPropagation();
        applyRiverPoint();
      }
    }
    function onPointerMove() {
      if (!paintingRef.current) return;
      const state = useInteractionStore.getState();
      if (toolToTerrainOperation(state.activeTool)) applyActiveTerrainTool();
      if (state.activeTool === "RIVER") applyRiverPoint();
    }
    function onPointerUp() {
      paintingRef.current = false;
      lastRiverPointRef.current = null;
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
    if (!gamepadState.connected || !gamepadState.jump) return;
    if (toolToTerrainOperation(state.activeTool)) applyActiveTerrainTool();
    if (state.activeTool === "RIVER") applyRiverPoint();
  });

  return null;
}
