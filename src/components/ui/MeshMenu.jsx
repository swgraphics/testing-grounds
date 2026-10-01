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
      <div className="tg-tree-editor-mode-hint">{editMode === "branch" ? "BRANCH // CLICK + DRAG OUTWARD" : "TRUNK // CLICK + DRAG UP / DOWN"}</div>
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

function MeshEditModal({ mesh, onSave, onCancel }) {
  const baseDefinition = useMemo(
    () =>
      mesh?.treeDefinition ??
      createCrimsonTreeDefinition(),
    [mesh?.treeDefinition]
  );

  const [trunkHeight, setTrunkHeight] = useState(
    Number(baseDefinition.trunk?.height ?? 50)
  );

  const [trunkWidth, setTrunkWidth] = useState(
    Number(baseDefinition.trunk?.radius ?? 50)
  );

  const [trunkTaper, setTrunkTaper] = useState(
    Number(baseDefinition.trunk?.taper ?? 50)
  );

  const [trunkBend, setTrunkBend] = useState(
    Number(baseDefinition.trunk?.bend ?? 50)
  );
  const [crownWidth, setCrownWidth] = useState(
    Number(baseDefinition.leaves?.size ?? 50)
  );

  const [crownHeight, setCrownHeight] = useState(
    Number(baseDefinition.leaves?.clustering ?? 50)
  );

  const [leafFillColor, setLeafFillColor] = useState(
    baseDefinition.leaves?.color ?? "#080808"
  );

  const [leafOutlineColor, setLeafOutlineColor] = useState(
  baseDefinition.leaves?.outlineColor ?? "#fc0303"
  );

  const [leafGradientEnabled, setLeafGradientEnabled] = useState(
  baseDefinition.leaves?.gradientEnabled ?? false
  );

  const [leafGradientColor, setLeafGradientColor] = useState(
  baseDefinition.leaves?.gradientColor ?? "#181818"
  );
  
  const [floatingLeafDensity, setFloatingLeafDensity] = useState(
  Number(baseDefinition.leaves?.floating?.density ?? 15)
  );

  const [rotation, setRotation] = useState(
    Number(mesh?.transform?.rotation ?? 0)
    );

  const [scale, setScale] = useState(
    Number(mesh?.transform?.scale ?? 50)
  );
  const [directTreeEdit, setDirectTreeEdit] = useState(false);
  const [leafVertexEditorOpen, setLeafVertexEditorOpen] = useState(false);
  const [leafVertices, setLeafVertices] = useState(baseDefinition.leaves?.vertices ?? null);
  const [treeEditMode, setTreeEditMode] = useState("trunk");
  const [branchTaper, setBranchTaper] = useState(Number(baseDefinition.branches?.taper ?? 50));
  const [secondaryBranchCount, setSecondaryBranchCount] = useState(Number(baseDefinition.branches?.secondary?.count ?? 2));
  const [customBranches, setCustomBranches] = useState(baseDefinition.branches?.custom ?? []);

  const [fireflyDensity, setFireflyDensity] = useState(Number(mesh?.editSettings?.density ?? 40));
  const [fireflySpeed, setFireflySpeed] = useState(Number(mesh?.editSettings?.speed ?? 30));
  const [fireflyFlicker, setFireflyFlicker] = useState(Number(mesh?.editSettings?.flicker ?? 65));
  const [fireflyColor, setFireflyColor] = useState(mesh?.editSettings?.color ?? "#d9ff8a");
  const [branchCount, setBranchCount] = useState(
    Number(baseDefinition.branches?.count ?? 50)
  );

  const [branchAngle, setBranchAngle] = useState(
    Number(baseDefinition.branches?.angle ?? 50)
  );

  const [branchLength, setBranchLength] = useState(
    Number(baseDefinition.branches?.length ?? 50)
  );

  const [branchThickness, setBranchThickness] = useState(
    Number(baseDefinition.branches?.thickness ?? 50)
  );

  const [branchFrequency, setBranchFrequency] = useState(
    Number(baseDefinition.branches?.frequency ?? 50)
  );

  const [branchVerticality, setBranchVerticality] = useState(
    Number(baseDefinition.branches?.verticality ?? 50)
  );

  const [branchRandomness, setBranchRandomness] = useState(
    Number(baseDefinition.branches?.randomness ?? 50)
  );

  const treeDefinition = useMemo(() => {
    return {
      ...baseDefinition,

      trunk: {
  ...baseDefinition.trunk,
  height: trunkHeight,
  radius: trunkWidth,
  taper: trunkTaper,
  bend: trunkBend,
},

      branches: {
        ...baseDefinition.branches,
        count: branchCount,
        angle: branchAngle,
        length: branchLength,
        thickness: branchThickness,
        frequency: branchFrequency,
        verticality: branchVerticality,
        randomness: branchRandomness,
        taper: branchTaper,
        secondary: { ...(baseDefinition.branches?.secondary ?? {}), count: secondaryBranchCount },
        custom: customBranches,
      },

      leaves: {
  ...baseDefinition.leaves,
  size: crownWidth,
  clustering: crownHeight,
  color: leafFillColor,
  outlineColor: leafOutlineColor,
  gradientEnabled: leafGradientEnabled,
  gradientColor: leafGradientColor,

  floating: {
    ...baseDefinition.leaves?.floating,
    enabled: true,
    density: floatingLeafDensity,
  },
  vertices: leafVertices,
},
    };
  }, [
    baseDefinition,
    trunkHeight,
    trunkWidth,
    trunkTaper,
    trunkBend,
    branchCount,
    branchAngle,
    branchLength,
    branchThickness,
    branchFrequency,
    branchVerticality,
    branchRandomness,
    branchTaper,
    secondaryBranchCount,
    customBranches,
    crownWidth,
    crownHeight,
    leafFillColor,
    leafOutlineColor,
    leafGradientEnabled,
    leafGradientColor,
    floatingLeafDensity,
    leafVertices,
  ]);
  
  const resolvedScale =
    0.65 +
    (scale / 100) * 0.70;
  
  const handleSave = () => {
    onSave({
      treeDefinition,
      transform: {
        rotation,
        scale: resolvedScale,
      },
      fireflySettings: isFireflies ? {
        density: fireflyDensity,
        speed: fireflySpeed,
        flicker: fireflyFlicker,
        color: fireflyColor,
      } : undefined,
    });
  };

  const isCrimsonTree =
    mesh?.id === "crimson-tree" ||
    mesh?.name === "CRIMSON TREE";
  const isFireflies = mesh?.modelType === "fireflies" || mesh?.id === "fireflies";

  const renderSlider = (
    label,
    value,
    setter
  ) => (
    <label
      className="tg-mesh-edit-slider"
      key={label}
    >
      <span>
        {label}
        <strong>{value}%</strong>
      </span>

      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) =>
          setter(
            Number(event.target.value)
          )
        }
      />
    </label>
  );

  return (
    <div
      className="tg-mesh-edit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Mesh editor"
    >
      <div className="tg-mesh-edit-window">

        <div className="tg-mesh-edit-preview">
          <div className="tg-mesh-edit-preview-title">
            {mesh?.name || "MESH"}
          </div>

          {isFireflies ? (
            <div className="tg-mesh-edit-placeholder tg-firefly-edit-preview">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={index}
                  className="tg-firefly-preview-dot"
                  style={{
                    left: `${12 + ((index * 37) % 76)}%`,
                    top: `${16 + ((index * 53) % 68)}%`,
                    animationDelay: `${(index % 7) * -0.28}s`,
                    animationDuration: `${Math.max(0.35, 2.8 - fireflySpeed * 0.018)}s`,
                    opacity: `${0.2 + fireflyFlicker * 0.008}`,
                    background: fireflyColor,
                    boxShadow: `0 0 8px 2px ${fireflyColor}aa`,
                    transform: `scale(${0.65 + fireflyDensity / 180})`,
                  }}
                />
              ))}
              <strong>FIREFLY FIELD</strong>
            </div>
          ) : isCrimsonTree ? (
            directTreeEdit ? (
              <TreeEditorPreview
                treeDefinition={treeDefinition}
                rotation={rotation}
                scale={resolvedScale}
                onHeightChange={setTrunkHeight}
                onBendChange={setTrunkBend}
                editMode={treeEditMode}
                onBranchCreate={(point, dx, dy) => {
                  if (!point) return;
                  const local = point.clone();
                  const angle = Math.atan2(-dy, dx);
                  const direction = new THREE.Vector3(Math.cos(angle), 0.16, Math.sin(angle)).normalize();
                  const next = [...customBranches];
                  const index = next.length;
                  next.push({
                    trunkT: THREE.MathUtils.clamp(local.y / 8.5, 0.05, 0.95),
                    origin: [local.x, local.y, local.z],
                    direction: [direction.x, direction.y, direction.z],
                    length: THREE.MathUtils.clamp(1.4 + Math.hypot(dx, dy) * 0.02, 0.6, 5.5),
                  });
                  setCustomBranches(next);
                }}
              />
            ) : (
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
                  scale={resolvedScale}
                >
                  <CrimsonTreeModel treeDefinition={treeDefinition} />
                </group>
                <gridHelper args={[14, 14, "#303030", "#202020"]} position={[0, -4.8, 0]} />
              </Canvas>
            )
          ) : (
            <div className="tg-mesh-edit-placeholder">
              <PreviewIcon
                kind={mesh?.kind}
              />
            </div>
          )}

          <div
            className="tg-mesh-gizmo"
            aria-hidden="true"
          >
            <span className="x" />
            <span className="y" />
            <span className="z" />
            <i />
          </div>
        </div>

        <div className="tg-mesh-edit-controls">

          {isFireflies ? (
            <>
              <div className="tg-mesh-edit-section-label">FIREFLIES</div>
              {renderSlider("DENSITY", fireflyDensity, setFireflyDensity)}
              {renderSlider("SPEED", fireflySpeed, setFireflySpeed)}
              {renderSlider("FLICKER", fireflyFlicker, setFireflyFlicker)}
              <label className="tg-mesh-edit-slider">
                <span>COLOR<strong>{fireflyColor}</strong></span>
                <input type="color" value={fireflyColor} onChange={(event) => setFireflyColor(event.target.value)} />
              </label>
            </>
          ) : (
          <>
          <div className="tg-mesh-edit-section-label">
            TREE EDIT MODE
          </div>
          <div className="tg-mesh-edit-mode-row">
            <button type="button" className={`tg-mesh-edit-action ${treeEditMode === "trunk" ? "active" : ""}`} onClick={() => setTreeEditMode("trunk")}>TRUNK</button>
            <button type="button" className={`tg-mesh-edit-action ${treeEditMode === "branch" ? "active" : ""}`} onClick={() => setTreeEditMode("branch")}>BRANCH</button>
          </div>

          <div className="tg-mesh-edit-section-label">
            TRUNK
          </div>

          <button
            type="button"
            className={`tg-mesh-edit-action ${directTreeEdit ? "active" : ""}`}
            onClick={() => setDirectTreeEdit((current) => !current)}
          >
            {directTreeEdit ? "EXIT TREE EDIT" : "DIRECT TREE EDIT"}
          </button>

          {renderSlider(
            "TRUNK HEIGHT",
            trunkHeight,
            setTrunkHeight
          )}
          
          {renderSlider(
            "TRUNK TAPER",
            trunkTaper,
            setTrunkTaper
          )}

          {renderSlider(
            "TRUNK BEND",
            trunkBend,
            setTrunkBend
          )}
          
          {renderSlider(
            "TRUNK WIDTH",
            trunkWidth,
            setTrunkWidth
          )}

          <div className="tg-mesh-edit-section-label">
            BRANCHES
          </div>

          {renderSlider(
            "BRANCH COUNT",
            branchCount,
            setBranchCount
          )}

          {renderSlider(
            "BRANCH ANGLE",
            branchAngle,
            setBranchAngle
          )}

          {renderSlider(
            "BRANCH LENGTH",
            branchLength,
            setBranchLength
          )}

          {renderSlider(
            "BRANCH THICKNESS",
            branchThickness,
            setBranchThickness
          )}

          {renderSlider(
            "BRANCH FREQUENCY",
            branchFrequency,
            setBranchFrequency
          )}

          {renderSlider(
            "BRANCH VERTICALITY",
            branchVerticality,
            setBranchVerticality
          )}

          {renderSlider(
            "BRANCH RANDOMNESS",
            branchRandomness,
            setBranchRandomness
          )}

          {renderSlider("BRANCH TAPER", branchTaper, setBranchTaper)}
          {renderSlider("SECONDARY BRANCHES", secondaryBranchCount * 12.5, (value) => setSecondaryBranchCount(Math.round(Number(value) / 12.5)))}

          <div className="tg-mesh-edit-section-label">
            CANOPY
          </div>

          {renderSlider(
            "CROWN WIDTH",
            crownWidth,
            setCrownWidth
          )}

          {renderSlider(
            "CROWN HEIGHT",
            crownHeight,
            setCrownHeight
          )}
          
          {renderSlider(
            "FLOATING LEAF DENSITY",
            floatingLeafDensity,
            setFloatingLeafDensity
          )}

<label className="tg-mesh-edit-slider">
  <span>
    LEAF FILL COLOR
    <strong>{leafFillColor}</strong>
  </span>

  <input
    type="color"
    value={leafFillColor}
    onChange={(event) =>
      setLeafFillColor(event.target.value)
    }
  />
</label>
<label className="tg-mesh-edit-slider">
  <span>
    LEAF OUTLINE COLOR
    <strong>{leafOutlineColor}</strong>
  </span>

  <input
    type="color"
    value={leafOutlineColor}
    onChange={(event) =>
      setLeafOutlineColor(event.target.value)
    }
  />
</label>
<label className="tg-mesh-edit-slider">
  <span>
    FOLIAGE GRADIENT
    <strong>
      {leafGradientEnabled ? "ON" : "OFF"}
    </strong>
  </span>

  <input
    type="checkbox"
    checked={leafGradientEnabled}
    onChange={(event) =>
      setLeafGradientEnabled(
        event.target.checked
      )
    }
  />
</label>

{leafGradientEnabled && (
  <label className="tg-mesh-edit-slider">
    <span>
      GRADIENT COLOR
      <strong>{leafGradientColor}</strong>
    </span>

    <input
      type="color"
      value={leafGradientColor}
      onChange={(event) =>
        setLeafGradientColor(
          event.target.value
        )
      }
    />
  </label>
)}
<label className="tg-mesh-edit-slider">
  <span>
    ROTATION
    <strong>{rotation}°</strong>
  </span>

  <input
    type="range"
    min="0"
    max="360"
    value={rotation}
    onChange={(event) =>
      setRotation(
        Number(event.target.value)
      )
    }
  />
</label>

<label className="tg-mesh-edit-slider">
  <span>
    SCALE
    <strong>{scale}%</strong>
  </span>

  <input
    type="range"
    min="0"
    max="100"
    value={scale}
    onChange={(event) =>
      setScale(
        Number(event.target.value)
      )
    }
  />
</label>
          </>
          )}

          <div className="tg-mesh-edit-divider" />
          <button type="button" className="tg-mesh-edit-action" onClick={() => setLeafVertexEditorOpen(true)}>VERTEX EDIT</button>
          <button type="button" className="tg-mesh-edit-action" disabled>RANDOMIZE</button>
          <div className="tg-mesh-edit-footer">
            <button type="button" className="tg-mesh-save" onClick={handleSave}>SAVE</button>
            <button type="button" className="tg-mesh-cancel" onClick={onCancel}>CANCEL</button>
          </div>

        </div>
      </div>
      {leafVertexEditorOpen && (
        <LeafVertexEditor vertices={leafVertices} onSave={(next) => { setLeafVertices(next); setLeafVertexEditorOpen(false); }} onCancel={() => setLeafVertexEditorOpen(false)} />
      )}
    </div>
  );
}

