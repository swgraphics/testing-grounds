import { useEffect, useRef, useState } from "react";
import { useWorldStore } from "../../systems/world/worldStore";
import { useHistoryStore } from "../../systems/history/historyStore";
import { PANEL_DIRECTIONS, useEditorStore, panelLayoutStyle } from "../../systems/editor/editorStore";
import { clearGameplayInput } from "../../systems/input/inputOwnership";
import { useNavigationStore } from "../../systems/ui/navigationStore";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { returnToWorldView, runNavigationAction } from "../../systems/ui/navigationActions";
import { saveWorldSettings, loadWorldSettings, saveCurrentChunk, loadCurrentChunk, resetCurrentChunk } from "../../systems/terrain/terrainSettings";
import { hasSavedWorld, hasSavedChunk } from "../../systems/world/worldPersistence";
import WorldMap from "./WorldMap";
import ChunkCreationDialog from "./ChunkCreationDialog";
import { TerrainTools } from "./WorkspaceTools";

const DIRECTIONAL_PANELS = Object.freeze({
  north: { title: "WORLD // MAP", component: WorldMapPanel },
  south: { title: "OBJECTS // LIBRARY", component: ObjectsPanel },
  west: { title: "WORLD EDITOR", component: WorldEditorPanel },
  east: { title: "DEV TOOLS", component: DevToolsPanel },
});

export function DirectionalPanelLayout({ viewMode, visiblePanels, ...hosts }) {
  const anyVisible = Object.values(visiblePanels).some(Boolean);
  function setExpanded(direction, expanded, moveFocus = true) {
    const store = useEditorStore.getState();
    if (expanded) store.openPanel(direction); else store.closePanel(direction);
    clearGameplayInput();
    if (!moveFocus) return;
    document.activeElement?.blur?.();
    window.requestAnimationFrame(() => {
      const control = document.querySelector(expanded ? `[data-panel-collapse="${direction}"]` : `[data-panel-expand="${direction}"]`);
      (control || document.querySelector(".tg-compass-activate"))?.focus({ preventScroll: true });
    });
  }
  return <div className={`tg-directional-layout ${viewMode}`} data-view-mode={viewMode} style={panelLayoutStyle(visiblePanels)}>
    {PANEL_DIRECTIONS.map(direction => {
      const Content = DIRECTIONAL_PANELS[direction].component;
      const title = DIRECTIONAL_PANELS[direction].title;
      return <div className={`tg-panel-region ${direction}`} key={direction}>
        <DirectionalPanel direction={direction} visible={visiblePanels[direction]} onCollapse={() => setExpanded(direction, false)} panelControls={viewMode === "editor" && direction === "north" ? <PanelVisibilityControls visiblePanels={visiblePanels} onSetExpanded={setExpanded} /> : null}><Content {...hosts} /></DirectionalPanel>
        {anyVisible && !visiblePanels[direction] && <button className="tg-panel-expand tg-ui-button" data-panel-expand={direction} aria-label={`Expand ${title}`} aria-expanded={false} aria-controls={`tg-panel-${direction}`} data-input-context="panel" onClick={() => setExpanded(direction, true)}>+</button>}
      </div>;
    })}
  </div>;
}

function PanelVisibilityControls({ visiblePanels, onSetExpanded }) {
  const disclosure = useRef(null);
  useEffect(() => { if (!visiblePanels.north && disclosure.current) disclosure.current.open = false; }, [visiblePanels.north]);
  return <details ref={disclosure} className="tg-panel-visibility">
    <summary className="tg-ui-button">PANELS</summary>
    <div className="tg-panel-visibility-menu tg-hud-surface" role="group" aria-label="Panel visibility">
      {PANEL_DIRECTIONS.map(direction => <button key={direction} className="tg-ui-button" data-panel-toggle={direction} aria-pressed={visiblePanels[direction]} onClick={() => onSetExpanded(direction, !visiblePanels[direction], direction === "north")}>
        {visiblePanels[direction] ? "HIDE" : "SHOW"} {DIRECTIONAL_PANELS[direction].title}
      </button>)}
      <button className="tg-ui-button" onClick={returnToWorldView}>WORLD VIEW</button>
    </div>
  </details>;
}

function DirectionalPanel({ direction, visible, onCollapse, panelControls, children }) {
  return <section hidden={!visible} id={`tg-panel-${direction}`} className={`tg-directional-panel tg-hud-surface ${direction}`} data-directional-panel={direction} data-input-context="panel" aria-labelledby={`tg-heading-${direction}`}>
    <header className="tg-directional-heading">
      <h2 id={`tg-heading-${direction}`}>{DIRECTIONAL_PANELS[direction].title}</h2>
      {panelControls}
      {direction === "north" && <button className="tg-ui-button" data-action="world-view" onClick={returnToWorldView}>WORLD VIEW</button>}
      <button className="tg-panel-collapse tg-ui-button" data-panel-collapse={direction} aria-label={`Collapse ${DIRECTIONAL_PANELS[direction].title}`} aria-expanded={true} aria-controls={`tg-panel-${direction}`} onClick={onCollapse}>−</button>
    </header>
    <div className="tg-directional-content">{children}</div>
  </section>;
}

