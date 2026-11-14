import { WorkspaceToolbar, QuickTools, WorkspaceBottom, WorkspaceFooter } from "./WorkspaceTools";
import { useNavigationStore } from "../../systems/ui/navigationStore";
import { PanelControls, ActiveToolFeedback } from "./EditorPanelControls";
import { returnToWorldView, openObjectLibrary } from "../../systems/ui/navigationActions";
import TerrainExportPanel from './TerrainExportPanel';
import { useTerrainExportStore } from '../../systems/terrain/terrainExportStore';
import { useEffect, useState } from "react";
import { useEditorStore } from "../../systems/editor/editorStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { useHistoryStore } from "../../systems/history/historyStore";
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

export default function EditorView() {
  const exportOpen = useTerrainExportStore(state => state.open);
  const panels = useEditorStore(state => state.panels);
  const isOpen = useEditorStore((state) => state.isOpen);
  const activePanel = useEditorStore((state) => state.activePanel);
  const viewportMode = useEditorStore((state) => state.viewportMode);
  const setActivePanel = useEditorStore((state) => state.setActivePanel);
  const setViewportMode = useEditorStore((state) => state.setViewportMode);
  const openDevToolsPanel = useEditorStore((state) => state.openDevToolsPanel);
  const closeDevTools = useEditorStore((state) => state.closeDevTools);

  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const setCurrentChunk = useWorldStore((state) => state.setCurrentChunk);

  const currentChunk = useWorldStore((state) => state.world.chunks[currentChunkId]);
  const chunks = useWorldStore((state) => state.world.chunks);
  const canUndo = useHistoryStore((state) => state.undoStack.length > 0);
  const canRedo = useHistoryStore((state) => state.redoStack.length > 0);

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
    for (const key of ["left","right","library","scatter"]) document.body.classList.toggle("tg-panel-" + key + "-open", panels[key]);
    return () => { for (const key of ["left","right","library","scatter"]) document.body.classList.remove("tg-panel-" + key + "-open"); };
  }, [panels]);

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

  function selectPanel(id) {
    setActivePanel(id);

    if (id === "editor") {
      useEditorStore.getState().openDevToolsMenu();
      return;
    }

    if (id === "control") {
      openDevToolsPanel();
      useEditorStore.getState().setPanel("left", true);
      return;
    }

    if (id === "objects") {
      openObjectLibrary();
      return;
    }

    if (id === "map") {
      closeDevTools();
        setViewportMode("map");
      return;
    }

    closeDevTools();
    window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
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

  function closeEditor() { returnToWorldView(); }

  return (<>
    <ActiveToolFeedback /><PanelControls />
    {isOpen && <div className="tg-editor-view tg-workspace-v2" data-input-context="panel" aria-label="Testing Grounds Editor">
      <div className="tg-editor-header">
        <div className="tg-editor-brand">
          <img className="tg-brand-vector" src="/brand/TG-Logo wide.svg" alt="Testing Grounds" />
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
          <button type="button" className="tg-editor-header-button" onClick={() => useNavigationStore.getState().openCompass()}>MAIN MENU</button>
          <button type="button" className="tg-editor-close" onClick={closeEditor} aria-label="Close all panels">
            ×
          </button>
        </div>
      </div>
      <div
        className="tg-editor-area-row"
        role="navigation"
        aria-label="Testing Grounds teleport and map controls"
      >
        <span className="tg-editor-area-label">{currentChunk?.grid || "WORLD"} // {currentChunk?.name || "NO AREA"}</span>
        <button className="tg-ui-button" onClick={openDevToolsPanel}>DEV // TOOLS</button>
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
        {panels.left && <aside className="tg-editor-sidebar">
          <WorkspaceToolbar />
          <details><summary className="tg-editor-panel-title">MORE WORKSPACES</summary>
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
          </details>
        </aside>}

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

          <WorkspaceBottom />
          <div className="tg-editor-bottom-bar">
            <button type="button" aria-expanded={exportOpen} onClick={() => useTerrainExportStore.getState().setOpen(!exportOpen)}>TERRAIN EXPORT</button>
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
        {panels.right && <QuickTools />}
      </div>
      <WorkspaceFooter />
    </div>}
      {exportOpen && <TerrainExportPanel />}
      {showChunkDialog && <ChunkCreationDialog
        initialGrid={chunkDialogGrid}
        initialMapPosition={chunkDialogMapPosition}
        playerPosition={playerPosition}
        onClose={() => { setShowChunkDialog(false); setChunkDialogGrid(""); setChunkDialogMapPosition(null); }}
      />}
    </>
  );
}