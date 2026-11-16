import { clearGameplayInput } from '../../systems/input/inputOwnership';
import { createPortal } from "react-dom";
import AnimationActions from "./AnimationActions";
import { addObjectToScatter, scatterEligibility } from "../../systems/objects/scatterOperations";
import { terrainSettings } from "../../systems/terrain/terrainSettings";
import TreeProperties from "./TreeProperties";
import ObjectTransformProperties from "./ObjectTransformProperties";
import ObjectEditHistory from "./ObjectEditHistory";
import { mergeTreeProperties } from "../../systems/objects/treeProperties";
import { resolveObjectTarget, editObjectTarget } from "../../systems/objects/objectEditing";
import { useEditorStore } from "../../systems/editor/editorStore";
import { returnToWorldView, openObjectLibrary } from "../../systems/ui/navigationActions";
import { useNavigationStore } from "../../systems/ui/navigationStore";
import { useEffect, useMemo, useRef, useState } from "react";
import CrimsonTreeModel from "../world/CrimsonTreeModel";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  createCrimsonTreeDefinition,
} from "../world/treeGenerator";
import "./MeshMenu.css";
import { BUILTIN_OBJECTS, createUploadedObject, createSavedObject } from "../../systems/objects/objectRegistry";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { useWorldStore } from "../../systems/world/worldStore";



