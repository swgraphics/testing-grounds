import { useEffect } from "react";
import { useInteractionStore, INTERACTION_MODES } from "../../systems/interaction/interactionStore";
import { useEditorStore } from "../../systems/editor/editorStore";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";

const TOOLS = [
  { id: "terrain-height", label: "TERRAIN HEIGHT", description: "Raise / lower terrain" },
  { id: "terrain-vertex", label: "VERTEX", description: "Select terrain vertices" },
  { id: "sun", label: "SUN", description: "Move the sun through the sky" },
  { id: "terrain-smooth", label: "SMOOTH", description: "Soften terrain" },
  { id: "terrain-flatten", label: "FLATTEN", description: "Flatten terrain" },
  { id: "terrain-slope", label: "SLOPE", description: "Shape a slope" },
  { id: "terrain-canyon-edge", label: "CANYON EDGE", description: "Extrude / expand a canyon edge" },
  { id: "water-river", label: "DRAW WATER", description: "Reveal the water layer by lowering terrain" },
  { id: "object", label: "OBJECT", description: "Select / move / rotate / scale" },
];

export default function InteractionPanel() {
  const panelOpen = useInteractionStore((state) => state.panelOpen);
  const activeTool = useInteractionStore((state) => state.activeTool);
  const activeMode = useInteractionStore((state) => state.activeMode);
  const guidesVisible = useWorldGuideStore((state) => state.visible);

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

    if (tool.startsWith("terrain-")) {
      const terrainTool = tool === "terrain-height" ? "HEIGHT" : tool === "terrain-vertex" ? "VERTEX" : tool === "terrain-canyon-edge" ? "CANYON_EDGE" : tool.replace("terrain-", "").toUpperCase();
      useInteractionStore.getState().activate({
        target: "terrain",
        tool: terrainTool,
        mode: INTERACTION_MODES.SCULPT,
      });
      return;
    }

    if (tool === "sun") {
      useInteractionStore.getState().activate({ target: "sun", tool: "SUN", mode: INTERACTION_MODES.GRAB });
      return;
    }

    if (tool === "water-river") {
      useInteractionStore.getState().activate({ target: "water", tool: "RIVER", mode: INTERACTION_MODES.GRAB });
    }
  }

  return (
    <aside className="tg-interaction-panel" aria-label="Testing Grounds Terrain Control">
      <div className="tg-interaction-panel-title-row">
        <div>
          <div className="tg-side-panel-title">TERRAIN CONTROL</div>
          <div className="tg-interaction-panel-subtitle">DIRECT WORLD TOOLS</div>
        </div>
        <button type="button" className="tg-side-panel-close" onClick={close} aria-label="Close Interaction Panel">×</button>
      </div>

      <div className="tg-interaction-panel-tools">
        {TOOLS.map((entry) => {
          const expectedTool = entry.id === "object" ? "OBJECT" : entry.id === "sun" ? "SUN" : entry.id === "terrain-height" ? "HEIGHT" : entry.id === "terrain-canyon-edge" ? "CANYON_EDGE" : entry.id.startsWith("terrain-") ? entry.id.replace("terrain-", "").toUpperCase() : "RIVER";
          const active = activeTool === expectedTool && Boolean(activeMode);
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
        onClick={() => useWorldGuideStore.getState().toggle()}
      >
        WORLD GUIDES: {guidesVisible ? "ON" : "OFF"}
      </button>

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
