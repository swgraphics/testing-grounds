import { runNavigationAction } from '../../systems/ui/navigationActions';
import WorldToolControls from './WorldToolControls';

export function TerrainTools(){
  return <details className="tg-terrain-tools"><summary>TERRAIN / WORLD TOOLS</summary>
    <WorldToolControls origin="north"/>
    <div className="tg-panel-actions">
      <button className="tg-ui-button" onClick={()=>runNavigationAction('clouds')}>EDIT CLOUDS</button>
      <button className="tg-ui-button" onClick={()=>runNavigationAction('devtools')}>PLATEAU / TERRAIN SETTINGS</button>
      <button className="tg-ui-button" onClick={()=>runNavigationAction('compass-tools')}>COMPASS TOOLS</button>
    </div>
  </details>;
}
