import { useInteractionStore, INTERACTION_COLOR } from "../../systems/interaction/interactionStore";
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
  const assignmentMode = useInteractionStore((state) => state.shortcutAssignmentMode);
  const shortcutsOpen = useEditorStore((state) => state.quickToolsOpen);

  function arm(direction) {
    useInteractionStore.getState().setShortcutAssignmentDirection(direction);
  }

  function beginAssignment() {
    useInteractionStore.getState().beginShortcutAssignment();
  }

  return (
    <div className={`tg-quick-interaction-slots ${shortcutsOpen ? "open" : ""}`} aria-label="Shortcut tools">
      <button type="button" className="tg-quick-shortcuts-toggle" onClick={() => useEditorStore.getState().toggleQuickTools()}>SHORTCUTS</button>
      {shortcutsOpen && (
        <div className="tg-quick-shortcut-panel">
          <button type="button" className="tg-quick-add-shortcut" onClick={beginAssignment}>ADD TO SHORTCUT</button>
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
                  className={`tg-quick-interaction-slot ${active && !assignmentMode ? "active" : ""} ${armed ? "assignment-active" : ""}`}
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
          {assignmentMode && <div className="tg-quick-assignment-hint">{assignmentDirection ? `${assignmentDirection.toUpperCase()} SELECTED · NOW CHOOSE A FUNCTION` : "CHOOSE AN ARROW SLOT"}</div>}
        </div>
      )}
    </div>
  );
}
