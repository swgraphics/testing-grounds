import {useCanyonEdgeStore} from '../../systems/geology/canyonEdgeStore';
import {useInteractionStore} from '../../systems/interaction/interactionStore';
import {useEditorStore} from '../../systems/editor/editorStore';
import './CanyonEdgeControls.css';

export default function CanyonEdgeControls({embedded=false}){
  const active=useInteractionStore(s=>s.activeTool==='CANYON_EDGE'),east=useEditorStore(s=>s.visiblePanels.east),ui=useCanyonEdgeStore();
  if(!active||!embedded&&east)return null;
  const selection=ui.selection??ui.hover,parameters=ui.draftParameters??ui.parameters;
  const act=fn=>{fn();if(!embedded)document.activeElement?.blur()};
  const message=ui.proposal?(ui.held?'PREVIEW: release in the viewport to confirm.':'PREVIEW: Apply, or click the viewport to confirm.'):selection?(ui.selection?'SELECTED':'HOVER')+': '+selection.mode+' / '+(selection.side==='left'?'LEFT WALL':'RIGHT WALL'):'Aim at a raised wall. Middle: reshape. Endpoint: extend.';
  return <aside className={embedded?'tg-canyon-settings':'tg-geology-canyon-controls'} data-canyon-controls={embedded?'east':'world'} data-input-context="panel" aria-label="Canyon Edge controls">
    <strong>DRAW CANYON EDGE</strong>
    <div className="tg-panel-actions"><button type="button" className="tg-ui-button" aria-pressed={ui.mode==='select'} data-canyon-mode="select" onClick={()=>act(()=>ui.setMode('select'))}>SELECT WALL</button><button type="button" className="tg-ui-button" aria-pressed={ui.mode==='new'} data-canyon-mode="new" onClick={()=>act(()=>ui.setMode('new'))}>NEW EDGE</button></div>
    {ui.mode==='select'&&<div className="tg-panel-actions">{[['auto','AUTO'],['widen','WIDEN'],['extend','EXTEND'],['deform','DEFORM EDGE']].map(([id,label])=><button type="button" className="tg-ui-button" key={id} data-canyon-operation={id} aria-pressed={ui.operation===id} disabled={ui.held} onClick={()=>act(()=>ui.setOperation(id))}>{label}</button>)}</div>}
    <span role="status" data-canyon-state>{message}</span>
    <details open={embedded||Boolean(ui.selection)}><summary>{ui.selection?'SELECTED WALL: PREVIEW SETTINGS':'TOOL DEFAULTS: FUTURE GESTURES'}</summary>
      <p className="tg-canyon-help">{ui.selection?'These settings affect the selected wall only after confirmation.':'Defaults do not change placed formations. Existing walls are sampled when selected.'}</p>
      {[
        ['height','EDGE HEIGHT',ui.selection?.scale??1,100*(ui.selection?.scale??1),ui.selection ? .1 : 1,'m'],
        ['width','EDGE WIDTH',ui.selection?4*(ui.selection.scale??1):8,160*(ui.selection?.scale??1),ui.selection ? .1 : 1,'m'],
        ['edgeDeformation','EDGE DEFORMATION',0,1,.01,''],
        ['seed','EDGE RANDOMIZER',1,ui.selection?.featureId?199999:99999,1,''],
      ].map(([key,label,min,max,step,unit])=><label key={key}>{label}<input type="range" min={min} max={max} step={step} value={parameters[key]} aria-label={'Canyon '+label.toLowerCase()} data-canyon-parameter={key} disabled={ui.held} onChange={event=>ui.setParameter(key,event.target.value)}/><output>{Number(parameters[key]).toFixed(step<1?2:0)} {unit}</output></label>)}
      {ui.mode==='new'&&<div className="tg-panel-actions">{['left','right'].map(side=><button type="button" key={side} className="tg-ui-button" disabled={ui.held} aria-pressed={parameters.side===side} onClick={()=>act(()=>ui.setParameter('side',side))}>{side.toUpperCase()} SHOULDER</button>)}</div>}
    </details>
    {ui.selection&&<div className="tg-panel-actions"><button type="button" className="tg-ui-button" data-canyon-apply disabled={!ui.proposal||ui.held} onClick={()=>act(()=>window.dispatchEvent(new Event('tg-canyon-confirm-preview')))}>APPLY PREVIEW</button><button type="button" className="tg-ui-button" data-canyon-cancel onClick={()=>act(()=>window.dispatchEvent(new Event('tg-canyon-cancel-preview')))}>CANCEL SELECTION</button></div>}
    <p className="tg-canyon-help">Drag across the wall; at an endpoint, drag along it. Deform Edge reshapes a bounded section. RT + stick previews; release confirms. Escape/B cancels the current preview first.</p>
    {ui.message&&<span role="status">{ui.message}</span>}
  </aside>;
}
