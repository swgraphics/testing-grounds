from pathlib import Path
p=Path('/mnt/data/tgwork')

# --- tree canopy: support authored canonical leaf vertices ---
f=p/'src/components/world/treeCanopy.js'
s=f.read_text()
s=s.replace('export function createProceduralCanopyGeometry(\n  canopyData = [],\n  {\n    gradientEnabled = false,\n    gradientColor = "#181818",\n    baseColor = "#080808",\n  } = {}\n)', 'export function createProceduralCanopyGeometry(\n  canopyData = [],\n  {\n    gradientEnabled = false,\n    gradientColor = "#181818",\n    baseColor = "#080808",\n    leafVertices = null,\n  } = {}\n)')
s=s.replace('  const basePositions =\n    leafGeometry\n      .getAttribute(\n        "position"\n      )\n      .array;', '  const defaultPositions =\n    leafGeometry\n      .getAttribute(\n        "position"\n      )\n      .array;\n\n  const basePositions = Array.isArray(leafVertices) && leafVertices.length === defaultPositions.length\n    ? leafVertices\n    : defaultPositions;')
f.write_text(s)

# --- CrimsonTreeModel: pass authored leaf vertices ---
f=p/'src/components/world/CrimsonTreeModel.jsx'
s=f.read_text()
s=s.replace('        baseColor:\n          generatorLeaves?.color ?? crownColor,\n      }\n    );', '        baseColor:\n          generatorLeaves?.color ?? crownColor,\n        leafVertices: generatorLeaves?.vertices ?? null,\n      }\n    );')
f.write_text(s)

# --- interaction indicator terminology ---
f=p/'src/components/ui/InteractionIndicator.jsx'
s=f.read_text()
s=s.replace('  const displayTool = isTreeInteraction ? "OBJECT" : tool;\n  const displayMode = isTreeInteraction ? "TREE" : mode;', '  const displayTool = isTreeInteraction ? "OBJECT" : tool;\n  const displayMode = isTreeInteraction ? "TREE" : mode;')
# Already outputs OBJECT // TREE; leave structure, add explicit aria-friendly branch not needed.
f.write_text(s)

