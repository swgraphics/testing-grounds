import { useHistoryStore } from "../history/historyStore";
import { useWorldStore } from './worldStore';
import { getExpansionCandidates, terrainShape } from './terrainRegions';
import { terrainSettings } from '../terrain/terrainSettings';

export function addTerrainChunk({grid,name}={}) {
  const store=useWorldStore.getState(),world=store.world;
  const target=getExpansionCandidates(world).find(c=>c.grid===grid);
  if (!target) return {ok:false,message:'Choose an empty terrain cell connected to this world.'};
  const id=`terrain-${target.column}-${target.row}`;
  if (world.chunks[id]) return {ok:false,message:'That chunk identifier already exists.'};
  const settings=JSON.parse(JSON.stringify(terrainSettings));
  delete settings.terrainPreviewStamp;delete settings.terrainPreviewVersion;
  const terrainEdits=settings.terrainEdits ?? {};delete settings.terrainEdits;delete settings.terrainVertexEdits;
  if(!world.terrainSurface) {
    // Keep existing terrain Undo/Redo meaningful when promoting the visible area.
    const promote=entry=>{
      const paths=entry.metadata?.paths ?? [];
      if(!paths.some(p=>p[0]==='chunks'&&p[1]===world.currentChunkId&&p[2]==='terrain'))return entry;
      const convert=snapshot=>({...snapshot,terrainSurface:{terrainEdits:snapshot.chunks?.[world.currentChunkId]?.terrain?.terrainEdits,settings:{terrainEditVersion:snapshot.chunks?.[world.currentChunkId]?.terrain?.terrainEditVersion}}});
      return {...entry,before:convert(entry.before),after:convert(entry.after),metadata:{...entry.metadata,paths:paths.map(p=>p[0]==='chunks'&&p[1]===world.currentChunkId&&p[2]==='terrain'&&p[3]==='terrainEdits'?['terrainSurface','terrainEdits']:p[0]==='chunks'&&p[1]===world.currentChunkId&&p[2]==='terrain'&&p[3]==='terrainEditVersion'?['terrainSurface','settings','terrainEditVersion']:p)}};
    };
    const history=useHistoryStore.getState();useHistoryStore.setState({undoStack:history.undoStack.map(promote),redoStack:history.redoStack.map(promote)});
  }
  const surface=world.terrainSurface ?? {version:1,revision:0,baseChunkId:world.currentChunkId,settings,terrainEdits};
  const chunk={id,grid,name:String(name??'').trim().slice(0,32)||`CHUNK ${grid}`,position:target.position,coordinates:{column:target.column,row:target.row},terrainRegion:{version:1,size:target.size,initialShape:terrainShape(settings)},terrain:terrainShape(settings),water:{},objects:{},foliage:{},dirty:true,mapPosition:[target.column,target.row-1],mapLabel:grid,metadata:{source:'terrain-expansion'}};
  store.replaceWorld({...world,terrainSurface:surface,chunks:{...world.chunks,[id]:chunk}});
  store.setCurrentChunk(id);
  return {ok:true,id,chunk,message:`Created ${chunk.name} / ${grid} at X ${target.position[0]}, Z ${target.position[2]}.`};
}
