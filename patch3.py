from pathlib import Path
p=Path('/mnt/data/tgwork')
f=p/'src/components/ui/MeshMenu.jsx'; s=f.read_text()
needle=' function editSelected() {'
if 'function requestDelete(mesh)' not in s:
    funcs=''' function requestDelete(mesh) {\n  if (!mesh || BUILTIN_OBJECTS.some((entry) => entry.id === mesh.id)) return;\n  setDeleteCandidate(mesh);\n}\n\nfunction confirmDelete() {\n  if (!deleteCandidate) return;\n  const id = deleteCandidate.id;\n  setUploadedMeshes((current) => current.filter((entry) => entry.id !== id));\n  setSavedMeshes((current) => {\n    const next = current.filter((entry) => entry.id !== id);\n    localStorage.setItem("testingGroundsSavedObjects", JSON.stringify(next));\n    return next;\n  });\n  setEditedMeshes((current) => { const next = { ...current }; delete next[id]; return next; });\n  useWorldStore.getState().removeScatterProfile(id);\n  if (selectedId === id) setSelectedId(BUILTIN_OBJECTS[0].id);\n  setDeleteCandidate(null);\n}\n\n'''
    s=s.replace(needle,funcs+needle)
# ensure state exists
if 'const [deleteCandidate, setDeleteCandidate]' not in s:
    s=s.replace('  const [renameValue, setRenameValue] = useState("");','  const [renameValue, setRenameValue] = useState("");\n  const [deleteCandidate, setDeleteCandidate] = useState(null);')
# add modal near end
if 'tg-mesh-delete-backdrop' not in s:
    marker='''      </div>\n\n        {editOpen && selectedMesh && ('''
    # put delete dialog after mesh menu close but before edit modal
    # easier insert before {editOpen
    s=s.replace('''        {editOpen && selectedMesh && (''','''        {deleteCandidate && (\n          <div className="tg-mesh-delete-backdrop" role="dialog" aria-modal="true">\n            <div className="tg-mesh-delete-dialog">\n              <div className="tg-side-panel-title">DELETE OBJECT</div>\n              <p>ARE YOU SURE YOU WANT TO DELETE?</p>\n              <strong>{deleteCandidate.name}</strong>\n              <div className="tg-mesh-delete-actions">\n                <button type="button" className="tg-mesh-cancel" onClick={() => setDeleteCandidate(null)}>CANCEL</button>\n                <button type="button" className="tg-mesh-save" onClick={confirmDelete}>DELETE</button>\n              </div>\n            </div>\n          </div>\n        )}\n\n        {editOpen && selectedMesh && (''')
f.write_text(s)

# fix tree direct edit mode persistence: stronger event capture guard + don't re-raycast away active target during gesture
f=p/'src/components/world/CrimsonTreeInteractionSystem.jsx'; s=f.read_text()
s=s.replace('''        event.preventDefault();\n        event.stopPropagation();\n        enter(target.treeId);''','''        event.preventDefault();\n        event.stopPropagation();\n        event.stopImmediatePropagation?.();\n        enter(target.treeId);''')
s=s.replace('''      event.preventDefault();\n      event.stopPropagation();\n    };''','''      event.preventDefault();\n      event.stopPropagation();\n      event.stopImmediatePropagation?.();\n    };''',1)
# Keep active tree target stable if pointer leaves tree during an edit gesture.
s=s.replace('''    if (useInteractionStore.getState().activeTool === "TREE" && result) {''','''    if (useInteractionStore.getState().activeTool === "TREE" && (result || targetRef.current?.treeId === activeTreeIdRef.current)) {''')
s=s.replace('''      updateRing(result);\n    } else if (ringVisibleRef.current) {''','''      updateRing(result ?? targetRef.current);\n    } else if (ringVisibleRef.current) {''')
f.write_text(s)

# shortcuts panel implementation using existing quick slots
f=p/'src/components/ui/QuickInteractionSlots.jsx'; s=f.read_text()
if 'quickToolsOpen' not in s:
    s=s.replace('import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";', 'import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";\nimport { useEditorStore } from "../../systems/editor/editorStore";')
    s=s.replace('  const activeTool = useInteractionStore((state) => state.activeTool);', '  const activeTool = useInteractionStore((state) => state.activeTool);\n  const shortcutsOpen = useEditorStore((state) => state.quickToolsOpen);')
    start=s.index('  return (', s.index('export default function QuickInteractionSlots'))
    # replace return section entirely
    s=s[:start]+'''  return (\n    <div className={`tg-quick-interaction-slots ${shortcutsOpen ? "open" : ""}`} aria-label="Shortcut tools">\n      <button type="button" className="tg-quick-shortcuts-toggle" onClick={() => useEditorStore.getState().toggleQuickTools()}>SHORTCUTS</button>\n      {shortcutsOpen && (\n        <div className="tg-quick-shortcut-grid">\n          {entries.map(([direction, arrow]) => {\n            const tool = quickSlots[direction];\n            const active = activeTool === (tool === "HEIGHT" ? "HEIGHT" : tool);\n            return (\n              <button key={direction} type="button" className={`tg-quick-interaction-slot ${active ? "active" : ""}`} style={{ "--tg-interaction-color": INTERACTION_COLOR }} onClick={() => useInteractionStore.getState().activateQuickSlot(direction)} title={`${arrow} ${LABELS[tool] ?? tool}`}>\n                <span className="tg-quick-interaction-arrow">{arrow}</span>\n                <span>{LABELS[tool] ?? tool}</span>\n              </button>\n            );\n          })}\n        </div>\n      )}\n    </div>\n  );\n}\n'''
    f.write_text(s)

