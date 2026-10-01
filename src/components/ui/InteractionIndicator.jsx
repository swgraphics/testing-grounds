import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";

export default function InteractionIndicator() {
  const activeTool = useInteractionStore((state) => state.activeTool);
  const activeMode = useInteractionStore((state) => state.activeMode);

  if (!activeTool && !activeMode) return null;

  const modeLabels = {
    select: "SELECT",
    edit: "EDIT",
    place: "PLACE",
    sculpt: "SCULPT",
    grab: "GRAB",
  };

  const tool = String(activeTool || "INTERACT").toUpperCase();
  const mode = modeLabels[activeMode] || String(activeMode || "").toUpperCase();
  const isTreeInteraction = tool === "TREE" || useInteractionStore.getState().activeTarget?.startsWith?.("tree:");
  const displayTool = isTreeInteraction ? "OBJECT" : tool;
  const displayMode = isTreeInteraction ? "TREE" : mode;

  return (
    <div
      className="tg-interaction-indicator"
      style={{ "--tg-interaction-color": INTERACTION_COLOR }}
      aria-live="polite"
    >
      <span className="tg-interaction-indicator-dot" />
      <span>{displayTool} // {displayMode}</span>
    </div>
  );
}