# --- Tree interaction panel: all relevant branch controls + leaf editor entry ---
f=p/'src/components/ui/CrimsonTreeInteractionPanel.jsx'
s=f.read_text()
s=s.replace('  const [mode, setMode] = useState("trunk");', '  const [mode, setMode] = useState("trunk");\n  const [branchSettings, setBranchSettings] = useState({});')
s=s.replace('      setDefinition((current) => mergeTreeDefinition(current ?? {}, patch));', '      setDefinition((current) => mergeTreeDefinition(current ?? {}, patch));\n      if (patch.branches) setBranchSettings((current) => ({ ...current, ...patch.branches, secondary: { ...(current.secondary ?? {}), ...(patch.branches.secondary ?? {}) } }));', 1)
# Replace values and update function block
old='''  const branchTaper = Number(definition?.branches?.taper ?? 50);\n  const secondaryCount = Number(definition?.branches?.secondary?.count ?? 2);\n\n  function update(key, value) {\n    const patch = key === "branchTaper" ? { branches: { taper: Number(value) } } : key === "secondaryCount" ? { branches: { secondary: { count: Math.round(Number(value) / 12.5) } } } : { trunk: { [key]: Number(value) } };\n    setDefinition((current) => mergeTreeDefinition(current ?? {}, patch));\n    window.dispatchEvent(\n      new CustomEvent("crimson-tree-edit-change", {\n        detail: { treeId, patch },\n      })\n    );\n  }'''
new='''  const branch = definition?.branches ?? {};\n  const secondary = branch.secondary ?? {};\n  const branchFields = [\n    ["BRANCH COUNT", "count", branch.count ?? 50],\n    ["BRANCH ANGLE", "angle", branch.angle ?? 50],\n    ["BRANCH LENGTH", "length", branch.length ?? 50],\n    ["BRANCH THICKNESS", "thickness", branch.thickness ?? 50],\n    ["BRANCH FREQUENCY", "frequency", branch.frequency ?? 50],\n    ["BRANCH VERTICALITY", "verticality", branch.verticality ?? 50],\n    ["BRANCH RANDOMNESS", "randomness", branch.randomness ?? 50],\n    ["BRANCH TAPER", "taper", branch.taper ?? 50],\n    ["SECONDARY BRANCHES", "secondary.count", secondary.count ?? 50],\n    ["SECONDARY LENGTH", "secondary.length", secondary.length ?? 50],\n    ["SECONDARY THICKNESS", "secondary.thickness", secondary.thickness ?? 50],\n    ["SECONDARY RANDOMNESS", "secondary.randomness", secondary.randomness ?? 50],\n  ];\n\n  function update(key, value) {\n    const numeric = Number(value);\n    let patch;\n    if (key.startsWith("secondary.")) {\n      patch = { branches: { secondary: { [key.split(".")[1]]: numeric } } };\n    } else if (["height", "taper", "bend", "radius"].includes(key)) {\n      patch = { trunk: { [key]: numeric } };\n    } else {\n      patch = { branches: { [key]: numeric } };\n    }\n    setDefinition((current) => mergeTreeDefinition(current ?? {}, patch));\n    window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, patch } }));\n  }'''
if old not in s: raise SystemExit('tree panel update block not found')
s=s.replace(old,new)
s=s.replace('''      <div className="tg-tree-interaction-mode-row">\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "trunk" ? "active" : ""}`} onClick={() => { setMode("trunk"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "trunk" } })); }}>TRUNK</button>\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "branch" ? "active" : ""}`} onClick={() => { setMode("branch"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "branch" } })); }}>BRANCH</button>\n      </div>''','''      <div className="tg-tree-interaction-mode-row">\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "trunk" ? "active" : ""}`} onClick={() => { setMode("trunk"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "trunk" } })); }}>TRUNK</button>\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "branch" ? "active" : ""}`} onClick={() => { setMode("branch"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "branch" } })); }}>BRANCHES</button>\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "leaves" ? "active" : ""}`} onClick={() => { setMode("leaves"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "leaves" } })); }}>LEAVES</button>\n      </div>''')
# Replace branch control section + hint
s=s.replace('''      <div className="tg-tree-interaction-section">BRANCH CONTROL</div>\n      {slider("BRANCH TAPER", branchTaper, "branchTaper")}\n      {slider("SECONDARY BRANCHES", secondaryCount * 12.5, "secondaryCount")}\n\n      <div className="tg-tree-interaction-hint">{mode === "branch" ? "LOOK AT A BRANCH / CLICK + DRAG TO EXTRUDE" : "UP / DOWN = HEIGHT  ·  LEFT / RIGHT = BEND"}</div>''','''      {mode === "branch" && (\n        <>\n          <div className="tg-tree-interaction-section">BRANCH CONTROL</div>\n          {branchFields.map(([label, key, value]) => slider(label, Number(value), key))}\n          <div className="tg-tree-interaction-hint">LOOK AT TRUNK / CLICK TO ANCHOR / DRAG TO EXTRUDE / CLICK TO COMMIT</div>\n        </>\n      )}\n\n      {mode === "leaves" && (\n        <>\n          <div className="tg-tree-interaction-section">LEAF CONTROL</div>\n          {slider("LEAF SIZE", Number(definition?.leaves?.size ?? 50), "leafSize")}\n          {slider("LEAF DENSITY", Number(definition?.leaves?.density ?? 50), "leafDensity")}\n          <button type="button" className="tg-tree-interaction-mode" onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-leaf-vertex-open", { detail: { treeId, definition } }))}>LEAF VERTEX EDIT</button>\n        </>\n      )}\n\n      <div className="tg-tree-interaction-hint">{mode === "trunk" ? "UP / DOWN = HEIGHT  ·  LEFT / RIGHT = BEND" : mode === "leaves" ? "SELECT LEAF VERTEX EDIT FOR DIRECT SHAPE CONTROL" : "BRANCH MODE = DIRECT PROCEDURAL EXTRUSION"}</div>''')
f.write_text(s)

