import {useEffect,useState} from 'react';
import {useWorldStore} from '../../systems/world/worldStore';
import {useInteractionStore} from '../../systems/interaction/interactionStore';

export default function GeologySelectionActions(){
  const target=useInteractionStore(state=>state.activeTarget),tool=useInteractionStore(state=>state.activeTool);
  const feature=useWorldStore(state=>state.world.geology?.features?.[target?.startsWith('object:')?target.slice(7):'']);
  const [message,setMessage]=useState('');
  useEffect(()=>{const update=e=>setMessage(e.detail?.message??'');window.addEventListener('tg-geology-message',update);return()=>window.removeEventListener('tg-geology-message',update)},[]);
  const edit=()=>window.dispatchEvent(new CustomEvent('tg-object-focus-edit',{detail:{id:feature.id,chunkId:feature.chunkId}}));
  return <>{message&&<div className="tg-cloud-placement-hint" role="alert">{message}<button className="tg-ui-button" onClick={()=>setMessage('')}>DISMISS</button></div>}{feature&&!tool&&<div className="tg-cloud-selection"><button className="tg-ui-button" data-geology-edit-selected onClick={edit}>{feature.name} / EDIT FORMATION</button></div>}</>;
}
