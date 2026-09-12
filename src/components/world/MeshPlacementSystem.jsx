// MeshPlacementSystem.jsx

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CrimsonTreeModel from "./CrimsonTreeModel";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getTerrainHeightAt } from "./../../systems/terrain/terrainHeight";
import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { useWorldStore } from "../../systems/world/worldStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function cloneScene(scene) {
  const clone = scene.clone(true);

  clone.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    if (child.material) {
      child.material = child.material.clone();
    }
  });

  return clone;
}

function getCrimsonTreeSettings(settings = {}) {
  return {
    trunkHeight: Number(settings.trunkHeight ?? 6.3),
    trunkTopRadius: Number(settings.trunkTopRadius ?? 0.11),
    trunkBottomRadius: Number(settings.trunkBottomRadius ?? 0.27),
    crownWidth: Number(settings.crownWidth ?? 0.88),
    crownHeight: Number(settings.crownHeight ?? 0.92),
  };
}
function getCrimsonTreeGeneratorSettings(mesh) {
  if (!mesh?.treeDefinition) {
    return getCrimsonTreeSettings(
      mesh?.editSettings
    );
  }

  return {
    treeDefinition: mesh.treeDefinition,
  };
}
function BuildingBlock({ type = "block" }) {
  const dimensions = {
    block: [4, 4, 4],
    wall: [4, 5, 0.8],
    platform: [5, 0.6, 5],
    floor: [6, 0.35, 6],
    ramp: [5, 2.5, 4],
  }[type] ?? [4, 4, 4];
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial color="#4a535c" roughness={0.72} metalness={0.04} />
    </mesh>
  );
}

function ProceduralObject({ mesh, crownRef, windPhase = 0 }) {
  if (mesh?.modelType === "building-block") {
    return <BuildingBlock type={mesh.blockType} />;
  }
  return (
    <CrimsonTreeModel
      {...getCrimsonTreeGeneratorSettings(mesh)}
      crownRef={crownRef}
      windPhase={windPhase}
    />
  );
}
function findTerrainHit(ray) {
  const direction = ray.direction.clone();

  let low = 0;
  let high = 1000;

  const evaluate = (distance) => {
    const point = ray.origin
      .clone()
      .add(direction.clone().multiplyScalar(distance));

    return point.y - getTerrainHeightAt(point.x, point.z);
  };

  let lowValue = evaluate(low);
  let highValue = evaluate(high);

  // The ray never crossed the terrain.
  if (lowValue * highValue > 0) {
    return null;
  }

  // Binary-search the terrain intersection.
  for (let i = 0; i < 18; i += 1) {
    const middle = (low + high) / 2;
    const middleValue = evaluate(middle);

    if (Math.abs(middleValue) < 0.01) {
      low = middle;
      high = middle;
      break;
    }

    if (lowValue * middleValue <= 0) {
      high = middle;
      highValue = middleValue;
    } else {
      low = middle;
      lowValue = middleValue;
    }
  }

  const distance = (low + high) / 2;

  return ray.origin
    .clone()
    .add(direction.multiplyScalar(distance));
}

