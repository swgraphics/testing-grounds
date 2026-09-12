import { useEffect } from "react";
import { useInteractionStore, INTERACTION_MODES } from "../../systems/interaction/interactionStore";
import { useEditorStore } from "../../systems/editor/editorStore";

const TOOLS = [
  { id: "sun", label: "SUN", description: "Grab / rotate / raise" },
  { id: "terrain-raise", label: "RAISE", description: "Lift terrain" },
  { id: "terrain-lower", label: "LOWER", description: "Lower terrain" },
  { id: "terrain-smooth", label: "SMOOTH", description: "Soften terrain" },
  { id: "terrain-flatten", label: "FLATTEN", description: "Flatten terrain" },
  { id: "terrain-slope", label: "SLOPE", description: "Shape a slope" },
  { id: "water-river", label: "RIVER", description: "Draw a river" },
  { id: "object", label: "OBJECT", description: "Select / move / rotate / scale" },
];

export default function InteractionPanel() {
  const panelOpen = useInteractionStore((state) => state.panelOpen);
  const activeTool = useInteractionStore((state) => state.activeTool);
  const activeMode = useInteractionStore((state) => state.activeMode);

  useEffect(() => {
    document.body.classList.toggle("tg-tool-active", Boolean(activeTool && ["sculpt", "grab", "place", "edit"].includes(activeMode)));
    return () => document.body.classList.remove("tg-tool-active");
  }, [activeTool, activeMode]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      useInteractionStore.getState().clear();
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, []);

  if (!panelOpen) return null;

  function close() {
    useInteractionStore.getState().clear();
  }

  function selectTool(tool) {
    if (tool === "object") {
      useInteractionStore.getState().closePanel();
      useInteractionStore.getState().activate({
        target: "object-menu",
        tool: "OBJECT",
        mode: INTERACTION_MODES.SELECT,
      });
      window.dispatchEvent(new CustomEvent("tg-mesh-menu-open"));
      return;
    }

    if (tool === "sun") {
      useInteractionStore.getState().activate({
        target: "sun",
        tool: "SUN",
        mode: INTERACTION_MODES.GRAB,
      });
      return;
    }

    if (tool.startsWith("terrain-")) {
      useInteractionStore.getState().activate({
        target: "terrain",
        tool: tool.replace("terrain-", "").toUpperCase(),
        mode: INTERACTION_MODES.SCULPT,
      });
      return;
    }

    if (tool === "water-river") {
      useInteractionStore.getState().activate({
        target: "water",
        tool: "RIVER",
        mode: INTERACTION_MODES.GRAB,
      });
    }
  }

  return (
    <aside className="tg-interaction-panel" aria-label="Testing Grounds Interaction Panel">
      <div className="tg-interaction-panel-title-row">
        <div>
          <div className="tg-side-panel-title">INTERACTION</div>
          <div className="tg-interaction-panel-subtitle">DIRECT WORLD TOOLS</div>
        </div>
        <button type="button" className="tg-side-panel-close" onClick={close} aria-label="Close Interaction Panel">×</button>
      </div>

      <div className="tg-interaction-panel-tools">
        {TOOLS.map((entry) => {
          const active = activeTool === (entry.id === "sun" ? "SUN" : entry.id === "object" ? "OBJECT" : entry.id.startsWith("terrain-") ? entry.id.replace("terrain-", "").toUpperCase() : "RIVER") && activeMode;
          return (
            <button
              key={entry.id}
              type="button"
              className={`tg-interaction-tool ${active ? "active" : ""}`}
              onClick={() => selectTool(entry.id)}
            >
              <strong>{entry.label}</strong>
              <span>{entry.description}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="tg-interaction-panel-devtools"
        onClick={() => {
          useInteractionStore.getState().closePanel();
          useEditorStore.getState().openDevToolsMenu();
        }}
      >
        OPEN DEV TOOLS
      </button>

      <div className="tg-interaction-panel-footer">
        {activeTool ? `${activeTool} // ${activeMode}` : "LOOK • SELECT • INTERACT"}
      </div>
    </aside>
  );
}
