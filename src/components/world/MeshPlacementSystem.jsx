import { clearGameplayInput } from '../../systems/input/inputOwnership';
import { gameplayInputAllowed } from '../../systems/input/inputOwnership';
import {captureGeologyFoundation,createGeologyFeature,pickGeologyFeatureAt} from '../../systems/geology/geologyFeatures';
import {geologyDefinition} from '../../systems/geology/geologyDefinition';
import GeologyPlacementGhost from './GeologyPlacementGhost';
import {raycastCommittedTerrain} from '../../systems/terrain/raycastTerrain';
import { hasTerrainAt, terrainChunkAt } from "../../systems/world/terrainRegions";
import { mergeTreeProperties } from "../../systems/objects/treeProperties";
// MeshPlacementSystem.jsx

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CrimsonTreeModel from "./CrimsonTreeModel";
import { createCrimsonTreeDefinition } from "./treeGenerator";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Text } from "@react-three/drei";
import { getTerrainHeightAt } from "./../../systems/terrain/terrainHeight";
import { setTerrainPreviewStamp } from "../../systems/terrain/terrainEdits";
import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { useWorldStore } from "../../systems/world/worldStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { beginHistoryTransaction, commitHistoryTransaction, undoHistory, redoHistory, useHistoryStore } from "../../systems/history/historyStore";

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
  if (mesh?.treeDefinition) {
    return { treeDefinition: mesh.treeDefinition };
  }

  return {
    treeDefinition: createCrimsonTreeDefinition(),
  };
}
function getBlockDimensions(type = "block") {
  return { block: [4, 4, 4], wall: [4, 5, 0.8], platform: [5, 0.6, 5], floor: [6, 0.35, 6], ramp: [5, 2.5, 4] }[type] ?? [4, 4, 4];
}

const OSWALD_FONT_URL = "/fonts/Oswald-Regular.ttf";

function BuildingBlock({ type = "block", heightLevel = 1 }) {
  const dimensions = getBlockDimensions(type);
  const edgeGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...dimensions)), [dimensions[0], dimensions[1], dimensions[2]]);
  return (
    <group>
      <mesh castShadow receiveShadow><boxGeometry args={dimensions} /><meshStandardMaterial color="#080b10" roughness={0.94} metalness={0} flatShading /></mesh>
      <lineSegments geometry={edgeGeometry}><lineBasicMaterial color="#ffffff" transparent opacity={0.8} /></lineSegments>
      <Text
        position={[0, 0, dimensions[2] / 2 + 0.012]}
        fontSize={Math.min(dimensions[0] * 0.42, 0.72)}
        color="#ffffff"
        font={OSWALD_FONT_URL}
        anchorX="center"
        anchorY="middle"
        depthOffset={-0.01}
      >
        {`${heightLevel}M`}
      </Text>
      <Text
        position={[0, 0, -dimensions[2] / 2 - 0.012]}
        rotation={[0, Math.PI, 0]}
        fontSize={Math.min(dimensions[0] * 0.42, 0.72)}
        color="#ffffff"
        font={OSWALD_FONT_URL}
        anchorX="center"
        anchorY="middle"
        depthOffset={-0.01}
      >
        {`${heightLevel}M`}
      </Text>
    </group>
  );
}

function FirefliesObject({ settings = {} }) {
  const density = Number(settings.density ?? 40);
  const speed = Number(settings.speed ?? 30);
  const flicker = Number(settings.flicker ?? 65);
  const color = settings.color ?? "#d9ff8a";
  const count = Math.max(8, Math.round(8 + density * 0.72));
  const pointsRef = useRef(null);
  const basePositionsRef = useRef(null);

  const geometry = useMemo(() => {
    const positions = [];
    for (let index = 0; index < count; index += 1) {
      const seed = index * 12.9898 + 78.233;
      const hash = (Math.sin(seed) * 43758.5453) % 1;
      const hash2 = (Math.sin(seed * 1.731) * 43758.5453) % 1;
      const hash3 = (Math.sin(seed * 2.417) * 43758.5453) % 1;
      positions.push(
        (hash - 0.5) * 8,
        0.4 + Math.abs(hash2) * 3.4,
        (hash3 - 0.5) * 8,
      );
    }
    basePositionsRef.current = positions.slice();
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return buffer;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position;
    const t = clock.elapsedTime * (0.25 + speed / 55);
    for (let index = 0; index < count; index += 1) {
      const i = index * 3;
      const base = basePositionsRef.current || positions.array;
      const baseX = base[i];
      const baseY = base[i + 1];
      const baseZ = base[i + 2];
      positions.array[i] = baseX + Math.cos(t + index * 1.7) * 0.16;
      positions.array[i + 1] = baseY + Math.sin(t * 1.3 + index) * 0.22;
      positions.array[i + 2] = baseZ + Math.sin(t + index * 2.1) * 0.16;
    }
    positions.needsUpdate = true;
    const material = pointsRef.current.material;
    material.opacity = 0.45 + ((0.5 + 0.5 * Math.sin(t * 3.2)) * (0.35 + flicker / 220));
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.075 + flicker * 0.0008}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
      />
    </points>
  );
}

