import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";

export default function InteractionIndicator() {
  const activeTool = useInteractionStore((state) => state.activeTool);
  const activeMode = useInteractionStore((state) => state.activeMode);

  if (!activeTool && !activeMode) return null;

  const label = [activeTool, activeMode].filter(Boolean).join(" // ").toUpperCase();

  return (
    <div
      className="tg-interaction-indicator"
      style={{ "--tg-interaction-color": INTERACTION_COLOR }}
      aria-live="polite"
    >
      <span className="tg-interaction-indicator-dot" />
      <span>{label}</span>
    </div>
  );
}
