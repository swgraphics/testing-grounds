import {useEffect} from 'react';
import {useInteractionStore} from '../../systems/interaction/interactionStore';

// Nonvisual lifecycle formerly hidden inside the orphaned Terrain Control panel.
export default function WorldToolLifecycle(){
  const tool=useInteractionStore(state=>state.activeTool),mode=useInteractionStore(state=>state.activeMode);
  useEffect(()=>{
    document.body.classList.toggle('tg-tool-active',Boolean(tool&&['sculpt','grab','place','edit'].includes(mode)));
    return()=>document.body.classList.remove('tg-tool-active');
  },[tool,mode]);
  return null;
}
