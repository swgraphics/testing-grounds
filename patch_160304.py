from pathlib import Path

root=Path('/mnt/data/tg160304/src')

# 1) Interaction store: generic shortcut assignment workflow.
p=root/'systems/interaction/interactionStore.js'
s=p.read_text()
s=s.replace('export const QUICK_TOOL_DEFAULTS = Object.freeze({\n  up: "HEIGHT",\n  down: "SMOOTH",\n  left: "SMOOTH",\n  right: "RIVER",\n});', '''export const QUICK_TOOL_DEFAULTS = Object.freeze({
  up: { id: "HEIGHT", label: "TERRAIN HEIGHT", target: "terrain", tool: "HEIGHT", mode: INTERACTION_MODES.SCULPT },
  down: { id: "SMOOTH", label: "SMOOTH TERRAIN", target: "terrain", tool: "SMOOTH", mode: INTERACTION_MODES.SCULPT },
  left: { id: "SMOOTH", label: "SMOOTH TERRAIN", target: "terrain", tool: "SMOOTH", mode: INTERACTION_MODES.SCULPT },
  right: { id: "RIVER", label: "DRAW RIVER", target: "water", tool: "RIVER", mode: INTERACTION_MODES.GRAB },
});''')
s=s.replace('  quickSlots: { ...QUICK_TOOL_DEFAULTS },\n};', '  quickSlots: { ...QUICK_TOOL_DEFAULTS },\n  shortcutAssignmentDirection: null,\n};')
# Replace activate and activateQuickSlot and setQuickSlot methods.
old='''  activate({ target = null, tool = null, mode = null }) {
    set({
      activeTarget: target,
      activeTool: tool,
      activeMode: mode,
    });
  },

  activateQuickSlot(direction) {
    set((state) => {
      const toolId = state.quickSlots[direction];
      const definition = QUICK_TOOL_MAP[toolId];
      if (!definition) return state;
      return {
        activeTarget: definition.target,
        activeTool: definition.tool,
        activeMode: definition.mode,
      };
    });
  },

  setQuickSlot(direction, toolId) {
    if (!Object.prototype.hasOwnProperty.call(QUICK_TOOL_DEFAULTS, direction)) return;
    set((state) => ({
      quickSlots: {
        ...state.quickSlots,
        [direction]: toolId,
      },
    }));
  },'''
new='''  activate({ target = null, tool = null, mode = null }) {
    set((state) => {
      const assignmentDirection = state.shortcutAssignmentDirection;
      if (assignmentDirection && tool) {
        return {
          activeTarget: target,
          activeTool: tool,
          activeMode: mode,
          quickSlots: {
            ...state.quickSlots,
            [assignmentDirection]: {
              id: tool,
              label: String(tool).replaceAll("_", " "),
              target,
              tool,
              mode,
            },
          },
          shortcutAssignmentDirection: null,
        };
      }
      return { activeTarget: target, activeTool: tool, activeMode: mode };
    });
  },

  activateQuickSlot(direction) {
    set((state) => {
      const raw = state.quickSlots[direction];
      const definition = typeof raw === "string" ? QUICK_TOOL_MAP[raw] : raw;
      if (!definition?.tool) return state;
      return {
        activeTarget: definition.target ?? null,
        activeTool: definition.tool,
        activeMode: definition.mode ?? null,
      };
    });
  },

  setShortcutAssignmentDirection(direction) {
    if (!Object.prototype.hasOwnProperty.call(QUICK_TOOL_DEFAULTS, direction)) return;
    set({ shortcutAssignmentDirection: direction });
  },

  clearShortcutAssignment() {
    set({ shortcutAssignmentDirection: null });
  },

  setQuickSlot(direction, action) {
    if (!Object.prototype.hasOwnProperty.call(QUICK_TOOL_DEFAULTS, direction)) return;
    set((state) => ({ quickSlots: { ...state.quickSlots, [direction]: action }, shortcutAssignmentDirection: null }));
  },'''
if old not in s: raise SystemExit('interactionStore block not found')
s=s.replace(old,new)
p.write_text(s)

