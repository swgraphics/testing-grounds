import { useEffect, useState } from "react";
import { useEditorStore } from "../../systems/editor/editorStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { useHistoryStore } from "../../systems/history/historyStore";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import {
  saveWorldSettings,
  loadWorldSettings,
  saveCurrentChunk,
  loadCurrentChunk,
  resetCurrentChunk,
} from "../../systems/terrain/terrainSettings";
import WorldMap from "./WorldMap";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { devSettings, updateDevSetting } from "../../systems/dev/devSettings";
import { hasSavedChunk } from "../../systems/world/worldPersistence";
import ChunkCreationDialog from "./ChunkCreationDialog";

const PANEL_LABELS = [
  ["editor", "WORLD // EDITOR"],
  ["control", "WORLD // CONTROL"],
  ["map", "WORLD // MAP"],
  ["objects", "WORLD // OBJECTS"],
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

  const currentChunk = useWorldStore((state) => state.world.chunks[currentChunkId]);
  const chunks = useWorldStore((state) => state.world.chunks);
  const worldType = useWorldStore((state) => state.world.worldType);
  const canUndo = useHistoryStore((state) => state.undoStack.length > 0);
  const canRedo = useHistoryStore((state) => state.redoStack.length > 0);
  const activeTool = useInteractionStore((state) => state.activeTool);
  const activeMode = useInteractionStore((state) => state.activeMode);

  const [renamingAreaId, setRenamingAreaId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [fpvMode, setFpvMode] = useState(devSettings.fpvMode);
  const [showChunkDialog, setShowChunkDialog] = useState(false);
  const [chunkDialogGrid, setChunkDialogGrid] = useState("");
  const [chunkDialogMapPosition, setChunkDialogMapPosition] = useState(null);
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);

  useEffect(() => {
    function handlePlayerPosition(event) {
      const detail = event.detail ?? {};
      if (![detail.x, detail.y, detail.z].every(Number.isFinite)) return;
      setPlayerPosition([Number(detail.x), Number(detail.y), Number(detail.z)]);
    }
    window.addEventListener("player-position-changed", handlePlayerPosition);
    return () => window.removeEventListener("player-position-changed", handlePlayerPosition);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("tg-editor-active", isOpen);
    return () => document.body.classList.remove("tg-editor-active");
  }, [isOpen]);

  useEffect(() => {
    function handleDevSetting(event) {
      if (event.detail?.key === "fpvMode") setFpvMode(Boolean(event.detail.value));
    }
    window.addEventListener("dev-settings-changed", handleDevSetting);
    return () => window.removeEventListener("dev-settings-changed", handleDevSetting);
  }, []);

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
    if (activeTool) {
      const modeLabels = { select: "SELECT", edit: "EDIT", place: "PLACE", sculpt: "SCULPT", grab: "GRAB" };
      const normalizedTool = String(activeTool).toUpperCase();
      const activeTarget = useInteractionStore.getState().activeTarget;
      const terrainTools = new Set(["HEIGHT", "RAISE", "LOWER", "SMOOTH", "FLATTEN", "SLOPE", "CANYON_EDGE"]);
      const isTreeInteraction = normalizedTool === "TREE" || activeTarget?.startsWith?.("tree:");
      const domain = isTreeInteraction ? "OBJECT" : terrainTools.has(normalizedTool) ? "TERRAIN" : normalizedTool === "RIVER" ? "WATER" : normalizedTool;
      const label = isTreeInteraction
        ? `${domain}//TREE`
        : domain === "OBJECT"
          ? `${domain}//${modeLabels[activeMode] || normalizedTool}`
          : `${domain}//${normalizedTool}`;
      return (
        <button
          type="button"
          className="tg-interaction-state-tag"
          onClick={() => {
            if (activeMode === "place") {
              window.dispatchEvent(new CustomEvent("tg-place-mode-exit"));
              return;
            }
            useInteractionStore.getState().deactivate();
          }}
          aria-label={`Active interaction ${activeTool} ${modeLabels[activeMode] || ""}`}
        >
          <span className="tg-interaction-indicator-dot" />
          [{label}]
          {activeMode === "place" && <span className="tg-interaction-state-close">[X]</span>}
        </button>
      );
    }

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

    if (id === "editor") {
      useEditorStore.getState().openDevToolsMenu();
      return;
    }

    if (id === "control") {
      openDevToolsPanel();
      useInteractionStore.getState().activate({
        target: "terrain-control",
        tool: "TERRAIN",
        mode: "select",
      });
      return;
    }

    if (id === "objects") {
      openObjectMenu("object");
      return;
    }

    if (id === "map") {
      closeDevTools();
      useInteractionStore.getState().clear();
      setViewportMode("map");
      return;
    }

    closeDevTools();
    window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
    useInteractionStore.getState().clear();
  }

  function teleportToChunk(chunk) {
    if (!chunk) return;
    setCurrentChunk(chunk.id);
    window.dispatchEvent(
      new CustomEvent("tg-teleport-to-area", {
        detail: { areaId: chunk.id, chunkId: chunk.id },
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
          <strong>// WORLD</strong>
        </div>

        <div className="tg-editor-header-actions">
          <button type="button" className="tg-editor-header-button" disabled={!canUndo} onClick={() => useHistoryStore.getState().undo()} title="Undo (Ctrl/Cmd+Z)">UNDO</button>
          <button type="button" className="tg-editor-header-button" disabled={!canRedo} onClick={() => useHistoryStore.getState().redo()} title="Redo (Ctrl/Cmd+Shift+Z)">REDO</button>
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
            WORLD MAP
          </button>
          <button type="button" className="tg-editor-close" onClick={closeEditor} aria-label="Close editor">
            ×
          </button>
        </div>
      </div>
      <div
        className="tg-editor-area-row"
        role="navigation"
        aria-label="Testing Grounds teleport and map controls"
      >
        <span className="tg-editor-area-label">TELEPORT</span>

        {Object.values(chunks)
          .sort((a, b) => String(a.grid).localeCompare(String(b.grid), undefined, { numeric: true }))
          .map((chunk) => {
          const active = chunk.id === currentChunkId;

          if (renamingAreaId === chunk.id) {
            return (
              <input
                key={`${chunk.id}-rename`}
                autoFocus
                className="tg-editor-area-rename-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const name = renameValue.trim();
                    if (name) useWorldStore.getState().renameChunk(chunk.id, name);
                    setRenamingAreaId(null);
                  }
                  if (event.key === "Escape") setRenamingAreaId(null);
                }}
                onBlur={() => {
                  const name = renameValue.trim();
                  if (name) useWorldStore.getState().renameChunk(chunk.id, name);
                  setRenamingAreaId(null);
                }}
              />
            );
          }

          return (
            <button
              key={chunk.id}
              type="button"
              className={`tg-editor-area-button ${active ? "active" : ""}`}
              onClick={() => teleportToChunk(chunk)}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setRenameValue(chunk.name ?? chunk.grid);
                setRenamingAreaId(chunk.id);
              }}
            >
              <span>{chunk.grid}</span>
              {chunk.name}
            </button>
          );
        })}
      </div>

      <div className="tg-editor-body">
        <aside className="tg-editor-sidebar">
          <div className="tg-editor-panel-title">
            WORLD // DEV TOOLS
          </div>

          {PANEL_LABELS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tg-editor-panel-button ${
                activePanel === id ? "active" : ""
              }`}
              onClick={() => selectPanel(id)}
            >
              {label}
            </button>
          ))}
        </aside>

        <main className="tg-editor-main">
          <div
            className={`tg-editor-viewport ${
              viewportMode === "map" ? "map-mode" : "world-mode"
            }`}
          >
            <span className="tg-editor-viewport-label">
              {currentChunk?.grid ?? "A1"} // {currentChunk?.name ?? "NO CHUNK"}
            </span>

            {viewportMode === "map" && (
              <div className="tg-editor-aerial-map">
                <WorldMap
                  onAddChunk={(grid, mapPosition) => {
                    setChunkDialogGrid(grid ?? "");
                    setChunkDialogMapPosition(mapPosition ?? null);
                    setShowChunkDialog(true);
                  }}
                  onSelectChunk={teleportToChunk}
                />
              </div>
            )}
          </div>

          <div className="tg-editor-bottom-bar">
            <button type="button" onClick={saveWorldSettings}>SAVE WORLD</button>
            <button type="button" onClick={loadWorldSettings}>LOAD WORLD</button>
            <button type="button" onClick={() => saveCurrentChunk()} disabled={!currentChunk}>SAVE CHUNK</button>
            <button type="button" onClick={() => loadCurrentChunk()} disabled={!currentChunk || !hasSavedChunk(currentChunkId)}>LOAD CHUNK</button>
            <button type="button" onClick={() => resetCurrentChunk()} disabled={!currentChunk}>RESET CHUNK</button>
            <button type="button" onClick={() => { setChunkDialogGrid(""); setChunkDialogMapPosition(null); setShowChunkDialog(true); }}>ADD CHUNK</button>
            <button type="button" onClick={() => useWorldGuideStore.getState().toggle()}>GUIDES / MARKERS</button>
            <button type="button" onClick={() => updateDevSetting("fpvMode", !fpvMode)}>FPV: {fpvMode ? "ON" : "OFF"}</button>
          </div>
        </main>
      </div>
      {showChunkDialog && <ChunkCreationDialog
        initialGrid={chunkDialogGrid}
        initialMapPosition={chunkDialogMapPosition}
        playerPosition={playerPosition}
        onClose={() => { setShowChunkDialog(false); setChunkDialogGrid(""); setChunkDialogMapPosition(null); }}
      />}
    </div>
  );
}