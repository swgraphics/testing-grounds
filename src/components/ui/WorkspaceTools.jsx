import { useNavigationStore } from "../../systems/ui/navigationStore";
import { activateWorldTool, openObjectLibrary, openWorkspace, runNavigationAction } from "../../systems/ui/navigationActions";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { useEditorStore } from "../../systems/editor/editorStore";
import { useTerrainExportStore } from "../../systems/terrain/terrainExportStore";
import { BUILTIN_OBJECTS } from "../../systems/objects/objectRegistry";
import { saveWorldSettings } from "../../systems/terrain/terrainSettings";
import { NatureIcon } from "./NavigationShell";
import { version } from "../../../package.json";
import "./WorkspaceTools.css";
const BRUSHES = [["RAISE","Raise"],["LOWER","Lower"],["SMOOTH","Smooth"],["FLATTEN","Flatten"],["SLOPE","Path / Slope"],["PLATEAU","Plateau settings"],["RIVER","River"],["POND","Lake"],["REGION","Region / Export"]];
export function WorkspaceToolbar() {
  const workspace = useNavigationStore(state => state.workspace);
  const tool = useInteractionStore(state => state.activeTool);
  const objects = workspace === "objects" || workspace === "scatter";
  return <div id="tg-panel-left" className="tg-workspace-tools tg-hud-surface" data-input-context="panel">
    <button className="tg-panel-collapse" aria-label="Collapse left tools" onClick={() => useEditorStore.getState().setPanel("left", false)}>CLOSE LEFT</button>
    <NatureIcon name={objects ? "box" : "mountain"} /><h2 className="tg-hud-heading">{objects ? "OBJECT TOOLS" : "TERRAIN BRUSH"}</h2>
    {objects ? [["place","Place"],["edit","Edit / Transform"],["scatter","Scatter"],["upload","Upload"]].map(([mode,label]) => <button className="tg-ui-button" key={mode} onClick={() => openObjectLibrary(mode)}>{label}</button>)
      : BRUSHES.map(([id,label]) => <button className="tg-ui-button" key={id} aria-pressed={tool === id}
        title={id === "SLOPE" ? "Uses the existing slope brush; no separate path generator" : id === "PLATEAU" ? "Adjust the existing plateau setting in Dev Tools" : label}
        onClick={() => { if (id === "REGION") { useTerrainExportStore.getState().setOpen(true); return; } if (id === "PLATEAU") { runNavigationAction("devtools"); return; } activateWorldTool(id, ["RIVER","POND"].includes(id) ? "grab" : "sculpt"); }}>{label}</button>)}
    <button className="tg-ui-button" onClick={() => openWorkspace("map")}>WORLD MAP</button>
    <p>D-pad: focus tools. A: select. B: back.<br />Click the viewport to apply the active tool.</p>
  </div>;
}
export function QuickTools() {
  const workspace = useNavigationStore(state => state.workspace);
  const objects = ["objects","scatter"].includes(workspace);
  const entries = objects ? [["edit-objects","move","Transform"],["objects","box","Place"],["scatter","tree-pine","Scatter"]] : [["river","droplets","Draw River"],["sun","sun","Move Sun"],["clouds","cloud","Edit Clouds"],["terrain","mountain","Edit Terrain"]];
  return <aside id="tg-panel-right" className="tg-workspace-quick tg-hud-surface" data-input-context="panel"><button className="tg-panel-collapse" aria-label="Collapse right quick tools" onClick={() => useEditorStore.getState().setPanel("right", false)}>CLOSE RIGHT</button><h2 className="tg-hud-heading">QUICK TOOLS //</h2>{entries.map(([action,icon,label]) => <button className="tg-ui-button" key={action} onClick={() => runNavigationAction(action)}><NatureIcon name={icon} />{label}</button>)}</aside>;
}
export function WorkspaceBottom() {
  const panels = useEditorStore(state => state.panels);
  const workspace = useNavigationStore(state => state.workspace);
  const profiles = useWorldStore(state => state.world.scatterProfiles);
  const activeTool = useInteractionStore(state => state.activeTool);
  if (!panels.library && !panels.scatter) return null;
  return <div className="tg-workspace-bottom" data-input-context="panel" data-single={!(panels.library && panels.scatter)}>
    {panels.library && <section id="tg-panel-library" className="tg-hud-surface"><button className="tg-panel-collapse" aria-label="Collapse library" onClick={() => useEditorStore.getState().setPanel("library", false)}>CLOSE LIBRARY</button><h2 className="tg-hud-heading">LIBRARY //</h2><div className="tg-library-strip">{BUILTIN_OBJECTS.slice(0,6).map(mesh => <button className="tg-ui-button" key={mesh.id} onClick={() => {
        useEditorStore.getState().closeDevTools(); window.dispatchEvent(new CustomEvent("tg-mesh-library-select", { detail: { mesh } })); document.activeElement?.blur?.();
      }}><NatureIcon name={mesh.kind === "tree" ? "tree-pine" : "box"} />{mesh.name}</button>)}</div><button className="tg-ui-button" onClick={() => openObjectLibrary()}>FULL LIBRARY / UPLOAD</button></section>}
    {panels.scatter && <section id="tg-panel-scatter" className="tg-hud-surface"><button className="tg-panel-collapse" aria-label="Collapse scatter" onClick={() => useEditorStore.getState().setPanel("scatter", false)}>CLOSE SCATTER</button><h2 className="tg-hud-heading">{workspace === "terrain" ? "SCATTER / TOOL" : "SCATTER // POPULATIONS"}</h2><p>{Object.keys(profiles ?? {}).length} saved populations | Active: {activeTool || "none"}</p><div className="tg-workspace-actions"><button className="tg-ui-button" onClick={() => openObjectLibrary("scatter")}>MANAGE SCATTER</button><button className="tg-ui-button" onClick={saveWorldSettings}>SAVE WORLD</button><button className="tg-ui-button" onClick={() => { useInteractionStore.getState().clear(); window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement")); }}>CANCEL TOOL</button></div><p>Changes apply live. Save World persists them; Undo reverses supported edits.</p></section>}
  </div>;
}
export function WorkspaceFooter() { return <footer className="tg-workspace-footer"><span>TESTING GROUNDS // v{version}</span><button className="tg-ui-button" onClick={() => useNavigationStore.getState().setHelp(true)}>HELP / CONTROLS</button></footer>; }