# --- MeshMenu: leaf vertex editor + delete + immediate place ---
f=p/'src/components/ui/MeshMenu.jsx'
s=f.read_text()
# Add leaf editor component before MeshEditModal
marker='function MeshEditModal({ mesh, onSave, onCancel }) {'
component=r'''function LeafVertexEditor({ vertices, onSave, onCancel }) {
  const defaultVertices = [
    [0.00, 0.00, 0.00], [0.42, 0.12, 0.00], [0.78, 0.38, 0.00], [0.48, 0.82, 0.00],
    [0.05, 1.00, 0.00], [-0.38, 0.72, 0.00], [-0.58, 0.28, 0.00], [-0.32, -0.08, 0.00],
  ];
  const [points, setPoints] = useState(() => {
    const source = Array.isArray(vertices) && vertices.length === 24 ? vertices : defaultVertices.flat();
    return Array.from({ length: 8 }, (_, i) => ({ x: Number(source[i * 3] ?? 0), y: Number(source[i * 3 + 1] ?? 0) }));
  });
  const [selected, setSelected] = useState(0);
  const dragRef = useRef(null);
  const view = { left: 18, top: 18, width: 364, height: 300 };
  const toScreen = (point) => ({ x: view.left + ((point.x + 0.7) / 1.5) * view.width, y: view.top + (1.1 - point.y) / 1.25 * view.height });
  const toWorld = (clientX, clientY, rect) => ({ x: ((clientX - rect.left - view.left) / view.width) * 1.5 - 0.7, y: 1.1 - ((clientY - rect.top - view.top) / view.height) * 1.25 });
  useEffect(() => {
    function move(event) {
      if (!dragRef.current) return;
      const rect = dragRef.current.rect;
      const next = toWorld(event.clientX, event.clientY, rect);
      setPoints((current) => current.map((point, index) => index === dragRef.current.index ? { ...point, x: next.x, y: next.y } : point));
    }
    function up() { dragRef.current = null; }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);
  const screenPoints = points.map(toScreen);
  const polygon = screenPoints.map((point) => `${point.x},${point.y}`).join(" ");
  function startDrag(index, event) {
    event.preventDefault(); event.stopPropagation();
    setSelected(index);
    dragRef.current = { index, rect: event.currentTarget.closest(".tg-leaf-editor-canvas").getBoundingClientRect() };
  }
  function save() {
    const flat = points.flatMap((point) => [Number(point.x.toFixed(4)), Number(point.y.toFixed(4)), 0]);
    onSave(flat);
  }
  return (
    <div className="tg-leaf-editor-backdrop" role="dialog" aria-modal="true" aria-label="Leaf Vertex Editor">
      <div className="tg-leaf-editor-window">
        <div className="tg-leaf-editor-header"><div><div className="tg-side-panel-title">LEAF VERTEX EDITOR</div><div className="tg-tree-interaction-subtitle">CANONICAL LEAF SHAPE</div></div><button type="button" className="tg-tree-interaction-close" onClick={onCancel}>×</button></div>
        <div className="tg-leaf-editor-canvas">
          <svg viewBox="0 0 400 336" width="100%" height="100%" role="img" aria-label="Editable leaf vertices">
            <defs><pattern id="tg-leaf-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1"/></pattern></defs>
            <rect x="0" y="0" width="400" height="336" fill="url(#tg-leaf-grid)" />
            <polygon points={polygon} fill="rgba(184,255,42,.78)" stroke="#2a8fff" strokeWidth="3" />
            {screenPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === selected ? 9 : 7} fill={index === selected ? "#ffffff" : "#2a8fff"} stroke="#111111" strokeWidth="2" onPointerDown={(event) => startDrag(index, event)} />)}
          </svg>
        </div>
        <div className="tg-leaf-editor-footer"><span>CLICK + DRAG VERTEX</span><strong>VERTEX {selected + 1}</strong><button type="button" className="tg-mesh-save" onClick={save}>SAVE</button><button type="button" className="tg-mesh-cancel" onClick={onCancel}>CANCEL</button></div>
      </div>
    </div>
  );
}

function MeshEditModal({ mesh, onSave, onCancel }) {'''
s=s.replace(marker,component)
# state leaf editor
s=s.replace('  const [directTreeEdit, setDirectTreeEdit] = useState(false);', '  const [directTreeEdit, setDirectTreeEdit] = useState(false);\n  const [leafVertexEditorOpen, setLeafVertexEditorOpen] = useState(false);\n  const [leafVertices, setLeafVertices] = useState(baseDefinition.leaves?.vertices ?? null);')
# include in treeDefinition leaves
s=s.replace('''  floating: {\n    ...baseDefinition.leaves?.floating,\n    enabled: true,\n    density: floatingLeafDensity,\n  },\n},''','''  floating: {\n    ...baseDefinition.leaves?.floating,\n    enabled: true,\n    density: floatingLeafDensity,\n  },\n  vertices: leafVertices,\n},''')
s=s.replace('    floatingLeafDensity,\n  ]);','    floatingLeafDensity,\n    leafVertices,\n  ]);')
# enable vertex edit button
s=s.replace('<button type="button" className="tg-mesh-edit-action" disabled>VERTEX EDIT</button>', '<button type="button" className="tg-mesh-edit-action" onClick={() => setLeafVertexEditorOpen(true)}>VERTEX EDIT</button>')
# render editor before closing MeshEditModal outer return: insert before final </div> nesting at exact footer area
needle='''          </div>\n        </div>\n      </div>\n    </div>\n  );\n}\n\nexport default function MeshMenu()'''
replacement='''          </div>\n        </div>\n      </div>\n      {leafVertexEditorOpen && (\n        <LeafVertexEditor\n          vertices={leafVertices}\n          onSave={(next) => { setLeafVertices(next); setLeafVertexEditorOpen(false); }}\n          onCancel={() => setLeafVertexEditorOpen(false)}\n        />\n      )}\n    </div>\n  );\n}\n\nexport default function MeshMenu()'''
if needle not in s: raise SystemExit('mesh modal footer needle not found')
s=s.replace(needle,replacement)
# MeshMenu delete confirmation state
s=s.replace('  const [renameValue, setRenameValue] = useState("");', '  const [renameValue, setRenameValue] = useState("");\n  const [deleteCandidate, setDeleteCandidate] = useState(null);')
# selectMesh always place
old='''  function selectMesh(mesh) {\n    const stayingInPlaceMode = useInteractionStore.getState().activeMode === "place" || mode === "place";\n    setSelectedId(mesh.id);\n    setMode(stayingInPlaceMode ? "place" : "select");\n    useInteractionStore.getState().activate({\n      target: `object:${mesh.id}`,\n      tool: "OBJECT",\n      mode: stayingInPlaceMode ? "PLACE" : "SELECT",\n    });\n    window.dispatchEvent(\n      new CustomEvent(stayingInPlaceMode ? "tg-mesh-place-request" : "tg-mesh-selection-changed", {\n        detail: { mesh },\n      })\n    );\n  }'''
new='''  function selectMesh(mesh) {\n    setSelectedId(mesh.id);\n    setMode("place");\n    setEditOpen(false);\n    useInteractionStore.getState().activate({ target: `object:${mesh.id}`, tool: "OBJECT", mode: "PLACE" });\n    window.dispatchEvent(new CustomEvent("tg-mesh-place-request", { detail: { mesh } }));\n  }'''
if old not in s: raise SystemExit('selectMesh block not found')
s=s.replace(old,new)
# add delete function before editSelected
needle=''' function editSelected() {'''
insert=''' function requestDelete(mesh) {\n  if (!mesh || BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id)) return;\n  setDeleteCandidate(mesh);\n}\n\nfunction confirmDelete() {\n  if (!deleteCandidate) return;\n  const id = deleteCandidate.id;\n  setUploadedMeshes((current) => current.filter((entry) => entry.id !== id));\n  setSavedMeshes((current) => {\n    const next = current.filter((entry) => entry.id !== id);\n    localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next));\n    return next;\n  });\n  setEditedMeshes((current) => { const next = { ...current }; delete next[id]; return next; });\n  useWorldStore.getState().removeScatterProfile(id);\n  if (selectedId === id) {\n    const fallback = meshes.find((entry) => entry.id !== id);\n    setSelectedId(fallback?.id ?? BUILTIN_OBJECTS[0].id);\n  }\n  setDeleteCandidate(null);\n}\n\n function editSelected() {'''
s=s.replace(needle,insert)
# card shell add x
old='''              <div key={mesh.id} className="tg-mesh-card-shell">\n                <button'''
new='''              <div key={mesh.id} className="tg-mesh-card-shell">\n                {!BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id) && (\n                  <button type="button" className="tg-mesh-card-delete" aria-label={`Delete ${mesh.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); requestDelete(mesh); }}>×</button>\n                )}\n                <button'''
s=s.replace(old,new)
# Add confirmation modal before closing fragment of MeshMenu
needle='''        )}\n\n      </>\n    )}\n  </>\n);'''
replacement='''        )}\n\n        {deleteCandidate && (\n          <div className="tg-mesh-delete-backdrop" role="dialog" aria-modal="true" aria-label="Delete object confirmation">\n            <div className="tg-mesh-delete-dialog">\n              <div className="tg-side-panel-title">DELETE OBJECT</div>\n              <p>ARE YOU SURE YOU WANT TO DELETE?</p>\n              <strong>{deleteCandidate.name}</strong>\n              <div className="tg-mesh-delete-actions"><button type="button" className="tg-mesh-cancel" onClick={() => setDeleteCandidate(null)}>CANCEL</button><button type="button" className="tg-mesh-save" onClick={confirmDelete}>DELETE</button></div>\n            </div>\n          </div>\n        )}\n      </>\n    )}\n  </>\n);'''
if needle not in s: raise SystemExit('delete modal needle not found')
s=s.replace(needle,replacement)
f.write_text(s)