function createGeologyGeometry(type) {
  const positions = [];
  const indices = [];

  if (type === "giant-rock") {
    const segments = 9;
    const rings = 4;
    for (let ring = 0; ring <= rings; ring += 1) {
      const t = ring / rings;
      const y = t * 5.2;
      const ringScale = t === 0 ? 0.95 : 1.0 - t * 0.22;
      for (let i = 0; i < segments; i += 1) {
        const a = (i / segments) * Math.PI * 2;
        const wobble = 1 + 0.14 * Math.sin(i * 2.7 + ring * 1.8);
        const x = Math.cos(a) * (3.8 * ringScale) * wobble;
        const z = Math.sin(a) * (2.8 * ringScale) * (1 + 0.1 * Math.cos(i * 1.7));
        positions.push(x, y + (ring === rings ? Math.sin(i * 1.8) * 0.28 : 0), z);
      }
    }
    for (let ring = 0; ring < rings; ring += 1) {
      for (let i = 0; i < segments; i += 1) {
        const a = ring * segments + i;
        const b = ring * segments + ((i + 1) % segments);
        const c = (ring + 1) * segments + ((i + 1) % segments);
        const d = (ring + 1) * segments + i;
        indices.push(a, b, d, b, c, d);
      }
    }
    const topCenter = positions.length / 3;
    positions.push(0, 5.2, 0);
    for (let i = 0; i < segments; i += 1) {
      indices.push(rings * segments + i, rings * segments + ((i + 1) % segments), topCenter);
    }
  } else {
    const segments = 7;
    const rows = type === "cliff-face" ? 5 : 4;
    const width = type === "cliff-face" ? 7 : 9;
    const height = type === "cliff-face" ? 7 : 5.5;
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows;
      for (let i = 0; i <= segments; i += 1) {
        const u = i / segments;
        const x = (u - 0.5) * width;
        const baseDepth = type === "cliff-face" ? 0.65 : 1.6;
        const ledge = type === "cliff-face"
          ? 0.45 * Math.sin(row * 1.7 + i * 0.9) + 0.18 * Math.sin(i * 2.2)
          : 0.35 * Math.sin(i * 1.4 + row * 1.1);
        const z = -baseDepth - ledge - t * (type === "cliff-face" ? 0.35 : 0.8);
        const y = t * height + (row === rows ? 0.35 * Math.sin(i * 1.4) : 0);
        positions.push(x + 0.22 * Math.sin(row * 1.8 + i), y, z);
      }
    }
    const rowWidth = segments + 1;
    for (let row = 0; row < rows; row += 1) {
      for (let i = 0; i < segments; i += 1) {
        const a = row * rowWidth + i;
        const b = a + 1;
        const c = a + rowWidth + 1;
        const d = a + rowWidth;
        indices.push(a, b, d, b, c, d);
      }
    }
    // Add a shallow back/top volume so the form reads as a solid geological object.
    const backStart = positions.length / 3;
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows;
      for (let i = 0; i <= segments; i += 1) {
        const u = i / segments;
        const x = (u - 0.5) * width;
        const y = t * height + (row === rows ? 0.25 * Math.sin(i) : 0);
        const z = 0.45 - t * 0.25;
        positions.push(x, y, z);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let i = 0; i < segments; i += 1) {
        const frontA = row * rowWidth + i;
        const frontB = frontA + 1;
        const backA = backStart + row * rowWidth + i;
        const backB = backA + 1;
        indices.push(frontA, backA, frontB, frontB, backA, backB);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function GeologyObject({ type = "giant-rock" }) {
  const geometry = useMemo(() => createGeologyGeometry(type), [type]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#080b10" roughness={0.94} metalness={0} flatShading />
    </mesh>
  );
}

function getTerrainAnchoredObjectY(entry) {
  const x = Number(entry?.position?.x ?? entry?.object?.position?.x);
  const z = Number(entry?.position?.z ?? entry?.object?.position?.z);
  if (![x, z].every(Number.isFinite)) return null;

  // Geology objects stamp/shape the terrain itself. They are intentionally
  // excluded from ordinary object terrain-follow so their existing behavior
  // remains unchanged.
  if (entry?.type === "procedural" && entry.mesh?.modelType === "geology") return null;

  const terrainY = getTerrainHeightAt(x, z);
  if (entry?.type === "procedural" && entry.mesh?.modelType === "building-block") {
    const dimensions = getBlockDimensions(entry.mesh?.blockType);
    const heightLevel = Number(entry.mesh?.heightLevel ?? entry.heightLevel ?? 1);
    return terrainY + dimensions[1] * (Math.max(1, heightLevel) - 0.5);
  }

  return terrainY;
}

function isProceduralObject(mesh) {
  return Boolean(
    mesh?.source === "procedural" ||
    ["crimson-tree", "fireflies", "building-block", "geology"].includes(mesh?.modelType)
  );
}

function getPlacementRules(mesh) {
  if (mesh?.modelType === "building-block") {
    return { snap: true, randomRotation: false };
  }
  if (mesh?.modelType === "geology") {
    return { snap: false, randomRotation: false };
  }
  if (mesh?.modelType === "fireflies") {
    return { snap: false, randomRotation: false };
  }
  if (mesh?.source === "quaternius" || mesh?.modelType === "crimson-tree") {
    return { snap: false, randomRotation: true };
  }
  return { snap: false, randomRotation: false };
}

function ProceduralObject({ mesh, crownRef, windPhase = 0, treeId = null, heightLevelOverride = null }) {
  if (mesh?.modelType === "building-block") {
    return <BuildingBlock type={mesh.blockType} heightLevel={heightLevelOverride ?? mesh.heightLevel ?? 1} />;
  }
  if (mesh?.modelType === "geology") {
    return <GeologyObject type={mesh.geologyType} />;
  }
  if (mesh?.modelType === "fireflies") {
    return <FirefliesObject settings={mesh.editSettings} />;
  }
  return (
    <CrimsonTreeModel
      {...getCrimsonTreeGeneratorSettings(mesh)}
      crownRef={crownRef}
      windPhase={windPhase}
      treeId={treeId}
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

  const hit=ray.origin.clone().add(direction.multiplyScalar(distance));
  return hasTerrainAt(hit.x,hit.z,useWorldStore.getState().world)?hit:null;
}

function placedObjectChunkId(id) {
 const world=useWorldStore.getState().world;return Object.values(world.chunks).find(c=>c.objects?.[id])?.id ?? world.currentChunkId;
}
function placementChunkAt(position) {
 const world=useWorldStore.getState().world;return world.terrainSurface?terrainChunkAt(position.x,position.z,world)?.id:world.currentChunkId;
}
export default function MeshPlacementSystem() {
  const { camera, gl } = useThree();

  const [selectedMesh, setSelectedMesh] = useState(null);
  const objectScope = useWorldStore((state) => state.world.terrainSurface ? "all" : state.world.currentChunkId);
  const [placementMode, setPlacementMode] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [loadedScene, setLoadedScene] = useState(null);
  const [proceduralMesh, setProceduralMesh] = useState(null);
  const [placedMeshes, setPlacedMeshes] = useState([]);
  const historyRevision = useHistoryStore((state) => state.revision);
  const [placementRotation, setPlacementRotation] = useState(0);
  const [geologyFoundation,setGeologyFoundation] = useState(null);
  const geologySelectionPad=useRef(false);
  const selectedPlacedIdRef = useRef(null);
  const draggingObjectRef = useRef(false);
  const crownRefs = useRef(new Map());
  const previewCrownRef = useRef(null);
  const frameCounterRef = useRef(0);
  const blockHeightLevels = useMemo(() => {
    const levels = new Map();
    const blocks = placedMeshes.filter((entry) => entry.type === "procedural" && entry.mesh?.modelType === "building-block");
    blocks.forEach((entry) => {
      const entryDims = getBlockDimensions(entry.mesh?.blockType);
      const sameStack = blocks.filter((candidate) => {
        const candidateDims = getBlockDimensions(candidate.mesh?.blockType);
        const toleranceX = Math.max(0.18, Math.min(entryDims[0], candidateDims[0]) * 0.45);
        const toleranceZ = Math.max(0.18, Math.min(entryDims[2], candidateDims[2]) * 0.45);
        return Math.abs((candidate.position?.x ?? 0) - (entry.position?.x ?? 0)) <= toleranceX &&
          Math.abs((candidate.position?.z ?? 0) - (entry.position?.z ?? 0)) <= toleranceZ;
      }).sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));
      levels.set(entry.id, sameStack.findIndex((candidate) => candidate.id === entry.id) + 1);
    });
    return levels;
  }, [placedMeshes]);

  function getStackedBlockPlacementY(point, mesh) {
    const dimensions = getBlockDimensions(mesh?.blockType);
    const baseY = getTerrainHeightAt(point.x, point.z);
    let topY = baseY;
    placedMeshes.forEach((entry) => {
      if (entry.type !== "procedural" || entry.mesh?.modelType !== "building-block") return;
      if (Math.abs((entry.position?.x ?? 0) - point.x) > 0.05 || Math.abs((entry.position?.z ?? 0) - point.z) > 0.05) return;
      const h = getBlockDimensions(entry.mesh?.blockType)[1];
      topY = Math.max(topY, (entry.position?.y ?? baseY) + h / 2);
    });
    return { y: topY + dimensions[1] / 2, heightLevel: Math.max(1, Math.round((topY - baseY) / Math.max(dimensions[1], 0.001)) + 1) };
  }
  const loader = useMemo(() => new GLTFLoader(), []);

  useEffect(() => {
    setPlacedMeshes([]);
    const world=useWorldStore.getState().world;
    const objects = objectScope==="all" ? Object.values(world.chunks).flatMap(c=>Object.values(c.objects ?? {})) : Object.values(world.chunks[objectScope]?.objects ?? {});
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
              heightLevel: entry.heightLevel,
              geologyType: entry.geologyType,
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
    return () => { cancelled = true; if(terrainSettings.terrainPreviewStamp)setTerrainPreviewStamp(null); };
  }, [loader, objectScope, historyRevision]);

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

      if (placementMode) {
        setPlacementRotation(mesh.modelType==='geology'?geologyDefinition(mesh.geologyType,mesh.geologyDefinition).rotation*Math.PI/180:getPlacementRules(mesh).randomRotation ? Math.random() * Math.PI * 2 : 0);
        if(mesh.modelType==='geology')setGeologyFoundation(captureGeologyFoundation());
        setPreviewPosition(null);
        setLoadedScene(null);
        setProceduralMesh(null);
        useInteractionStore.getState().activate({
          target: `object:${mesh.id}`,
          tool: "OBJECT",
          mode: "PLACE",
        });
        if (isProceduralObject(mesh)) {
          setProceduralMesh(mesh);
        } else if (mesh.file || mesh.modelPath) {
          loadMeshSource(mesh);
        }
        return;
      }

      if (mesh.file || mesh.modelPath) {
        loadMeshSource(mesh);
      }
    }

    function handlePlaceRequest(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);
      setPlacementMode(true);
      const rules = getPlacementRules(mesh);
      setPlacementRotation(mesh.modelType==='geology'?geologyDefinition(mesh.geologyType,mesh.geologyDefinition).rotation*Math.PI/180:rules.randomRotation ? Math.random() * Math.PI * 2 : 0);
      if(mesh.modelType==='geology')setGeologyFoundation(captureGeologyFoundation());
      useInteractionStore.getState().activate({
        target: `object:${mesh.id}`,
        tool: "OBJECT",
        mode: "PLACE",
      });
      setPreviewPosition(null);

      setLoadedScene(null);
      setProceduralMesh(null);

      if (isProceduralObject(mesh)) {
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
      if(terrainSettings.terrainPreviewStamp)setTerrainPreviewStamp(null);
      setPlacementMode(false);
      setPreviewPosition(null);
      useInteractionStore.getState().clear();
      window.dispatchEvent(new CustomEvent("tg-mesh-placement-cancelled"));
    }
    function handleEditSave(event) {
      const mesh = event.detail?.mesh;

      if (!mesh) return;

      setSelectedMesh(mesh);

      if (isProceduralObject(mesh)) {
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
  }, [loader, placementMode]);

  useEffect(()=>{
    if(!placementMode||selectedMesh?.modelType!=='geology')return;
    const unsubscribe=useInteractionStore.subscribe(state=>{if(state.activeTool!=='OBJECT'||state.activeMode!=='place'){setPlacementMode(false);setPreviewPosition(null)}});
    const key=event=>{
      if(event.target?.closest?.('input,select,textarea,button')||!gameplayInputAllowed())return;
      if(event.code==='KeyR'){event.preventDefault();setPlacementRotation(angle=>(angle+Math.PI/12)%(Math.PI*2))}
      if(['BracketLeft','BracketRight'].includes(event.code)){event.preventDefault();setSelectedMesh(mesh=>({...mesh,geologyDefinition:geologyDefinition(mesh.geologyType,{...mesh.geologyDefinition,scale:(mesh.geologyDefinition?.scale??1)+(event.code==='BracketRight' ? .1 : -.1)})}))}
    };
    window.addEventListener('keydown',key);
    return()=>{unsubscribe();window.removeEventListener('keydown',key)};
  },[placementMode,selectedMesh?.modelType]);

  function commitGeologyPlacement(){
    try{
      const definition=geologyDefinition(selectedMesh.geologyType,{...selectedMesh.geologyDefinition,rotation:placementRotation*180/Math.PI});
      const id=createGeologyFeature(selectedMesh.geologyType,definition,previewPosition.toArray(),{foundation:geologyFoundation,name:selectedMesh.name});
      if(!id)return false;
      setPreviewPosition(null);
      window.dispatchEvent(new CustomEvent('tg-mesh-placement-completed'));
      window.dispatchEvent(new CustomEvent('crash-unit-action',{detail:{action:'worldTransform',duration:620}}));
      return true;
    }catch(error){window.dispatchEvent(new CustomEvent('tg-geology-message',{detail:{message:error.message}}));return false}
  }

  function selectPlacedObject(id) {
    selectedPlacedIdRef.current = id;
    useInteractionStore.getState().activate({
      target: `object:${id}`,
      tool: "OBJECT",
      mode: "SELECT",
    });
  }

  // Focused South editing selects the same world target used by existing R/[ / ] controls.
  useEffect(() => useInteractionStore.subscribe(state => {
    if (state.activeTool !== "OBJECT" || state.activeMode !== "select") return;
    const id = state.activeTarget?.startsWith("object:") ? state.activeTarget.slice(7) : null;
    const world = useWorldStore.getState().world;
    if (id && Object.values(world.chunks).some(c=>c.objects?.[id])) selectedPlacedIdRef.current = id;
  }), []);

  function beginObjectDrag(id, event) {
    if (placementMode) return;

    // Default Tree has its own direct-interaction state. Do not let the
    // generic Object drag handler steal the same click and switch the HUD
    // to OBJECT // EDIT/SELECT.
    let hitObject = event.object ?? event.eventObject ?? null;
    while (hitObject) {
      if (hitObject.userData?.tgCrimsonTreeId) return;
      hitObject = hitObject.parent;
    }
    event.stopPropagation();
    // R3F pointer handlers are passive; stopPropagation is the supported API.
    selectPlacedObject(id);
    const chunkId = placedObjectChunkId(id);
    const object = useWorldStore.getState().world.chunks?.[chunkId]?.objects?.[id];
    beginHistoryTransaction("MOVE OBJECT", { chunks: { [chunkId]: { objects: { [id]: object } } } }, {
      paths: [["chunks", chunkId, "objects", id]],
    });
    draggingObjectRef.current = true;
    useInteractionStore.getState().setGestureOwner('object-drag');clearGameplayInput();
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
    const entry = placedMeshes.find((object) => object.id === id);
    if (entry?.mesh?.modelType === "building-block") {
      point.y = getTerrainAnchoredObjectY({ ...entry, position: point }) ?? point.y;
    }
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
      const chunkId = placedObjectChunkId(id);
      const beforeObject = useWorldStore.getState().world.chunks?.[chunkId]?.objects?.[id];
      let rotationY = current.rotationY ?? current.object?.rotation.y ?? 0;
      let scale = current.scale ?? current.object?.scale.x ?? 1;
      if (event.code === "KeyR") { rotationY += Math.PI / 12; changed = true; }
      if (event.code === "BracketLeft") { scale = Math.max(0.25, scale - 0.1); changed = true; }
      if (event.code === "BracketRight") { scale = Math.min(4, scale + 0.1); changed = true; }
      if (event.code === "Delete") {
        beginHistoryTransaction("DELETE OBJECT", { chunks: { [chunkId]: { objects: { [id]: beforeObject } } } }, { paths: [["chunks", chunkId, "objects", id]] });
        setPlacedMeshes((items) => items.filter((entry) => entry.id !== id));
        useWorldStore.getState().removeObject(id);
        selectedPlacedIdRef.current = null;
        useInteractionStore.getState().deactivate();
        commitHistoryTransaction({ chunks: { [chunkId]: { objects: { [id]: undefined } } } }, { paths: [["chunks", chunkId, "objects", id]] });
        changed = false;
      }
      if (!changed) return;
      beginHistoryTransaction("OBJECT TRANSFORM", { chunks: { [chunkId]: { objects: { [id]: beforeObject } } } }, { paths: [["chunks", chunkId, "objects", id]] });
      setPlacedMeshes((items) => items.map((entry) => {
        if (entry.id !== id) return entry;
        if (entry.type === "scene") {
          entry.object.rotation.y = rotationY;
          entry.object.scale.setScalar(scale);
        }
        return { ...entry, rotationY, scale };
      }));
      useWorldStore.getState().updateObject(id, { rotationY, scale });
      const afterObject = useWorldStore.getState().world.chunks?.[chunkId]?.objects?.[id];
      commitHistoryTransaction({ chunks: { [chunkId]: { objects: { [id]: afterObject } } } }, { paths: [["chunks", chunkId, "objects", id]] });
    }
    window.addEventListener("keydown", handleObjectKey);
    return () => window.removeEventListener("keydown", handleObjectKey);
  }, [placedMeshes, placementMode]);

  useEffect(() => {
    function handleHistoryKey(event) {
      if (event.target?.closest?.("input, textarea, select")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        undoHistory();
      } else if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        redoHistory();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        event.stopPropagation();
        redoHistory();
      }
    }
    window.addEventListener("keydown", handleHistoryKey, true);
    return () => window.removeEventListener("keydown", handleHistoryKey, true);
  }, []);

  useEffect(() => {
    function finishObjectHistory() {
      if (!draggingObjectRef.current) return;
      const id = selectedPlacedIdRef.current;
      if (!id) return;
      const chunkId = placedObjectChunkId(id);
      const afterObject = useWorldStore.getState().world.chunks?.[chunkId]?.objects?.[id];
      commitHistoryTransaction({ chunks: { [chunkId]: { objects: { [id]: afterObject } } } }, { paths: [["chunks", chunkId, "objects", id]] });
      draggingObjectRef.current = false;
      if(useInteractionStore.getState().gestureOwner==='object-drag')useInteractionStore.getState().setGestureOwner(null);
      const interaction=useInteractionStore.getState();
      if(interaction.activeTool==='OBJECT'&&interaction.activeMode==='edit')interaction.activate({target:`object:${id}`,tool:'OBJECT',mode:'select'});
    }
    window.addEventListener("pointerup", finishObjectHistory, true);
    window.addEventListener("pointercancel", finishObjectHistory, true);
    window.addEventListener("blur", finishObjectHistory, true);
    return () => {
      window.removeEventListener("pointerup", finishObjectHistory, true);
      window.removeEventListener("pointercancel", finishObjectHistory, true);
      window.removeEventListener("blur", finishObjectHistory, true);
    };
  }, []);

  // --------------------------------------------------
  // DEFAULT TREE DIRECT EDITING
  // --------------------------------------------------

  useEffect(() => {
    function handleTreeEditChange(event) {
      const treeId = event.detail?.treeId;
      const patch = event.detail?.patch;
      if (!treeId || !patch) return;

      const world = useWorldStore.getState().world;
      const object = world.chunks?.[placedObjectChunkId(treeId)]?.objects?.[treeId];
      if (!object || object.modelType !== "crimson-tree") return;
      const nextDefinition = event.detail.applied ? object.treeDefinition : mergeTreeProperties(createCrimsonTreeDefinition(object.treeDefinition ?? {}), patch);
      // Store mutation belongs to the event, never a React state updater.
      if (!event.detail.applied) useWorldStore.getState().updateObject(treeId, { treeDefinition: nextDefinition });
      setPlacedMeshes(current => current.map(entry => entry.id === treeId ? { ...entry, mesh: { ...entry.mesh, treeDefinition: nextDefinition } } : entry));
    }

    window.addEventListener("crimson-tree-edit-change", handleTreeEditChange);
    return () => window.removeEventListener("crimson-tree-edit-change", handleTreeEditChange);
  }, []);

  // --------------------------------------------------
  // TERRAIN FOLLOW
  // --------------------------------------------------

  useEffect(() => {
    function handleTerrainChange(event) {
      const key = event.detail?.key;
      const bounds = event.type==='geology-terrain-changed'?event.detail?.bounds:null;
      if (event.type!=='geology-terrain-changed' && ![
        "terrainEditVersion",
        "terrainVertexEditVersion",
        "terrainPreviewVersion",
        "heightMultiplier",
        "mountainHeight",
        "cliffSharpness",
        "rollingHills",
        "ridgeStrength",
        "plateauAmount",
        "geometryStrength",
      ].includes(key)) return;

        let changed = false;
        const next = placedMeshes.map((entry) => {
          const p=entry.type==='scene'?entry.object?.position:entry.position;
          if(bounds&&p&&(p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ))return entry;
          const nextY = getTerrainAnchoredObjectY(entry);
          if (nextY == null) return entry;
          const currentY = entry.type === "scene"
            ? entry.object?.position?.y
            : entry.position?.y;
          if (Math.abs((currentY ?? nextY) - nextY) < 0.001) return entry;

          changed = true;
          if (entry.type === "scene") {
            entry.object.position.y = nextY;
            useWorldStore.getState().updateObject(entry.id, {
              position: entry.object.position.toArray(),
            });
            return { ...entry };
          }

          const position = entry.position.clone();
          position.y = nextY;
          useWorldStore.getState().updateObject(entry.id, {
            position: position.toArray(),
          });
          return { ...entry, position };
        });
        if (changed) setPlacedMeshes(next);
    }

    window.addEventListener("terrain-settings-changed", handleTerrainChange);
    window.addEventListener("geology-terrain-changed", handleTerrainChange);
    return () => {window.removeEventListener("terrain-settings-changed", handleTerrainChange);window.removeEventListener("geology-terrain-changed", handleTerrainChange)};
  }, [placedMeshes]);

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
        const rules = getPlacementRules(selectedMesh);
        if (rules.snap) {
          hit.x = Math.round(hit.x / 4) * 4;
          hit.z = Math.round(hit.z / 4) * 4;
          hit.y = getTerrainHeightAt(hit.x, hit.z);
          if (selectedMesh?.modelType === "building-block") {
            const stacked = getStackedBlockPlacementY(hit, selectedMesh);
            hit.y = stacked.y;
            hit.userData = { ...(hit.userData || {}), blockHeightLevel: stacked.heightLevel };
          }
        }
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
  if (!placementMode) {
    if(event.button===0&&!useInteractionStore.getState().activeTool&&gameplayInputAllowed()){
      const rect=gl.domElement.getBoundingClientRect();mouse.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(mouse,camera);
      const point=findTerrainHit(raycaster.ray),feature=point?pickGeologyFeatureAt(point.x,point.z):null;
      if(feature)useInteractionStore.getState().setTarget('object:'+feature.id);
    }
    return;
  }
  if (event.button !== 0) return;
  if (!previewPosition) return;

  const hasLoadedScene = Boolean(loadedScene);
  const hasProceduralMesh = Boolean(proceduralMesh);

  if (!hasLoadedScene && !hasProceduralMesh) {
    return;
  }

  event.preventDefault();

  if (selectedMesh?.modelType === "geology") {
    commitGeologyPlacement();
    return;
  }

  if (hasLoadedScene) {
    const object = cloneScene(loadedScene);
    const placementChunkId = placementChunkAt(previewPosition);
    const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
    beginHistoryTransaction("PLACE OBJECT", { chunks: { [placementChunkId]: { objects: { [objectId]: undefined } } } }, {
      paths: [["chunks", placementChunkId, "objects", objectId]],
    });

    object.position.copy(previewPosition);
    object.rotation.y = placementRotation;

    setPlacedMeshes((current) => [
      ...current,
      {
        id: objectId,
        type: "scene",
        object,
        rotationY: placementRotation,
        scale: 1,
      },
    ]);

    useWorldStore.getState().upsertObject({
      id: objectId,
      type: "scene",
      source: selectedMesh?.source ?? "uploaded",
      name: selectedMesh?.name ?? "UPLOADED OBJECT",
      modelPath: selectedMesh?.modelPath,
      position: previewPosition.toArray(),
      rotationY: placementRotation,
      scale: 1,
    });

    const placedObject = useWorldStore.getState().world.chunks?.[placementChunkId]?.objects?.[objectId];
    commitHistoryTransaction({ chunks: { [placementChunkId]: { objects: { [objectId]: placedObject } } } }, {
      paths: [["chunks", placementChunkId, "objects", objectId]],
    });

    setPreviewPosition(null);
    const rules = getPlacementRules(selectedMesh);
    setPlacementRotation(rules.randomRotation ? Math.random() * Math.PI * 2 : 0);
    useInteractionStore.getState().activate({
      target: `object:${selectedMesh?.id ?? "selected"}`,
      tool: "OBJECT",
      mode: "PLACE",
    });
    window.dispatchEvent(new CustomEvent("tg-mesh-placement-completed"));
    window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: "worldTransform", duration: 620 } }));
    return;
  }

  const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
  const placementChunkId = placementChunkAt(previewPosition);
  const windPhase = placedMeshes.length * 1.73;
  beginHistoryTransaction("PLACE OBJECT", { chunks: { [placementChunkId]: { objects: { [objectId]: undefined } } } }, {
    paths: [["chunks", placementChunkId, "objects", objectId]],
  });

  useWorldStore.getState().upsertObject({
    id: objectId,
    type: "procedural",
    source: "generated",
    name: proceduralMesh?.name ?? "PROCEDURAL OBJECT",
    modelType: proceduralMesh?.modelType,
    blockType: proceduralMesh?.blockType,
    heightLevel: previewPosition.userData?.blockHeightLevel ?? 1,
    geologyType: proceduralMesh?.geologyType,
    treeDefinition: proceduralMesh?.treeDefinition,
    editSettings: proceduralMesh?.editSettings,
    position: previewPosition.toArray(),
    rotationY: placementRotation,
    scale: 1,
  });

  const placedObject = useWorldStore.getState().world.chunks?.[placementChunkId]?.objects?.[objectId];
  commitHistoryTransaction({ chunks: { [placementChunkId]: { objects: { [objectId]: placedObject } } } }, {
    paths: [["chunks", placementChunkId, "objects", objectId]],
  });

  setPlacedMeshes((current) => [
    ...current,
    {
      id: objectId,
      type: "procedural",
      mesh: proceduralMesh,
      position: previewPosition.clone(),
      rotationY: placementRotation,
      scale: 1,
      windPhase,
      heightLevel: previewPosition.userData?.blockHeightLevel ?? 1,
    },
  ]);

  setPreviewPosition(null);
  const nextRules = getPlacementRules(selectedMesh);
  setPlacementRotation(nextRules.randomRotation ? Math.random() * Math.PI * 2 : 0);
  useInteractionStore.getState().activate({
    target: `object:${selectedMesh?.id ?? "selected"}`,
    tool: "OBJECT",
    mode: "PLACE",
  });
  window.dispatchEvent(new CustomEvent("tg-mesh-placement-completed"));
  window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: "worldTransform", duration: 620 } }));
}

    function handleGamepadPlace() {
      if (!placementMode || !previewPosition) return;
      const hasLoadedScene = Boolean(loadedScene);
      const hasProceduralMesh = Boolean(proceduralMesh);
      if (!hasLoadedScene && !hasProceduralMesh) return;

      if (selectedMesh?.modelType === "geology") {
        commitGeologyPlacement();
        return;
      }

      if (hasLoadedScene) {
        const object = cloneScene(loadedScene);
        object.position.copy(previewPosition);
        object.rotation.y = placementRotation;
        const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
        const placementChunkId = placementChunkAt(previewPosition);
        beginHistoryTransaction("PLACE OBJECT", { chunks: { [placementChunkId]: { objects: { [objectId]: undefined } } } }, {
          paths: [["chunks", placementChunkId, "objects", objectId]],
        });
        setPlacedMeshes((current) => [...current, { id: objectId, type: "scene", object }]);
        useWorldStore.getState().upsertObject({
          id: objectId, type: "scene", source: selectedMesh?.source ?? "uploaded",
          name: selectedMesh?.name ?? "UPLOADED OBJECT", modelPath: selectedMesh?.modelPath,
          position: previewPosition.toArray(), rotationY: placementRotation, scale: 1,
        });
        const placedObject = useWorldStore.getState().world.chunks?.[placementChunkId]?.objects?.[objectId];
        commitHistoryTransaction({ chunks: { [placementChunkId]: { objects: { [objectId]: placedObject } } } }, {
          paths: [["chunks", placementChunkId, "objects", objectId]],
        });
      } else {
        const objectId = `placed-mesh-${Date.now()}-${placedMeshes.length}`;
        const placementChunkId = placementChunkAt(previewPosition);
        beginHistoryTransaction("PLACE OBJECT", { chunks: { [placementChunkId]: { objects: { [objectId]: undefined } } } }, {
          paths: [["chunks", placementChunkId, "objects", objectId]],
        });
        useWorldStore.getState().upsertObject({
          id: objectId, type: "procedural", source: "generated", name: proceduralMesh?.name ?? "PROCEDURAL OBJECT",
          modelType: proceduralMesh?.modelType, blockType: proceduralMesh?.blockType, geologyType: proceduralMesh?.geologyType,
          treeDefinition: proceduralMesh?.treeDefinition, editSettings: proceduralMesh?.editSettings,
          position: previewPosition.toArray(), rotationY: placementRotation, scale: 1,
        });
        const placedObject = useWorldStore.getState().world.chunks?.[placementChunkId]?.objects?.[objectId];
        commitHistoryTransaction({ chunks: { [placementChunkId]: { objects: { [objectId]: placedObject } } } }, {
          paths: [["chunks", placementChunkId, "objects", objectId]],
        });
        setPlacedMeshes((current) => [
          ...current,
          { id: objectId, type: "procedural", mesh: proceduralMesh, position: previewPosition.clone(), rotationY: placementRotation, scale: 1, windPhase: current.length * 1.73 },
        ]);
      }
      setPreviewPosition(null);
      const rules = getPlacementRules(selectedMesh);
      setPlacementRotation(rules.randomRotation ? Math.random() * Math.PI * 2 : 0);
      useInteractionStore.getState().activate({ target: `object:${selectedMesh?.id ?? "selected"}`, tool: "OBJECT", mode: "PLACE" });
      window.dispatchEvent(new CustomEvent("tg-mesh-placement-completed"));
      window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: "worldTransform", duration: 620 } }));
    }

    function handleContextMenu(event) {
      if (!placementMode) return;
      if(terrainSettings.terrainPreviewStamp)setTerrainPreviewStamp(null);

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
  selectedMesh,
  placementRotation,
  geologyFoundation,
  placedMeshes.length,
]);