# 2) Quick shortcut panel: assignment-first workflow + centered button.
p=root/'components/ui/QuickInteractionSlots.jsx'
p.write_text('''import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";
import { useEditorStore } from "../../systems/editor/editorStore";

const entries = [
  ["up", "↑"],
  ["left", "←"],
  ["right", "→"],
  ["down", "↓"],
];

function labelFor(action) {
  if (!action) return "EMPTY";
  if (typeof action === "string") return action.replaceAll("_", " ");
  return action.label || action.id || action.tool || "EMPTY";
}

export default function QuickInteractionSlots() {
  const quickSlots = useInteractionStore((state) => state.quickSlots);
  const activeTool = useInteractionStore((state) => state.activeTool);
  const assignmentDirection = useInteractionStore((state) => state.shortcutAssignmentDirection);
  const shortcutsOpen = useEditorStore((state) => state.quickToolsOpen);

  function arm(direction) {
    useInteractionStore.getState().setShortcutAssignmentDirection(direction);
  }

  return (
    <div className={`tg-quick-interaction-slots ${shortcutsOpen ? "open" : ""}`} aria-label="Shortcut tools">
      <button type="button" className="tg-quick-shortcuts-toggle" onClick={() => useEditorStore.getState().toggleQuickTools()}>SHORTCUTS</button>
      {shortcutsOpen && (
        <div className="tg-quick-shortcut-panel">
          <button type="button" className="tg-quick-add-shortcut" onClick={() => arm(assignmentDirection ?? "up")}>ADD TO SHORTCUT</button>
          <div className="tg-quick-shortcut-grid">
            {entries.map(([direction, arrow]) => {
              const raw = quickSlots[direction];
              const action = typeof raw === "string" ? { id: raw, label: raw.replaceAll("_", " "), tool: raw } : raw;
              const active = action?.tool === activeTool;
              const armed = assignmentDirection === direction;
              return (
                <button
                  key={direction}
                  type="button"
                  className={`tg-quick-interaction-slot ${active ? "active" : ""} ${armed ? "assignment-active" : ""}`}
                  style={{ "--tg-interaction-color": INTERACTION_COLOR }}
                  onClick={() => arm(direction)}
                  title={`${arrow} ${labelFor(action)}${armed ? " — SELECT A FUNCTION TO ASSIGN" : ""}`}
                >
                  <span className="tg-quick-interaction-arrow">{arrow}</span>
                  <span>{labelFor(action)}</span>
                </button>
              );
            })}
          </div>
          {assignmentDirection && <div className="tg-quick-assignment-hint">{assignmentDirection.toUpperCase()} SELECTED · NOW CHOOSE A FUNCTION</div>}
        </div>
      )}
    </div>
  );
}
''')

# 3) Shortcut panel styles: centered bottom, one active blue state, assignment controls.
p=root/'../styles/brand.css'
s=p.read_text()
start=s.find('/* 1.6.03.02 — shortcuts stay hidden until explicitly opened. */')
end=s.find('.tg-tree-interaction-mode-row{grid-template-columns:repeat(3', start)
if start!=-1 and end!=-1:
    replacement='''/* 1.6.03.04 — SHORTCUTS is a temporary centered bottom HUD. */
.tg-quick-interaction-slots{position:fixed;left:50%;right:auto;top:auto;bottom:18px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:7px;z-index:260}
.tg-quick-shortcuts-toggle{min-height:30px;padding:5px 14px;border:1px solid rgba(205,38,38,.65);background:rgba(5,6,8,.88);color:var(--tg-white);font-family:var(--tg-font-display);font-size:10px;letter-spacing:.08em;cursor:pointer}
.tg-quick-shortcuts-toggle:hover{border-color:var(--tg-crimson);background:rgba(129,16,18,.22)}
.tg-quick-shortcut-panel{display:flex;flex-direction:column;align-items:center;gap:6px;padding:7px;background:rgba(5,6,8,.9);border:1px solid rgba(232,238,245,.16)}
.tg-quick-add-shortcut{min-height:27px;padding:4px 10px;border:1px solid rgba(205,38,38,.58);background:rgba(5,6,8,.82);color:var(--tg-white);font-family:var(--tg-font-display);font-size:9px;letter-spacing:.08em;cursor:pointer}
.tg-quick-shortcut-grid{display:grid;grid-template-columns:repeat(4,minmax(96px,1fr));gap:5px}
.tg-quick-interaction-slot{min-height:42px;border:1px solid rgba(232,238,245,.22);background:rgba(8,10,14,.88);color:var(--tg-white);font-family:var(--tg-font-display);font-size:9px;letter-spacing:.06em;cursor:pointer}
.tg-quick-interaction-slot:hover{border-color:rgba(232,238,245,.5)}
.tg-quick-interaction-slot.active,.tg-quick-interaction-slot.assignment-active{border-color:var(--tg-interaction-color);background:rgba(42,143,255,.18);box-shadow:0 0 12px rgba(42,143,255,.24)}
.tg-quick-interaction-arrow{display:block;font-size:16px;line-height:1;margin-bottom:2px}
.tg-quick-assignment-hint{font-family:var(--tg-font-display);font-size:8px;letter-spacing:.08em;color:rgba(232,238,245,.62)}
@media(max-width:900px){.tg-quick-shortcut-grid{grid-template-columns:repeat(2,minmax(96px,1fr))}}
@media(max-width:620px){.tg-quick-interaction-slots{bottom:112px}.tg-quick-shortcut-grid{grid-template-columns:repeat(2,minmax(82px,1fr))}}
'''
    s=s[:start]+replacement+s[end:]
