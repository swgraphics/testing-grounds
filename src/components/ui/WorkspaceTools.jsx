import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { runNavigationAction } from "../../systems/ui/navigationActions";
import { useNavigationStore } from "../../systems/ui/navigationStore";

const BRUSHES = [["raise", "Raise"], ["lower", "Lower"], ["smooth", "Smooth"], ["flatten", "Flatten"], ["slope", "Path / Slope"], ["vertex", "Vertex Edit"]];
export function TerrainTools() {
  const activeTool = useInteractionStore(state => state.activeTool);
  return <details className="tg-terrain-tools">
    <summary>TERRAIN / WORLD TOOLS</summary>
    <div className="tg-panel-actions">
      {BRUSHES.map(([id, label]) => <button key={id} className="tg-ui-button" aria-pressed={activeTool === id.toUpperCase()} onClick={() => runNavigationAction("brush-" + id)}>{label}</button>)}
      <button className="tg-ui-button" onClick={() => runNavigationAction("river")}>DRAW RIVER</button>
      <button className="tg-ui-button" onClick={() => runNavigationAction("lake")}>LAKE</button>
      <button className="tg-ui-button" onClick={() => runNavigationAction("sun")}>MOVE SUN</button>
      <button className="tg-ui-button" onClick={() => runNavigationAction("clouds")}>EDIT CLOUDS</button>
      <button className="tg-ui-button" onClick={() => runNavigationAction("devtools")}>PLATEAU / TERRAIN SETTINGS</button>
      <button className="tg-ui-button" onClick={() => { const nav = useNavigationStore.getState(); nav.openCompass(); nav.enterMenu("tools"); }}>COMPASS TOOLS</button>
    </div>
  </details>;
}