function PreviewIcon({ kind = "structure" }) {
  if (kind === "tree") {
    return (
      <div className="tg-mesh-icon tg-mesh-icon-tree" aria-hidden="true">
        <span className="tg-mesh-tree-trunk" />
        <span className="tg-mesh-tree-crown" />
      </div>
    );
  }

  if (kind === "foliage") {
    return (
      <div className="tg-mesh-icon tg-mesh-icon-fern" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index} style={{ transform: `rotate(${index * 25}deg)` }} />
        ))}
      </div>
    );
  }

  if (kind === "structure") {
    return <div className={`tg-mesh-icon tg-mesh-icon-${kind}`} aria-hidden="true" />;
  }

  return <div className="tg-mesh-icon" aria-hidden="true" />;
}
function getCrimsonTreeSettings(settings = {}) {
  const trunkShape = Number(settings.trunkShape ?? 50) / 100;
  const trunkSize = Number(settings.trunkSize ?? 50) / 100;
  const leafShape = Number(settings.leafShape ?? 50) / 100;
  const leafSize = Number(settings.leafSize ?? 50) / 100;

  return {
    trunkHeight: THREE.MathUtils.lerp(
      5.2,
      7.4,
      trunkSize
    ),

    trunkTopRadius: THREE.MathUtils.lerp(
      0.06,
      0.18,
      trunkShape
    ),

    trunkBottomRadius: THREE.MathUtils.lerp(
      0.20,
      0.38,
      trunkShape
    ),

    crownWidth: THREE.MathUtils.lerp(
      0.72,
      1.25,
      leafSize
    ),

    crownHeight: THREE.MathUtils.lerp(
      0.78,
      1.28,
      leafShape
    ),
  };
}
function TreeEditorPreview({ treeDefinition, rotation, scale, onHeightChange, onBendChange, editMode = "trunk", onBranchCreate }) {
  const [reticle, setReticle] = useState(null);
  const dragRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragStartHeightRef = useRef(50);
  const dragStartBendRef = useRef(50);
  const dragStartPointRef = useRef(null);
  const previewRef = useRef(null);

  function updateReticle(event) {
    if (!event?.point || !event?.object) return;

    const object = event.object;
    const worldQuaternion = new THREE.Quaternion();
    object.getWorldQuaternion(worldQuaternion);

    let normal = new THREE.Vector3(0, 1, 0);
    let radius = 0.16;

    if (editMode === "branch" && object.userData?.tgCrimsonTreeBranch) {
      const data = object.userData.tgTreeBranchData ?? [];
      const branchIndex = Number.isFinite(event.faceIndex)
        ? Math.floor(event.faceIndex / 12)
        : -1;
      const branch = data[branchIndex];
      if (branch?.direction) {
        normal = new THREE.Vector3(...branch.direction);
        radius = Math.max(0.12, Number(branch.thickness ?? 0.06) * 2.6);
      }
    } else {
      const trunkRadius = Number(treeDefinition?.trunk?.radius ?? 50) / 100;
      radius = Math.max(0.16, 0.18 + trunkRadius * 0.18);
    }

    normal.applyQuaternion(worldQuaternion).normalize();

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );

    setReticle({
      position: event.point.clone(),
      quaternion,
      radius: radius * Math.max(0.5, Number(scale) || 1),
    });
  }

  function handlePointerMove(event) {
    updateReticle(event);
  }

  function handlePointerOut() {
    if (!dragRef.current) setReticle(null);
  }

  function handlePointerDown(event) {
    event.stopPropagation();
    event.preventDefault();
    updateReticle(event);
    dragRef.current = true;
    dragStartYRef.current = event.clientY;
    dragStartXRef.current = event.clientX;
    dragStartHeightRef.current = Number(treeDefinition?.trunk?.height ?? 50);
    dragStartBendRef.current = Number(treeDefinition?.trunk?.bend ?? 50);
    dragStartPointRef.current = event.point?.clone?.() ?? null;
  }

  useEffect(() => {
    function handleWindowMove(event) {
      if (!dragRef.current) return;
      const deltaY = event.clientY - dragStartYRef.current;
      const deltaX = event.clientX - dragStartXRef.current;
      if (editMode === "branch") {
        onBranchCreate?.(dragStartPointRef.current, deltaX, deltaY);
      } else {
        onHeightChange(THREE.MathUtils.clamp(dragStartHeightRef.current - deltaY * 0.28, 0, 100));
        onBendChange?.(THREE.MathUtils.clamp(dragStartBendRef.current + deltaX * 0.28, 0, 100));
      }
    }

    function handleWindowUp() {
      dragRef.current = false;
    }

    window.addEventListener("pointermove", handleWindowMove, true);
    window.addEventListener("pointerup", handleWindowUp, true);
    window.addEventListener("pointercancel", handleWindowUp, true);
    return () => {
      window.removeEventListener("pointermove", handleWindowMove, true);
      window.removeEventListener("pointerup", handleWindowUp, true);
      window.removeEventListener("pointercancel", handleWindowUp, true);
    };
  }, [onHeightChange, onBendChange, onBranchCreate, editMode, treeDefinition]);

  return (
    <div ref={previewRef} className="tg-tree-editor-preview">
      <Canvas
        camera={{ position: [9, 7, 12], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#111111"]} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[5, 10, 6]} intensity={3} />
        <directionalLight position={[-4, 5, -2]} intensity={1} />
        <group
          position={[0, -4.8, 0]}
          rotation={[0, THREE.MathUtils.degToRad(rotation), 0]}
          scale={scale}
        >
          <CrimsonTreeModel
            treeDefinition={treeDefinition}
            interactiveTrunk
            onTrunkPointerMove={editMode === "trunk" ? handlePointerMove : undefined}
            onTrunkPointerOut={editMode === "trunk" ? handlePointerOut : undefined}
            onTrunkPointerDown={editMode === "trunk" ? handlePointerDown : undefined}
            onBranchPointerMove={editMode === "branch" ? handlePointerMove : undefined}
            onBranchPointerOut={editMode === "branch" ? handlePointerOut : undefined}
            onBranchPointerDown={editMode === "branch" ? handlePointerDown : undefined}
          />
        </group>
        <gridHelper
          args={[14, 14, "#303030", "#202020"]}
          position={[0, -4.8, 0]}
        />
        {reticle && (
          <mesh
            position={reticle.position}
            quaternion={reticle.quaternion}
            scale={reticle.radius / 0.16}
            renderOrder={20}
          >
            <torusGeometry args={[0.16, 0.012, 8, 64]} />
            <meshBasicMaterial
              color="#2a8fff"
              transparent
              opacity={0.95}
              depthTest
              depthWrite={false}
            />
          </mesh>
        )}
      </Canvas>
      <div className="tg-tree-editor-mode-hint">{editMode === "preview" ? "OBJECT PREVIEW" : editMode === "branch" ? "BRANCH // CLICK + DRAG OUTWARD" : "TRUNK // CLICK + DRAG UP / DOWN"}</div>
    </div>
  );
}

function LeafVertexEditor({ vertices, onSave, onCancel }) {
  const defaults = [0,0,0, .42,.12,0, .78,.38,0, .48,.82,0, .05,1,0, -.38,.72,0, -.58,.28,0, -.32,-.08,0];
  const [points, setPoints] = useState(() => {
    const source = Array.isArray(vertices) && vertices.length === 24 ? vertices : defaults;
    return Array.from({ length: 8 }, (_, index) => ({ x: Number(source[index * 3] ?? 0), y: Number(source[index * 3 + 1] ?? 0) }));
  });
  const [selected, setSelected] = useState(0);
  const dragRef = useRef(null);
  const mapPoint = (point) => ({ x: 200 + point.x * 220, y: 300 - point.y * 220 });
  function beginDrag(index, event) {
    event.preventDefault(); event.stopPropagation();
    setSelected(index);
    dragRef.current = { index, rect: event.currentTarget.ownerSVGElement.getBoundingClientRect() };
  }
  useEffect(() => {
    function move(event) {
      if (!dragRef.current) return;
      const { index, rect } = dragRef.current;
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * (400 / 220);
      const y = (0.5 - (event.clientY - rect.top) / rect.height) * (400 / 220);
      setPoints((current) => current.map((point, i) => i === index ? { ...point, x, y } : point));
    }
    function up() { dragRef.current = null; }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);
  const screen = points.map(mapPoint);
  const polygon = screen.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className="tg-leaf-editor-backdrop" role="dialog" aria-modal="true" aria-label="Leaf Vertex Editor">
      <div className="tg-leaf-editor-window">
        <div className="tg-tree-interaction-title-row"><div><div className="tg-side-panel-title">LEAF VERTEX EDITOR</div><div className="tg-tree-interaction-subtitle">CANONICAL LEAF SHAPE</div></div><button type="button" className="tg-tree-interaction-close" onClick={onCancel}>×</button></div>
        <div className="tg-leaf-editor-canvas">
          <svg viewBox="0 0 400 400" width="100%" height="100%">
            <defs><pattern id="tg-leaf-editor-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.10)" /></pattern></defs>
            <rect width="400" height="400" fill="url(#tg-leaf-editor-grid)" />
            <polygon points={polygon} fill="rgba(184,255,42,.78)" stroke="#2a8fff" strokeWidth="3" />
            {screen.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === selected ? 9 : 7} fill={index === selected ? "#ffffff" : "#2a8fff"} stroke="#080808" strokeWidth="2" onPointerDown={(event) => beginDrag(index, event)} />)}
          </svg>
        </div>
        <div className="tg-leaf-editor-footer"><span>CLICK + DRAG VERTEX</span><strong>VERTEX {selected + 1}</strong><button type="button" className="tg-mesh-save" onClick={() => onSave(points.flatMap((point) => [Number(point.x.toFixed(4)), Number(point.y.toFixed(4)), 0]))}>SAVE</button><button type="button" className="tg-mesh-cancel" onClick={onCancel}>CANCEL</button></div>
      </div>
    </div>
  );
}