# --- World brush locking ---
f=p/'src/components/world/WorldInteractionSystem.jsx'
s=f.read_text()
s=s.replace('  const heightPointerLastYRef = useRef(null);', '  const heightPointerLastYRef = useRef(null);\n  const lockedBrushPointRef = useRef(null);')
s=s.replace('''    const state = useInteractionStore.getState();\n    const point = findTerrainPoint(camera);\n    if (!point) return;''','''    const state = useInteractionStore.getState();\n    const point = lockedBrushPointRef.current ?? findTerrainPoint(camera);\n    if (!point) return;''',1)
s=s.replace('''        paintingRef.current = true;\n        heightPointerLastYRef.current = state.activeTool === "HEIGHT" ? event.clientY : null;''','''        paintingRef.current = true;\n        lockedBrushPointRef.current = findTerrainPoint(camera);\n        heightPointerLastYRef.current = state.activeTool === "HEIGHT" ? event.clientY : null;''')
s=s.replace('''    function onPointerUp() {\n      paintingRef.current = false;\n      heightPointerLastYRef.current = null;\n      lastRiverPointRef.current = null;\n    }''','''    function onPointerUp() {\n      paintingRef.current = false;\n      lockedBrushPointRef.current = null;\n      heightPointerLastYRef.current = null;\n      lastRiverPointRef.current = null;\n    }''')
# Brush visual uses locked point while active
old='''    const point = findTerrainPoint(camera);\n    setBrushPoint((current) => {'''
new='''    const point = paintingRef.current ? (lockedBrushPointRef.current ?? findTerrainPoint(camera)) : findTerrainPoint(camera);\n    setBrushPoint((current) => {'''
s=s.replace(old,new,1)
f.write_text(s)

