import { useEditorStore } from "../../systems/editor/editorStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { openWorkspace, returnToWorldView } from "../../systems/ui/navigationActions";

export function PanelControls() {
  const panels = useEditorStore(state => state.panels);
  return <details className="tg-panel-switcher tg-hud-surface" data-input-context="panel">
    <summary>PANELS</summary><div>
      {Object.entries({ left: "Left Tools", right: "Right Quick Tools", library: "Library", scatter: "Scatter" }).map(([key,label]) =>
        <button key={key} className="tg-ui-button" aria-pressed={panels[key]} aria-controls={"tg-panel-" + key}
          onClick={() => useEditorStore.getState().togglePanel(key)}>{panels[key] ? "Hide " : "Show "}{label}</button>)}
      <button className="tg-ui-button" onClick={() => openWorkspace()}>FULL EDITOR</button>
      <button className="tg-ui-button" onClick={returnToWorldView}>WORLD VIEW</button>
    </div>
  </details>;
}
export function ActiveToolFeedback() {
  const tool = useInteractionStore(state => state.activeTool);
  const mode = useInteractionStore(state => state.activeMode);
  if (!tool) return null;
  return <button type="button" className="tg-interaction-state-tag" aria-label={`Exit active ${tool} tool`} onClick={() => {
    if (mode === "place") window.dispatchEvent(new CustomEvent("tg-place-mode-exit"));
    else useInteractionStore.getState().deactivate();
  }}><span className="tg-interaction-indicator-dot" />{tool} // {String(mode || "").toUpperCase()} [EXIT]</button>;
}
