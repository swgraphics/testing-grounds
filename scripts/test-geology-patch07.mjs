import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-geology-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
globalThis.window=new EventTarget();window.requestAnimationFrame=fn=>fn();
globalThis.document={activeElement:{blur(){}},querySelector:()=>null};
const storage=new Map();globalThis.localStorage=window.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const passes=[];const pass=message=>{passes.push(message);console.log('PASS '+message)};
try{
 const {useWorldStore:world}=await server.ssrLoadModule('/src/systems/world/worldStore.js');
 const terrain=await server.ssrLoadModule('/src/systems/terrain/terrainSettings.js');
 const edits=await server.ssrLoadModule('/src/systems/terrain/terrainEdits.js');
 const height=await server.ssrLoadModule('/src/systems/terrain/terrainHeight.js');
 const geo=await server.ssrLoadModule('/src/systems/geology/geologyFeatures.js');
 const field=await server.ssrLoadModule('/src/systems/geology/geologyField.js');
 const sample=await server.ssrLoadModule('/src/systems/geology/geologySampling.js');
 const {geologyDefinition,geologyBounds}=await server.ssrLoadModule('/src/systems/geology/geologyDefinition.js');
 const {useHistoryStore:history}=await server.ssrLoadModule('/src/systems/history/historyStore.js');
 const persistence=await server.ssrLoadModule('/src/systems/world/worldPersistence.js');
 world.getState().initializeBlankWorld();terrain.initializeBlankCanvasTerrain();history.getState().clearHistory();
 edits.applyTerrainBrush({x:48,z:48,radius:12,strength:2});
 terrain.terrainSettings.terrainVertexEdits={'50,50':.75};world.setState({world:{...world.getState().world,terrainVertexEdits:{'50,50':.75}}});
 const before=JSON.stringify(terrain.terrainSettings.terrainEdits),vertexBefore=JSON.stringify(world.getState().world.terrainVertexEdits);
 const id=geo.createGeologyFeature('giant-rock',{height:18,width:44,length:40},[48,0,48],{id:'rock-1'});
 assert.equal(id,'rock-1');assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),before);assert.equal(JSON.stringify(world.getState().world.terrainVertexEdits),vertexBefore);
 const initial=structuredClone(geo.geologyFeatures()[id]),initialField=field.compileGeologyField(geo.geologyFeatures()[id]);
 assert.ok(initialField.heightAt(48,48)>12);
 assert.ok(Math.abs(height.getCommittedTerrainHeightAt(48,48)-initialField.heightAt(48,48)-edits.getTerrainEditDelta(48,48)-.27)<1e-10);
 pass('Geology contributes through the committed sampler without mutating pre-existing sculpt or vertex edits');

 const oldHeight=height.getCommittedTerrainHeightAt(48,48);edits.applyTerrainBrush({x:48,z:48,radius:12,strength:3});
 assert.ok(Math.abs(height.getCommittedTerrainHeightAt(48,48)-oldHeight-3)<1e-10);
 const manualAfter=JSON.stringify(terrain.terrainSettings.terrainEdits);
 for(let i=0;i<25;i++)geo.updateGeologyFeature(id,{definition:{height:20+i%9,width:40+i%7,seed:250+i,scale:.75+(i%4)*.25}});
 geo.updateGeologyFeature(id,{definition:initial.definition});
 assert.deepEqual(geo.geologyFeatures()[id],initial);
 assert.deepEqual([...field.compileGeologyField(geo.geologyFeatures()[id]).values],[...initialField.values]);
 assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),manualAfter);assert.equal(JSON.stringify(world.getState().world.terrainVertexEdits),vertexBefore);
 pass('25 parameter changes and restoration reproduce the exact owned field; later manual edits remain byte-for-byte intact');

 const canyon=geo.createGeologyFeature('canyon-wall',{},[48,0,48],{id:'canyon-1'}),canyonRecord=geo.geologyFeatures()[canyon],canyonField=field.compileGeologyField(canyonRecord);
 const point=[48,72],composed=edits.getTerrainEditDelta(...point)+initialField.heightAt(...point)+canyonField.heightAt(...point);
 assert.ok(Math.abs(height.getCommittedTerrainHeightAt(...point)-composed)<1e-10);
 geo.updateGeologyFeature(id,{definition:{height:35}});
 assert.equal(geo.geologyFeatures()[canyon],canyonRecord);assert.equal(field.compileGeologyField(canyonRecord),canyonField);
 assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),manualAfter);
 pass('Overlapping features compose independently; editing one preserves the other record and its cached contribution');

 const beforeGesture=structuredClone(geo.geologyFeatures()[id]),undoCount=history.getState().undoStack.length;
 assert.equal(geo.beginGeologyEdit(id),true);for(let n=36;n<=42;n++)geo.updateGeologyFeature(id,{definition:{height:n}},{continuous:true});geo.commitGeologyEdit();
 assert.equal(history.getState().undoStack.length,undoCount+1);history.getState().undo();assert.deepEqual(geo.geologyFeatures()[id],beforeGesture);history.getState().redo();assert.equal(geo.geologyFeatures()[id].definition.height,42);
 const committed=structuredClone(geo.geologyFeatures()[id]),count=history.getState().undoStack.length;
 geo.beginGeologyEdit(id);geo.updateGeologyFeature(id,{definition:{height:70}},{continuous:true});geo.cancelGeologyEdit();assert.deepEqual(geo.geologyFeatures()[id],committed);assert.equal(history.getState().undoStack.length,count);
 assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),manualAfter);
 pass('One slider gesture makes one history entry; Undo/Redo and cancellation replace only the owned feature');

 geo.removeGeologyFeature(id);assert.equal(geo.geologyFeatures()[id],undefined);assert.ok(Math.abs(height.getCommittedTerrainHeightAt(...point)-edits.getTerrainEditDelta(...point)-canyonField.heightAt(...point))<1e-10);
 history.getState().undo();assert.deepEqual(geo.geologyFeatures()[id],committed);
 pass('Feature deletion removes its exact contribution, and Undo restores it without subtracting manual terrain');

 assert.equal(canyonField.heightAt(48,48),0);assert.ok(canyonField.heightAt(48,20)>20);assert.ok(canyonField.heightAt(48,76)>20);
 const rightSamples=Array.from({length:15},(_,i)=>canyonField.heightAt(20+i*4,76));
 geo.updateGeologyFeature(canyon,{definition:{sides:{left:{offset:12,end:40}}}});
 const expanded=field.compileGeologyField(geo.geologyFeatures()[canyon]);assert.deepEqual(Array.from({length:15},(_,i)=>expanded.heightAt(20+i*4,76)),rightSamples);
 assert.ok(expanded.heightAt(116,4)>10);assert.equal(expanded.heightAt(116,76),0);assert.equal(expanded.heightAt(48,48),0);
 pass('Canyon has two raised shoulders and a lower corridor; moving/extending the left bank preserves the right bank exactly');

 const rock1=geo.draftGeologyFeature('giant-rock',{scale:1},[160,0,48]);const rock2=geo.draftGeologyFeature('giant-rock',{scale:2},[160,0,48]);
 assert.ok(Math.abs(field.compileGeologyField(rock2).heightAt(160,48)/field.compileGeologyField(rock1).heightAt(160,48)-2)<1e-10);
 const b1=geologyBounds(rock1),b2=geologyBounds(rock2);assert.ok(Math.abs((b2.maxX-b2.minX-8)/(b1.maxX-b1.minX-8)-2)<1e-10);
 const cliff=geo.draftGeologyFeature('cliff-face',{},[160,0,48]),c=field.compileGeologyField(cliff);assert.ok(c.heightAt(160,48)>25);assert.equal(c.heightAt(160,20),0);
 assert.notDeepEqual([...c.values],[...field.compileGeologyField(rock1).values]);
 assert.notDeepEqual(geologyDefinition('giant-rock',{seed:1}),geologyDefinition('giant-rock',{seed:2}));
 pass('Real Scale doubles formation height and footprint; cliff and rock have distinct profiles and deterministic seed parameters');

 const probes=Array.from({length:100},(_,i)=>[8+(i%10)*8,8+Math.floor(i/10)*8]);const savedHeights=probes.map(p=>height.getCommittedTerrainHeightAt(...p));
 persistence.saveWorldSnapshot();const saved=JSON.parse(storage.get(persistence.WORLD_STORAGE_KEY));assert.equal(saved.schemaVersion,8);assert.equal(saved.geology.version,1);assert.equal(JSON.stringify(saved.geology).includes('values'),false);
 world.getState().replaceWorld({...world.getState().world,geology:undefined});const restored=persistence.loadWorldSnapshot();assert.ok(restored);terrain.loadChunkTerrainSettings(restored.currentChunkId,true);
 assert.deepEqual(probes.map(p=>height.getCommittedTerrainHeightAt(...p)),savedHeights);assert.deepEqual(restored.geology.features,saved.geology.features);
 pass('World Save/Load restores parameters and identical terrain, without serializing meshes/grids or applying stamps twice');

 const legacy={...saved,schemaVersion:7};delete legacy.geology;storage.set(persistence.WORLD_STORAGE_KEY,JSON.stringify(legacy));const loaded=persistence.loadWorldSnapshot();terrain.loadChunkTerrainSettings(loaded.currentChunkId,true);
 assert.equal(loaded.geology,undefined);assert.deepEqual(terrain.terrainSettings.terrainEdits,legacy.chunks[legacy.currentChunkId].terrain.terrainEdits);
 assert.throws(()=>field.normalizeGeologyLayer({version:2,features:{}}));assert.throws(()=>field.normalizeGeologyLayer({version:1,features:{bad:{...initial,position:[NaN,0,0]}}}));assert.throws(()=>field.normalizeGeologyLayer({version:1,features:{bad:{...initial,definition:{...initial.definition,version:2}}}}));
 pass('Legacy baked edits are preserved without invented records; malformed or future feature versions are rejected');

 await fs.mkdir('geology-patch07.local',{recursive:true});await fs.writeFile('geology-patch07.local/foundation-results.json',JSON.stringify({pass:true,passes},null,2));
}finally{await server.close()}
