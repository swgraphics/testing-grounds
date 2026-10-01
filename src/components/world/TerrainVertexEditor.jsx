import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";
import {
  makeTerrainVertex,
  moveSelectedTerrainVertices,
  beginTerrainVertexHistory,
  commitTerrainVertexHistory,
  useTerrainVertexStore,
} from "../../systems/terrain/terrainVertexEditing";
import { gamepadState } from "../../systems/input/gamepadState";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { useHistoryStore, undoHistory } from "../../systems/history/historyStore";

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

  for (let i = 0; i < 22; i += 1) {
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

function isUiTarget(target) {
  return target?.closest?.(
    "button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view"
  );
}

export default function TerrainVertexEditor() {
  const { camera } = useThree();
  const activeTool = useInteractionStore((state) => state.activeTool);
  const selected = useTerrainVertexStore((state) => state.selected);
  const hovered = useTerrainVertexStore((state) => state.hovered);
  const draggingRef = useRef(false);
  const lastPointerYRef = useRef(null);
  const controllerEditAccumulatorRef = useRef(0);
  const controllerHistoryActiveRef = useRef(false);

  useEffect(() => {
    if (activeTool === "VERTEX") return;
    useTerrainVertexStore.getState().clearSelection();
  }, [activeTool]);

  useEffect(() => {
    if (activeTool !== "VERTEX") return undefined;

    function updateHover() {
      const point = findTerrainPoint(camera);
      if (!point) {
        useTerrainVertexStore.getState().setHovered(null);
        return;
      }
      useTerrainVertexStore.getState().setHovered(makeTerrainVertex(point.x, point.z));
    }

    function onHoverPointerMove(event) {
      if (isUiTarget(event.target)) return;
      updateHover();
    }

    function onPointerDown(event) {
      if (event.button !== 0 || isUiTarget(event.target)) return;
      const point = findTerrainPoint(camera);
      if (!point) return;

      const vertex = makeTerrainVertex(point.x, point.z);
      const vertexStore = useTerrainVertexStore.getState();
      const vertexKey = `${vertex.x},${vertex.z}`;
      const alreadySelected = Boolean(vertexStore.selected[vertexKey]);

      // Preserve an existing multi-selection when the drag begins on one
      // of its selected vertices. Only replace the selection when the user
      // clicks an unselected vertex without a modifier key.
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        vertexStore.toggleSelected(vertex);
      } else if (!alreadySelected) {
        vertexStore.selectOnly(vertex);
      }

      beginTerrainVertexHistory();
      draggingRef.current = true;
      lastPointerYRef.current = event.clientY;
      event.preventDefault();
      event.stopPropagation();
    }

    function onPointerMove(event) {
      if (!draggingRef.current || isUiTarget(event.target)) return;
      const previousY = lastPointerYRef.current;
      lastPointerYRef.current = event.clientY;
      if (previousY == null) return;
      const dy = event.clientY - previousY;
      if (Math.abs(dy) < 1) return;
      // Screen Y is inverted: moving the mouse upward raises the vertex.
      moveSelectedTerrainVertices(-dy * 0.08);
      event.preventDefault();
      event.stopPropagation();
    }

    function stopDragging() {
      if (draggingRef.current) commitTerrainVertexHistory();
      draggingRef.current = false;
      lastPointerYRef.current = null;
    }

    window.addEventListener("pointermove", onHoverPointerMove, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", stopDragging, true);
    window.addEventListener("pointercancel", stopDragging, true);

    return () => {
      window.removeEventListener("pointermove", onHoverPointerMove, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", stopDragging, true);
      window.removeEventListener("pointercancel", stopDragging, true);
    };
  }, [activeTool, camera]);

  useEffect(() => {
    if (activeTool !== "VERTEX") {
      controllerEditAccumulatorRef.current = 0;
    }
  }, [activeTool]);

  useFrame((_, delta) => {
    if (activeTool === "VERTEX" && gamepadState.connected) {
      const vertexStore = useTerrainVertexStore.getState();
      const hoveredVertex = vertexStore.hovered;
      const selectedCount = Object.keys(vertexStore.selected).length;

      // A selects the vertex under the reticle. LT acts as the controller
      // equivalent of Shift/Ctrl: it preserves/toggles selection instead of
      // replacing it.
      if (gamepadState.aPressed && hoveredVertex) {
        if (gamepadState.leftTrigger) vertexStore.toggleSelected(hoveredVertex);
        else vertexStore.selectOnly(hoveredVertex);
      }

      // B undoes the most recent vertex-edit command without consuming an
      // unrelated terrain/object history command.
      if (gamepadState.bPressed) {
        const history = useHistoryStore.getState();
        const last = history.undoStack[history.undoStack.length - 1];
        if (last?.label === "VERTEX EDIT") undoHistory();
      }

      if (gamepadState.rightTrigger && selectedCount) {
        if (!controllerHistoryActiveRef.current) {
          beginTerrainVertexHistory();
          controllerHistoryActiveRef.current = true;
        }
        const stickY = Number(gamepadState.leftStickY) || 0;
        controllerEditAccumulatorRef.current += delta;
        if (controllerEditAccumulatorRef.current >= 0.045 && Math.abs(stickY) > 0.12) {
          // Controller input follows the standard convention: stick up raises.
          const elapsed = controllerEditAccumulatorRef.current;
          controllerEditAccumulatorRef.current = 0;
          moveSelectedTerrainVertices(-stickY * elapsed * 2.8);
        }
      } else {
        controllerEditAccumulatorRef.current = 0;
        if (controllerHistoryActiveRef.current) {
          commitTerrainVertexHistory();
          controllerHistoryActiveRef.current = false;
        }
      }
    } else {
      controllerEditAccumulatorRef.current = 0;
      if (controllerHistoryActiveRef.current) {
        commitTerrainVertexHistory();
        controllerHistoryActiveRef.current = false;
      }
    }

    if (activeTool !== "VERTEX") return;
    const point = findTerrainPoint(camera);
    if (!point) return;
    const next = makeTerrainVertex(point.x, point.z);
    const current = useTerrainVertexStore.getState().hovered;
    if (!current || current.x !== next.x || current.z !== next.z) {
      useTerrainVertexStore.getState().setHovered(next);
    }
  });

  if (activeTool !== "VERTEX") return null;

  const selectedVertices = Object.values(selected);

  return (
    <group>
      {hovered && (
        <mesh position={[hovered.x, getTerrainHeightAt(hovered.x, hovered.z) + 0.16, hovered.z]}>
          <sphereGeometry args={[0.8, 12, 12]} />
          <meshBasicMaterial color="#2a8fff" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}

      {selectedVertices.map((vertex) => (
        <mesh
          key={`${vertex.x},${vertex.z}`}
          position={[vertex.x, getTerrainHeightAt(vertex.x, vertex.z) + 0.22, vertex.z]}
        >
          <sphereGeometry args={[1.15, 16, 16]} />
          <meshBasicMaterial color="#2a8fff" depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
