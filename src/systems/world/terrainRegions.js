import { CHUNK_SIZE, columnToLetter } from './worldGrid';

// The authored landscape remains intact. Area bookmarks inside it are not tiles.
export const BASE_TERRAIN_SIZE = 600;
export const TERRAIN_SAMPLE_STEP = 5;
export const TERRAIN_SHAPE_KEYS = ['heightMultiplier','mountainHeight','cliffSharpness','rollingHills','ridgeStrength','plateauAmount','geometryStrength'];
export const terrainShape = settings => Object.fromEntries(TERRAIN_SHAPE_KEYS.map(key=>[key,settings[key]]));
const regionCache=new WeakMap();
export const BASE_TERRAIN_BOUNDS = Object.freeze({ minX:-300, maxX:300, minZ:-300, maxZ:300 });
export const containsPoint = (bounds,x,z) => x>=bounds.minX && x<=bounds.maxX && z>=bounds.minZ && z<=bounds.maxZ;
export function chunkBounds(chunk, world) {
  const size=Number(chunk?.terrainRegion?.size ?? world?.grid?.chunkSize ?? CHUNK_SIZE);
  const x=Number(chunk?.position?.[0]),z=Number(chunk?.position?.[2]);
  return {minX:x-size/2,maxX:x+size/2,minZ:z-size/2,maxZ:z+size/2};
}
export function getTerrainRegions(world) {
  const chunks=world?.chunks;
  if(chunks&&regionCache.has(chunks)&&regionCache.get(chunks).size===world?.grid?.chunkSize)return regionCache.get(chunks).regions;
  const regions=[{id:'base-terrain',...BASE_TERRAIN_BOUNDS},...Object.values(world?.chunks ?? {}).flatMap(chunk=>{
    const bounds=chunkBounds(chunk,world);
    if (!Object.values(bounds).every(Number.isFinite)) return [];
    const outside=bounds.minX>=300 || bounds.maxX<=-300 || bounds.minZ>=300 || bounds.maxZ<=-300;
    return outside ? [{id:chunk.id,...bounds}] : [];
  })];
  if(chunks)regionCache.set(chunks,{size:world?.grid?.chunkSize,regions});
  return regions;
}
export function hasTerrainAt(x,z,world) {
  return [x,z].every(Number.isFinite) && getTerrainRegions(world).some(bounds=>containsPoint(bounds,x,z));
}
export function terrainChunkAt(x,z,world) {
  const extension=getTerrainRegions(world).slice(1).find(bounds=>containsPoint(bounds,x,z));
  if (extension) return world.chunks[extension.id];
  if (!containsPoint(BASE_TERRAIN_BOUNDS,x,z)) return null;
  const current=world.chunks?.[world.currentChunkId];
  return current && !current.terrainRegion ? current : world.chunks?.[world.terrainSurface?.baseChunkId] ?? Object.values(world.chunks ?? {}).find(c=>!c.terrainRegion);
}
export function spatialGrid(column,row) {
  return column>=0 && row>=1 ? `${columnToLetter(column)}${row}` : `[${column},${row}]`;
}
export function getExpansionCandidates(world, reference=[0,0,0]) {
  const size=Number(world?.grid?.chunkSize ?? CHUNK_SIZE);
  if (!(size>0) || size%TERRAIN_SAMPLE_STEP || BASE_TERRAIN_SIZE%size) return [];
  const origin=-BASE_TERRAIN_SIZE/2, occupied=new Set();
  for(const region of getTerrainRegions(world)) for(let x=region.minX;x<region.maxX;x+=size) for(let z=region.minZ;z<region.maxZ;z+=size) occupied.add(`${Math.round((x-origin)/size)},${Math.round((z-origin)/size)}`);
  const result=new Map();
  for(const key of occupied) {
    const [x,z]=key.split(',').map(Number);
    for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const column=x+dx,row=z+dz,k=`${column},${row}`;
      if (occupied.has(k)) continue;
      const position=[origin+(column+.5)*size,0,origin+(row+.5)*size];
      if (Math.max(Math.abs(position[0]),Math.abs(position[2]))>99000) continue;
      const grid=spatialGrid(column,row+1);
      if (Object.values(world.chunks ?? {}).some(c=>c.grid===grid)) continue;
      result.set(k,{grid,position,size,column,row:row+1});
    }
  }
  const regions=getTerrainRegions(world);
  const valid=[...result.values()].filter(c=>{const b={minX:c.position[0]-size/2,maxX:c.position[0]+size/2,minZ:c.position[2]-size/2,maxZ:c.position[2]+size/2};return !regions.some(r=>Math.min(r.maxX,b.maxX)-Math.max(r.minX,b.minX)>1e-6&&Math.min(r.maxZ,b.maxZ)-Math.max(r.minZ,b.minZ)>1e-6)});
  return valid.sort((a,b)=>Math.hypot(a.position[0]-reference[0],a.position[2]-reference[2])-Math.hypot(b.position[0]-reference[0],b.position[2]-reference[2]) || a.grid.localeCompare(b.grid));
}

export function terrainCoversRectangle(bounds,world) {
  const regions=getTerrainRegions(world);
  const xs=[bounds.minX,bounds.maxX,...regions.flatMap(r=>[r.minX,r.maxX]).filter(x=>x>bounds.minX&&x<bounds.maxX)].sort((a,b)=>a-b);
  const zs=[bounds.minZ,bounds.maxZ,...regions.flatMap(r=>[r.minZ,r.maxZ]).filter(z=>z>bounds.minZ&&z<bounds.maxZ)].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++)if(!regions.some(r=>containsPoint(r,(xs[i-1]+xs[i])/2,(zs[j-1]+zs[j])/2)))return false;
  return true;
}