# --- block stack levels update after placement ---
f=p/'src/components/world/MeshPlacementSystem.jsx'
s=f.read_text()
# Add helper after getStackedBlockPlacementY
needle='''  const loader = useMemo(() => new GLTFLoader(), []);'''
helper='''  function refreshBlockStackLevels(entries) {\n    const next = entries.map((entry) => ({ ...entry, mesh: entry.mesh ? { ...entry.mesh } : entry.mesh }));\n    const blockEntries = next.filter((entry) => entry.type === "procedural" && entry.mesh?.modelType === "building-block");\n    blockEntries.forEach((entry) => {\n      const baseY = getTerrainHeightAt(Number(entry.position?.x ?? 0), Number(entry.position?.z ?? 0));\n      const dimensions = getBlockDimensions(entry.mesh?.blockType);\n      const sameStack = blockEntries\n        .filter((candidate) => Math.abs((candidate.position?.x ?? 0) - (entry.position?.x ?? 0)) <= 0.05 && Math.abs((candidate.position?.z ?? 0) - (entry.position?.z ?? 0)) <= 0.05)\n        .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));\n      const index = sameStack.findIndex((candidate) => candidate.id === entry.id);\n      const level = index >= 0 ? index + 1 : 1;\n      entry.heightLevel = level;\n      entry.mesh.heightLevel = level;\n      useWorldStore.getState().updateObject(entry.id, { heightLevel: level, position: entry.position?.toArray?.() ?? [0, baseY, 0] });\n      // Keep the measured world position authoritative; only the stamp changes.\n      void dimensions;\n    });\n    return next;\n  }\n\n  const loader = useMemo(() => new GLTFLoader(), []);'''
s=s.replace(needle,helper)
# After procedural placement set, use functional update with refresh. Replace exact block
old='''  setPlacedMeshes((current) => [\n    ...current,\n    {\n      id: objectId,\n      type: "procedural",\n      mesh: proceduralMesh,\n      position: previewPosition.clone(),\n      rotationY: placementRotation,\n      scale: 1,\n      windPhase,\n      heightLevel: previewPosition.userData?.blockHeightLevel ?? 1,\n    },\n  ]);'''
new='''  setPlacedMeshes((current) => refreshBlockStackLevels([\n    ...current,\n    {\n      id: objectId,\n      type: "procedural",\n      mesh: proceduralMesh,\n      position: previewPosition.clone(),\n      rotationY: placementRotation,\n      scale: 1,\n      windPhase,\n      heightLevel: previewPosition.userData?.blockHeightLevel ?? 1,\n    },\n  ]));'''
if old not in s: raise SystemExit('block placement array not found')
s=s.replace(old,new)
f.write_text(s)

