import { useEffect, useMemo, useRef, useState } from "react";
import CrimsonTreeModel from "../world/CrimsonTreeModel";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  createCrimsonTreeDefinition,
} from "../world/treeGenerator";
import "./MeshMenu.css";

const BUILTIN_MESHES = [
  {
    id: "crimson-tree",
    name: "CRIMSON TREE",
    kind: "tree",
    source: "procedural",
    modelType: "crimson-tree",
  },
  { id: "taiga-tree", name: "TAIGA TREE", kind: "tree" },
  { id: "palm-tree", name: "PALM TREE", kind: "tree" },
  { id: "leafy-fern", name: "LEAFY FERN", kind: "foliage" },
  { id: "stone-pillar", name: "STONE PILLAR", kind: "structure" },
  { id: "cave-dome", name: "CAVE DOME", kind: "structure" },
  { id: "castle-tower", name: "CASTLE TOWER", kind: "structure" },
];

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
    crownWidth,
    crownHeight,
    leafFillColor,
    leafOutlineColor,
    leafGradientEnabled,
    leafGradientColor,
    floatingLeafDensity,
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
    });
  };

  const isCrimsonTree =
    mesh?.id === "crimson-tree" ||
    mesh?.name === "CRIMSON TREE";

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

          {isCrimsonTree ? (
            <Canvas
              camera={{
                position: [9, 7, 12],
                fov: 35,
              }}
              dpr={[1, 1.5]}
              gl={{
                antialias: true,
                alpha: true,
              }}
            >
              <color
                attach="background"
                args={["#111111"]}
              />

              <ambientLight intensity={1.8} />

              <directionalLight
                position={[5, 10, 6]}
                intensity={3}
              />

              <directionalLight
                position={[-4, 5, -2]}
                intensity={1}
              />

              <group
                position={[0, -4.8, 0]}
                rotation={[
                  0,
                  THREE.MathUtils.degToRad(rotation),
                  0,
              ]}
              scale={resolvedScale}
>
  <CrimsonTreeModel
    treeDefinition={treeDefinition}
  />
</group>

              <gridHelper
                args={[
                  14,
                  14,
                  "#303030",
                  "#202020",
                ]}
                position={[0, -4.8, 0]}
              />
            </Canvas>
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

          <div className="tg-mesh-edit-section-label">
            TRUNK
          </div>

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
          <div className="tg-mesh-edit-divider" />

          <button
            type="button"
            className="tg-mesh-edit-action"
            disabled
          >
            VERTEX EDIT
          </button>

          <button
            type="button"
            className="tg-mesh-edit-action"
            disabled
          >
            RANDOMIZE
          </button>

          <div className="tg-mesh-edit-footer">
            <button
              type="button"
              className="tg-mesh-save"
              onClick={handleSave}
            >
              SAVE
            </button>

            <button
              type="button"
              className="tg-mesh-cancel"
              onClick={onCancel}
            >
              CANCEL
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function MeshMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("place");
  const [selectedId, setSelectedId] = useState(BUILTIN_MESHES[0].id);
  const [editOpen, setEditOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [uploadedMeshes, setUploadedMeshes] = useState([]);
  const [editedMeshes, setEditedMeshes] = useState({});
  const fileInputRef = useRef(null);

  const meshes = useMemo(
  () =>
    [
      ...uploadedMeshes,
      ...BUILTIN_MESHES,
    ].map((mesh) => {
      const edited = editedMeshes[mesh.id];

      return {
        ...mesh,
        editSettings:
          edited ??
          mesh.editSettings,

        treeDefinition:
          edited?.treeDefinition ??
          mesh.treeDefinition,
      };
    }),
  [uploadedMeshes, editedMeshes]
);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(meshes.length / pageSize));
  const visibleMeshes = meshes.slice(page * pageSize, page * pageSize + pageSize);
  const selectedMesh = meshes.find((mesh) => mesh.id === selectedId) || visibleMeshes[0];

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);
useEffect(() => {
  function handleMeshMenuOpen() {
    setMenuOpen(true);
    setEditOpen(false);
    setMode("edit");
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
  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const id = `upload-${Date.now()}`;
    const mesh = {
      id,
      name: file.name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 22),
      kind: "uploaded",
      file,
      status: "pending-import",
    };

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
    window.dispatchEvent(
      new CustomEvent("tg-mesh-selection-changed", {
        detail: { mesh },
      })
    );
  }

  function placeSelected() {
    if (!selectedMesh) return;
    setMode("place");
    window.dispatchEvent(
      new CustomEvent("tg-mesh-place-request", {
        detail: { mesh: selectedMesh },
      })
    );
  }

 function editSelected() {
  if (!selectedMesh) return;

  window.dispatchEvent(
    new CustomEvent("tg-mesh-cancel-placement")
  );

  setMode("edit");
  setEditOpen(true);

  window.dispatchEvent(
    new CustomEvent("tg-mesh-edit-request", {
      detail: { mesh: selectedMesh },
    })
  );
}

function closeMenu() {
  setEditOpen(false);
  setMenuOpen(false);

  window.dispatchEvent(
    new CustomEvent("tg-mesh-menu-close")
  );

  window.dispatchEvent(
    new CustomEvent("tg-mesh-cancel-placement")
  );
}

function addToScatter() {
  if (!selectedMesh) return;

  window.dispatchEvent(
    new CustomEvent("tg-mesh-cancel-placement")
  );

  window.dispatchEvent(
    new CustomEvent("tg-mesh-scatter-request", {
      detail: { mesh: selectedMesh },
    })
  );
}

  return (
  <>
    {menuOpen && (
      <>
        <div
          className="tg-mesh-mode-label"
          aria-hidden="true"
        >
          <strong>
            ADD NEW MESH//{mode === "edit" ? "EDIT MODE" : "PLACEMODE"}
          </strong>
        </div>

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
          <button type="button" className={mode === "place" ? "active" : ""} onClick={placeSelected}>
            PLACE
          </button>
          <button type="button" className={mode === "edit" ? "active" : ""} onClick={editSelected}>
            EDIT
          </button>
          <button type="button" onClick={addToScatter}>
            ADD TO SCATTER
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj,.fbx"
            hidden
            onChange={handleUpload}
          />
        </div>

        <div className="tg-mesh-library">
          {visibleMeshes.map((mesh) => (
            <button
              key={mesh.id}
              type="button"
              className={`tg-mesh-card ${selectedId === mesh.id ? "selected" : ""}`}
              onClick={() => selectMesh(mesh)}
              title={mesh.name}
            >
              <div className="tg-mesh-card-art">
                <PreviewIcon kind={mesh.kind} />
              </div>
              <span>{mesh.name}</span>
            </button>
          ))}
        </div>

        {meshes.length > pageSize && (
          <button
            type="button"
            className="tg-mesh-next"
            aria-label="Next mesh page"
            onClick={() => setPage((current) => (current + 1) % pageCount)}
          >
            ›
          </button>
        )}
      </div>

        {editOpen && selectedMesh && (
    <MeshEditModal
      mesh={selectedMesh}
    onSave={(settings) => {
  const updatedMesh = {
    ...selectedMesh,
    editSettings: settings,
    treeDefinition: settings.treeDefinition,
  };

  setEditedMeshes((current) => ({
    ...current,
    [selectedMesh.id]: settings,
  }));

  window.dispatchEvent(
    new CustomEvent("tg-mesh-edit-save", {
      detail: {
        mesh: updatedMesh,
        settings,
        treeDefinition: settings.treeDefinition,
      },
    })
  );

  setEditOpen(false);
}}
      onCancel={() => setEditOpen(false)}
    />
  )}

      </>
    )}
  </>
);
}