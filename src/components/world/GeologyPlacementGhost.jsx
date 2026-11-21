import {useEffect,useLayoutEffect,useMemo} from 'react';
import * as THREE from 'three';
import {Html,Line} from '@react-three/drei';
import {draftGeologyFeature} from '../../systems/geology/geologyFeatures';
import {createGeologyGeometry} from '../../systems/geology/geologyGeometry';
import {compileGeologyField} from '../../systems/geology/geologyField';
import {getCommittedTerrainHeightAt} from '../../systems/terrain/terrainHeight';
import {hasTerrainAt} from '../../systems/world/terrainRegions';
import {useWorldStore} from '../../systems/world/worldStore';
import {geologyEdgeDeformation,geologyWorldPoint} from '../../systems/geology/geologyDefinition';

export default function GeologyPlacementGhost({mesh,point,rotation,foundation,proposal,replaceRecord}) {
  const type=mesh?.geologyType,definition=mesh?.geologyDefinition,x=point?.x,z=point?.z;
  const draft=useMemo(()=>proposal?null:draftGeologyFeature(type,{...definition,rotation:rotation*180/Math.PI},[x,0,z],{foundation}),[proposal,type,definition,x,z,rotation,foundation]);
  const record=proposal??draft;
  const geometry=useMemo(()=>new THREE.BufferGeometry(),[]);
  useLayoutEffect(()=>{
    const previous=replaceRecord?compileGeologyField(replaceRecord):null,candidate=compileGeologyField(record);
    createGeologyGeometry(record,{baseHeightAt:(x,z)=>getCommittedTerrainHeightAt(x,z)-(previous?.heightAt(x,z)??0),clipAt:(x,z)=>hasTerrainAt(x,z,useWorldStore.getState().world)&&Math.abs(candidate.heightAt(x,z)-(previous?.heightAt(x,z)??0))>.001,lift:.15},geometry);
  },[geometry,record,replaceRecord]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const b=compileGeologyField(record).bounds;
  const corners=[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ],[b.minX,b.minZ]].map(([x,z])=>[x,getCommittedTerrainHeightAt(x,z)+.35,z]);
  const corridor=[];
  if(record.geologyType==='canyon-wall'){
    for(const side of ['left','right'])for(let i=0;i<=24;i++){
      const d=record.definition,t=side==='left'?i/24:1-i/24,x=-d.length/2+d.length*t,s=d.sides[side],sign=side==='left'?-1:1;
      const localZ=sign*Math.max(2,d.floorWidth/2+s.offset+geologyEdgeDeformation(s,x).offset),[wx,wz]=geologyWorldPoint(record,x,localZ);
      const previous=replaceRecord?compileGeologyField(replaceRecord).heightAt(wx,wz):0;
      corridor.push([wx,getCommittedTerrainHeightAt(wx,wz)-previous+compileGeologyField(record).heightAt(wx,wz)+.35,wz]);
    }
    corridor.push(corridor[0]);
  }
  return <group userData={{tgGeologyGhost:true,definition:record.definition,feature:record}}>
    <mesh geometry={geometry} position={record.position} renderOrder={200}><meshStandardMaterial color="#82a7be" transparent opacity={.65} depthWrite={false} depthTest={false} flatShading side={THREE.DoubleSide}/></mesh>
    {!replaceRecord&&<><Line points={corners} color="#102030" lineWidth={7} depthTest={false} renderOrder={202}/><Line points={corners} color="#2a8fff" lineWidth={4} depthTest={false} renderOrder={203}/><Line points={corners} color="white" lineWidth={1} depthTest={false} renderOrder={204}/></>}
    {corridor.length>1&&<group userData={{tgCanyonCorridor:true}}><Line points={corridor} color="#102030" lineWidth={6} depthTest={false} renderOrder={205}/><Line points={corridor} color="white" lineWidth={2} depthTest={false} dashed dashSize={2} gapSize={1} renderOrder={206}/></group>}
    {mesh&&<Html position={[record.position[0],record.position[1]+record.definition.height*record.definition.scale+4,record.position[2]]} center style={{pointerEvents:'none',whiteSpace:'nowrap',background:'rgba(5,8,12,.82)',color:'white',padding:'4px 7px',font:'11px monospace'}}><span data-geology-measurement>H {(record.definition.height*record.definition.scale).toFixed(1)} m · W {(record.definition.width*record.definition.scale).toFixed(1)} m · {record.geologyType==='canyon-wall'?'L':'D'} {(record.definition.length*record.definition.scale).toFixed(1)} m</span></Html>}
  </group>;
}
