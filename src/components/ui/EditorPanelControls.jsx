import { useNavigationStore } from "../../systems/ui/navigationStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

export function ActiveToolFeedback({ style }) {
  const tool = useInteractionStore(state => state.activeTool);
  const mode = useInteractionStore(state => state.activeMode);
  const origin = useNavigationStore(state => state.placementOrigin);
  if (!tool) return null;
  const returningToLibrary = mode === "place" && origin === "south";
  return <button type="button" className="tg-interaction-state-tag" style={style} data-placement-back={returningToLibrary || undefined} aria-label={returningToLibrary ? "Back to Objects Library" : `Exit active ${tool} tool`} onClick={() => {
    if (mode === "place") window.dispatchEvent(new CustomEvent("tg-place-mode-exit"));
    else useInteractionStore.getState().deactivate();
  }}><span className="tg-interaction-indicator-dot" />{tool} // {String(mode || "").toUpperCase()} [{returningToLibrary ? "BACK TO LIBRARY" : "EXIT"}]</button>;
}