function MeshEditModal({ mesh, live, onChange, onSave, onCancel }) {
  useEffect(()=>{
    if(!live)return;
    const finish=()=>{if(useInteractionStore.getState().gestureOwner==='object-editor')useInteractionStore.getState().setGestureOwner(null)};
    for(const event of ['pointerup','pointercancel','blur'])window.addEventListener(event,finish,true);
    return()=>{for(const event of ['pointerup','pointercancel','blur'])window.removeEventListener(event,finish,true);finish()};
  },[live]);
  const [draft, setDraft] = useState(() => createCrimsonTreeDefinition(mesh.treeDefinition ?? {}));
  const [fireflyDraft, setFireflyDraft] = useState(mesh.editSettings ?? { density: 40, speed: 30, flicker: 65, color: "#d9ff8a" });
  const [rotation, setRotation] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const [directTreeEdit, setDirectTreeEdit] = useState(false);
  const [treeEditMode, setTreeEditMode] = useState("trunk");
  const [vertexOpen, setVertexOpen] = useState(false);
  const isTree = mesh.modelType === "crimson-tree";
  const isFireflies = mesh.modelType === "fireflies";
  const definition = live ? mesh.treeDefinition ?? draft : draft;
  const fireflySettings = live ? mesh.editSettings ?? fireflyDraft : fireflyDraft;
  function update(patch) {
    if (live) onChange({ treeDefinition: patch });
    else setDraft(current => mergeTreeProperties(current, patch));
  }
  function updateFirefly(key, value) {
    const editSettings = { ...fireflySettings, [key]: value };
    if (live) onChange({ editSettings }); else setFireflyDraft(editSettings);
  }
  return <div className="tg-mesh-edit-backdrop tg-object-editor-backdrop" role="dialog" aria-modal={!live} data-world-object-editor={live?true:undefined} aria-label="Edit Object" data-input-context="panel" onPointerDownCapture={()=>{if(live){useInteractionStore.getState().setGestureOwner('object-editor');clearGameplayInput()}}} onPointerUpCapture={event=>{
    if(live&&event.target.matches('input[type="range"],input[type="number"]')&&!event.target.hasAttribute('data-gamepad-adjusting'))window.requestAnimationFrame(()=>event.target.blur());
  }}>
    <div className="tg-mesh-edit-window tg-focused-object-editor">
      <div className="tg-mesh-edit-preview">
        <div className="tg-mesh-edit-preview-title">{mesh.name || "OBJECT"}</div>
        {isTree ? <TreeEditorPreview treeDefinition={definition} rotation={rotation} scale={previewScale}
          editMode={directTreeEdit ? treeEditMode : "preview"}
          onHeightChange={value => { if (directTreeEdit) update({ trunk: { height: value } }); }}
          onBendChange={value => { if (directTreeEdit) update({ trunk: { bend: value } }); }}
          onBranchCreate={(point, dx, dy) => {
            if (!directTreeEdit || !point) return;
            const angle = Math.atan2(-dy, dx);
            const direction = new THREE.Vector3(Math.cos(angle), .16, Math.sin(angle)).normalize();
            update({ branches: { custom: [...(definition.branches?.custom ?? []), { trunkT: THREE.MathUtils.clamp(point.y / 8.5, .05, .95), origin: [point.x, point.y, point.z], direction: direction.toArray(), length: THREE.MathUtils.clamp(1.4 + Math.hypot(dx, dy) * .02, .6, 5.5) }] } });
          }} /> : isFireflies ? <div className="tg-mesh-edit-placeholder tg-firefly-edit-preview">
          {Array.from({ length: 18 }, (_, index) => <span key={index} className="tg-firefly-preview-dot" style={{ left: (12 + ((index * 37) % 76)) + "%", top: (16 + ((index * 53) % 68)) + "%", background: fireflySettings.color, opacity: .2 + (fireflySettings.flicker ?? 65) * .008, animationDuration: Math.max(.35, 2.8 - (fireflySettings.speed ?? 30) * .018) + "s", transform: "scale(" + (.65 + (fireflySettings.density ?? 40) / 180) + ")" }} />)}
          <strong>FIREFLY FIELD</strong>
        </div> : <div className="tg-mesh-edit-placeholder"><PreviewIcon kind={mesh.kind} /></div>}
      </div>
      <div className="tg-mesh-edit-controls">
        <h2>EDIT OBJECT</h2>
        <p className="tg-library-guidance">{live ? "WORLD OBJECT — changes apply live. Undo restores previous edits." : mesh.file && !mesh.modelPath ? "LOCAL GLB — session-only. Use Place; persistent library copies require a registered model path." : "LIBRARY TEMPLATE — Save creates a library copy; Cancel discards this draft."}</p>
        {live && mesh.position && <ObjectTransformProperties object={mesh} onChange={onChange} />}
        {live && !mesh.position && <p className="tg-library-guidance">Scatter placement/rotation/scale are generated by the population. Editing scope: {mesh.editScope || "single tree"}.</p>}
        {isTree && <>
          <TreeProperties definition={definition} onChange={update} onVertexEdit={() => setVertexOpen(true)} seedEditable={!(mesh.profileId && mesh.editScope === "global")} />
          <button className="tg-ui-button" onClick={() => setDirectTreeEdit(current => !current)}>{directTreeEdit ? "EXIT DIRECT TREE EDIT" : "DIRECT TREE EDIT"}</button>
          {directTreeEdit && <div className="tg-panel-actions"><button className="tg-ui-button" aria-pressed={treeEditMode === "trunk"} onClick={() => setTreeEditMode("trunk")}>TRUNK</button><button className="tg-ui-button" aria-pressed={treeEditMode === "branch"} onClick={() => setTreeEditMode("branch")}>BRANCH</button></div>}
          <details><summary>PREVIEW CAMERA</summary><label>PREVIEW ROTATION<input aria-label="Preview rotation" type="range" min="0" max="360" value={rotation} onChange={event => setRotation(Number(event.target.value))} /></label><label>PREVIEW SCALE<input aria-label="Preview scale" type="range" min=".25" max="2" step=".05" value={previewScale} onChange={event => setPreviewScale(Number(event.target.value))} /></label></details>
        </>}
        {isFireflies && <fieldset><legend>FIREFLIES</legend>{["density", "speed", "flicker"].map(key => <label key={key}>{key.toUpperCase()}<input aria-label={"Firefly " + key} type="range" min="0" max="100" value={fireflySettings[key] ?? 50} onChange={event => updateFirefly(key, Number(event.target.value))} /></label>)}<label>COLOR<input aria-label="Firefly color" type="color" value={fireflySettings.color ?? "#d9ff8a"} onChange={event => updateFirefly("color", event.target.value)} /></label></fieldset>}
        {!isTree && !isFireflies && <p className="tg-library-guidance">{live ? "Edit transforms here or directly in the world. The world is the visual preview for this asset." : "This asset has no procedural property editor. Use Place, then select its world instance to edit transforms."}</p>}
        <div className="tg-mesh-edit-footer">
          {live && <ObjectEditHistory />}
          {!live && <button type="button" className="tg-mesh-save" disabled={Boolean(mesh.file && !mesh.modelPath)} onClick={() => onSave({ treeDefinition: isTree ? draft : undefined, fireflySettings: isFireflies ? fireflyDraft : undefined })}>SAVE LIBRARY COPY</button>}
          <button type="button" className="tg-mesh-cancel" data-object-editor-close onClick={onCancel}>{live ? "BACK TO SOUTH" : "CANCEL"}</button>
        </div>
      </div>
    </div>
    {vertexOpen && <LeafVertexEditor vertices={definition.leaves?.vertices} onSave={vertices => { update({ leaves: { vertices } }); setVertexOpen(false); }} onCancel={() => setVertexOpen(false)} />}
  </div>;
}