export default function MeshMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("place");
  const [selectedId, setSelectedId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [uploadedMeshes, setUploadedMeshes] = useState([]);
  const [editedMeshes, setEditedMeshes] = useState({});
  const [savedMeshes, setSavedMeshes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("testingGroundsSavedObjects") || "[]"); } catch { return []; }
  });
  const fileInputRef = useRef(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const meshes = useMemo(
  () =>
    [
      ...savedMeshes,
      ...uploadedMeshes,
      ...BUILTIN_OBJECTS,
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
  [uploadedMeshes, editedMeshes, savedMeshes]
);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(meshes.length / pageSize));
  const visibleMeshes = meshes.slice(page * pageSize, page * pageSize + pageSize);
  const selectedMesh = meshes.find((mesh) => mesh.id === selectedId) || null;
  const scatterProfiles = useWorldStore((state) => state.world.scatterProfiles ?? {});
  const scatterProfile = useWorldStore(
    (state) => selectedMesh?.id ? state.world.scatterProfiles?.[selectedMesh.id] : null
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);
useEffect(() => {
  function handleMeshMenuOpen() {
    setMenuOpen(true);
    setEditOpen(false);
    setMode("select");
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
      setMenuOpen(true);
      setEditOpen(false);
      setMode("select");
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

    const id = `upload-${Date.now()}`;
    const mesh = createUploadedObject(file, id);

    setUploadedMeshes((current) => [mesh, ...current]);
    setSelectedId(id);
    setMode("place");

    window.dispatchEvent(
      new CustomEvent("tg-mesh-upload-request", {
        detail: { file, meshId: id },
      })
    );

    event.target.value = "";
  }

  function selectMesh(mesh) {
    setSelectedId(mesh.id);
    setMode("place");
    setEditOpen(false);
    useInteractionStore.getState().activate({ target: `object:${mesh.id}`, tool: "OBJECT", mode: "PLACE" });
    window.dispatchEvent(new CustomEvent("tg-mesh-place-request", { detail: { mesh } }));
  }

  function placeSelected() {
    if (!selectedMesh) return;
    if (mode === "place") {
      useInteractionStore.getState().clear();
      window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
      setMode("select");
      return;
    }
    setMode("place");
    setEditOpen(false);
    setMenuOpen(true);
    useInteractionStore.getState().activate({
      target: `object:${selectedMesh.id}`,
      tool: "OBJECT",
      mode: "PLACE",
    });
    window.dispatchEvent(
      new CustomEvent("tg-mesh-place-request", {
        detail: { mesh: selectedMesh },
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

  window.dispatchEvent(
    new CustomEvent("tg-mesh-cancel-placement")
  );

  useInteractionStore.getState().activate({
    target: `object:${selectedMesh.id}`,
    tool: "OBJECT",
    mode: "EDIT",
  });

  setMode("edit");
  setEditOpen(true);

  window.dispatchEvent(
    new CustomEvent("tg-mesh-edit-request", {
      detail: { mesh: selectedMesh },
    })
  );
}

function closeMenu() {
  useInteractionStore.getState().clear();

  // Placement cancellation intentionally happens first because the mesh menu
  // listens for that event and normally reopens itself after placement exits.
  // The explicit close state comes last so the X button always wins.
  window.dispatchEvent(
    new CustomEvent("tg-mesh-cancel-placement")
  );
  window.dispatchEvent(
    new CustomEvent("tg-mesh-menu-close")
  );

  setEditOpen(false);
  setMenuOpen(false);
}

function getDefaultCrimsonProfile() {
  const current = useWorldStore.getState().world.scatterProfiles?.["crimson-tree"];
  return {
    enabled: current?.enabled !== false,
    objectId: "crimson-tree",
    name: "CRIMSON TREE",
    kind: "tree",
    source: "procedural",
    modelType: "crimson-tree",
    treeDefinition: current?.treeDefinition ?? createCrimsonTreeDefinition(),
    density: Number(current?.density ?? 25),
    coverage: Number(current?.coverage ?? 50),
    scaleVariation: Number(current?.scaleVariation ?? 25),
    rotationVariation: Number(current?.rotationVariation ?? 100),
    clustering: Number(current?.clustering ?? 35),
  };
}

  function addToScatter() {
    if (!selectedMesh) return;

    useInteractionStore.getState().activate({
      target: `object:${selectedMesh.id}`,
      tool: "SCATTER",
      mode: "EDIT",
    });

    window.dispatchEvent(
      new CustomEvent("tg-mesh-cancel-placement")
    );

    const worldStore = useWorldStore.getState();
    worldStore.upsertScatterProfile(selectedMesh.id, {
      enabled: true,
      objectId: selectedMesh.id,
      name: selectedMesh.name,
      kind: selectedMesh.kind,
      source: selectedMesh.source,
      modelPath: selectedMesh.modelPath,
      modelType: selectedMesh.modelType,
      geologyType: selectedMesh.geologyType,
      treeDefinition: selectedMesh.treeDefinition ?? (selectedMesh.modelType === "crimson-tree" ? createCrimsonTreeDefinition() : undefined),
      density: Number(scatterProfile?.density ?? 50),
      coverage: Number(scatterProfile?.coverage ?? 50),
      width: Number(scatterProfile?.width ?? (selectedMesh.geologyType === "canyon-wall" ? 60 : 36)),
      height: Number(scatterProfile?.height ?? (selectedMesh.geologyType === "canyon-wall" ? 30 : 12)),
      scaleVariation: Number(scatterProfile?.scaleVariation ?? 25),
      rotationVariation: Number(scatterProfile?.rotationVariation ?? 100),
      clustering: Number(scatterProfile?.clustering ?? 35),
    });

    setMode("scatter");

    window.dispatchEvent(
      new CustomEvent("tg-mesh-scatter-request", {
        detail: { mesh: selectedMesh },
      })
    );
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
    setSelectedId(profileId);
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
      .filter(([id, profile]) => id !== "crimson-tree" && profile?.enabled)
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
        useInteractionStore.getState().clear();
        window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
        return;
      }

      closeMenu();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editOpen, menuOpen]);

  return (
  <>
    {menuOpen && (
      <>
        <div className="tg-mesh-menu">

    <button
      type="button"
      className="tg-mesh-menu-close"
      aria-label="Close mesh menu"
      onClick={closeMenu}
    >
      ×
    </button>

        <div className="tg-mesh-menu-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            UPLOAD MESH
          </button>
          <button type="button" className={`tg-mesh-place-button ${mode === "place" && selectedMesh ? "active" : ""}`} disabled={!selectedMesh} onClick={placeSelected}>
            PLACE
          </button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={editSelected}>
            EDIT
          </button>
          <button type="button" className={mode === "scatter" ? "active" : ""} onClick={scatterProfile?.enabled ? () => setMode("scatter") : addToScatter}>
            {scatterProfile?.enabled ? "SCATTER" : "ADD TO SCATTER"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj,.fbx"
            hidden
            onChange={handleUpload}
          />
        </div>

        {mode === "scatter" && (
          <div className="tg-mesh-scatter-panel tg-mesh-scatter-manager">
            <div className="tg-mesh-scatter-manager-title">SCATTER</div>
            <div className="tg-mesh-scatter-manager-scroll">
              {scatterEntries().map(([profileId, profile]) => {
                const isDefault = profileId === "crimson-tree";
                const isEnabled = profile?.enabled !== false;
                const isSelected = selectedId === profileId;
                const isCanyonWall = profile?.geologyType === "canyon-wall" || profile?.modelType === "geology";
                return (
                  <div key={profileId} className={`tg-scatter-population ${isSelected ? "selected" : ""} ${!isEnabled ? "disabled" : ""}`}>
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
            {selectedMesh && !scatterProfiles[selectedMesh.id]?.enabled && selectedMesh.id !== "crimson-tree" && (
              <button type="button" className="tg-mesh-scatter-add-selected" onClick={addToScatter}>ADD SELECTED TO SCATTER</button>
            )}
          </div>
        )}

        <div className="tg-mesh-library-label">QUATERNIUS STYLIZED NATURE + TG BUILT-INS</div>

        <div className="tg-mesh-library">
          {visibleMeshes.map((mesh) => {
            const renaming = renamingId === mesh.id;
            return (
              <div key={mesh.id} className="tg-mesh-card-shell">
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
                      if (event.key === "Escape") setRenamingId(null);
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

        {meshes.length > pageSize && (
          <div className="tg-mesh-pagination">
            <button
              type="button"
              className="tg-mesh-prev"
              aria-label="Previous mesh page"
              onClick={() => setPage((current) => (current - 1 + pageCount) % pageCount)}
            >
              ‹
            </button>
            <span>{page + 1} / {pageCount}</span>
            <button
              type="button"
              className="tg-mesh-next"
              aria-label="Next mesh page"
              onClick={() => setPage((current) => (current + 1) % pageCount)}
            >
              ›
            </button>
          </div>
        )}
      </div>

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

        {editOpen && selectedMesh && (
    <MeshEditModal
      mesh={selectedMesh}
    onSave={(settings) => {
  const updatedMesh = {
    ...selectedMesh,
    editSettings: settings.fireflySettings ?? selectedMesh.editSettings ?? settings,
    treeDefinition: settings.treeDefinition ?? selectedMesh.treeDefinition,
  };

  setEditedMeshes((current) => ({
    ...current,
    [selectedMesh.id]: settings.fireflySettings ?? settings,
  }));

  const savedObject = createSavedObject(updatedMesh, {
    id: `${selectedMesh.id}-saved-${Date.now()}`,
  });

  setSavedMeshes((current) => {
    const next = [savedObject, ...current.filter((entry) => entry.id !== savedObject.id)];
    localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next));
    return next;
  });

  window.dispatchEvent(
    new CustomEvent("tg-mesh-edit-save", {
      detail: {
        mesh: { ...updatedMesh, savedObject },
        settings,
        treeDefinition: settings.treeDefinition,
      },
    })
  );

  setEditOpen(false);
}}
      onCancel={() => {
        setEditOpen(false);
        useInteractionStore.getState().clear();
      }}
    />
  )}

      </>
    )}
  </>
);
}