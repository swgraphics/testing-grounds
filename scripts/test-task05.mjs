import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-task05-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
globalThis.window=new EventTarget();const records=new Map();
globalThis.localStorage=window.localStorage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,String(v)),removeItem:k=>records.delete(k)};
globalThis.document={activeElement:{blur(){}},querySelector:()=>null};window.requestAnimationFrame=fn=>fn();
try {
 const {useWorldStore:store}=await server.ssrLoadModule('/src/systems/world/worldStore.js');
 const t=await server.ssrLoadModule('/src/systems/terrain/terrainSettings.js');
 const e=await server.ssrLoadModule('/src/systems/terrain/terrainEdits.js');
 const v=await server.ssrLoadModule('/src/systems/terrain/terrainVertexEditing.js');
 const p=await server.ssrLoadModule('/src/systems/world/worldPersistence.js');
 const r=await server.ssrLoadModule('/src/systems/world/terrainRegions.js');
 const {addTerrainChunk:add}=await server.ssrLoadModule('/src/systems/world/terrainExpansion.js');
 const {getCommittedTerrainHeightAt:height}=await server.ssrLoadModule('/src/systems/terrain/terrainHeight.js');
 const {useHistoryStore:history}=await server.ssrLoadModule('/src/systems/history/historyStore.js');
 const {AREA_CONFIG}=await server.ssrLoadModule('/src/config/areaConfig.js');
 const exporter=await server.ssrLoadModule('/src/systems/terrain/terrainExport.js');
 const reports=[];
 for(const blank of [false,true]) {
  history.getState().clearHistory();records.clear();
  if(blank){store.getState().initializeBlankWorld();t.initializeBlankCanvasTerrain()}
  else {store.getState().initializeWorld(AREA_CONFIG);t.loadChunkTerrainSettings()}
  const original=JSON.parse(JSON.stringify(store.getState().world.chunks));
  const before=height(80,-160);e.beginTerrainHistory();e.applyTerrainBrush({x:40,z:40,radius:14,strength:3});e.commitTerrainHistory();
  const sculpt=height(40,40);assert.ok(sculpt>0);
  assert.equal(r.getExpansionCandidates(store.getState().world).length,24);
  const added=['G4','H4','G5'].map(grid=>{const result=add({grid,name:'TEST '+grid});assert.ok(result.ok);return result.id});
  assert.equal(add({grid:'G4'}).ok,false);assert.equal(add({grid:'D4'}).ok,false);
  assert.equal(height(80,-160),before);assert.equal(height(40,40),sculpt);
  assert.equal(Object.keys(store.getState().world.chunks).length,Object.keys(original).length+3);
  history.getState().undo();assert.equal(height(40,40),0);history.getState().redo();assert.equal(height(40,40),sculpt);
  const world=store.getState().world;assert.equal(new Set(Object.keys(world.chunks)).size,Object.keys(world.chunks).length);
  for(const id of added){assert.equal(world.chunks[id].terrainRegion.size,world.grid.chunkSize);assert.ok(r.hasTerrainAt(...[world.chunks[id].position[0],world.chunks[id].position[2]],world))}
  assert.equal(r.hasTerrainAt(550,250,world),false);
  store.getState().setCurrentChunk(added[0]);const h=height(350,50);
  for(const tool of ['raise','lower','smooth','flatten','slope']){e.beginTerrainHistory(tool);e.applyTerrainBrush({x:350,z:50,tool,radius:18,strength:4});e.commitTerrainHistory();assert.ok(Number.isFinite(height(350,50)))}
  e.applyTerrainBrush({x:300,z:50,radius:18,strength:5});
  assert.ok(Math.abs(height(300-1e-6,50)-height(300+1e-6,50))<.001);
  v.beginTerrainVertexHistory();v.setTerrainVertexEdit(350,50,7);v.commitTerrainVertexHistory();assert.equal(v.getTerrainVertexEdit(350,50),7);assert.equal(v.makeTerrainVertex(750,750),null);
  store.getState().setCurrentChunk(Object.keys(original)[0]);assert.equal(v.getTerrainVertexEdit(350,50),7);assert.notEqual(height(350,50),h);
  store.getState().upsertObject({id:'new-object',type:'procedural',position:[350,height(350,50)+2,50],modelType:'building-block',blockType:'block'});
  assert.ok(store.getState().world.chunks[added[0]].objects['new-object']);
  store.getState().upsertObject({id:'neighbor-object',type:'procedural',position:[450,height(450,50)+2,50],modelType:'building-block',blockType:'block'});
  t.saveWorldSettings();const saved=JSON.parse(records.get(p.WORLD_STORAGE_KEY));assert.equal(saved.terrainSurface.version,1);const geometryState=JSON.stringify(saved.terrainSurface.terrainEdits);
  store.getState().initializeBlankWorld();t.loadWorldSettings();assert.equal(JSON.stringify(store.getState().world.terrainSurface.terrainEdits),geometryState);assert.ok(store.getState().world.chunks[added[0]].objects['new-object']);
  store.getState().setCurrentChunk(added[0]);t.saveCurrentChunk();const savedHeight=height(350,50),neighbor=height(450,50),border=height(300,50);
  e.applyTerrainBrush({x:350,z:50,radius:10,strength:5});v.setTerrainVertexEdit(350,50,17);assert.notEqual(height(350,50),savedHeight);t.loadCurrentChunk();assert.equal(height(350,50),savedHeight);assert.equal(height(450,50),neighbor);assert.equal(height(300,50),border);
  const neighborShape=height(450,50);t.updateTerrainSetting('heightMultiplier',.73);t.saveCurrentChunk();t.updateTerrainSetting('heightMultiplier',.21);t.loadCurrentChunk();assert.equal(t.terrainSettings.heightMultiplier,.73,'Chunk Load restores its shape settings');assert.equal(height(450,50),neighborShape,'local shape controls preserve neighboring terrain');
  t.resetCurrentChunk();assert.equal(v.getTerrainVertexEdit(350,50),0);assert.equal(height(450,50),neighbor);assert.equal(height(300,50),border);assert.ok(store.getState().world.chunks[added[1]].objects['neighbor-object']);assert.equal(Object.keys(store.getState().world.chunks[added[0]].objects).length,0);
  const geometry=exporter.createTerrainExportGeometry({minX:280,maxX:380,minZ:20,maxZ:80,segmentsX:20,segmentsZ:12,origin:'world'});assert.equal(geometry.attributes.position.count,273);geometry.dispose();
  assert.throws(()=>exporter.createTerrainExportGeometry({minX:480,maxX:580,minZ:180,maxZ:280,segmentsX:2,segmentsZ:2,origin:'world'}),/without terrain/);
  store.getState().setCurrentChunk(Object.keys(original)[0]);t.updateTerrainSetting('heightMultiplier',.62);t.saveCurrentChunk();const neighborBaseLoad=height(450,50);t.updateTerrainSetting('heightMultiplier',.29);t.loadCurrentChunk();assert.equal(t.terrainSettings.heightMultiplier,.62);assert.equal(height(450,50),neighborBaseLoad);t.resetCurrentChunk();assert.equal(t.terrainSettings.heightMultiplier,.5);assert.equal(Object.keys(store.getState().world.chunks).length,Object.keys(original).length+3);
  reports.push({world:blank?'blank':'populated',regions:r.getTerrainRegions(store.getState().world),passes:'three adjacent chunks, promotion/history, stable sampling, all brushes, seam and vertex edits, coordinate object ownership, world reload, isolated chunk restore/reset, export coverage'});
 }

 store.getState().initializeWorld(AREA_CONFIG);t.loadChunkTerrainSettings();e.applyTerrainBrush({x:40,z:40,strength:3});store.getState().setCurrentChunk('forest');e.applyTerrainBrush({x:-80,z:-80,strength:7});store.getState().setCurrentChunk('start');add({grid:'G4'});e.applyTerrainBrush({x:350,z:50,strength:4});const newHeight=height(350,50);t.saveWorldSettings();store.getState().setCurrentChunk('forest');t.loadCurrentChunk();assert.ok(height(-80,-80)>6,'inactive legacy area sculpt preset survives expanded World Save');assert.equal(height(350,50),newHeight,'legacy area restore preserves added terrain');
 store.getState().initializeBlankWorld();t.initializeBlankCanvasTerrain();
 for(const grid of ['[3,0]','[-1,4]'])assert.ok(add({grid}).ok,'signed frontier placement '+grid);
 t.saveWorldSettings();t.loadWorldSettings();assert.equal(store.getState().world.chunks['terrain--1-4'].coordinates.column,-1);assert.equal(store.getState().world.chunks['terrain-3-0'].coordinates.row,0);assert.ok(r.hasTerrainAt(-350,50,store.getState().world));
 const supported=records.get(p.WORLD_STORAGE_KEY),unsupported=JSON.parse(supported);unsupported.terrainSurface.version=99;records.set(p.WORLD_STORAGE_KEY,JSON.stringify(unsupported));const unchanged=records.get(p.WORLD_STORAGE_KEY);assert.equal(p.loadWorldSnapshot(),null);assert.equal(records.get(p.WORLD_STORAGE_KEY),unchanged,'unsupported spatial version is not rewritten');records.set(p.WORLD_STORAGE_KEY,supported);
 store.getState().initializeWorld(AREA_CONFIG);t.loadChunkTerrainSettings();t.updateTerrainSetting('heightMultiplier',.71);t.saveWorldSettings();assert.equal(p.loadWorldSnapshot().terrainSurface,undefined);assert.equal(store.getState().world.chunks.start.terrain.heightMultiplier,.71);
 fs.writeFileSync('ui-revision-05.local/node-results.json',JSON.stringify({reports,legacy:'PASS unchanged pre-expansion save format'},null,2));console.log('PASS',JSON.stringify(reports));console.log('PASS legacy world persistence without spatial reinterpretation');
} finally {await server.close()}