function captureLibraryPosition(mode) {
  return { mode: mode === "place" ? "select" : mode, scrollTop: document.querySelector("#tg-panel-south .tg-directional-content")?.scrollTop ?? 0, galleryScrollLeft: document.querySelector(".tg-mesh-library")?.scrollLeft ?? 0 };
}

export default function MeshMenu({ host }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [selectedId, setSelectedId] = useState(null);
  const [worldTarget, setWorldTarget] = useState(null);
  const world = useWorldStore(state => state.world);
  const southVisible = useEditorStore(state => state.visiblePanels.south);
  const activeTarget = useInteractionStore(state => state.activeTarget);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadedMeshes, setUploadedMeshes] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [editedMeshes, setEditedMeshes] = useState({});
  const [savedMeshes, setSavedMeshes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("testingGroundsSavedObjects") || "[]"); } catch { return []; }
  });
  const fileInputRef = useRef(null);
  const galleryRef = useRef(null);
  function scrollGallery(direction) {
    const gallery = galleryRef.current;
    gallery?.scrollBy({ left: direction * gallery.clientWidth * 0.85, behavior: "auto" });
  }
  const libraryPosition = useRef({ mode: "select", scrollTop: 0, galleryScrollLeft: 0 });
  function rememberLibraryPosition(browsingMode = mode) {
    libraryPosition.current = captureLibraryPosition(browsingMode);
  }
  useEffect(() => {
    function selectFromLibrary(event) {
      const mesh = event.detail?.mesh;
      if (!mesh?.id) return;
      setWorldTarget(null); setSelectedId(mesh.id); setMode("select"); setEditOpen(false); setMenuOpen(true);
      useEditorStore.getState().openPanel("south");
    }
    window.addEventListener("tg-mesh-library-select", selectFromLibrary);
    return () => window.removeEventListener("tg-mesh-library-select", selectFromLibrary);
  }, []);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const scatterProfiles = useWorldStore((state) => state.world.scatterProfiles ?? {});
  const meshes = useMemo(
  () =>
    [
      ...savedMeshes,
      ...uploadedMeshes,
      ...BUILTIN_OBJECTS,
      ...Object.entries(scatterProfiles).filter(([id]) => !savedMeshes.some(mesh => mesh.id === id) && !uploadedMeshes.some(mesh => mesh.id === id) && !BUILTIN_OBJECTS.some(mesh => mesh.id === id)).map(([id, profile]) => ({ ...profile, id, source: profile.source ?? "saved" })),
    ].map((mesh) => {
      const edited = editedMeshes[mesh.id];

      return {
        ...mesh,
        editSettings: {
          ...(mesh.editSettings ?? {}),
          ...(edited ?? {}),
        },

        name: edited?.name ?? mesh.name,
        treeDefinition:
          edited?.treeDefinition ??
          mesh.treeDefinition,
      };
    }),
  [uploadedMeshes, editedMeshes, savedMeshes, scatterProfiles]
);
  const worldSelection = useMemo(() => resolveObjectTarget(worldTarget, world), [worldTarget, world]);
  const selectedMesh = worldTarget ? worldSelection : meshes.find(mesh => mesh.id === selectedId) || null;
  const eligibility = scatterEligibility(selectedMesh);
  const currentSelectionId = activeTarget?.replace(/^(object|tree):/, "");
  const currentSelection = resolveObjectTarget({ id: currentSelectionId }, world);
  const scatterProfile = useWorldStore(
    (state) => selectedMesh?.id ? state.world.scatterProfiles?.[selectedMesh.id] : null
  );