else:
    raise SystemExit('shortcut css block not found')
p.write_text(s)

# 4) Mesh menu: no object selected until user selects one; Place state color; selected object enters Place.
p=root/'components/ui/MeshMenu.jsx'
s=p.read_text()
s=s.replace('  const [selectedId, setSelectedId] = useState(BUILTIN_OBJECTS[0].id);','  const [selectedId, setSelectedId] = useState(null);')
s=s.replace('  const selectedMesh = meshes.find((mesh) => mesh.id === selectedId) || visibleMeshes[0];','  const selectedMesh = meshes.find((mesh) => mesh.id === selectedId) || null;')
s=s.replace('      <button type="button" className={mode === "place" ? "active" : ""} onClick={placeSelected}>\n            PLACE\n          </button>', '      <button type="button" className={`tg-mesh-place-button ${mode === "place" && selectedMesh ? "active" : ""}`} disabled={!selectedMesh} onClick={placeSelected}>\n            PLACE\n          </button>')
p.write_text(s)

# 5) Mesh menu CSS for Place button blue active / dark disabled.
p=root/'components/ui/MeshMenu.css'
s=p.read_text()
insert='''\n.tg-mesh-menu-actions .tg-mesh-place-button:disabled{opacity:.72;border-color:rgba(232,238,245,.14);background:rgba(5,6,8,.72);color:rgba(232,238,245,.42);cursor:not-allowed;box-shadow:none}\n.tg-mesh-menu-actions .tg-mesh-place-button.active{border-color:#2a8fff;background:rgba(42,143,255,.18);box-shadow:0 0 14px rgba(42,143,255,.24);color:var(--tg-white)}\n'''
pos=s.find('/* =======================================================\n   Left Action Column')
s=s[:pos]+insert+s[pos:]
p.write_text(s)

# 6) Dynamic block stack labels: derive current level from actual stack rather than stale placement metadata.
p=root/'components/world/MeshPlacementSystem.jsx'
s=p.read_text()
s=s.replace('function ProceduralObject({ mesh, crownRef, windPhase = 0, treeId = null }) {\n  if (mesh?.modelType === "building-block") {\n    return <BuildingBlock type={mesh.blockType} heightLevel={mesh.heightLevel ?? 1} />;', 'function ProceduralObject({ mesh, crownRef, windPhase = 0, treeId = null, heightLevelOverride = null }) {\n  if (mesh?.modelType === "building-block") {\n    return <BuildingBlock type={mesh.blockType} heightLevel={heightLevelOverride ?? mesh.heightLevel ?? 1} />;')
needle='  const frameCounterRef = useRef(0);\n'
replacement=needle+'''  const blockHeightLevels = useMemo(() => {
    const levels = new Map();
    const blocks = placedMeshes.filter((entry) => entry.type === "procedural" && entry.mesh?.modelType === "building-block");
    blocks.forEach((entry) => {
      const sameStack = blocks
        .filter((candidate) =>
          Math.abs((candidate.position?.x ?? 0) - (entry.position?.x ?? 0)) <= 0.08 &&
          Math.abs((candidate.position?.z ?? 0) - (entry.position?.z ?? 0)) <= 0.08
        )
        .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));
      levels.set(entry.id, sameStack.findIndex((candidate) => candidate.id === entry.id) + 1);
    });
    return levels;
  }, [placedMeshes]);
'''
if needle not in s: raise SystemExit('frame ref not found')
s=s.replace(needle,replacement,1)
old='''      <ProceduralObject
        mesh={entry.mesh}
        crownRef={{'''
