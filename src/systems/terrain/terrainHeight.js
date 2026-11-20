import { getTerrainRegions, containsPoint } from "../world/terrainRegions";
import * as THREE from "three";
import { terrainSettings } from "./terrainSettings";
import { getTerrainVertexEditDelta } from "./terrainVertexEditing";
import { getGeologyTerrainPreviewDelta } from "./terrainEdits";
import { getTerrainEditDelta } from "./terrainEdits";
import { useWorldStore } from "../world/worldStore";
import { getGeologyTerrainDelta } from '../geology/geologySampling';

// Shared by terrain sampling and frozen geology foundations; no world state in the base evaluator.
import { smoothStep, getProceduralTerrainHeightAt } from './terrainBase';
export { smoothStep, getProceduralTerrainHeightAt } from './terrainBase';
function getBaseCommittedHeightAt(x,z) {
  const world=useWorldStore.getState().world,surface=world.terrainSurface;
  const settings=surface?.settings ?? terrainSettings,blank=world.worldType==='blank';
  let height=getProceduralTerrainHeightAt(x,z,settings,blank);
  if(surface) {
    const region=getTerrainRegions(world).slice(1).find(r=>containsPoint(r,x,z));
    const chunk=region?world.chunks[region.id]:null;
    if(chunk?.terrainRegion) {
      const edge=Math.min(x-region.minX,region.maxX-x,z-region.minZ,region.maxZ-z);
      const blend=smoothStep(0,Math.min(20,chunk.terrainRegion.size/4),edge);
      height=THREE.MathUtils.lerp(height,getProceduralTerrainHeightAt(x,z,{...settings,...chunk.terrain},blank),blend);
    }
  }
  height += getTerrainEditDelta(x, z);
  height += getTerrainVertexEditDelta(x, z);


  return height;
}

export function getCommittedTerrainHeightAt(x, z) {
  return getBaseCommittedHeightAt(x, z) + getGeologyTerrainDelta(x, z);
}
export function getTerrainHeightWithoutGeologyAt(x, z) {
  return getBaseCommittedHeightAt(x, z) + getGeologyTerrainPreviewDelta(x, z);
}

// Preserve preview behavior for rendering, collision and all existing callers.
export function getTerrainHeightAt(x, z) {
  return getCommittedTerrainHeightAt(x, z) + getGeologyTerrainPreviewDelta(x, z);
}