# --- shortcuts store: support objects and action resolution ---
f=p/'src/systems/interaction/interactionStore.js'
s=f.read_text()
s=s.replace('''  setQuickSlot(direction, toolId) {\n    if (!Object.prototype.hasOwnProperty.call(QUICK_TOOL_DEFAULTS, direction)) return;\n    set((state) => ({\n      quickSlots: {\n        ...state.quickSlots,\n        [direction]: toolId,\n      },\n    }));\n  },''','''  setQuickSlot(direction, toolId) {\n    if (!Object.prototype.hasOwnProperty.call(QUICK_TOOL_DEFAULTS, direction)) return;\n    set((state) => ({ quickSlots: { ...state.quickSlots, [direction]: toolId } }));\n  },''')
f.write_text(s)

# --- keyboard V shortcut panel + hold dpad up shortcut panel ---
f=p/'src/components/ui/GamepadMenuNavigator.jsx'
s=f.read_text()
# add editorStore import
s=s.replace('import { useInteractionStore } from "../../systems/interaction/interactionStore";', 'import { useInteractionStore } from "../../systems/interaction/interactionStore";\nimport { useEditorStore } from "../../systems/editor/editorStore";')
# modify menu-open helper by adding shortcut panel checks
s=s.replace('''function isMenuOpen() {\n  return Boolean(document.querySelector(\n    ".tg-interaction-panel, .tg-editor-view, .tg-side-panel.open, .tg-dev-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop"\n  ));\n}''','''function isMenuOpen() {\n  return Boolean(document.querySelector(\n    ".tg-interaction-panel, .tg-editor-view, .tg-side-panel.open, .tg-dev-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop"\n  ));\n}\n\nfunction toggleShortcutPanel() {\n  useEditorStore.getState().toggleQuickTools();\n  window.dispatchEvent(new CustomEvent("tg-shortcuts-toggle"));\n}''')
# replace dpad section and add keydown effect
old='''      if (edge(gamepad, 12)) menuOpen ? moveFocus("up") : activateQuickTool("up");\n      if (edge(gamepad, 13)) menuOpen ? moveFocus("down") : activateQuickTool("down");\n      if (edge(gamepad, 14)) menuOpen ? moveFocus("left") : activateQuickTool("left");\n      if (edge(gamepad, 15)) menuOpen ? moveFocus("right") : activateQuickTool("right");'''
new='''      const shortcutsOpen = useEditorStore.getState().quickToolsOpen;\n      if (shortcutsOpen) {\n        if (edge(gamepad, 12)) { activateQuickTool("up"); toggleShortcutPanel(); }\n        if (edge(gamepad, 13)) activateQuickTool("down");\n        if (edge(gamepad, 14)) activateQuickTool("left");\n        if (edge(gamepad, 15)) activateQuickTool("right");\n      } else {\n        if (edge(gamepad, 12)) moveFocus("up");\n        if (edge(gamepad, 13)) moveFocus("down");\n        if (edge(gamepad, 14)) moveFocus("left");\n        if (edge(gamepad, 15)) moveFocus("right");\n      }'''
if old not in s: raise SystemExit('gamepad dpad block not found')
s=s.replace(old,new)
# append keyboard effect before return null
s=s.replace('''  }, []);\n\n  return null;\n}''','''  }, []);\n\n  useEffect(() => {\n    function onKeyDown(event) {\n      if (event.code !== "KeyV" || event.repeat) return;\n      if (event.target?.closest?.("input, textarea, select")) return;\n      event.preventDefault();\n      toggleShortcutPanel();\n    }\n    window.addEventListener("keydown", onKeyDown);\n    return () => window.removeEventListener("keydown", onKeyDown);\n  }, []);\n\n  return null;\n}''')
f.write_text(s)