export default function MeshPlacementSystem() {
  const { camera, gl } = useThree();

  const [selectedMesh, setSelectedMesh] = useState(null);
  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const [placementMode, setPlacementMode] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [loadedScene, setLoadedScene] = useState(null);
  const [proceduralMesh, setProceduralMesh] = useState(null);
  const [placedMeshes, setPlacedMeshes] = useState([]);
  const selectedPlacedIdRef = useRef(null);
  const draggingObjectRef = useRef(false);
  const crownRefs = useRef(new Map());
  const previewCrownRef = useRef(null);
  const frameCounterRef = useRef(0);
  const loader = useMemo(() => new GLTFLoader(), []);

  useEffect(() => {
    setPlacedMeshes([]);
    const chunk = useWorldStore.getState().world.chunks[currentChunkId];
    const objects = Object.values(chunk?.objects ?? {});
    if (!objects.length) return;

    let cancelled = false;
    async function hydrate() {
      const restored = [];
      for (const entry of objects) {
        if (cancelled) return;
        if (entry.type === "procedural") {
          restored.push({
            id: entry.id,
            type: "procedural",
            mesh: {
              id: entry.id,
              name: entry.name,
              source: "procedural",
              modelType: entry.modelType,
              blockType: entry.blockType,
              treeDefinition: entry.treeDefinition,
              editSettings: entry.editSettings,
            },
            position: new THREE.Vector3(...(entry.position ?? [0, 0, 0])),
            rotationY: entry.rotationY ?? 0,
            scale: entry.scale ?? 1,
            windPhase: restored.length * 1.73,
          });
        } else if (entry.modelPath) {
          await new Promise((resolve) => {
            loader.load(entry.modelPath, (gltf) => {
              restored.push({
                id: entry.id,
                type: "scene",
                object: cloneScene(gltf.scene),
              });
              restored[restored.length - 1].object.position.fromArray(entry.position ?? [0, 0, 0]);
              restored[restored.length - 1].object.rotation.y = entry.rotationY ?? 0;
              restored[restored.length - 1].object.scale.setScalar(entry.scale ?? 1);
              restored[restored.length - 1].rotationY = entry.rotationY ?? 0;
              restored[restored.length - 1].scale = entry.scale ?? 1;
              resolve();
            }, undefined, () => resolve());
          });
        }
      }
      if (!cancelled && restored.length) setPlacedMeshes(restored);
    }
    hydrate();
    return () => { cancelled = true; };
  }, [loader, currentChunkId]);

  // --------------------------------------------------
  // MESH MENU EVENTS
  // --------------------------------------------------

  useEffect(() => {
    function loadMeshSource(mesh) {
      if (!mesh) return;

      const source = mesh.file
        ? URL.createObjectURL(mesh.file)
        : mesh.modelPath;

      if (!source) return;

      loader.load(
        source,
        (gltf) => {
          setLoadedScene(() => cloneScene(gltf.scene));
          if (mesh.file) URL.revokeObjectURL(source);
        },
        undefined,
        (error) => {
          console.error("Testing Grounds: failed to load mesh.", error);
          if (mesh.file) URL.revokeObjectURL(source);
        }
      );
    }

    function loadMeshFile(file) {
      if (!file) return;
      loadMeshSource({ file });
    }

    function handleSelection(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);

      if (mesh.file || mesh.modelPath) {
        loadMeshSource(mesh);
      }
    }

    function handlePlaceRequest(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);
      setPlacementMode(true);
      useInteractionStore.getState().activate({
        target: `object:${mesh.id}`,
        tool: "OBJECT",
        mode: "PLACE",
      });
      setPreviewPosition(null);

      setLoadedScene(null);
      setProceduralMesh(null);

      if (mesh.source === "procedural") {
        setProceduralMesh(mesh);
        return;
      }

      if (mesh.file || mesh.modelPath) {
        loadMeshSource(mesh);
      }
  }

    function handleUploadRequest(event) {
      const file = event.detail?.file;

      if (!file) return;

      loadMeshFile(file);
    }

    function handleCancelPlacement() {
      setPlacementMode(false);
      setPreviewPosition(null);
      useInteractionStore.getState().clear();
      window.dispatchEvent(new CustomEvent("tg-mesh-placement-cancelled"));
    }
    function handleEditSave(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);

      if (mesh.source === "procedural") {
        setProceduralMesh(mesh);
        setLoadedScene(null);
      }
    }

    window.addEventListener(
      "tg-mesh-edit-save",
      handleEditSave
    );

    window.addEventListener(
      "tg-mesh-selection-changed",
      handleSelection
    );

    window.addEventListener(
      "tg-mesh-place-request",
      handlePlaceRequest
    );

    window.addEventListener(
      "tg-mesh-upload-request",
      handleUploadRequest
    );

    window.addEventListener(
      "tg-mesh-cancel-placement",
      handleCancelPlacement
    );

    return () => {
      window.removeEventListener(
        "tg-mesh-selection-changed",
        handleSelection
      );

      window.removeEventListener(
        "tg-mesh-place-request",
        handlePlaceRequest
      );

      window.removeEventListener(
        "tg-mesh-upload-request",
        handleUploadRequest
      );

      window.removeEventListener(
        "tg-mesh-cancel-placement",
        handleCancelPlacement
      );

      window.removeEventListener(
        "tg-mesh-edit-save",
        handleEditSave
      );
    };
  }, [loader]);

  function selectPlacedObject(id) {
    selectedPlacedIdRef.current = id;
    useInteractionStore.getState().activate({
      target: `object:${id}`,
      tool: "OBJECT",
      mode: "SELECT",
    });
  }

  function beginObjectDrag(id, event) {
    if (placementMode) return;
    event.stopPropagation();
    event.preventDefault();
    selectPlacedObject(id);
    draggingObjectRef.current = true;
    useInteractionStore.getState().activate({
      target: `object:${id}`,
      tool: "OBJECT",
      mode: "EDIT",
    });
  }

  function moveSelectedObject() {
    if (!draggingObjectRef.current) return;
    const id = selectedPlacedIdRef.current;
    if (!id) return;
    const point = findTerrainHit(raycaster.ray);
    if (!point) return;
    setPlacedMeshes((current) => current.map((entry) => {
      if (entry.id !== id) return entry;
      if (entry.type === "scene") {
        entry.object.position.copy(point);
        return { ...entry };
      }
      return { ...entry, position: point.clone() };
    }));
    useWorldStore.getState().updateObject(id, {
      position: point.toArray(),
    });
  }

  useEffect(() => {
    function handleObjectKey(event) {
      const id = selectedPlacedIdRef.current;
      if (!id || placementMode) return;
      if (event.target?.closest?.("input, textarea, select, button")) return;
      const current = placedMeshes.find((entry) => entry.id === id);
      if (!current) return;

      let changed = false;
      let rotationY = current.rotationY ?? current.object?.rotation.y ?? 0;
      let scale = current.scale ?? current.object?.scale.x ?? 1;
      if (event.code === "KeyR") { rotationY += Math.PI / 12; changed = true; }
      if (event.code === "BracketLeft") { scale = Math.max(0.25, scale - 0.1); changed = true; }
      if (event.code === "BracketRight") { scale = Math.min(4, scale + 0.1); changed = true; }
      if (event.code === "Delete") {
        setPlacedMeshes((items) => items.filter((entry) => entry.id !== id));
        useWorldStore.getState().removeObject(id);
        selectedPlacedIdRef.current = null;
        useInteractionStore.getState().deactivate();
        changed = false;
      }
      if (!changed) return;
      setPlacedMeshes((items) => items.map((entry) => {
        if (entry.id !== id) return entry;
        if (entry.type === "scene") {
          entry.object.rotation.y = rotationY;
          entry.object.scale.setScalar(scale);
        }
        return { ...entry, rotationY, scale };
      }));
      useWorldStore.getState().updateObject(id, { rotationY, scale });
    }
    window.addEventListener("keydown", handleObjectKey);
    return () => window.removeEventListener("keydown", handleObjectKey);
  }, [placedMeshes, placementMode]);

  // --------------------------------------------------
  // POINTER / ESC / RIGHT-CLICK CONTROLS
  // --------------------------------------------------

  useEffect(() => {
    function handlePointerMove(event) {
      if (!placementMode) return;

      const rect = gl.domElement.getBoundingClientRect();

      mouse.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;

      mouse.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const hit = findTerrainHit(raycaster.ray);

      if (hit) {
        setPreviewPosition(hit);
      }
    }

    function handleGlobalPointerMove(event) {
      if (!draggingObjectRef.current || placementMode) return;
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      moveSelectedObject();
    }

    function handleGlobalPointerUp() {
      if (!draggingObjectRef.current) return;
      draggingObjectRef.current = false;
      useInteractionStore.getState().deactivate();
    }

    function handlePointerDown(event) {
  if (!placementMode) return;
  if (event.button !== 0) return;
  if (!previewPosition) return;

  const hasLoadedScene = Boolean(loadedScene);
  const hasProceduralMesh = Boolean(proceduralMesh);

  if (!hasLoadedScene && !hasProceduralMesh) {
    return;
  }

  event.preventDefault();

  if (hasLoadedScene) {
    const object = cloneScene(loadedScene);

    object.position.copy(previewPosition);

    const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;

    setPlacedMeshes((current) => [
      ...current,
      {
        id: objectId,
        type: "scene",
        object,
      },
    ]);

    useWorldStore.getState().upsertObject({
      id: objectId,
      type: "scene",
      source: selectedMesh?.source ?? "uploaded",
      name: selectedMesh?.name ?? "UPLOADED OBJECT",
      modelPath: selectedMesh?.modelPath,
      position: previewPosition.toArray(),
      rotationY: 0,
      scale: 1,
    });

    setPreviewPosition(null);
    useInteractionStore.getState().activate({
      target: `object:${selectedMesh?.id ?? "selected"}`,
      tool: "OBJECT",
      mode: "PLACE",
    });
    window.dispatchEvent(new CustomEvent("tg-mesh-placement-completed"));
    return;
  }

  const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
  const windPhase = placedMeshes.length * 1.73;

  useWorldStore.getState().upsertObject({
    id: objectId,
    type: "procedural",
    source: "generated",
    name: proceduralMesh?.name ?? "PROCEDURAL OBJECT",
    modelType: proceduralMesh?.modelType,
    blockType: proceduralMesh?.blockType,
    treeDefinition: proceduralMesh?.treeDefinition,
    editSettings: proceduralMesh?.editSettings,
    position: previewPosition.toArray(),
    rotationY: 0,
    scale: 1,
  });

  setPlacedMeshes((current) => [
    ...current,
    {
      id: objectId,
      type: "procedural",
      mesh: proceduralMesh,
      position: previewPosition.clone(),
      rotationY: 0,
      scale: 1,
      windPhase,
    },
  ]);

  setPreviewPosition(null);
  useInteractionStore.getState().activate({
    target: `object:${selectedMesh?.id ?? "selected"}`,
    tool: "OBJECT",
    mode: "PLACE",
  });
  window.dispatchEvent(new CustomEvent("tg-mesh-placement-completed"));
}

    function handleGamepadPlace() {
      if (!placementMode || !previewPosition) return;
      const hasLoadedScene = Boolean(loadedScene);
      const hasProceduralMesh = Boolean(proceduralMesh);
      if (!hasLoadedScene && !hasProceduralMesh) return;

      if (hasLoadedScene) {
        const object = cloneScene(loadedScene);
        object.position.copy(previewPosition);
        const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
        setPlacedMeshes((current) => [...current, { id: objectId, type: "scene", object }]);
        useWorldStore.getState().upsertObject({
          id: objectId, type: "scene", source: selectedMesh?.source ?? "uploaded",
          name: selectedMesh?.name ?? "UPLOADED OBJECT", modelPath: selectedMesh?.modelPath,
          position: previewPosition.toArray(), rotationY: 0, scale: 1,
        });
      } else {
        const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
        useWorldStore.getState().upsertObject({
          id: objectId, type: "procedural", source: "generated", name: proceduralMesh?.name ?? "PROCEDURAL OBJECT",
          modelType: proceduralMesh?.modelType, blockType: proceduralMesh?.blockType,
          treeDefinition: proceduralMesh?.treeDefinition, editSettings: proceduralMesh?.editSettings,
          position: previewPosition.toArray(), rotationY: 0, scale: 1,
        });
        setPlacedMeshes((current) => [
          ...current,
          { id: objectId, type: "procedural", mesh: proceduralMesh, position: previewPosition.clone(), rotationY: 0, scale: 1, windPhase: current.length * 1.73 },
        ]);
      }
      setPreviewPosition(null);
      useInteractionStore.getState().activate({ target: `object:${selectedMesh?.id ?? "selected"}`, tool: "OBJECT", mode: "PLACE" });
      window.dispatchEvent(new CustomEvent("tg-mesh-placement-completed"));
    }

    function handleContextMenu(event) {
      if (!placementMode) return;

      event.preventDefault();

      window.dispatchEvent(
        new CustomEvent("tg-mesh-cancel-placement")
      );
    }

    gl.domElement.addEventListener(
      "pointermove",
      handlePointerMove
    );

    gl.domElement.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);

    gl.domElement.addEventListener(
      "contextmenu",
      handleContextMenu
    );

    window.addEventListener("tg-gamepad-place", handleGamepadPlace);

    return () => {
      gl.domElement.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      gl.domElement.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);

      gl.domElement.removeEventListener(
        "contextmenu",
        handleContextMenu
      );
      window.removeEventListener("tg-gamepad-place", handleGamepadPlace);

    };
  }, [
  camera,
  gl,
  placementMode,
  previewPosition,
  loadedScene,
  proceduralMesh,
]);