useEffect(() => {
  function handleMeshMenuOpen(event) {
    useEditorStore.getState().openPanel("south");
    setMenuOpen(true);
    setEditOpen(false);
    if (event?.detail?.restore) {
      setMode(libraryPosition.current.mode);
      window.requestAnimationFrame(() => {
        const panel = document.querySelector("#tg-panel-south");
        if (!panel || panel.hidden) return;
        const selected = panel.querySelector(".tg-mesh-card.selected") || panel.querySelector(".tg-mesh-menu-actions button");
        selected?.focus({ preventScroll: true });
        panel.querySelector(".tg-directional-content").scrollTop = libraryPosition.current.scrollTop;
        if (galleryRef.current) galleryRef.current.scrollLeft = libraryPosition.current.galleryScrollLeft;
      });
    } else {
      const requested = event?.detail?.mode;
      const nextMode = requested === 'edit' ? 'selected' : ['scatter','animation'].includes(requested) ? requested : 'select';
      setMode(nextMode);
      libraryPosition.current.mode = nextMode;
    }
  }

  window.addEventListener(
    "tg-mesh-menu-open",
    handleMeshMenuOpen
  );

  return () => {
    window.removeEventListener(
      "tg-mesh-menu-open",
      handleMeshMenuOpen
    );
  };
}, []);

  useEffect(() => {
    function handleMeshMenuClose() {
      setMenuOpen(false);
      setEditOpen(false);
    }

    window.addEventListener("tg-mesh-menu-close", handleMeshMenuClose);
    return () => window.removeEventListener("tg-mesh-menu-close", handleMeshMenuClose);
  }, []);

  useEffect(() => {
    function handlePlacementCancelled() {
      const navigation = useNavigationStore.getState();
      const fromLibrary = navigation.placementOrigin === "south";
      navigation.setPlacementOrigin(null);
      if (fromLibrary) openObjectLibrary("return");
    }

    window.addEventListener("tg-mesh-placement-cancelled", handlePlacementCancelled);
    return () => window.removeEventListener("tg-mesh-placement-cancelled", handlePlacementCancelled);
  }, []);

  function commitRename(mesh) {
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    const renamed = { ...mesh, name: name.toUpperCase().slice(0, 32) };
    setUploadedMeshes((current) => current.map((entry) => entry.id === mesh.id ? renamed : entry));
    setSavedMeshes((current) => {
      const next = current.map((entry) => entry.id === mesh.id ? renamed : entry);
      localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next));
      return next;
    });
    setEditedMeshes((current) => ({ ...current, [mesh.id]: { ...(current[mesh.id] ?? {}), name: renamed.name } }));
    setRenamingId(null);
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // The existing importer supports self-contained GLB, not OBJ/FBX or sidecar files.
    if (!/\.glb$/i.test(file.name)) {
      setUploadError("Choose a self-contained .glb file. OBJ, FBX and external glTF resources are not supported.");
      event.target.value = "";
      return;
    }
    setUploadError("");

    const id = `upload-${Date.now()}`;
    const mesh = createUploadedObject(file, id);

    setUploadedMeshes((current) => [mesh, ...current]);
    setWorldTarget(null);
    setSelectedId(id);
    setMode("select");

    window.dispatchEvent(
      new CustomEvent("tg-mesh-upload-request", {
        detail: { file, meshId: id },
      })
    );

    event.target.value = "";
  }

  function selectMesh(mesh) {
    setWorldTarget(null);
    setSelectedId(mesh.id);
    setMode(current => current === "scatter" ? "scatter" : "select");
    setEditOpen(false);
  }

  function placeSelected() {
    if (!selectedMesh) return;
    rememberLibraryPosition();
    returnToWorldView();
    setMode("place");
    setEditOpen(false);
    setMenuOpen(false);
    useInteractionStore.getState().activate({
      target: `object:${selectedMesh.id}`,
      tool: "OBJECT",
      mode: "PLACE",
    });
    window.dispatchEvent(
      new CustomEvent("tg-mesh-place-request", {
        detail: { mesh: selectedMesh, origin: "south" },
      })
    );
  }

 function requestDelete(mesh) {
  if (!mesh || BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id)) return;
  setDeleteCandidate(mesh);
}

