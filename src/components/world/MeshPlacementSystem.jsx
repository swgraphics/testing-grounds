// MeshPlacementSystem.jsx

import { useEffect, useMemo, useState } from "react";
import CrimsonTreeModel from "./CrimsonTreeModel";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getTerrainHeightAt } from "./../../systems/terrain/terrainHeight";

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
  const [placementMode, setPlacementMode] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [loadedScene, setLoadedScene] = useState(null);
  const [proceduralMesh, setProceduralMesh] = useState(null);
  const [placedMeshes, setPlacedMeshes] = useState([]);

  const loader = useMemo(() => new GLTFLoader(), []);

  // --------------------------------------------------
  // MESH MENU EVENTS
  // --------------------------------------------------

  useEffect(() => {
    function loadMeshFile(file) {
      if (!file) return;

      const objectUrl = URL.createObjectURL(file);

      loader.load(
        objectUrl,
        (gltf) => {
          setLoadedScene(() => cloneScene(gltf.scene));
          URL.revokeObjectURL(objectUrl);
        },
        undefined,
        (error) => {
          console.error(
            "Testing Grounds: failed to load mesh.",
            error
          );

          URL.revokeObjectURL(objectUrl);
        }
      );
    }

    function handleSelection(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);

      if (mesh.file) {
        loadMeshFile(mesh.file);
      }
    }

    function handlePlaceRequest(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);
      setPlacementMode(true);
      setPreviewPosition(null);

      setLoadedScene(null);
      setProceduralMesh(null);

      if (mesh.source === "procedural") {
        setProceduralMesh(mesh);
        return;
      }

      if (mesh.file) {
       loadMeshFile(mesh.file);
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
    function handleEditSave(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);

      if (mesh.source === "procedural") {
        setProceduralMesh(mesh);
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

    setPlacedMeshes((current) => [
      ...current,
      {
        id: `placed-mesh-${Date.now()}-${current.length}`,
        type: "scene",
        object,
      },
    ]);

    return;
  }

  setPlacedMeshes((current) => [
    ...current,
    {
      id: `placed-mesh-${Date.now()}-${current.length}`,
      type: "procedural",
      mesh: proceduralMesh,
      position: previewPosition.clone(),
    },
  ]);
}

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      if (!placementMode) return;

      event.preventDefault();

      window.dispatchEvent(
        new CustomEvent("tg-mesh-cancel-placement")
      );
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

    gl.domElement.addEventListener(
      "contextmenu",
      handleContextMenu
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      gl.domElement.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      gl.domElement.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      gl.domElement.removeEventListener(
        "contextmenu",
        handleContextMenu
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
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
  // SMOOTH PLACEMENT PREVIEW
  // --------------------------------------------------

  useFrame(() => {
    if (!placementMode) return;
    if (!previewPosition) return;
    if (!loadedScene) return;

    loadedScene.position.lerp(
      previewPosition,
      0.35
    );
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
      <CrimsonTreeModel
        {...getCrimsonTreeSettings(
          proceduralMesh.editSettings
        )}
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
>
  <CrimsonTreeModel
    {...getCrimsonTreeSettings(
      entry.mesh.editSettings
    )}
  />
</group>
    );
  }

  return (
    <primitive
      key={entry.id}
      object={entry.object}
    />
  );
})}
    </group>
  );
}