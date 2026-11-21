import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from 'react';
import { useWorldStore } from '../../systems/world/worldStore';
import { useHistoryStore } from '../../systems/history/historyStore';
import { useWorldGuideStore } from '../../systems/ui/worldGuideStore';
import { useDevSetting } from '../../systems/dev/useDevSetting';
import { useCompassShortcutStore } from '../../systems/ui/compassShortcutStore';
import { getCompassActions, getCompassAction, executeCompassAction, compassActionUnavailable, subscribeCompassActions, compassActionRevision } from '../../systems/ui/compassActionRegistry';
function ShortcutPicker({ slot, onClose, onAssign }) {
  const [query,setQuery]=useState(''),[category,setCategory]=useState('All');
  const root=useRef(null);
  useSyncExternalStore(subscribeCompassActions,compassActionRevision,compassActionRevision);
  const actions=getCompassActions();
  useEffect(()=>{
    const previous=document.activeElement;
    const compass=document.querySelector('[data-compass]');
    if(compass)compass.inert=true;
    root.current?.querySelector('input')?.focus();
    const close=()=>onClose();window.addEventListener('tg-shortcut-picker-close',close);
    return ()=>{if(compass)compass.inert=false;window.removeEventListener('tg-shortcut-picker-close',close);window.requestAnimationFrame(()=>{if(previous?.isConnected)previous.focus();else document.querySelector('[data-shortcut-slot="'+slot+'"]')?.focus()})};
  },[onClose,slot]);
  const filtered=actions.filter(a=>(category==='All'||a.category===category)&&(a.label+' '+a.category).toLowerCase().includes(query.toLowerCase()));
  return createPortal(<div className="tg-shortcut-picker-backdrop" onPointerDown={event=>{event.stopPropagation();if(event.target===event.currentTarget)event.preventDefault()}}><section className="tg-shortcut-picker tg-hud-surface" ref={root} role="dialog" aria-modal="true" aria-label={'Assign shortcut '+(slot+1)} data-input-context="panel">
    <header><h2>SHORTCUT {slot+1}</h2><button className="tg-ui-button" aria-label="Close shortcut assignment" onClick={onClose}>X</button></header>
    <input aria-label="Find an action" type="search" placeholder="Find a tool or function" value={query} onChange={e=>setQuery(e.target.value)} />
    <nav aria-label="Action categories">{['All',...new Set(actions.map(a=>a.category))].map(name=><button key={name} className="tg-ui-button" aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</nav>
    <div className="tg-shortcut-action-list">{filtered.map(action=><button key={action.id} className="tg-ui-button" data-assign-action={action.id} onClick={()=>onAssign(slot,action.id)}><span>{action.label}</span><small>{action.category}{compassActionUnavailable(action.id)?' / currently unavailable':''}</small></button>)}{!filtered.length&&<p role="status">No matching actions.</p>}</div>
  </section></div>,document.body);
}
export default function CompassShortcuts() {
  const slots=useCompassShortcutStore(s=>s.slots),storageError=useCompassShortcutStore(s=>s.storageError);
  const [editing,setEditing]=useState(null),[feedback,setFeedback]=useState('');
  useWorldStore(s=>s.world);useHistoryStore(s=>s.revision);useWorldGuideStore(s=>s.visible);useDevSetting('fpvMode');
  useSyncExternalStore(subscribeCompassActions,compassActionRevision,compassActionRevision);
  const closePicker=useCallback(()=>setEditing(null),[]);
  return <>
    <aside className="tg-compass-shortcuts" data-compass-group="shortcuts" aria-label="Compass Shortcuts" title="LB/RB changes Compass groups">
      <h2>SHORTCUTS //</h2>
      {slots.map((id,index)=>{const action=getCompassAction(id),reason=id?compassActionUnavailable(id):null;return <div className="tg-shortcut-slot" key={index}>
        <button className="tg-ui-button tg-shortcut-activate" data-shortcut-slot={index} aria-label={id?(action?.label??'Unavailable shortcut'):'Assign shortcut '+(index+1)} aria-disabled={Boolean(reason)} aria-pressed={action?.pressed?.()} title={reason??action?.label??'Assign a tool or function'} onClick={()=>{if(!id)setEditing(index);else setFeedback(executeCompassAction(id).message)}}>{id?(action?.label??'UNAVAILABLE ACTION'):'+'}</button>
        {id&&<><button className="tg-ui-button tg-shortcut-edit" aria-label={'Replace shortcut '+(index+1)} onClick={()=>setEditing(index)}>...</button><button className="tg-ui-button tg-shortcut-edit" aria-label={'Clear shortcut '+(index+1)} onClick={()=>{useCompassShortcutStore.getState().assign(index,null);setFeedback('Shortcut '+(index+1)+' cleared.')}}>X</button></>}
      </div>})}
    </aside>
    {editing!==null&&<ShortcutPicker slot={editing} onClose={closePicker} onAssign={(slot,id)=>{useCompassShortcutStore.getState().assign(slot,id);setEditing(null);setFeedback('Shortcut assigned.')}} />}
    {(feedback||storageError)&&<p className="tg-compass-feedback" role="status">{storageError||feedback}</p>}
  </>;
}