function WorldMapPanel() {
  const world = useWorldStore(state => state.world);
  const currentChunk = world.chunks[world.currentChunkId];
  const [chunkDialog, setChunkDialog] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);
  useEffect(() => {
    const updatePosition = event => {
      const { x, y, z } = event.detail ?? {};
      if ([x, y, z].every(Number.isFinite)) setPlayerPosition([x, y, z]);
    };
    window.addEventListener("player-position-changed", updatePosition);
    return () => window.removeEventListener("player-position-changed", updatePosition);
  }, []);
  function teleport(chunk) {
    useWorldStore.getState().setCurrentChunk(chunk.id);
    window.dispatchEvent(new CustomEvent("tg-teleport-to-area", { detail: { areaId: chunk.id, chunkId: chunk.id } }));
  }
  function finishRename() {
    if (renameValue.trim()) useWorldStore.getState().renameChunk(renamingId, renameValue.trim());
    setRenamingId(null);
  }
  return <>
    <div className="tg-north-layout">
      <WorldMap onSelectChunk={teleport} onAddChunk={(grid, mapPosition) => setChunkDialog({ grid: grid ?? "", mapPosition: mapPosition ?? null })} />
      <div className="tg-map-controls">
        <p className="tg-current-area">{currentChunk?.grid} // {currentChunk?.name || "NO AREA"}</p>
        <nav className="tg-teleport-controls" aria-label="Teleport to chunk">
          {Object.values(world.chunks).sort((a, b) => String(a.grid).localeCompare(String(b.grid), undefined, { numeric: true })).map(chunk => renamingId === chunk.id
            ? <input key={chunk.id} className="tg-editor-area-rename-input" aria-label="Rename chunk" autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} onBlur={finishRename} onKeyDown={event => {
              if (event.key === "Enter") finishRename();
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenamingId(null); }
            }} />
            : <button key={chunk.id} className="tg-ui-button" aria-pressed={chunk.id === world.currentChunkId} onClick={() => teleport(chunk)} onDoubleClick={() => { setRenamingId(chunk.id); setRenameValue(chunk.name ?? chunk.grid); }}>{chunk.grid} // {chunk.name}</button>)}
        </nav>
        <div className="tg-panel-actions tg-area-navigation" aria-label="Area navigation">
          <button className="tg-ui-button" onClick={() => runNavigationAction("previous-area")}>PREVIOUS AREA</button>
          <button className="tg-ui-button" onClick={() => runNavigationAction("current-area")}>CURRENT AREA</button>
          <button className="tg-ui-button" onClick={() => runNavigationAction("next-area")}>NEXT AREA</button>
          <button className="tg-ui-button" onClick={() => useWorldGuideStore.getState().toggle()}>WORLD GUIDES</button>
        </div>
        <div className="tg-panel-actions tg-chunk-actions" aria-label="Chunk management">
          <button className="tg-ui-button" onClick={() => setChunkDialog({ grid: "", mapPosition: null })}>ADD CHUNK</button>
          <button className="tg-ui-button" disabled={!currentChunk} onClick={() => saveCurrentChunk()}>SAVE CHUNK</button>
          <button className="tg-ui-button" disabled={!currentChunk || !hasSavedChunk(world.currentChunkId)} onClick={() => loadCurrentChunk()}>LOAD CHUNK</button>
          <button className="tg-ui-button" disabled={!currentChunk} onClick={() => resetCurrentChunk()}>RESET CHUNK</button>
        </div>
      </div>
    </div>
    {chunkDialog && <ChunkCreationDialog initialGrid={chunkDialog.grid} initialMapPosition={chunkDialog.mapPosition} playerPosition={playerPosition} onClose={() => setChunkDialog(null)} />}
  </>;
}

function ObjectsPanel({ onLibraryHost }) {
  return <div className="tg-object-library-host" ref={onLibraryHost} />;
}

// Registration point for future Project actions. No Project persistence exists yet.
const PROJECT_ACTIONS = Object.freeze([]);
function WorldEditorPanel() {
  const savedWorldAvailable = useWorldStore(() => hasSavedWorld());
  const canUndo = useHistoryStore(state => state.undoStack.length > 0);
  const canRedo = useHistoryStore(state => state.redoStack.length > 0);
  return <>
    <section className="tg-world-group" aria-label="World management"><h3>WORLD</h3>
    <div className="tg-panel-actions tg-world-actions">
      <button className="tg-ui-button" onClick={saveWorldSettings}>SAVE WORLD</button>
      <button className="tg-ui-button" disabled={!savedWorldAvailable} onClick={loadWorldSettings}>LOAD WORLD</button>
      <button className="tg-ui-button" disabled={!canUndo} onClick={() => useHistoryStore.getState().undo()}>UNDO</button>
      <button className="tg-ui-button" disabled={!canRedo} onClick={() => useHistoryStore.getState().redo()}>REDO</button>
    </div></section>
    <section className="tg-world-group tg-project-planned" aria-label="Project support planned"><h3>PROJECT <small>PLANNED</small></h3>
    <div className="tg-panel-actions tg-world-actions">
      <button className="tg-ui-button" disabled>LOAD PROJECT (PLANNED)</button>
      <button className="tg-ui-button" disabled>SAVE PROJECT (PLANNED)</button>
      {PROJECT_ACTIONS.map(action => <button key={action.id} className="tg-ui-button" onClick={action.run}>{action.label}</button>)}
    </div></section>
    <section className="tg-world-group" aria-label="Tools and support"><h3>TOOLS &amp; SUPPORT</h3>
    <div className="tg-panel-actions tg-world-actions">
      <button className="tg-ui-button" onClick={() => runNavigationAction("export")}>TERRAIN EXPORT</button>
      <button className="tg-ui-button" onClick={() => useNavigationStore.getState().setHelp(true)}>HELP / CONTROLS</button>
    </div>
    <TerrainTools />
    </section>
  </>;
}

function DevToolsPanel({ onDevToolsHost }) {
  return <div className="tg-dev-tools-host" ref={onDevToolsHost} />;
}