new='''      <ProceduralObject
        mesh={entry.mesh}
        heightLevelOverride={entry.mesh?.modelType === "building-block" ? (blockHeightLevels.get(entry.id) ?? 1) : null}
        crownRef={{'''
s=s.replace(old,new,1)
p.write_text(s)

# 7) Functional Leaf Vertex Editor: live geometry, presets, controller movement, B/Esc commit, Cancel revert.
p=root/'components/ui/LeafVertexEditorWindow.jsx'
p.write_text('''import { useEffect, useRef, useState } from "react";
import "./LeafVertexEditorWindow.css";

const DEFAULT_VERTICES = [
  0,0,0, .42,.12,0, .78,.38,0, .48,.82,0,
  .05,1,0, -.38,.72,0, -.58,.28,0, -.32,-.08,0,
];

const LEAF_PRESETS = {
  OAK: [
    0,0,0, .34,.18,0, .58,.06,0, .46,.48,0,
    .16,.96,0, -.18,.58,0, -.62,.82,0, -.42,.24,0,
  ],
  MAPLE: [
    0,0,0, .30,.12,0, .18,.52,0, .54,.72,0,
    .04,1,0, -.34,.64,0, -.18,.34,0, -.56,.72,0,
  ],
  BIRCH: [
    0,0,0, .22,.10,0, .34,.42,0, .26,.76,0,
    .04,1.12,0, -.20,.78,0, -.30,.38,0, -.20,.10,0,
  ],
};

function cloneVertices(vertices) {
  return Array.isArray(vertices) && vertices.length === 24 ? [...vertices] : [...DEFAULT_VERTICES];
}

export default function LeafVertexEditorWindow() {
  const [open, setOpen] = useState(false);
  const [treeId, setTreeId] = useState(null);
  const [points, setPoints] = useState(DEFAULT_VERTICES);
  const originalRef = useRef(DEFAULT_VERTICES);
  const [selected, setSelected] = useState(0);
  const [drag, setDrag] = useState(null);
  const previousBRef = useRef(false);

  function emitVertices(vertices) {
    if (!treeId) return;
    window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", {
      detail: { treeId, patch: { leaves: { vertices: [...vertices] } } },
    }));
  }

  useEffect(() => {
    function handleOpen(event) {
      const definition = event.detail?.definition;
      const vertices = cloneVertices(definition?.leaves?.vertices);
      setTreeId(event.detail?.treeId ?? null);
      originalRef.current = [...vertices];
      setPoints(vertices);
      setSelected(0);
      setDrag(null);
      setOpen(true);
    }
    window.addEventListener("crimson-tree-leaf-vertex-open", handleOpen);
    return () => window.removeEventListener("crimson-tree-leaf-vertex-open", handleOpen);
  }, []);

  function commitAndClose() {
    emitVertices(points);
    setOpen(false);
    setDrag(null);
  }

  function cancelAndRevert() {
    const original = [...originalRef.current];
    setPoints(original);
    emitVertices(original);
    setOpen(false);
    setDrag(null);
  }

  useEffect(() => {
    if (!open) return undefined;
    function keydown(event) {
      if (event.target?.closest?.("input, textarea, select")) return;
      if (event.code === "Escape" || event.code === "KeyB") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        commitAndClose();
      }
    }
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, [open, points, treeId]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(() => {
      const gamepad = navigator.getGamepads?.().find((entry) => entry?.connected);
      if (!gamepad) return;
      const bPressed = Boolean(gamepad.buttons?.[1]?.pressed);
      if (bPressed && !previousBRef.current) {
        commitAndClose();
        previousBRef.current = bPressed;
        return;
      }
      previousBRef.current = bPressed;
      const x = Number(gamepad.axes?.[0] ?? 0);
      const y = Number(gamepad.axes?.[1] ?? 0);
      if (Math.abs(x) < 0.16 && Math.abs(y) < 0.16) return;
      setPoints((current) => {
        const next = [...current];
        next[selected * 3] = Number((next[selected * 3] + x * 0.025).toFixed(4));
        next[selected * 3 + 1] = Number((next[selected * 3 + 1] - y * 0.025).toFixed(4));
        emitVertices(next);
        return next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [open, selected, treeId, points]);

  useEffect(() => {
    if (!drag) return undefined;
    function move(event) {
      const x = ((event.clientX - drag.rect.left) / drag.rect.width - 0.5) * (400 / 220);
      const y = (0.5 - (event.clientY - drag.rect.top) / drag.rect.height) * (400 / 220);
      setPoints((current) => {
        const next = current.map((value, index) => {
          if (index === drag.index * 3) return Number(x.toFixed(4));
          if (index === drag.index * 3 + 1) return Number(y.toFixed(4));
          return value;
        });
        emitVertices(next);
        return next;
      });
    }
    function up() { setDrag(null); }
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    return () => { window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", up, true); };
  }, [drag, treeId]);

  function beginDrag(index, event) {
    event.preventDefault();
    event.stopPropagation();
    setSelected(index);
    setDrag({ index, rect: event.currentTarget.ownerSVGElement.getBoundingClientRect() });
  }

  function applyPreset(name) {
    const next = [...LEAF_PRESETS[name]];
    setPoints(next);
    setSelected(0);
    emitVertices(next);
  }

  if (!open) return null;

  const screen = Array.from({ length: 8 }, (_, index) => ({
    x: 200 + points[index * 3] * 220,
    y: 300 - points[index * 3 + 1] * 220,
  }));
  const polygon = screen.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="tg-leaf-editor-window-backdrop" role="dialog" aria-modal="true" aria-label="Leaf Vertex Editor">
      <div className="tg-leaf-editor-window">
        <div className="tg-tree-interaction-title-row">
          <div>
            <div className="tg-side-panel-title">LEAF VERTEX EDITOR</div>
            <div className="tg-tree-interaction-subtitle">CANONICAL LEAF SHAPE</div>
          </div>
          <button type="button" className="tg-tree-interaction-close" onClick={commitAndClose}>×</button>
        </div>
        <div className="tg-leaf-preset-row">
          {Object.keys(LEAF_PRESETS).map((name) => <button key={name} type="button" onClick={() => applyPreset(name)}>{name}</button>)}
        </div>
        <div className="tg-leaf-editor-canvas">
          <svg viewBox="0 0 400 400" width="100%" height="100%">
            <defs><pattern id="tg-leaf-grid-global-v2" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.10)" /></pattern></defs>
            <rect width="400" height="400" fill="url(#tg-leaf-grid-global-v2)" />
            <polygon points={polygon} fill="rgba(184,255,42,.78)" stroke="#2a8fff" strokeWidth="3" />
            {screen.map((point, index) => (
              <circle key={index} cx={point.x} cy={point.y} r={index === selected ? 10 : 7} fill={index === selected ? "#2a8fff" : "#f5f7fa"} stroke="#080808" strokeWidth="2" onPointerDown={(event) => beginDrag(index, event)} />
            ))}
          </svg>
        </div>
        <div className="tg-leaf-editor-footer">
          <span>DRAG VERTEX · LEFT STICK MOVE · B / ESC KEEP CHANGES</span>
          <strong>VERTEX {selected + 1}</strong>
          <button type="button" className="tg-mesh-save" onClick={commitAndClose}>SAVE</button>
          <button type="button" className="tg-mesh-cancel" onClick={cancelAndRevert}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
''')

# 8) Leaf editor styles.
p=root/'components/ui/LeafVertexEditorWindow.css'
s=p.read_text()
s += '\n.tg-leaf-preset-row{display:flex;gap:6px;margin-top:9px}.tg-leaf-preset-row button{min-height:29px;padding:4px 10px;border:1px solid rgba(205,38,38,.55);background:rgba(5,6,8,.82);color:var(--tg-white);font-family:var(--tg-font-display);font-size:10px;letter-spacing:.07em;cursor:pointer}.tg-leaf-preset-row button:hover{border-color:var(--tg-crimson);background:rgba(129,16,18,.22)}\n'
p.write_text(s)

# 9) Patch note/version.
Path('/mnt/data/tg160304/package.json').write_text(Path('/mnt/data/tg160304/package.json').read_text().replace('"version": "1.6.03.03"','"version": "1.6.03.04"'))