// --------------------------------------------------
// PLACEMENT PREVIEW + TREE WIND
// --------------------------------------------------

useFrame((state) => {
  /*
   * Smooth uploaded-mesh placement preview.
   */
  if (
    placementMode &&
    previewPosition &&
    loadedScene
  ) {
    loadedScene.position.lerp(
      previewPosition,
      0.35
    );
  }

  /*
   * Match the existing scatter-tree wind system.
   *
   * Vegetation transform work only runs every
   * second frame, just like Landscape.jsx.
   */
  frameCounterRef.current += 1;

  if (
    frameCounterRef.current % 2 !== 0
  ) {
    return;
  }

  const strength =
    (Number(
      terrainSettings.windStrength
    ) || 0) / 100;

  /*
   * Wind disabled.
   */
  if (strength <= 0) {
    crownRefs.current.forEach(
      (crown) => {
        if (!crown) return;

        crown.rotation.x = 0;
        crown.rotation.z = 0;
      }
    );

    if (previewCrownRef.current) {
      previewCrownRef.current.rotation.x = 0;
      previewCrownRef.current.rotation.z = 0;
    }

    return;
  }

  const speed =
    0.25 +
    ((Number(
      terrainSettings.windSpeed
    ) || 0) / 100) * 2.75;

  const time =
    state.clock.elapsedTime *
    speed;

  crownRefs.current.forEach(
    (crown) => {
      if (!crown) return;

      const phase =
        crown.userData.windPhase ?? 0;

      const mainSway =
        Math.sin(
          time + phase
        ) *
        strength *
        0.055;

      const secondarySway =
        Math.cos(
          time * 0.65 + phase
        ) *
        strength *
        0.025;

      crown.rotation.z =
        mainSway;

      crown.rotation.x =
        secondarySway;
    }
  );

  /*
   * Apply the same wind behavior to the
   * currently previewed procedural tree.
   */
  if (previewCrownRef.current) {
    const crown =
      previewCrownRef.current;

    const phase =
      crown.userData.windPhase ?? 0;

    const mainSway =
      Math.sin(
        time + phase
      ) *
      strength *
      0.055;

    const secondarySway =
      Math.cos(
        time * 0.65 + phase
      ) *
      strength *
      0.025;

    crown.rotation.z =
      mainSway;

    crown.rotation.x =
      secondarySway;
  }
});
// --------------------------------------------------
// RENDER
// --------------------------------------------------