# --- quick slots visibility + shortcut button ---
f=p/'src/components/ui/QuickInteractionSlots.jsx'
s=f.read_text()
s=s.replace('import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";', 'import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";\nimport { useEditorStore } from "../../systems/editor/editorStore";')
s=s.replace('  const activeTool = useInteractionStore((state) => state.activeTool);', '  const activeTool = useInteractionStore((state) => state.activeTool);\n  const shortcutsOpen = useEditorStore((state) => state.quickToolsOpen);')
s=s.replace('''  return (\n    <div className="tg-quick-interaction-slots" aria-label="Quick interaction tools">''','''  return (\n    <div className="tg-quick-interaction-slots" aria-label="Quick interaction tools">\n      <button type="button" className="tg-quick-shortcuts-toggle" onClick={() => useEditorStore.getState().toggleQuickTools()}>SHORTCUTS</button>\n      {shortcutsOpen && (''')
s=s.replace('''      })}\n    </div>\n  );''','''      })}\n      )}\n    </div>\n  );''')
f.write_text(s)

# --- App button mappings VIEW->Editor, MENU->Dev Tools ---
f=p/'src/components/ui/GamepadMenuNavigator.jsx'
s=f.read_text()
# Add edge button behavior near A/B
old='''      if (edge(gamepad, 1)) {\n        if (menuOpen) {\n          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));\n        } else {\n          useInteractionStore.getState().deactivate();\n        }\n      }'''
new='''      if (edge(gamepad, 1)) {\n        if (menuOpen) {\n          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));\n        } else {\n          useInteractionStore.getState().deactivate();\n        }\n      }\n\n      // Standard Xbox mapping: VIEW = 8, MENU = 9.\n      if (edge(gamepad, 8)) useEditorStore.getState().open();\n      if (edge(gamepad, 9)) useEditorStore.getState().openDevToolsMenu();'''
if old not in s: raise SystemExit('AB block not found')
s=s.replace(old,new)
f.write_text(s)

