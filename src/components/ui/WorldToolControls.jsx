import {WORLD_TOOLS} from '../../systems/interaction/worldTools';
import {useInteractionStore} from '../../systems/interaction/interactionStore';
import {activateWorldTool,openObjectLibrary} from '../../systems/ui/navigationActions';
import {clearGameplayInput} from '../../systems/input/inputOwnership';
import './WorldToolControls.css';
import CanyonEdgeControls from './CanyonEdgeControls';

export default function WorldToolControls({origin='east'}){
  const activeTool=useInteractionStore(state=>state.activeTool),mode=useInteractionStore(state=>state.activeMode);
  const diameter=useInteractionStore(state=>state.waterDiameter);
  return <div className="tg-world-tool-controls" data-world-tools={origin} data-input-context="panel">
    {['terrain','world'].map(group=><section key={group} aria-label={group==='terrain'?'Terrain brushes':'Direct world tools'}>
      <h3>{group==='terrain'?'TERRAIN BRUSHES':'DIRECT WORLD TOOLS'}</h3>
      <div className="tg-world-tool-buttons">{WORLD_TOOLS.filter(tool=>tool.group===group).map(tool=><button type="button" className="tg-ui-button" key={tool.id} data-world-tool={tool.id} aria-pressed={activeTool===tool.id&&Boolean(mode)} onClick={()=>{clearGameplayInput();activateWorldTool(tool.id,undefined,{retainFocus:true})}}>{tool.label}</button>)}</div>
    </section>)}
    {activeTool==='POND'&&<label className="tg-pond-diameter">POND DIAMETER <output>{diameter} m</output><input type="range" min="8" max="120" step="4" value={diameter} aria-label="Pond diameter" data-pond-diameter onChange={event=>useInteractionStore.getState().setWaterDiameter(event.target.value)}/></label>}
    {origin==='east'&&activeTool==='CANYON_EDGE'&&<CanyonEdgeControls embedded/>}
    <button type="button" className="tg-ui-button tg-tool-library" data-tools-library onClick={()=>openObjectLibrary('select')}>OBJECTS // LIBRARY</button>
    <p className="tg-world-tool-hint">Click the viewport to use the selected tool. Controller: B closes this panel; RT performs the world action.</p>
  </div>;
}
