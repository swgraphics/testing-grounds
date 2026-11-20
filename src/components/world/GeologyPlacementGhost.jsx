import {useEffect,useLayoutEffect,useMemo} from 'react';
import * as THREE from 'three';
import {Line} from '@react-three/drei';
import {draftGeologyFeature} from '../../systems/geology/geologyFeatures';
import {createGeologyGeometry} from '../../systems/geology/geologyGeometry';
import {compileGeologyField} from '../../systems/geology/geologyField';
import {getCommittedTerrainHeightAt} from '../../systems/terrain/terrainHeight';
import {hasTerrainAt} from '../../systems/world/terrainRegions';
import {useWorldStore} from '../../systems/world/worldStore';

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
  return <group userData={{tgGeologyGhost:true,definition:record.definition,feature:record}}>
    <mesh geometry={geometry} position={record.position} renderOrder={200}><meshStandardMaterial color="#82a7be" transparent opacity={.65} depthWrite={false} depthTest={false} flatShading side={THREE.DoubleSide}/></mesh>
    {!replaceRecord&&<><Line points={corners} color="#102030" lineWidth={7} depthTest={false} renderOrder={202}/><Line points={corners} color="#2a8fff" lineWidth={4} depthTest={false} renderOrder={203}/><Line points={corners} color="white" lineWidth={1} depthTest={false} renderOrder={204}/></>}
  </group>;
}
