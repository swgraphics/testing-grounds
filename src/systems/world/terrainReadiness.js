import { useWorldStore } from './worldStore';
import { clearGameplayInput } from '../input/inputOwnership';
import { hasTerrainAt, containsPoint, BASE_TERRAIN_BOUNDS } from './terrainRegions';

const ready=new Map();
let request=0;
export function markTerrainReady(id,token) {
  ready.set(id,token);window.dispatchEvent(new Event('tg-terrain-ready'));
  return ()=>{if(ready.get(id)===token)ready.delete(id)};
}
export async function teleportToChunk(id) {
  const nonce=++request,world=useWorldStore.getState().world,chunk=world.chunks[id];
  if(!chunk||!hasTerrainAt(chunk.position[0],chunk.position[2],world))return {ok:false,message:'This area has no terrain at its saved location.'};
  const region=containsPoint(BASE_TERRAIN_BOUNDS,chunk.position[0],chunk.position[2])?'base-terrain':id;
  if(!ready.has(region)) await new Promise(resolve=>{
    const finish=()=>{window.removeEventListener('tg-terrain-ready',check);clearTimeout(timeout);resolve()};
    const check=()=>{if(ready.has(region))finish()};const timeout=setTimeout(finish,10000);
    window.addEventListener('tg-terrain-ready',check);check();
  });
  if(nonce!==request)return {ok:false,message:'A newer destination was selected.'};
  if(!ready.has(region)||!useWorldStore.getState().world.chunks[id])return {ok:false,message:'Terrain is not ready. Try locating the chunk again.'};
  useWorldStore.getState().setCurrentChunk(id);clearGameplayInput();document.activeElement?.blur?.();
  window.dispatchEvent(new PointerEvent('pointerup'));
  window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:id,chunkId:id}}));
  return {ok:true,message:`Located ${chunk.name}.`};
}