return (
  <group>
    {placementMode &&
      proceduralMesh &&
      previewPosition && (
        <group
          position={[
            previewPosition.x,
            previewPosition.y,
            previewPosition.z,
          ]}
        >
          <ProceduralObject
            mesh={proceduralMesh}
            crownRef={previewCrownRef}
            windPhase={0}
          />
        </group>
      )}

    {placedMeshes.map((entry) => {
      if (entry.type === "procedural") {
  return (
    <group
      key={entry.id}
      position={[
        entry.position.x,
        entry.position.y,
        entry.position.z,
      ]}
      rotation={[0, entry.rotationY ?? 0, 0]}
      scale={entry.scale ?? 1}
      onPointerDown={(event) => beginObjectDrag(entry.id, event)}
      onClick={(event) => { event.stopPropagation(); selectPlacedObject(entry.id); }}
    >
      <ProceduralObject
        mesh={entry.mesh}
        crownRef={{
          get current() {
            return crownRefs.current.get(
              entry.id
            ) ?? null;
          },

          set current(value) {
            if (value) {
              crownRefs.current.set(
                entry.id,
                value
              );
            } else {
              crownRefs.current.delete(
                entry.id
              );
            }
          },
        }}
        windPhase={
          entry.windPhase ?? 0
        }
      />
    </group>
  );
}

      return (
        <primitive
          key={entry.id}
          object={entry.object}
          onPointerDown={(event) => beginObjectDrag(entry.id, event)}
          onClick={(event) => { event.stopPropagation(); selectPlacedObject(entry.id); }}
        />
      );
    })}
  </group>
);
}