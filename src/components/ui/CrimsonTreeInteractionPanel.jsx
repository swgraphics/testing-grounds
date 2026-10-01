import { useEffect, useState } from "react";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

function mergeTreeDefinition(definition, patch) {
  return {
    ...definition,
    trunk: {
      ...(definition?.trunk ?? {}),
      ...(patch?.trunk ?? {}),
    },
    branches: {
      ...(definition?.branches ?? {}),
      ...(patch?.branches ?? {}),
      overrides: { ...(definition?.branches?.overrides ?? {}), ...(patch?.branches?.overrides ?? {}) },
      secondary: {
        ...(definition?.branches?.secondary ?? {}),
        ...(patch?.branches?.secondary ?? {}),
      },
    },
    leaves: {
      ...(definition?.leaves ?? {}),
      ...(patch?.leaves ?? {}),
    },
  };
}

export default function CrimsonTreeInteractionPanel() {
  const activeTool = useInteractionStore((state) => state.activeTool);
  const [treeId, setTreeId] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [mode, setMode] = useState("trunk");
  const [branchScope, setBranchScope] = useState("global");
  const [instanceScope, setInstanceScope] = useState("single");
  const [gestureMode, setGestureMode] = useState("length");

  useEffect(() => {
    function handleEnter(event) {
      setTreeId(event.detail?.treeId ?? null);
      setMode(event.detail?.mode ?? "trunk");
      setInstanceScope(event.detail?.instanceScope ?? "global");
    }

    function handleChange(event) {
      const patch = event.detail?.patch;
      if (!patch) return;
      setDefinition((current) => mergeTreeDefinition(current ?? {}, patch));
    }

    function handleTarget(event) {
      if (event.detail?.treeDefinition) {
        setDefinition(event.detail.treeDefinition);
      }
    }

    function handleExit() {
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

    window.addEventListener("crimson-tree-edit-enter", handleEnter);
    window.addEventListener("crimson-tree-edit-change", handleChange);
    window.addEventListener("crimson-tree-reticle-target-changed", handleTarget);
    window.addEventListener("crimson-tree-edit-exit", handleExit);
    window.addEventListener("crimson-tree-edit-mode-changed", handleMode);
    window.addEventListener("crimson-tree-branch-scope-changed", handleBranchScope);
    window.addEventListener("crimson-tree-instance-scope-changed", handleInstanceScope);
    window.addEventListener("crimson-tree-branch-gesture-changed", handleBranchGesture);

    return () => {
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

  if (activeTool !== "TREE" || !treeId) return null;

  const height = Number(definition?.trunk?.height ?? 50);
  const taper = Number(definition?.trunk?.taper ?? 50);
  const bend = Number(definition?.trunk?.bend ?? 50);
  const radius = Number(definition?.trunk?.radius ?? 50);
  const branch = definition?.branches ?? {};
  const secondary = branch.secondary ?? {};
  const branchFields = [
    ["BRANCH COUNT", "branch.count", branch.count ?? 50],
    ["BRANCH ANGLE", "branch.angle", branch.angle ?? 50],
    ["BRANCH LENGTH", "branch.length", branch.length ?? 50],
    ["BRANCH THICKNESS", "branch.thickness", branch.thickness ?? 50],
    ["BRANCH FREQUENCY", "branch.frequency", branch.frequency ?? 50],
    ["BRANCH VERTICALITY", "branch.verticality", branch.verticality ?? 50],
    ["BRANCH RANDOMNESS", "branch.randomness", branch.randomness ?? 50],
    ["BRANCH TAPER", "branch.taper", branch.taper ?? 50],
    ["SECONDARY BRANCHES", "secondary.count", secondary.count ?? 50],
    ["SECONDARY LENGTH", "secondary.length", secondary.length ?? 50],
    ["SECONDARY THICKNESS", "secondary.thickness", secondary.thickness ?? 50],
    ["SECONDARY RANDOMNESS", "secondary.randomness", secondary.randomness ?? 50],
  ];

  function update(key, value) {
    const numeric = Number(value);
    let patch;
    if (key.startsWith("secondary.")) {
      patch = { branches: { secondary: { [key.split(".")[1]]: numeric } } };
    } else if (key.startsWith("branch.")) {
      patch = { branches: { [key.split(".")[1]]: numeric } };
    } else if (["height", "taper", "bend", "radius"].includes(key)) {
      patch = { trunk: { [key]: numeric } };
    } else if (key === "leafSize" || key === "leafDensity") {
      patch = { leaves: { [key === "leafSize" ? "size" : "density"]: numeric } };
    } else {
      patch = { branches: { [key]: numeric } };
    }
    setDefinition((current) => mergeTreeDefinition(current ?? {}, patch));
    window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScope, patch } }));
  }

  function close() {
    window.dispatchEvent(new CustomEvent("crimson-tree-edit-exit-request"));
  }

  const slider = (label, value, key) => (
    <label className="tg-tree-interaction-slider" key={key}>
      <span>{label}<strong>{Math.round(value)}</strong></span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => update(key, event.target.value)}
      />
    </label>
  );

  return (
    <aside className="tg-tree-interaction-panel" aria-label="Crimson Tree Interaction">
      <div className="tg-tree-interaction-title-row">
        <div>
          <div className="tg-side-panel-title">TREE INTERACTION</div>
          <div className="tg-tree-interaction-subtitle">CRIMSON TREE // TRUNK</div>
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

      {slider("TRUNK HEIGHT", height, "height")}
      {slider("TRUNK TAPER", taper, "taper")}
      {slider("TRUNK BEND", bend, "bend")}
      {slider("TRUNK WIDTH", radius, "radius")}

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
          {branchFields.map(([label, key, value]) => slider(label, Number(value), key))}
          <div className="tg-tree-interaction-hint">DRAG = GESTURE · SHIFT = THICKNESS · CTRL = FREQUENCY · ALT = TAPER · G = SINGLE/ALL</div>
        </>
      )}

      {mode === "leaves" && (
        <>
          <div className="tg-tree-interaction-section">LEAF CONTROL</div>
          {slider("LEAF SIZE", Number(definition?.leaves?.size ?? 50), "leafSize")}
          {slider("LEAF DENSITY", Number(definition?.leaves?.density ?? 50), "leafDensity")}
          <button type="button" className="tg-tree-interaction-mode" onClick={() => window.dispatchEvent(new CustomEvent("crimson-tree-leaf-vertex-open", { detail: { treeId, definition, instanceScope } }))}>LEAF VERTEX EDIT</button>
        </>
      )}

      <div className="tg-tree-interaction-hint">{mode === "trunk" ? "UP / DOWN = HEIGHT  ·  LEFT / RIGHT = BEND" : mode === "leaves" ? "SELECT LEAF VERTEX EDIT FOR DIRECT SHAPE CONTROL" : "BRANCH MODE = DIRECT PROCEDURAL EXTRUSION"}</div>
    </aside>
  );
}
