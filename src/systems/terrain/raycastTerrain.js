import {Vector3} from 'three';
import {getCommittedTerrainHeightAt} from './terrainHeight';
import {hasTerrainAt} from '../world/terrainRegions';
import {useWorldStore} from '../world/worldStore';

// Return the first surface crossing, including steep walls and multiple hills.
// This is interaction sampling only; no render mesh or collider is rebuilt.
export function raycastCommittedTerrain(ray){
  const p=new Vector3(),h=getCommittedTerrainHeightAt;
  let previous=0,old=ray.origin.y-h(ray.origin.x,ray.origin.z);
  for(let distance=2;distance<=900;distance+=Math.min(5,Math.max(2,distance*.015))){
    ray.at(distance,p);const value=p.y-h(p.x,p.z);
    if(old>=0&&value<=0&&hasTerrainAt(p.x,p.z,useWorldStore.getState().world)){
      let low=previous,high=distance;
      for(let i=0;i<14;i++){const middle=(low+high)/2;ray.at(middle,p);if(p.y-h(p.x,p.z)>0)low=middle;else high=middle}
      ray.at((low+high)/2,p);return p;
    }
    previous=distance;old=value;
  }
  return null;
}
