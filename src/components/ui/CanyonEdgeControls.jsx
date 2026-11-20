import {useCanyonEdgeStore} from '../../systems/geology/canyonEdgeStore';
import {useInteractionStore} from '../../systems/interaction/interactionStore';
import './CanyonEdgeControls.css';

export default function CanyonEdgeControls(){
  const active=useInteractionStore(s=>s.activeTool==='CANYON_EDGE'),ui=useCanyonEdgeStore();
  if(!active)return null;
  const selection=ui.selection??ui.hover;
  const action=fn=>{fn();document.activeElement?.blur()};
  return <aside className="tg-geology-canyon-controls" data-input-context="panel" aria-label="Canyon Edge controls">
    <strong>DRAW CANYON EDGE</strong>
    <div className="tg-panel-actions"><button className="tg-ui-button" aria-pressed={ui.mode==='select'} data-canyon-mode="select" onClick={()=>action(()=>ui.setMode('select'))}>SELECT WALL</button><button className="tg-ui-button" aria-pressed={ui.mode==='new'} data-canyon-mode="new" onClick={()=>action(()=>ui.setMode('new'))}>NEW EDGE</button></div>
    {ui.mode==='select'?<><div className="tg-panel-actions">{[['auto','AUTO'],['widen','WIDEN'],['extend','EXTEND']].map(([id,label])=><button className="tg-ui-button" key={id} data-canyon-operation={id} aria-pressed={ui.operation===id} onClick={()=>action(()=>ui.setOperation(id))}>{label}</button>)}</div><span role="status">{ui.proposal?'PREVIEW — release to confirm':selection?(ui.selection?'SELECTED':'HOVER')+' · '+selection.mode+' · '+(selection.side==='left'?'LEFT WALL':'RIGHT WALL'):'Aim at a raised wall. Select its middle to widen or its end to extend.'}</span></>:<><span role="status">{ui.proposal?'PREVIEW — release to confirm':'Drag a new line, or click its start and end.'}</span><details><summary>NEW EDGE SETTINGS</summary>{[['height','HEIGHT',1,100,1],['width','WIDTH',8,80,1],['edgeDeformation','DEFORMATION',0,1,.01]].map(([key,label,min,max,step])=><label key={key}>{label}<input type="range" min={min} max={max} step={step} value={ui.parameters[key]} aria-label={'Canyon '+label.toLowerCase()} onChange={event=>ui.setParameter(key,Number(event.target.value))}/><output>{ui.parameters[key]}</output></label>)}<div className="tg-panel-actions">{['left','right'].map(side=><button key={side} className="tg-ui-button" aria-pressed={ui.parameters.side===side} onClick={()=>action(()=>ui.setParameter('side',side))}>{side.toUpperCase()} SHOULDER</button>)}</div></details></>}
    {ui.selection&&<button className="tg-ui-button" data-canyon-cancel onClick={()=>action(()=>{window.dispatchEvent(new Event('tg-canyon-cancel-preview'));useCanyonEdgeStore.setState({selection:null,proposal:null})})}>CLEAR SELECTION</button>}
    {ui.message&&<span role="status">{ui.message}</span>}
  </aside>;
}
