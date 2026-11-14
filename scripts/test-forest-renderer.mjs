import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCrimsonTreeDefinition } from '../src/components/world/treeGenerator.js';
import { createProceduralBranchData } from '../src/components/world/treeBranches.js';
import { createProceduralCanopyData, createProceduralCanopyGeometry } from '../src/components/world/treeCanopy.js';
import { createForestLeafShape, createForestLeafInstances } from '../src/components/world/forestGeometry.js';
const definition=createCrimsonTreeDefinition();
assert.equal(definition.leaves.color,'#8BCF6A');
assert.equal(definition.leaves.outlineColor,'#3A8C0E');
assert.equal(createCrimsonTreeDefinition({leaves:{color:'#abcdef'}}).leaves.color,'#abcdef');
assert.equal(createCrimsonTreeDefinition({leaves:{outlineColor:'#123456',color:'#abcdef'}}).leaves.outlineColor,'#123456');
const shape=createForestLeafShape();
let mergedMs=0,instancedMs=0;
for(const seed of [1,17,987654]){
 const branches=createProceduralBranchData(definition.trunk,definition.branches,seed);
 const leaves=createProceduralCanopyData(branches,definition.trunk,definition.branches,definition.leaves,seed);
 let start=performance.now();const merged=createProceduralCanopyGeometry(leaves);const edges=new THREE.EdgesGeometry(merged,18);mergedMs+=performance.now()-start;
 start=performance.now();const instances=createForestLeafInstances(leaves,shape);instancedMs+=performance.now()-start;
 assert.equal(instances.outline.instanceCount,leaves.length);
 assert.equal(instances.outline.attributes.position.count*leaves.length,edges.attributes.position.count);
 const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 const expected=merged.attributes.position;
 for(let i=0;i<leaves.length;i++){
  matrix.fromArray(instances.matrices,i*16);
  for(let vertex=0;vertex<shape.attributes.position.count;vertex++){
   point.fromBufferAttribute(shape.attributes.position,vertex).applyMatrix4(matrix);
   const actual=new THREE.Vector3().fromBufferAttribute(expected,i*shape.attributes.position.count+vertex);
   assert.ok(point.distanceTo(actual)<0.00001,'same procedural leaf positions');
   assert.ok(instances.bounds.clone().expandByScalar(0.00001).containsPoint(point),'culling bounds include leaves');
  }
 }
 instances.outline.dispose();merged.dispose();edges.dispose();
}
const custom=[...shape.attributes.position.array];custom[4]+=.2;const customized=createForestLeafShape(custom);assert.equal(customized.attributes.position.getY(1),Math.fround(custom[4]));
shape.dispose();customized.dispose();
console.log('PASS forest leaf transform/outline parity, bounds, custom shape, palette overrides', {mergedMs,instancedMs});
