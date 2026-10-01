import { useEffect, useRef, useState } from "react";
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
  const pointsRef = useRef(DEFAULT_VERTICES);
  const treeIdRef = useRef(null);
  const [selected, setSelected] = useState(0);
  const [drag, setDrag] = useState(null);
  const [instanceScope, setInstanceScope] = useState("global");
  const previousBRef = useRef(false);

  function emitVertices(vertices) {
    if (!treeIdRef.current) return;
    window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", {
      detail: { treeId, scope: instanceScope, patch: { leaves: { vertices: [...vertices] } } },
    }));
  }

  useEffect(() => {
    function handleOpen(event) {
      const vertices = cloneVertices(event.detail?.definition?.leaves?.vertices);
      const nextTreeId = event.detail?.treeId ?? null;
      treeIdRef.current = nextTreeId;
      setTreeId(nextTreeId);
      originalRef.current = [...vertices];
      pointsRef.current = vertices;
      setPoints(vertices);
      setSelected(0);
      setDrag(null);
      setInstanceScope(event.detail?.instanceScope ?? "global");
      setOpen(true);
    }
    function handleScope(event) {
      setInstanceScope(event.detail?.scope ?? "global");
    }
    window.addEventListener("crimson-tree-leaf-vertex-open", handleOpen);
    window.addEventListener("crimson-tree-instance-scope-changed", handleScope);
    return () => {
      window.removeEventListener("crimson-tree-leaf-vertex-open", handleOpen);
      window.removeEventListener("crimson-tree-instance-scope-changed", handleScope);
    };
  }, []);

  function commitAndClose() {
    emitVertices(pointsRef.current);
    setOpen(false);
    setDrag(null);
  }

  function cancelAndRevert() {
    const original = [...originalRef.current];
    pointsRef.current = original;
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
        pointsRef.current = next;
        next[selected * 3] = Number((next[selected * 3] + x * 0.025).toFixed(4));
        next[selected * 3 + 1] = Number((next[selected * 3 + 1] - y * 0.025).toFixed(4));
        emitVertices(next);
        return next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [open, selected]);

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
        pointsRef.current = next;
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
    pointsRef.current = next;
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