// --------------------------------------------------
// PLACEMENT PREVIEW + TREE WIND
// --------------------------------------------------

// Consume world selection before the gameplay poll can interpret A as Jump.
useFrame(() => {
  const padA=Boolean(navigator.getGamepads?.().find(p=>p?.connected)?.buttons[0]?.pressed);
  const interaction=useInteractionStore.getState();
  if(interaction.gestureOwner==='geology-selection'&&!padA){interaction.setGestureOwner(null);clearGameplayInput()}
  if(padA&&!geologySelectionPad.current&&!placementMode&&!useInteractionStore.getState().activeTool&&gameplayInputAllowed()&&Object.keys(useWorldStore.getState().world.geology?.features??{}).length){
    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
    const point=raycastCommittedTerrain(raycaster.ray),feature=point?pickGeologyFeatureAt(point.x,point.z):null;
    if(feature){interaction.setTarget('object:'+feature.id);interaction.setGestureOwner('geology-selection');clearGameplayInput()}
  }
  geologySelectionPad.current=padA;
},-1);
useEffect(()=>()=>{if(useInteractionStore.getState().gestureOwner==='geology-selection'){useInteractionStore.getState().setGestureOwner(null);clearGameplayInput()}},[]);

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
    loadedScene.rotation.y = placementRotation;
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
    {placementMode&&selectedMesh?.modelType==='geology'&&previewPosition&&<GeologyPlacementGhost mesh={selectedMesh} point={previewPosition} rotation={placementRotation} foundation={geologyFoundation}/>}
    {placementMode &&
      loadedScene &&
      previewPosition && (
        <primitive
          object={loadedScene}
          position={[previewPosition.x, previewPosition.y, previewPosition.z]}
          rotation={[0, placementRotation, 0]}
        />
      )}

    {placementMode &&
      proceduralMesh &&
      proceduralMesh.modelType !== "geology" &&
      previewPosition && (
        <group
          position={[
            previewPosition.x,
            previewPosition.y,
            previewPosition.z,
          ]}
          rotation={[0, placementRotation, 0]}
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
        heightLevelOverride={entry.mesh?.modelType === "building-block" ? (blockHeightLevels.get(entry.id) ?? 1) : null}
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
        treeId={entry.mesh?.modelType === "crimson-tree" ? entry.id : null}
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
