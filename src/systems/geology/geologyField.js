import { getProceduralTerrainHeightAt, smoothStep } from '../terrain/terrainBase';
import { geologyBounds, geologyDefinition, geologyEdgeDeformation, geologyLocalPoint, geologyNoise, geologyProfile, GEOLOGY_GRID } from './geologyDefinition';

export const GEOLOGY_SHAPE_KEYS = ['heightMultiplier', 'mountainHeight', 'cliffSharpness', 'rollingHills', 'ridgeStrength', 'plateauAmount', 'geometryStrength'];
export const MAX_GEOLOGY_FEATURES = 128;
const MAX_FIELD_SAMPLES = 160000;
const compiled = new WeakMap();
const shape = value => Object.fromEntries(GEOLOGY_SHAPE_KEYS.map(key => {
  if (!Number.isFinite(value?.[key]) || Math.abs(value[key]) > 10000) throw Error('Invalid geology foundation');
  return [key, value[key]];
}));

export function normalizeGeologyFoundation(input) {
  if (!input || !Array.isArray(input.regions) || input.regions.length > 2048) throw Error('Invalid geology foundation');
  return { blank: Boolean(input.blank), settings: shape(input.settings), regions: input.regions.map(region => {
    const bounds = Object.fromEntries(['minX', 'maxX', 'minZ', 'maxZ'].map(key => {
      if (!Number.isFinite(region.bounds?.[key])) throw Error('Invalid geology foundation region');
      return [key, region.bounds[key]];
    }));
    if (bounds.maxX <= bounds.minX || bounds.maxZ <= bounds.minZ) throw Error('Empty geology foundation region');
    return { bounds, settings: shape(region.settings) };
  }) };
}
export function sampleGeologyFoundation(foundation, x, z) {
  let height = getProceduralTerrainHeightAt(x, z, foundation.settings, foundation.blank);
  const region = foundation.regions.find(({ bounds: b }) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
  if (region) {
    const b = region.bounds, edge = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
    const blend = smoothStep(0, Math.min(20, (b.maxX - b.minX) / 4), edge);
    height += (getProceduralTerrainHeightAt(x, z, region.settings, foundation.blank) - height) * blend;
  }
  return height;
}
export function normalizeGeologyRecord(input, id = input?.id) {
  if (!input || input.version !== 1 || typeof id !== 'string' || !id.length || id.length > 100 || ['__proto__', 'constructor', 'prototype'].includes(id)) throw Error('Invalid geology feature');
  if (!Array.isArray(input.position) || input.position.length !== 3 || !input.position.every(v => Number.isFinite(v) && Math.abs(v) <= 100000)) throw Error('Invalid geology position');
  if (input.definition?.version != null && input.definition.version !== 1) throw Error('Unsupported geology definition');
  const record = { version: 1, id, name: String(input.name ?? input.geologyType).slice(0, 80), modelType: 'geology',
    geologyType: input.geologyType, chunkId: String(input.chunkId ?? '').slice(0, 100), position: input.position.slice(),
    definition: geologyDefinition(input.geologyType, input.definition), foundation: normalizeGeologyFoundation(input.foundation) };
  if(input.refinement){
    if(input.geologyType!=='canyon-edge'||!['widen','extend'].includes(input.refinement.kind)||input.refinement.version!==1||!input.refinement.samples||Array.isArray(input.refinement.samples))throw Error('Invalid wall refinement reference');
    const samples=Object.entries(input.refinement.samples);if(samples.length>MAX_FIELD_SAMPLES)throw Error('Wall reference exceeds the sample limit');
    record.refinement={version:1,kind:input.refinement.kind,samples:Object.fromEntries(samples.map(([key,value])=>{if(!/^-?\d+,-?\d+$/.test(key)||!key.split(',').every(n=>Math.abs(Number(n))<=50000)||!Number.isFinite(value)||Math.abs(value)>100000)throw Error('Invalid wall reference sample');return [key,value]}))};
  }
  const bounds = geologyBounds(record);
  if ((Math.ceil((bounds.maxX - bounds.minX) / GEOLOGY_GRID) + 3) * (Math.ceil((bounds.maxZ - bounds.minZ) / GEOLOGY_GRID) + 3) > MAX_FIELD_SAMPLES) throw Error('This geology footprint is too large. Reduce Scale or Length.');
  return record;
}
export function normalizeGeologyLayer(input) {
  if (input == null) return undefined; // Old baked terrain stays baked; no inferred feature records.
  if (input.version !== 1 || !input.features || Array.isArray(input.features) || typeof input.features !== 'object') throw Error('Unsupported geology feature data');
  const entries = Object.entries(input.features);
  if (entries.length > MAX_GEOLOGY_FEATURES) throw Error('Too many geology features');
  return { version: 1, revision: Number.isFinite(input.revision) ? Math.max(0, Math.floor(input.revision)) : 0, features: Object.fromEntries(entries.map(([id, value]) => [id, normalizeGeologyRecord(value, id)])) };
}

// New formations retain parameters and a small frozen procedural reference.
// Ordinary-wall refinements additionally retain bounded original surface samples
// to derive an owned delta. Neither path rewrites independent edits or saves meshes.
export function compileGeologyField(record) {
  if (compiled.has(record)) return compiled.get(record);
  const bounds = geologyBounds(record), step = GEOLOGY_GRID;
  const x0 = Math.floor(bounds.minX / step), z0 = Math.floor(bounds.minZ / step);
  const nx = Math.ceil(bounds.maxX / step) - x0 + 1, nz = Math.ceil(bounds.maxZ / step) - z0 + 1;
  if (nx * nz > MAX_FIELD_SAMPLES) throw Error('Geology footprint exceeds the field limit');
  const values = new Float64Array(nx * nz), d = record.definition;
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const x = (x0 + ix) * step, z = (z0 + iz) * step, local = geologyLocalPoint(record, x, z);
    const profile = geologyProfile(record.geologyType, d, local.x, local.z);
    if(profile.weight<=0&&record.refinement?.kind!=='widen')continue;
    const reference=record.refinement?.samples[`${x0+ix},${z0+iz}`]??sampleGeologyFoundation(record.foundation,x,z);
    if(record.refinement?.kind==='widen'){
      const side=d.sides.right,deformation=geologyEdgeDeformation(side,local.x),offset=side.offset,faceWidth=Math.max(1.5,Math.min(8,(side.width??d.width)*.12)),band=Math.max(7,faceWidth*2+3)+18*(side.deformations??[]).reduce((sum,item)=>sum+Math.abs(item.amount),0),lo=Math.min(0,offset)-band,hi=Math.max(0,offset)+band;
      const mask=smoothStep(lo,lo+4,local.z)*(1-smoothStep(hi-4,hi,local.z))*smoothStep(-d.length/2,-d.length/2+6,local.x)*(1-smoothStep(d.length/2-6,d.length/2,local.x));
      if(mask<=0)continue;
      const e=side.edgeDeformation??d.edgeDeformation,seed=side.seed??d.seed,edge=offset+e*2*geologyNoise(local.x*.13,0,seed)+deformation.offset;
      const face=smoothStep(edge-faceWidth,edge+faceWidth,local.z),target=record.position[1]+(side.height??d.height)*d.scale*face*(1+e*.04*geologyNoise(local.x*.055,0,seed+101)+deformation.rim);
      values[iz*nx+ix]=(target-reference)*mask;continue;
    }
    if (profile.weight <= 0) continue;
    const delta = record.position[1] + profile.height * d.scale - reference;
    values[iz * nx + ix] = (record.refinement?Math.max(0,delta):delta) * profile.weight;
  }
  const sample = (ix, iz) => ix >= 0 && ix < nx && iz >= 0 && iz < nz ? values[iz * nx + ix] : 0;
  const field = { bounds, x0, z0, nx, nz, values, heightAt(x, z) {
    const gx = x / step - x0, gz = z / step - z0, ix = Math.floor(gx), iz = Math.floor(gz), tx = gx - ix, tz = gz - iz;
    const a = sample(ix, iz), b = sample(ix + 1, iz), c = sample(ix, iz + 1), e = sample(ix + 1, iz + 1);
    return (a + (b - a) * tx) * (1 - tz) + (c + (e - c) * tx) * tz;
  } };
  compiled.set(record, field);
  return field;
}
