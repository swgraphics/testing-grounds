import { chunkBounds, getTerrainRegions, BASE_TERRAIN_BOUNDS } from './terrainRegions';

// Shared edge samples stay world-owned. A local restore cannot reshape a neighbor.
function snapshotBounds(chunk,world) {
  return chunk.terrainRegion ? chunkBounds(chunk,world) : getTerrainRegions(world).find(region=>region.id===chunk.id) ?? BASE_TERRAIN_BOUNDS;
}
function inside(key,bounds,step) {
  const [x,z]=key.split(',').map(n=>Number(n)*step);
  return x>bounds.minX && x<bounds.maxX && z>bounds.minZ && z<bounds.maxZ;
}
export function snapshotSpatialTerrain(chunk,world) {
  const bounds=snapshotBounds(chunk,world);
  // Old area records are saved workspace presets over the original surface.
  // Saving the expanded world must retain an inactive area's own sculpt map.
  const sculpt=!chunk.terrainRegion&&chunk.id!==world.currentChunkId
    ? chunk.terrain?.terrainEdits ?? {}
    : world.terrainSurface.terrainEdits ?? {};
  return {version:1,bounds,
    sculpt:Object.fromEntries(Object.entries(sculpt).filter(([key])=>inside(key,bounds,4))),
    vertices:Object.fromEntries(Object.entries(world.terrainVertexEdits ?? {}).filter(([key])=>inside(key,bounds,1))),
  };
}
export function restoreSpatialTerrain(world,chunk,snapshot=null) {
  const bounds=snapshotBounds(chunk,world);
  const restore=(current,saved,step)=>({...Object.fromEntries(Object.entries(current??{}).filter(([key])=>!inside(key,bounds,step))),...Object.fromEntries(Object.entries(saved??{}).filter(([key,value])=>inside(key,bounds,step)&&Number.isFinite(value)))});
  return {...world,terrainSurface:{...world.terrainSurface,revision:Number(world.terrainSurface.revision||0)+1,
    terrainEdits:restore(world.terrainSurface.terrainEdits,snapshot?.sculpt,4),
    settings:{...world.terrainSurface.settings,terrainEditVersion:Number(world.terrainSurface.settings.terrainEditVersion||0)+1},
  },terrainVertexEdits:restore(world.terrainVertexEdits,snapshot?.vertices,1)};
}
