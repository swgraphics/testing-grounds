from pathlib import Path
p=Path('/mnt/data/tgwork')
f=p/'src/components/ui/MeshMenu.jsx'; s=f.read_text()
# insert component
marker='function MeshEditModal({ mesh, onSave, onCancel }) {'
if 'function LeafVertexEditor(' not in s:
    comp=r'''function LeafVertexEditor({ vertices, onSave, onCancel }) {
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

function MeshEditModal({ mesh, onSave, onCancel }) {'''
    s=s.replace(marker,comp)
# states
s=s.replace('  const [directTreeEdit, setDirectTreeEdit] = useState(false);','  const [directTreeEdit, setDirectTreeEdit] = useState(false);\n  const [leafVertexEditorOpen, setLeafVertexEditorOpen] = useState(false);\n  const [leafVertices, setLeafVertices] = useState(baseDefinition.leaves?.vertices ?? null);')
s=s.replace('''    enabled: true,\n    density: floatingLeafDensity,\n  },\n},''','''    enabled: true,\n    density: floatingLeafDensity,\n  },\n  vertices: leafVertices,\n},''')
s=s.replace('    floatingLeafDensity,\n  ]);','    floatingLeafDensity,\n    leafVertices,\n  ]);')
s=s.replace('<button type="button" className="tg-mesh-edit-action" disabled>VERTEX EDIT</button>','<button type="button" className="tg-mesh-edit-action" onClick={() => setLeafVertexEditorOpen(true)}>VERTEX EDIT</button>')
# inject editor after modal main closing but before component return
needle='''        </div>\n      </div>\n    </div>\n  );\n}\n\nexport default function MeshMenu()'''
if needle in s and 'leafVertexEditorOpen &&' not in s:
    s=s.replace(needle,'''        </div>\n      </div>\n      {leafVertexEditorOpen && (\n        <LeafVertexEditor vertices={leafVertices} onSave={(next) => { setLeafVertices(next); setLeafVertexEditorOpen(false); }} onCancel={() => setLeafVertexEditorOpen(false)} />\n      )}\n    </div>\n  );\n}\n\nexport default function MeshMenu()''')
# menu state
s=s.replace('  const [renameValue, setRenameValue] = useState("");','  const [renameValue, setRenameValue] = useState("");\n  const [deleteCandidate, setDeleteCandidate] = useState(null);')
# select always place
start=s.index('  function selectMesh(mesh) {')
end=s.index('\n  function placeSelected()',start)
s=s[:start]+'''  function selectMesh(mesh) {\n    setSelectedId(mesh.id);\n    setMode("place");\n    setEditOpen(false);\n    useInteractionStore.getState().activate({ target: `object:${mesh.id}`, tool: "OBJECT", mode: "PLACE" });\n    window.dispatchEvent(new CustomEvent("tg-mesh-place-request", { detail: { mesh } }));\n  }\n'''+s[end:]
# delete funcs
needle='  function editSelected() {'
if 'function requestDelete(mesh)' not in s:
    funcs='''  function requestDelete(mesh) {\n    if (!mesh || BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id)) return;\n    setDeleteCandidate(mesh);\n  }\n\n  function confirmDelete() {\n    if (!deleteCandidate) return;\n    const id = deleteCandidate.id;\n    setUploadedMeshes((current) => current.filter((entry) => entry.id !== id));\n    setSavedMeshes((current) => {\n      const next = current.filter((entry) => entry.id !== id);\n      localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next));\n      return next;\n    });\n    setEditedMeshes((current) => { const next = { ...current }; delete next[id]; return next; });\n    useWorldStore.getState().removeScatterProfile(id);\n    if (selectedId === id) setSelectedId(BUILTIN_OBJECTS[0].id);\n    setDeleteCandidate(null);\n  }\n\n'''
    s=s.replace(needle,funcs+needle)
# card x
s=s.replace('''              <div key={mesh.id} className="tg-mesh-card-shell">\n                <button''','''              <div key={mesh.id} className="tg-mesh-card-shell">\n                {!BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id) && (\n                  <button type="button" className="tg-mesh-card-delete" aria-label={`Delete ${mesh.name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); requestDelete(mesh); }}>×</button>\n                )}\n                <button''')
# confirmation before fragment end
needle='''        )}\n\n      </>\n    )}\n  </>\n);'''
if needle in s and 'tg-mesh-delete-backdrop' not in s:
    s=s.replace(needle,'''        )}\n\n        {deleteCandidate && (\n          <div className="tg-mesh-delete-backdrop" role="dialog" aria-modal="true">\n            <div className="tg-mesh-delete-dialog">\n              <div className="tg-side-panel-title">DELETE OBJECT</div>\n              <p>ARE YOU SURE YOU WANT TO DELETE?</p>\n              <strong>{deleteCandidate.name}</strong>\n              <div className="tg-mesh-delete-actions"><button type="button" className="tg-mesh-cancel" onClick={() => setDeleteCandidate(null)}>CANCEL</button><button type="button" className="tg-mesh-save" onClick={confirmDelete}>DELETE</button></div>\n            </div>\n          </div>\n        )}\n      </>\n    )}\n  </>\n);''')
f.write_text(s)

# CSS append
f=p/'src/components/ui/MeshMenu.css'; s=f.read_text(); s += r'''

.tg-mesh-card-delete { position:absolute; top:5px; right:5px; z-index:4; width:22px; height:22px; border:1px solid rgba(205,38,38,.75); background:rgba(5,6,8,.92); color:rgba(232,238,245,.7); font-family:var(--tg-font-display); font-size:18px; line-height:18px; padding:0; cursor:pointer; }
.tg-mesh-card-delete:hover { color:var(--tg-white); background:var(--tg-crimson); }
.tg-mesh-delete-backdrop, .tg-leaf-editor-backdrop { position:fixed; inset:0; z-index:400; display:grid; place-items:center; background:rgba(0,0,0,.58); backdrop-filter:blur(5px); }
.tg-mesh-delete-dialog { width:min(420px,90vw); padding:22px; background:rgba(8,10,14,.98); border:1px solid rgba(205,38,38,.75); box-shadow:0 0 28px rgba(0,0,0,.55); color:var(--tg-white); font-family:var(--tg-font-display); text-transform:uppercase; }
.tg-mesh-delete-dialog p { margin:18px 0 8px; letter-spacing:.08em; }
.tg-mesh-delete-dialog strong { color:var(--tg-white); letter-spacing:.08em; }
.tg-mesh-delete-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:22px; }
.tg-leaf-editor-window { width:min(560px,92vw); background:rgba(8,10,14,.98); border:1px solid rgba(205,38,38,.72); box-shadow:0 0 30px rgba(0,0,0,.55); padding:14px; color:var(--tg-white); }
.tg-leaf-editor-canvas { width:100%; aspect-ratio:1; background:#111; border:1px solid rgba(205,38,38,.45); margin-top:10px; }
.tg-leaf-editor-footer { display:flex; align-items:center; gap:12px; padding-top:12px; font-family:var(--tg-font-display); font-size:13px; letter-spacing:.06em; }
.tg-leaf-editor-footer span { color:rgba(232,238,245,.6); flex:1; }
.tg-leaf-editor-footer strong { color:var(--tg-white); }
'''; f.write_text(s)