# --- WASD responsiveness in FPV + crash tester turning stabilization ---
f=p/'src/components/character/PlayerController.jsx'
s=f.read_text()
s=s.replace('''  const activeCameraProfile = getCameraSettings(currentCharacterId);\nconst fpvMoveSpeed =\n  activeCameraProfile.fpvMoveSpeed ?? 15;''','''  const activeCameraProfile = getCameraSettings(currentCharacterId);\nconst fpvMoveSpeed =\n  activeCameraProfile.fpvMoveSpeed ?? 15;\nconst crashTesterMovement = currentCharacterId.startsWith("crashTester");''')
s=s.replace('''    accDeltaTime={\n      fpvMode\n        ? 35\n        : speedProfile.accDeltaTime\n    }\n    turnVelMultiplier={\n      speedProfile.turnVelMultiplier\n    }''','''    accDeltaTime={\n      fpvMode\n        ? 15\n        : speedProfile.accDeltaTime\n    }\n    turnVelMultiplier={\n      crashTesterMovement\n        ? 0.25\n        : speedProfile.turnVelMultiplier\n    }''')
f.write_text(s)

# --- patch notes/version ---
(p/'package.json').write_text((p/'package.json').read_text().replace('"version": "1.6.02.02"','"version": "1.6.03.02"'))
(p/'PATCH_NOTES_1.6.03.02.md').write_text('''# Testing Grounds 1.6.03.02\n\n## Focus\nTree interaction recovery, leaf vertex editing foundation, object library cleanup/place flow, terrain brush anchoring, shortcut invocation, Xbox navigation, block stack stamps, and FPV movement responsiveness.\n\n## Included\n- Tree HUD remains `OBJECT // TREE` while tree edit is active.\n- Full branch parameter controls exposed in Tree Interaction.\n- Leaf Vertex Editor opens as a dedicated modal window.\n- Canonical leaf vertices are stored in the procedural tree definition and drive generated canopy geometry.\n- Selecting an object immediately enters PLACE mode and begins preview.\n- Custom object cards have delete controls with confirmation.\n- Terrain brush target is locked for the duration of a sculpt gesture while the visual brush remains natural.\n- Block stack height stamps are recomputed for the full stack after placement.\n- SHORTCUTS can be toggled with V / the on-screen button; controller D-pad navigation is reserved for shortcuts while the shortcut panel is open.\n- Xbox VIEW opens Editor; MENU opens Dev Tools.\n- FPV movement acceleration is made more responsive; Crash Tester turn response is damped.\n\n## Not included yet\nThe full visual Compass radial hierarchy, Undo/Redo, generalized Scatter expansion, object rotation widget, block collision overhaul, and Canyon Edge Expansion remain subsequent passes.\n''')