function confirmDelete() {
  if (!deleteCandidate) return;
  const id = deleteCandidate.id;
  setUploadedMeshes((current) => current.filter((entry) => entry.id !== id));
  setSavedMeshes((current) => {
    const next = current.filter((entry) => entry.id !== id);
    localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next));
    return next;
  });
  setEditedMeshes((current) => { const next = { ...current }; delete next[id]; return next; });
  useWorldStore.getState().removeScatterProfile(id);
  if (selectedId === id) setSelectedId(BUILTIN_OBJECTS[0].id);
  setDeleteCandidate(null);
}

 function editSelected() {
   if (!selectedMesh) return;
   window.dispatchEvent(new CustomEvent("crimson-tree-edit-exit-request"));
   window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
   if (worldTarget && selectedMesh.position) useInteractionStore.getState().activate({ target: "object:" + worldTarget.id, tool: "OBJECT", mode: "select" });
   setMode("selected"); setEditOpen(true);
   window.requestAnimationFrame(() => document.querySelector(".tg-mesh-edit-controls input, [data-object-editor-close]")?.focus());
 }
 useEffect(() => {
   function focusObject(event) {
     const target = event.detail;
     if (!resolveObjectTarget(target)) return;
     window.dispatchEvent(new CustomEvent("crimson-tree-edit-exit-request"));
     if (resolveObjectTarget(target)?.position) useInteractionStore.getState().activate({ target: "object:" + target.id, tool: "OBJECT", mode: "select" });
     setWorldTarget(target); setMode("selected"); setEditOpen(true); setMenuOpen(true);
     useEditorStore.getState().openPanel("south");
   }
   window.addEventListener("tg-object-focus-edit", focusObject);
   return () => window.removeEventListener("tg-object-focus-edit", focusObject);
 }, []);
 function closeEditor() {
   setEditOpen(false);
   window.requestAnimationFrame(() => document.querySelector("[data-object-edit]")?.focus());
 }

function closeMenu() {
  // Visibility only: preserve the selected tool and any placement preview.
  setEditOpen(false);
  setMenuOpen(false);
  window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
}

