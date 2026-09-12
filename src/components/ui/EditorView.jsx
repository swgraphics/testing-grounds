import { useEffect } from "react";
import { useEditorStore } from "../../systems/editor/editorStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { AREA_CONFIG } from "../../config/areaConfig";
import { saveWorldSettings, loadWorldSettings } from "../../systems/terrain/terrainSettings";
import WorldMap from "./WorldMap";

const PANEL_LABELS = [
  ["world", "WORLD"],
  ["terrain", "TERRAIN"],
  ["object", "OBJECT"],
  ["add-object", "ADD OBJECT"],
];

function openObjectMenu(panel = "object") {
  useEditorStore.getState().setActivePanel(panel);
  useEditorStore.getState().closeDevTools();
  useInteractionStore.getState().activate({
    target: "object-menu",
    tool: "OBJECT",
    mode: "select",
  });
  window.dispatchEvent(new CustomEvent("tg-mesh-menu-open"));
}

export default function EditorView() {
  const isOpen = useEditorStore((state) => state.isOpen);
  const activePanel = useEditorStore((state) => state.activePanel);
  const viewportMode = useEditorStore((state) => state.viewportMode);
  const setActivePanel = useEditorStore((state) => state.setActivePanel);
  const setViewportMode = useEditorStore((state) => state.setViewportMode);
  const close = useEditorStore((state) => state.close);
  const openDevToolsPanel = useEditorStore((state) => state.openDevToolsPanel);
  const closeDevTools = useEditorStore((state) => state.closeDevTools);

  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const setCurrentChunk = useWorldStore((state) => state.setCurrentChunk);

  const currentArea = AREA_CONFIG.find((area) => area.id === currentChunkId);

  useEffect(() => {
    document.body.classList.toggle("tg-editor-active", isOpen);
    return () => document.body.classList.remove("tg-editor-active");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEditorSection(event) {
      const section = event.detail?.section;
      if (!section) return;
      if (section === "terrain") {
        openDevToolsPanel();
      }
    }

    window.addEventListener("tg-dev-panel-section", handleEditorSection);
    return () => window.removeEventListener("tg-dev-panel-section", handleEditorSection);
  }, [isOpen, openDevToolsPanel]);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="tg-editor-open-button"
        onClick={() => useEditorStore.getState().open()}
      >
        EDITOR
      </button>
    );
  }

  function selectPanel(id) {
    setActivePanel(id);

    if (id === "terrain") {
      openDevToolsPanel();
      useInteractionStore.getState().activate({
        target: "terrain-editor",
        tool: "TERRAIN",
        mode: "select",
      });
      return;
    }

    if (id === "object" || id === "add-object") {
      openObjectMenu(id);
      return;
    }

    closeDevTools();
    window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
    useInteractionStore.getState().clear();
  }

  function teleportToArea(area) {
    setCurrentChunk(area.id);
    window.dispatchEvent(
      new CustomEvent("tg-teleport-to-area", {
        detail: { areaId: area.id },
      })
    );
  }

  function closeEditor() {
    closeDevTools();
    window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
    useInteractionStore.getState().clear();
    close();
  }

  return (
    <div className="tg-editor-view" aria-label="Testing Grounds Editor">
      <div className="tg-editor-header">
        <div className="tg-editor-brand">
          <span>TESTING GROUNDS</span>
          <strong>// EDITOR</strong>
        </div>

        <div className="tg-editor-header-actions">
          <button
            type="button"
            className={`tg-editor-header-button ${viewportMode === "world" ? "active" : ""}`}
            onClick={() => setViewportMode("world")}
          >
            WORLD
          </button>
          <button
            type="button"
            className={`tg-editor-header-button ${viewportMode === "map" ? "active" : ""}`}
            onClick={() => setViewportMode("map")}
          >
            AERIAL MAP
          </button>
          <button type="button" className="tg-editor-close" onClick={closeEditor} aria-label="Close editor">
            ×
          </button>
        </div>
      </div>

      <div className="tg-editor-area-row" role="navigation" aria-label="Testing Grounds areas">
        {AREA_CONFIG.map((area) => {
          const active = area.id === currentChunkId;
          return (
            <button
              key={area.id}
              type="button"
              className={`tg-editor-area-button ${active ? "active" : ""}`}
              onClick={() => teleportToArea(area)}
            >
              <span>{area.grid}</span>
              {area.name}
            </button>
          );
        })}
      </div>

      <div className="tg-editor-body">
        <aside className="tg-editor-sidebar">
          <div className="tg-editor-panel-title">EDITOR</div>
          {PANEL_LABELS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tg-editor-panel-button ${activePanel === id ? "active" : ""}`}
              onClick={() => selectPanel(id)}
            >
              {label}
            </button>
          ))}
        </aside>

        <main className="tg-editor-main">
          <div className={`tg-editor-viewport ${viewportMode === "map" ? "map-mode" : "world-mode"}`}>
            <span className="tg-editor-viewport-label">
              {currentArea?.grid ?? "A1"} // {currentArea?.name ?? "START"}
            </span>

            {viewportMode === "map" && (
              <div className="tg-editor-aerial-map">
                <WorldMap />
                <div className="tg-editor-map-label">AERIAL WORLD MAP</div>
                <div className="tg-map-grid-lines" aria-hidden="true" />
                {AREA_CONFIG.map((area) => {
                  const left = 50 + area.position[0] / 4;
                  const top = 50 + area.position[2] / 4;
                  const active = area.id === currentChunkId;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      className={`tg-map-node ${active ? "active" : ""}`}
                      style={{ left: `${left}%`, top: `${top}%` }}
                      onClick={() => teleportToArea(area)}
                    >
                      <span>{area.grid}</span>
                      <small>{area.name}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="tg-editor-bottom-bar">
            <button type="button" onClick={saveWorldSettings}>SAVE WORLD</button>
            <button type="button" onClick={loadWorldSettings}>LOAD WORLD</button>
            <button type="button" disabled>ADD CHUNK</button>
            <button type="button" onClick={() => setViewportMode(viewportMode === "map" ? "world" : "map")}>
              {viewportMode === "map" ? "WORLD VIEW" : "AERIAL MAP"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
