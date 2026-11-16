import { useEffect, useState, useRef } from "react";
import { clearGameplayInput } from "../../systems/input/inputOwnership";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { useWorldStore } from "../../systems/world/worldStore";
import TreeProperties from "./TreeProperties";
import ObjectTransformProperties from "./ObjectTransformProperties";
import ObjectEditHistory from "./ObjectEditHistory";
import { mergeTreeProperties } from "../../systems/objects/treeProperties";
import { resolveObjectTarget, editObjectTarget } from "../../systems/objects/objectEditing";

export default function CrimsonTreeInteractionPanel() {
  const world = useWorldStore(state => state.world);
  const activeTool = useInteractionStore((state) => state.activeTool);
  const [selection, setSelection] = useState(null);
  const previousFocus = useRef(null);
  const [treeId, setTreeId] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [mode, setMode] = useState("trunk");
  const [branchScope, setBranchScope] = useState("global");
  const [instanceScope, setInstanceScope] = useState("single");
  const [gestureMode, setGestureMode] = useState("length");

  useEffect(() => {
    function handleEnter(event) {
      previousFocus.current = document.activeElement;
      clearGameplayInput();
      window.requestAnimationFrame(() => document.querySelector(".tg-tree-interaction-close")?.focus());
      setTreeId(event.detail?.treeId ?? null);
      setDefinition(event.detail?.treeDefinition ?? null);
      setMode(event.detail?.mode ?? "trunk");
      setInstanceScope(event.detail?.instanceScope ?? "global");
    }

    function handleChange(event) {
      const patch = event.detail?.patch;
      if (!patch) return;
      setDefinition((current) => mergeTreeProperties(current ?? {}, patch));
    }

    function handleTarget(event) {
      if (event.detail?.treeDefinition) {
        setDefinition(event.detail.treeDefinition);
      }
    }

    function handleExit() {
      clearGameplayInput();
      window.requestAnimationFrame(() => { const e = previousFocus.current; if (e?.isConnected && e.getClientRects().length && e.closest("[data-directional-panel]")) e.focus(); else document.activeElement?.blur?.(); });
      setTreeId(null);
      setDefinition(null);
      setMode("trunk");
    }

    function handleMode(event) {
      setMode(event.detail?.mode ?? "trunk");
    }

    function handleBranchScope(event) {
      setBranchScope(event.detail?.scope ?? "global");
    }

    function handleInstanceScope(event) {
      setInstanceScope(event.detail?.scope ?? "global");
    }

    function handleBranchGesture(event) {
      setGestureMode(event.detail?.mode ?? "length");
    }

    const select = event => setSelection(event.detail);
    window.addEventListener("crimson-tree-selected", select);
    window.addEventListener("crimson-tree-edit-enter", handleEnter);
    window.addEventListener("crimson-tree-edit-change", handleChange);
    window.addEventListener("crimson-tree-reticle-target-changed", handleTarget);
    window.addEventListener("crimson-tree-edit-exit", handleExit);
    window.addEventListener("crimson-tree-edit-mode-changed", handleMode);
    window.addEventListener("crimson-tree-branch-scope-changed", handleBranchScope);
    window.addEventListener("crimson-tree-instance-scope-changed", handleInstanceScope);
    window.addEventListener("crimson-tree-branch-gesture-changed", handleBranchGesture);

    return () => {
      window.removeEventListener("crimson-tree-selected", select);
      window.removeEventListener("crimson-tree-edit-enter", handleEnter);
      window.removeEventListener("crimson-tree-edit-change", handleChange);
      window.removeEventListener("crimson-tree-reticle-target-changed", handleTarget);
      window.removeEventListener("crimson-tree-edit-exit", handleExit);
      window.removeEventListener("crimson-tree-edit-mode-changed", handleMode);
      window.removeEventListener("crimson-tree-branch-scope-changed", handleBranchScope);
      window.removeEventListener("crimson-tree-instance-scope-changed", handleInstanceScope);
      window.removeEventListener("crimson-tree-branch-gesture-changed", handleBranchGesture);
    };
  }, []);

  useEffect(() => {
    if (activeTool !== "TREE") {
      setTreeId(null);
      setDefinition(null);
    }
  }, [activeTool]);

  const selectedTarget = useInteractionStore(state => state.activeTarget);
  if (activeTool !== "TREE" || !treeId) return !activeTool && selection && selectedTarget === 'tree:' + selection.treeId ? <div className="tg-tree-selection" style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:30}}>
    <button className="tg-ui-button" data-tree-edit-selected onClick={() => window.dispatchEvent(new CustomEvent('crimson-tree-edit-selected-request'))}>TREE SELECTED / EDIT TREE (E / X)</button>
  </div> : null;

  const target = { id: treeId, chunkId: world.currentChunkId, scope: instanceScope, definition };
  const object = resolveObjectTarget(target, world);
  const effectiveDefinition = object?.treeDefinition ?? definition;
  function close() { window.dispatchEvent(new CustomEvent("crimson-tree-edit-exit-request")); }
  function changeTree(patch) {
    setDefinition(current => mergeTreeProperties(current ?? {}, patch));
    editObjectTarget(target, { treeDefinition: patch });
  }
  return (
    <aside className="tg-tree-interaction-panel" data-input-context="panel" aria-label="Default Tree Interaction">
      <div className="tg-tree-interaction-title-row">
        <div>
          <div className="tg-side-panel-title">TREE INTERACTION</div>
          <div className="tg-tree-interaction-subtitle">DEFAULT TREE // TRUNK</div>
        </div>
        <button type="button" className="tg-tree-interaction-close" onClick={close} aria-label="Exit tree interaction">×</button>
      </div>

      {treeId?.startsWith("scatter-tree-") && (
        <div className="tg-tree-interaction-section">
          SCATTER EDIT SCOPE
          <div className="tg-tree-interaction-mode-row">
            <button type="button" className={`tg-tree-interaction-mode ${instanceScope === "single" ? "active" : ""}`} onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-instance-scope-request", { detail: { scope: "single" } }))}>SINGLE TREE</button>
            <button type="button" className={`tg-tree-interaction-mode ${instanceScope === "global" ? "active" : ""}`} onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-instance-scope-request", { detail: { scope: "global" } }))}>ALL SCATTERED</button>
          </div>
        </div>
      )}

      <div className="tg-tree-interaction-mode-row">
        <button type="button" className={`tg-tree-interaction-mode ${mode === "trunk" ? "active" : ""}`} onClick={() => { setMode("trunk"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "trunk" } })); }}>TRUNK</button>
        <button type="button" className={`tg-tree-interaction-mode ${mode === "branch" ? "active" : ""}`} onClick={() => { setMode("branch"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "branch" } })); }}>BRANCHES</button>
        <button type="button" className={`tg-tree-interaction-mode ${mode === "leaves" ? "active" : ""}`} onClick={() => { setMode("leaves"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "leaves" } })); }}>LEAVES</button>
      </div>

      {mode === "branch" && (
        <>
          <div className="tg-tree-interaction-section">BRANCH CONTROL</div>
          <div className="tg-tree-interaction-mode-row">
            <button type="button" className={`tg-tree-interaction-mode ${branchScope === "global" ? "active" : ""}`} onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-branch-scope-request", { detail: { scope: "global" } }))}>ALL BRANCHES</button>
            <button type="button" disabled={instanceScope === "global"} className={`tg-tree-interaction-mode ${branchScope === "single" ? "active" : ""}`} onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-branch-scope-request", { detail: { scope: "single" } }))}>SINGLE BRANCH</button>
          </div>
          <div className="tg-tree-interaction-section">GESTURE</div>
          <div className="tg-tree-interaction-mode-row">
            {[["length","LENGTH"],["verticality","VERTICALITY"],["thickness","THICKNESS"],["frequency","FREQUENCY"],["taper","TAPER"]].map(([key,label]) => (
              <button key={key} type="button" className={`tg-tree-interaction-mode ${gestureMode === key ? "active" : ""}`} onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-branch-gesture-request", { detail: { mode: key } }))}>{label}</button>
            ))}
          </div>

          <div className="tg-tree-interaction-hint">DRAG = GESTURE · SHIFT = THICKNESS · CTRL = FREQUENCY · ALT = TAPER · G = SINGLE/ALL</div>
        </>
      )}

      <TreeProperties definition={effectiveDefinition} onChange={changeTree} seedEditable={!(object?.profileId && instanceScope === "global")} onVertexEdit={() => window.dispatchEvent(new CustomEvent("crimson-tree-leaf-vertex-open", { detail: { treeId, definition: effectiveDefinition, instanceScope } }))} />
      {object?.position && <ObjectTransformProperties object={object} onChange={patch => editObjectTarget(target, patch)} />}
      <ObjectEditHistory />
      <button className="tg-tree-interaction-mode" onClick={() => { close(); window.dispatchEvent(new CustomEvent("tg-object-focus-edit", { detail: target })); }}>OBJECT//LIBRARY</button>
    </aside>
  );
}
