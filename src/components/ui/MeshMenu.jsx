import { useEffect, useMemo, useRef, useState } from "react";
import "./MeshMenu.css";
const BUILTIN_MESHES = [
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

function MeshEditModal({ mesh, onSave, onCancel }) {
  const [trunkShape, setTrunkShape] = useState(50);
  const [trunkSize, setTrunkSize] = useState(50);
  const [leafShape, setLeafShape] = useState(50);
  const [leafSize, setLeafSize] = useState(50);

  return (
    <div className="tg-mesh-edit-backdrop" role="dialog" aria-modal="true" aria-label="Mesh editor">
      <div className="tg-mesh-edit-window">
        <div className="tg-mesh-edit-preview">
          <div className="tg-mesh-edit-preview-title">{mesh?.name || "MESH"}</div>
          <div className="tg-mesh-edit-placeholder">
            <PreviewIcon kind={mesh?.kind} />
          </div>
          <div className="tg-mesh-gizmo" aria-hidden="true">
            <span className="x" />
            <span className="y" />
            <span className="z" />
            <i />
          </div>
        </div>

        <div className="tg-mesh-edit-controls">
          {[
            ["TRUNK SHAPE", trunkShape, setTrunkShape],
            ["TRUNK SIZE", trunkSize, setTrunkSize],
            ["LEAF SHAPE", leafShape, setLeafShape],
            ["LEAF SIZE", leafSize, setLeafSize],
          ].map(([label, value, setter]) => (
            <label className="tg-mesh-edit-slider" key={label}>
              <span>{label}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(event) => setter(Number(event.target.value))}
              />
            </label>
          ))}

          <button type="button" className="tg-mesh-edit-action" onClick={() => window.dispatchEvent(new CustomEvent("tg-mesh-vertex-edit"))}>
            VERTEX EDIT
          </button>
          <button type="button" className="tg-mesh-edit-action" onClick={() => window.dispatchEvent(new CustomEvent("tg-mesh-randomize"))}>
            RANDOMIZE
          </button>
          <button type="button" className="tg-mesh-edit-action" onClick={() => window.dispatchEvent(new CustomEvent("tg-mesh-color-edit", { detail: { channel: "trunk" } }))}>
            TRUNK COLOR
          </button>
          <button type="button" className="tg-mesh-edit-action" onClick={() => window.dispatchEvent(new CustomEvent("tg-mesh-color-edit", { detail: { channel: "leaf" } }))}>
            LEAF COLOR
          </button>

          <div className="tg-mesh-edit-footer">
            <button type="button" className="tg-mesh-save" onClick={() => onSave({ trunkShape, trunkSize, leafShape, leafSize })}>
              SAVE
            </button>
            <button type="button" className="tg-mesh-cancel" onClick={onCancel}>
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
  const fileInputRef = useRef(null);

  const meshes = useMemo(() => [...uploadedMeshes, ...BUILTIN_MESHES], [uploadedMeshes]);
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
        window.dispatchEvent(
          new CustomEvent("tg-mesh-edit-save", {
            detail: { mesh: selectedMesh, settings },
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