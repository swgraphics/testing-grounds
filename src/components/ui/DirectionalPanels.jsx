import { teleportToChunk } from "../../systems/world/terrainReadiness";
import { useEffect, useRef, useState, useCallback } from "react";
import { useWorldStore } from "../../systems/world/worldStore";
import { useHistoryStore } from "../../systems/history/historyStore";
import { PANEL_DIRECTIONS, useEditorStore, panelLayoutStyle } from "../../systems/editor/editorStore";
import { clearGameplayInput } from "../../systems/input/inputOwnership";
import { useNavigationStore } from "../../systems/ui/navigationStore";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { runNavigationAction } from "../../systems/ui/navigationActions";
import { saveWorldSettings, loadWorldSettings, saveCurrentChunk, loadCurrentChunk, resetCurrentChunk } from "../../systems/terrain/terrainSettings";
import { hasSavedWorld, hasSavedChunk } from "../../systems/world/worldPersistence";
import WorldMap from "./WorldMap";
import ChunkCreationDialog from "./ChunkCreationDialog";
import { TerrainTools } from "./WorkspaceTools";
import { PANEL_DEFINITIONS } from "../../systems/ui/directionalPanelRegistry";
import { useInteractionStore } from "../../systems/interaction/interactionStore";

const DIRECTIONAL_PANELS = Object.freeze({
  north: { title: PANEL_DEFINITIONS.north.label, component: WorldEditorPanel },
  south: { title: "OBJECTS // LIBRARY", component: ObjectsPanel },
  west: { title: PANEL_DEFINITIONS.west.label, component: WorldMapPanel },
  east: { title: "DEV TOOLS", component: DevToolsPanel },
});