# gamepad navigator
f=p/'src/components/ui/GamepadMenuNavigator.jsx'; s=f.read_text()
if 'useEditorStore' not in s:
    s=s.replace('import { useInteractionStore } from "../../systems/interaction/interactionStore";', 'import { useInteractionStore } from "../../systems/interaction/interactionStore";\nimport { useEditorStore } from "../../systems/editor/editorStore";')
if 'function toggleShortcutPanel()' not in s:
    s=s.replace('''function isWorldToolActive() {\n  const state = useInteractionStore.getState();\n  return Boolean(state.activeTool && state.activeMode);\n}''','''function isWorldToolActive() {\n  const state = useInteractionStore.getState();\n  return Boolean(state.activeTool && state.activeMode);\n}\n\nfunction toggleShortcutPanel() {\n  useEditorStore.getState().toggleQuickTools();\n}''')
old='''      if (edge(gamepad, 12)) menuOpen ? moveFocus("up") : activateQuickTool("up");\n      if (edge(gamepad, 13)) menuOpen ? moveFocus("down") : activateQuickTool("down");\n      if (edge(gamepad, 14)) menuOpen ? moveFocus("left") : activateQuickTool("left");\n      if (edge(gamepad, 15)) menuOpen ? moveFocus("right") : activateQuickTool("right");'''
if old in s:
    new='''      const shortcutsOpen = useEditorStore.getState().quickToolsOpen;\n      if (shortcutsOpen) {\n        if (edge(gamepad, 12)) activateQuickTool("up");\n        if (edge(gamepad, 13)) activateQuickTool("down");\n        if (edge(gamepad, 14)) activateQuickTool("left");\n        if (edge(gamepad, 15)) activateQuickTool("right");\n      } else {\n        if (edge(gamepad, 12)) moveFocus("up");\n        if (edge(gamepad, 13)) moveFocus("down");\n        if (edge(gamepad, 14)) moveFocus("left");\n        if (edge(gamepad, 15)) moveFocus("right");\n      }'''
    s=s.replace(old,new)
if 'edge(gamepad, 8)' not in s:
    s=s.replace('''      if (edge(gamepad, 1)) {\n        if (menuOpen) {\n          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));\n        } else {\n          useInteractionStore.getState().deactivate();\n        }\n      }''','''      if (edge(gamepad, 1)) {\n        if (menuOpen) {\n          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));\n        } else {\n          useInteractionStore.getState().deactivate();\n        }\n      }\n\n      if (edge(gamepad, 8)) useEditorStore.getState().open();\n      if (edge(gamepad, 9)) useEditorStore.getState().openDevToolsMenu();''')
# keyboard V effect before return
if 'event.code !== "KeyV"' not in s:
    s=s.replace('''  return null;\n}''','''  useEffect(() => {\n    function onKeyDown(event) {\n      if (event.code !== "KeyV" || event.repeat) return;\n      if (event.target?.closest?.("input, textarea, select")) return;\n      event.preventDefault();\n      toggleShortcutPanel();\n    }\n    window.addEventListener("keydown", onKeyDown);\n    return () => window.removeEventListener("keydown", onKeyDown);\n  }, []);\n\n  return null;\n}''')
f.write_text(s)

# world brush locking
f=p/'src/components/world/WorldInteractionSystem.jsx'; s=f.read_text()
if 'lockedBrushPointRef' not in s:
    s=s.replace('  const heightPointerLastYRef = useRef(null);','  const heightPointerLastYRef = useRef(null);\n  const lockedBrushPointRef = useRef(null);')
s=s.replace('''    const state = useInteractionStore.getState();\n    const point = findTerrainPoint(camera);\n    if (!point) return;''','''    const state = useInteractionStore.getState();\n    const point = lockedBrushPointRef.current ?? findTerrainPoint(camera);\n    if (!point) return;''',1)
s=s.replace('''        paintingRef.current = true;\n        heightPointerLastYRef.current = state.activeTool === "HEIGHT" ? event.clientY : null;''','''        paintingRef.current = true;\n        lockedBrushPointRef.current = findTerrainPoint(camera);\n        heightPointerLastYRef.current = state.activeTool === "HEIGHT" ? event.clientY : null;''')
s=s.replace('''      paintingRef.current = false;\n      heightPointerLastYRef.current = null;\n      lastRiverPointRef.current = null;''','''      paintingRef.current = false;\n      lockedBrushPointRef.current = null;\n      heightPointerLastYRef.current = null;\n      lastRiverPointRef.current = null;''')
s=s.replace('''    const point = findTerrainPoint(camera);\n    setBrushPoint((current) => {''','''    const point = paintingRef.current ? (lockedBrushPointRef.current ?? findTerrainPoint(camera)) : findTerrainPoint(camera);\n    setBrushPoint((current) => {''',1)
f.write_text(s)

# version
f=p/'package.json'; s=f.read_text().replace('"version": "1.6.02.02"','"version": "1.6.03.02"'); f.write_text(s)