function getDefaultCrimsonProfile() {
  const current = useWorldStore.getState().world.scatterProfiles?.["crimson-tree"];
  return {
    enabled: current?.enabled !== false,
    objectId: "crimson-tree",
    name: "DEFAULT TREE",
    kind: "tree",
    source: "procedural",
    modelType: "crimson-tree",
    treeDefinition: current?.treeDefinition ?? createCrimsonTreeDefinition(),
    density: Number(current?.density ?? terrainSettings.treeDensity ?? 25),
    coverage: Number(current?.coverage ?? terrainSettings.treeCoverage ?? 50),
    scaleVariation: Number(current?.scaleVariation ?? 25),
    rotationVariation: Number(current?.rotationVariation ?? 100),
    clustering: Number(current?.clustering ?? 35),
  };
}

  function addToScatter() {
    const result = addObjectToScatter(selectedMesh);
    if (!result.ok) return;
    window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
    setMode("scatter");
    window.dispatchEvent(new CustomEvent("tg-mesh-scatter-request", { detail: { mesh: selectedMesh } }));
  }

  function updateScatterSetting(profileId, key, value) {
    if (!profileId) return;
    const current = useWorldStore.getState().world.scatterProfiles?.[profileId] ??
      (profileId === "crimson-tree" ? getDefaultCrimsonProfile() : null);
    if (!current) return;

    useWorldStore.getState().upsertScatterProfile(profileId, {
      ...current,
      objectId: profileId,
      enabled: true,
      [key]: Number(value),
    });
  }

  function selectScatterPopulation(profileId) {
    const mesh = meshes.find((entry) => entry.id === profileId);
    if (!mesh) return;
    setWorldTarget(null); setSelectedId(profileId);
    setMode("scatter");
    setEditOpen(false);
    useInteractionStore.getState().clear();
  }

  function removeScatterPopulation(profileId) {
    if (!profileId) return;
    if (profileId === "crimson-tree") {
      const current = useWorldStore.getState().world.scatterProfiles?.[profileId] ?? getDefaultCrimsonProfile();
      useWorldStore.getState().upsertScatterProfile(profileId, {
        ...current,
        objectId: "crimson-tree",
        enabled: false,
      });
      if (selectedId === profileId) useInteractionStore.getState().clear();
      return;
    }

    useWorldStore.getState().removeScatterProfile(profileId);
    if (selectedId === profileId) {
      useInteractionStore.getState().clear();
      setSelectedId(null);
    }
  }

  function enableScatterPopulation(profileId) {
    if (!profileId) return;
    const current = useWorldStore.getState().world.scatterProfiles?.[profileId];
    if (!current) return;
    useWorldStore.getState().upsertScatterProfile(profileId, { ...current, enabled: true });
  }

  function scatterEntries() {
    const defaultProfile = scatterProfiles["crimson-tree"] ?? getDefaultCrimsonProfile();
    const custom = Object.entries(scatterProfiles)
      .filter(([id]) => id !== "crimson-tree")
      .map(([id, profile]) => [id, profile]);
    return [["crimson-tree", defaultProfile], ...custom];
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      if (!editOpen && !menuOpen) return;

      event.preventDefault();

      if (editOpen) {
        setEditOpen(false);
        return;
      }

      closeMenu();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editOpen, menuOpen]);

  return (
  <>
    {(host || menuOpen) && (
      <>
        {host && createPortal(<div className="tg-mesh-menu" data-input-context="panel">
        <nav className="tg-object-entries" aria-label="Object workflows">
          {[["select","LIBRARY"],["selected","SELECTED OBJECT"],["scatter","SCATTER / POPULATIONS"],["animation","ANIMATION ACTIONS"]].map(([id,label]) => <button key={id} className="tg-ui-button" data-object-view={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}
        </nav>
        <div hidden={mode === "animation"} className="tg-object-browser">
        {mode === "selected" && <section className="tg-selected-object-context">
          <label>WORLD OBJECT <select aria-label="Select world object" value={worldTarget?.id ?? ""} onChange={event => setWorldTarget(event.target.value ? { id: event.target.value, chunkId: world.currentChunkId } : null)}>
            <option value="">Library selection</option>
            {Object.values(world.chunks?.[world.currentChunkId]?.objects ?? {}).map(object => <option key={object.id} value={object.id}>{object.name || object.id}</option>)}
            {worldSelection?.profileId && <option value={worldTarget.id}>{worldSelection.name} / scattered instance</option>}
          </select></label>
          <button className="tg-ui-button" disabled={!currentSelection} onClick={() => setWorldTarget({ id: currentSelectionId, chunkId: world.currentChunkId, scope: "single" })}>USE WORLD SELECTION</button>
          <p className="tg-library-guidance">{worldTarget ? "World target: " + (selectedMesh?.name || "unavailable") : "Library template: " + (selectedMesh?.name || "choose an item in Library")}</p>
        </section>}
        <div className="tg-library-toolbar">
        <div className="tg-mesh-menu-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            UPLOAD MESH
          </button>
          <button type="button" className={`tg-mesh-place-button ${mode === "place" && selectedMesh ? "active" : ""}`} disabled={!selectedMesh || Boolean(worldTarget)} onClick={placeSelected}>
            PLACE
          </button>
          <button type="button" data-object-edit disabled={!selectedMesh} onClick={editSelected}>
            EDIT
          </button>
          {mode !== "scatter" && <button type="button" data-add-to-scatter="selected" disabled={!eligibility.eligible} onClick={scatterProfile?.enabled ? () => setMode("scatter") : addToScatter}>{scatterProfile?.enabled ? "OPEN POPULATION" : "ADD TO SCATTER"}</button>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb"
            hidden
            onChange={handleUpload}
          />
        </div>

          <div className="tg-gallery-navigation" aria-label="Browse objects">
            <button type="button" className="tg-mesh-prev tg-ui-button" aria-label="Scroll objects left" onClick={() => scrollGallery(-1)}>&#8249;</button>
            <span>{meshes.length} OBJECTS</span>
            <button type="button" className="tg-mesh-next tg-ui-button" aria-label="Scroll objects right" onClick={() => scrollGallery(1)}>&#8250;</button>
          </div>
        </div>

        {uploadError && <p className="tg-upload-error" role="alert">{uploadError}</p>}
        <div hidden={mode === "selected" || mode === "scatter"} ref={galleryRef} className="tg-mesh-library" role="list" aria-label="Object gallery" tabIndex={0}>
          {meshes.map((mesh) => {
            const renaming = renamingId === mesh.id;
            return (
              <div key={mesh.id} className="tg-mesh-card-shell" role="listitem">
                {!BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id) && (
                  <button type="button" className="tg-mesh-card-delete" aria-label={`Delete ${mesh.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); requestDelete(mesh); }}>×</button>
                )}
                <button
                  type="button"
                  className={`tg-mesh-card ${selectedId === mesh.id ? "selected" : ""}`}
                  onClick={() => {
                    if (!renaming) selectMesh(mesh);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!renaming) selectMesh(mesh);
                    }
                  }}
                  aria-pressed={selectedId === mesh.id}
                  title={mesh.name}
                >
                  <div className="tg-mesh-card-art">
                    <PreviewIcon kind={mesh.kind} />
                  </div>
                  <span
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setRenameValue(mesh.name);
                      setRenamingId(mesh.id);
                    }}
                  >
                    {mesh.name}
                  </span>
                </button>
                {renaming && (
                  <input
                    className="tg-mesh-card-rename-input"
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename(mesh);
                    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenamingId(null); }
                    }}
                    onBlur={() => commitRename(mesh)}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="tg-library-footer">
          <output className="tg-library-selected" aria-label="Selected object" title={selectedMesh?.name}>{selectedMesh?.name || "Select an object, then choose an action"}</output>
          {selectedMesh && !eligibility.eligible && <p className="tg-library-guidance" role="status" data-scatter-feedback>{eligibility.message}</p>}
          <p className="tg-library-guidance">GLB uploads are session-only; Save World does not retain local files.</p>
          <details className="tg-placement-help"><summary>PLACEMENT CONTROLS</summary><p>Choose Place to enter the world. Escape / B returns here. Placed objects: R rotates; [ / ] changes scale.</p></details>
        </div>
        </div>
        <div hidden={mode !== "animation"} className="tg-object-animation-host"><AnimationActions /></div>
        {mode === "scatter" && (
          <div className="tg-mesh-scatter-panel tg-mesh-scatter-manager">
            <div className="tg-mesh-scatter-manager-title">SCATTER / POPULATIONS</div>
            <div className="tg-panel-actions tg-population-add">
              <label>LIBRARY OBJECT <select aria-label="Object to add to Scatter" value={worldTarget ? "" : selectedId ?? ""} onChange={event => { const mesh = meshes.find(entry => entry.id === event.target.value); if (mesh) selectMesh(mesh); }}>
                <option value="">Choose an object</option>
                {meshes.map(mesh => <option key={mesh.id} value={mesh.id} disabled={!scatterEligibility(mesh).eligible}>{mesh.name}{scatterEligibility(mesh).eligible ? "" : " (individual placement only)"}</option>)}
              </select></label>
              <button className="tg-ui-button" data-add-to-scatter="population" disabled={!eligibility.eligible} onClick={addToScatter}>ADD SELECTED TO SCATTER</button>
            </div>
            <div className="tg-mesh-scatter-manager-scroll">
              {scatterEntries().map(([profileId, profile]) => {
                const isDefault = profileId === "crimson-tree";
                const isEnabled = profile?.enabled !== false;
                const isSelected = selectedId === profileId;
                const isCanyonWall = profile?.geologyType === "canyon-wall" || profile?.modelType === "geology";
                return (
                  <div key={profileId} data-scatter-profile={profileId} className={`tg-scatter-population ${isSelected ? "selected" : ""} ${!isEnabled ? "disabled" : ""}`}>
                    <button type="button" className="tg-scatter-population-header" onClick={() => selectScatterPopulation(profileId)}>
                      <span>{profile?.name ?? profileId}</span>
                      <strong>{isDefault ? "DEFAULT" : "CUSTOM"}</strong>
                    </button>

                    {isEnabled && (
                      <>
                        {isCanyonWall ? (
                          <>
                            <label className="tg-mesh-scatter-slider">
                              <span>WIDTH <strong>{Number(profile?.width ?? 60)}</strong></span>
                              <input type="range" min="5" max="120" value={Number(profile?.width ?? 60)} onChange={(event) => updateScatterSetting(profileId, "width", event.target.value)} />
                            </label>
                            <label className="tg-mesh-scatter-slider">
                              <span>HEIGHT <strong>{Number(profile?.height ?? 30)}</strong></span>
                              <input type="range" min="2" max="80" value={Number(profile?.height ?? 30)} onChange={(event) => updateScatterSetting(profileId, "height", event.target.value)} />
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="tg-mesh-scatter-slider">
                              <span>DENSITY <strong>{Number(profile?.density ?? 50)}</strong></span>
                              <input type="range" min="0" max="100" value={Number(profile?.density ?? 50)} onChange={(event) => updateScatterSetting(profileId, "density", event.target.value)} />
                            </label>
                            <label className="tg-mesh-scatter-slider">
                              <span>COVERAGE <strong>{Number(profile?.coverage ?? 50)}</strong></span>
                              <input type="range" min="0" max="100" value={Number(profile?.coverage ?? 50)} onChange={(event) => updateScatterSetting(profileId, "coverage", event.target.value)} />
                            </label>
                          </>
                        )}
                        <button type="button" className="tg-mesh-scatter-remove" onClick={() => removeScatterPopulation(profileId)}>
                          REMOVE
                        </button>
                      </>
                    )}

                    {!isEnabled && (
                      <button type="button" className="tg-mesh-scatter-enable" onClick={() => enableScatterPopulation(profileId)}>ENABLE</button>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>, host)}

        {deleteCandidate && (
          <div className="tg-mesh-delete-backdrop" role="dialog" aria-modal="true">
            <div className="tg-mesh-delete-dialog">
              <div className="tg-side-panel-title">DELETE OBJECT</div>
              <p>ARE YOU SURE YOU WANT TO DELETE?</p>
              <strong>{deleteCandidate.name}</strong>
              <div className="tg-mesh-delete-actions">
                <button type="button" className="tg-mesh-cancel" onClick={() => setDeleteCandidate(null)}>CANCEL</button>
                <button type="button" className="tg-mesh-save" onClick={confirmDelete}>DELETE</button>
              </div>
            </div>
          </div>
        )}

        {editOpen && southVisible && selectedMesh && <MeshEditModal key={worldTarget?.id ?? selectedMesh.id} mesh={{ ...selectedMesh, editScope: worldTarget?.scope }} live={Boolean(worldTarget)}
          onChange={patch => editObjectTarget(worldTarget, patch)} onCancel={closeEditor}
          onSave={settings => {
            if (selectedMesh.file && !selectedMesh.modelPath) return;
            const updatedMesh = { ...selectedMesh, treeDefinition: settings.treeDefinition ?? selectedMesh.treeDefinition, editSettings: settings.fireflySettings ?? selectedMesh.editSettings };
            const savedObject = createSavedObject(updatedMesh, { id: selectedMesh.id + "-saved-" + Date.now() });
            setSavedMeshes(current => { const next = [savedObject, ...current]; localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next)); return next; });
            setSelectedId(savedObject.id); setEditOpen(false);
            window.dispatchEvent(new CustomEvent("tg-mesh-edit-save", { detail: { mesh: savedObject, settings } }));
          }} /> }

      </>
    )}
  </>
);
}
