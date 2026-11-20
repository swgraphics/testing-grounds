import * as THREE from 'three';
import { compileGeologyField } from './geologyField';
import { geologyDefinition } from './geologyDefinition';

const FLAT = { blank: true, settings: {heightMultiplier:0,mountainHeight:0,cliffSharpness:0,rollingHills:0,ridgeStrength:0,plateauAmount:0,geometryStrength:0}, regions:[] };
export function previewGeologyRecord(type, definition) {
  return {version:1,id:'preview',geologyType:type,position:[0,0,0],definition:geologyDefinition(type,definition),foundation:FLAT};
}
export function createGeologyGeometry(record, {baseHeightAt = () => 0, clipAt = null, lift = 0} = {}, target = null) {
  const field = compileGeologyField(record), {nx, nz, x0, z0} = field;
  const geometry=target??new THREE.BufferGeometry(),count=nx*nz;
  if(!geometry.attributes.position||geometry.attributes.position.array.length<count*3){geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));geometry.deleteAttribute('normal')}
  const position=geometry.attributes.position;position.count=count;
  let cursor=0;
  for (let iz=0;iz<nz;iz++) for(let ix=0;ix<nx;ix++) {
    const x=(x0+ix)*4,z=(z0+iz)*4;
    position.array[cursor++]=x-record.position[0];position.array[cursor++]=baseHeightAt(x,z)+field.values[iz*nx+ix]+lift-record.position[1];position.array[cursor++]=z-record.position[2];
  }
  const capacity=(nx-1)*(nz-1)*6;
  if(!geometry.index||geometry.index.array.length<capacity)geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
  let indexCount=0;
  for(let iz=0;iz<nz-1;iz++)for(let ix=0;ix<nx-1;ix++) {
    const x=(x0+ix)*4,z=(z0+iz)*4;
    if(clipAt&&!clipAt(x+2,z+2))continue;
    const a=iz*nx+ix,b=a+1,c=a+nx,d=c+1;
    if(!clipAt&&[a,b,c,d].every(i=>Math.abs(field.values[i])<.001))continue;
    const indices=geometry.index.array;indices[indexCount++]=a;indices[indexCount++]=c;indices[indexCount++]=b;indices[indexCount++]=b;indices[indexCount++]=c;indices[indexCount++]=d;
  }
  position.needsUpdate=true;geometry.index.count=indexCount;geometry.index.needsUpdate=true;geometry.setDrawRange(0,indexCount);
  if(geometry.attributes.normal)geometry.attributes.normal.count=count;
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.geologyDefinition=record.definition;
  return geometry;
}
