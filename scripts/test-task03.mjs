import assert from 'node:assert/strict';
import { createCrimsonTreeDefinition } from '../src/components/world/treeGenerator.js';
import { createProceduralBranchData, createProceduralBranchGeometry } from '../src/components/world/treeBranches.js';
import { createProceduralCanopyData, createProceduralFloatingLeafData } from '../src/components/world/treeCanopy.js';
const definition=count=>createCrimsonTreeDefinition({branches:{secondary:{count}}});
const data=d=>createProceduralBranchData(d.trunk,d.branches,d.seed);
const canopy=d=>createProceduralCanopyData(data(d),d.trunk,d.branches,d.leaves,d.seed);
for (const seed of [1,17,998]) {
 const min={...definition(0),seed}, max={...definition(8),seed};
 assert.equal(data(min).length,50);assert.equal(data(max).length,450);
 assert.deepEqual(data(max).slice(0,50),data(min),'primary indices/geometry unchanged');
 assert.deepEqual(createProceduralFloatingLeafData(data(max),max.trunk,max.branches,max.leaves,seed),createProceduralFloatingLeafData(data(min),min.trunk,min.branches,min.leaves,seed));
 assert.deepEqual(canopy(max),canopy(min),'secondary limbs do not multiply or alter primary foliage');
 const geometry=createProceduralBranchGeometry(max.trunk,max.branches,seed);
 assert.equal(geometry.attributes.position.count,5400);
 assert.ok([...geometry.attributes.position.array,...geometry.attributes.normal.array].every(Number.isFinite));geometry.dispose();
 assert.deepEqual(data(max),data(JSON.parse(JSON.stringify(max))));
 const off=createCrimsonTreeDefinition({branches:{secondary:{count:8,enabled:false}}});assert.equal(data(off).length,50);
}
const custom=createCrimsonTreeDefinition({branches:{custom:[{length:2,direction:[1,0,0]}],secondary:{count:2}}});
assert.equal(data(custom).filter(b=>b.custom).length,3);
assert.equal(data(custom).filter(b=>b.proceduralSecondary).length,100);
console.log('PASS secondary geometry endpoints, finite normals, stable primary/custom indices, deterministic save round-trip, enabled flag and unchanged canopy');