export function DirectionalPanelLayout({ viewMode, visiblePanels, ...hosts }) {
  const worldMapSize=useEditorStore(state=>state.worldMapSize);
  const anyVisible = Object.values(visiblePanels).some(Boolean);
  const panelControlHost=Object.keys(DIRECTIONAL_PANELS).find(direction=>visiblePanels[direction]);
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
  return <div className={`tg-directional-layout ${viewMode}`} data-view-mode={viewMode} style={panelLayoutStyle(visiblePanels,worldMapSize)}>
    {PANEL_DIRECTIONS.map(direction => {
      const Content = DIRECTIONAL_PANELS[direction].component;
      const title = DIRECTIONAL_PANELS[direction].title;
      return <div className={`tg-panel-region ${direction}`} key={direction}>
        <DirectionalPanel direction={direction} visible={visiblePanels[direction]} onCollapse={() => setExpanded(direction, false)} panelControls={direction === panelControlHost ? <PanelVisibilityControls visiblePanels={visiblePanels} onSetExpanded={setExpanded} /> : null}><Content {...hosts} /></DirectionalPanel>
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
      {PANEL_DIRECTIONS.map(direction => <button key={direction} className="tg-ui-button" data-panel-toggle={direction} aria-label={`${visiblePanels[direction] ? "Collapse" : "Expand"} ${DIRECTIONAL_PANELS[direction].title}`} aria-pressed={visiblePanels[direction]} onClick={() => onSetExpanded(direction, !visiblePanels[direction], direction === "north")}>
        <span aria-hidden="true">{visiblePanels[direction] ? "\u2212" : "+"}</span> {DIRECTIONAL_PANELS[direction].title}
      </button>)}
    </div>
  </details>;
}

function DirectionalPanel({ direction, visible, onCollapse, panelControls, children }) {
  return <section hidden={!visible} id={`tg-panel-${direction}`} className={`tg-directional-panel tg-hud-surface ${direction}`} data-directional-panel={direction} data-input-context="panel" aria-labelledby={`tg-heading-${direction}`}>
    <header className="tg-directional-heading">
      <h2 id={`tg-heading-${direction}`}>{DIRECTIONAL_PANELS[direction].title}</h2>
      {panelControls}
      <button className="tg-panel-collapse tg-ui-button" data-panel-collapse={direction} aria-label={`Collapse ${DIRECTIONAL_PANELS[direction].title}`} aria-expanded={true} aria-controls={`tg-panel-${direction}`} onClick={onCollapse}>−</button>
    </header>
    <div className="tg-directional-content">{children}</div>
    {direction==='west'&&<WorldMapResizeHandle />}
  </section>;
}

function WorldMapResizeHandle() {
  const drag=useRef(null);
  const finish=useCallback(()=>{
    const active=drag.current;drag.current=null;
    if(active?.element.hasPointerCapture(active.pointerId))active.element.releasePointerCapture(active.pointerId);
    if(useInteractionStore.getState().gestureOwner==='world-map-resize')useInteractionStore.getState().setGestureOwner(null);
  },[]);
  useEffect(()=>{
    const move=event=>{const d=drag.current;if(!d||event.pointerId!==d.pointerId)return;event.preventDefault();resize(d.width+event.clientX-d.x,d.height+event.clientY-d.y,d.element)};
    window.addEventListener('pointermove',move,true);
    for(const name of ['pointerup','pointercancel','blur','tg-return-to-world'])window.addEventListener(name,finish,true);
    return()=>{window.removeEventListener('pointermove',move,true);for(const name of ['pointerup','pointercancel','blur','tg-return-to-world'])window.removeEventListener(name,finish,true);finish()};
  },[finish]);
  function resize(width,height,element) {
    const region=element.closest('.tg-panel-region'),layout=region.parentElement;
    const east=layout.querySelector('.tg-panel-region.east').getBoundingClientRect().width;
    const limits={width:window.innerWidth-east-Math.min(240,window.innerWidth*.3)-32,height:region.getBoundingClientRect().height};
    useEditorStore.getState().resizeWorldMap(width,height,limits);
  }
  return <button type="button" className="tg-map-resize" data-map-resize aria-label="Resize World Map" title="Drag to resize World Map; double click to reset" onDoubleClick={()=>useEditorStore.getState().resetWorldMapSize()} onPointerDown={event=>{
    event.preventDefault();event.stopPropagation();clearGameplayInput();document.activeElement?.blur();
    const rect=event.currentTarget.closest('section').getBoundingClientRect();drag.current={x:event.clientX,y:event.clientY,width:rect.width,height:rect.height,element:event.currentTarget,pointerId:event.pointerId};
    useInteractionStore.getState().setGestureOwner('world-map-resize');event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} onKeyDown={event=>{
    if(!event.key.startsWith('Arrow'))return;event.preventDefault();const r=event.currentTarget.closest('section').getBoundingClientRect();resize(r.width+({ArrowRight:20,ArrowLeft:-20}[event.key]??0),r.height+({ArrowDown:20,ArrowUp:-20}[event.key]??0),event.currentTarget);
  }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20 20 8M13 20l7-7M18 20l2-2" fill="none" stroke="currentColor" strokeWidth="2" /></svg></button>;
}

function WorldMapPanel() {
  const world = useWorldStore(state => state.world);
  const currentChunk = world.chunks[world.currentChunkId];
  const [chunkDialog, setChunkDialog] = useState(null);
  const [chunkFeedback,setChunkFeedback]=useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);
  useEffect(()=>{const close=()=>{setChunkDialog(null);setRenamingId(null)};window.addEventListener('tg-return-to-world',close);return()=>window.removeEventListener('tg-return-to-world',close)},[]);
  useEffect(() => {
    const updatePosition = event => {
      const { x, y, z } = event.detail ?? {};
      if ([x, y, z].every(Number.isFinite)) setPlayerPosition([x, y, z]);
    };
    window.addEventListener("player-position-changed", updatePosition);
    return () => window.removeEventListener("player-position-changed", updatePosition);
  }, []);
  async function teleport(chunk) {
    setChunkFeedback({message:"Locating "+chunk.name+"..."});
    const result=await teleportToChunk(chunk.id);setChunkFeedback(result);
  }
  function finishRename() {
    if (renameValue.trim()) useWorldStore.getState().renameChunk(renamingId, renameValue.trim());
    setRenamingId(null);
  }
  return <>
    <div className="tg-map-layout">
      <WorldMap onSelectChunk={teleport} onAddChunk={(grid, mapPosition) => setChunkDialog({ grid: grid ?? "", mapPosition: mapPosition ?? null })} />
      <div className="tg-map-controls">
        {chunkFeedback&&<p role="status" data-chunk-feedback>{chunkFeedback.message} {chunkFeedback.id&&<button className="tg-ui-button" data-locate-new-chunk onClick={()=>teleport(world.chunks[chunkFeedback.id])}>LOCATE CHUNK</button>}</p>}
        {world.terrainSurface&&<p className="tg-current-area">Connected terrain // chunk shape settings blend at shared borders.</p>}
        <p className="tg-current-area">{currentChunk?.grid} // {currentChunk?.name || "NO AREA"}</p>
        <nav className="tg-teleport-controls" aria-label="Teleport to chunk">
          {Object.values(world.chunks).sort((a, b) => String(a.grid).localeCompare(String(b.grid), undefined, { numeric: true })).map(chunk => renamingId === chunk.id
            ? <input key={chunk.id} className="tg-editor-area-rename-input" aria-label="Rename chunk" autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} onBlur={finishRename} onKeyDown={event => {
              if (event.key === "Enter") finishRename();
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenamingId(null); }
            }} />
            : <button key={chunk.id} className="tg-ui-button" aria-pressed={chunk.id === world.currentChunkId} onClick={() => teleport(chunk)} onDoubleClick={() => { setRenamingId(chunk.id); setRenameValue(chunk.name ?? chunk.grid); }}>{world.terrainSurface&&!chunk.terrainRegion?"AREA ":""}{chunk.grid} // {chunk.name}</button>)}
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
    {chunkDialog && <ChunkCreationDialog initialGrid={chunkDialog.grid} initialMapPosition={chunkDialog.mapPosition} playerPosition={playerPosition} onCreated={setChunkFeedback} onClose={() => setChunkDialog(null)} />}
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
  return <div className="tg-world-editor-toolbar">
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
  </div>;
}

function DevToolsPanel({ onDevToolsHost }) {
  return <div className="tg-dev-tools-host" ref={onDevToolsHost} />;
}
