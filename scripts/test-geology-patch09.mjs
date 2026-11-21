import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-geology09-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
globalThis.window=new EventTarget();window.requestAnimationFrame=fn=>fn();globalThis.document={activeElement:{blur(){}},querySelector:()=>null,querySelectorAll:()=>[]};
const storage=new Map();globalThis.localStorage=window.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const passes=[],pass=s=>{passes.push(s);console.log('PASS '+s)};
try{
 const {useWorldStore:world}=await server.ssrLoadModule('/src/systems/world/worldStore.js');
 const terrain=await server.ssrLoadModule('/src/systems/terrain/terrainSettings.js');
 const edits=await server.ssrLoadModule('/src/systems/terrain/terrainEdits.js');
 const {getCommittedTerrainHeightAt:h}=await server.ssrLoadModule('/src/systems/terrain/terrainHeight.js');
 const geo=await server.ssrLoadModule('/src/systems/geology/geologyFeatures.js');
 const {compileGeologyField:field,normalizeGeologyRecord}=await server.ssrLoadModule('/src/systems/geology/geologyField.js');
 const {geologyWorldPoint,geologyBounds,geologyDefinition,geologyProfile}=await server.ssrLoadModule('/src/systems/geology/geologyDefinition.js');
 const geometry=await server.ssrLoadModule('/src/systems/geology/geologyGeometry.js');
 const ops=await server.ssrLoadModule('/src/systems/geology/canyonEdgeOperations.js');
 const {traceTerrainEdge}=await server.ssrLoadModule('/src/systems/geology/terrainEdgeDetection.js');
 const {useCanyonEdgeStore:ui}=await server.ssrLoadModule('/src/systems/geology/canyonEdgeStore.js');
 const {useHistoryStore:history}=await server.ssrLoadModule('/src/systems/history/historyStore.js');
 const persistence=await server.ssrLoadModule('/src/systems/world/worldPersistence.js');
 const exporter=await server.ssrLoadModule('/src/systems/terrain/terrainExport.js');
 const reset=()=>{world.getState().initializeBlankWorld();terrain.initializeBlankCanvasTerrain();history.getState().clearHistory();ui.getState().reset()};reset();
 const probes=Array.from({length:625},(_,i)=>[(i%25-12)*4,(Math.floor(i/25)-12)*4]);
 const signature=record=>probes.map(([x,z])=>field(record).heightAt(x,z));
 const shapes=['giant-rock','cliff-face','canyon-wall'].map(type=>geo.draftGeologyFeature(type,{},[0,0,0]));
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.notDeepEqual(signature(shapes[i]),signature(shapes[j]));
 for(const original of shapes){assert.deepEqual(signature(original),signature(structuredClone(original)));const changed=geo.draftGeologyFeature(original.geologyType,{...original.definition,seed:original.definition.seed+1},[0,0,0]);assert.notDeepEqual(signature(original),signature(changed));}
 pass('09A: three distinct sampled silhouettes; deterministic seeds reproduce actual fields and different seeds change them');
 // Fixed sample from the accepted Patch 07 generator: an inward-narrowed old
 // record must retain its original field, even close to the center corridor.
 const legacy=geologyDefinition('canyon-wall',{seed:5123,width:160,floorWidth:60,edgeDeformation:1,sides:{left:{offset:-27},right:{offset:-27}}});
 assert.deepEqual(geologyProfile('canyon-wall',legacy,-45,-1),{height:28.100186518059772,weight:.47079281455083466});
 const localLegacy={...legacy,sides:{...legacy.sides,right:{...legacy.sides.right,deformations:[{center:0,length:48,amount:.7,seed:173}]}}};
 for(const z of [-1,0,1])assert.deepEqual(geologyProfile('canyon-wall',localLegacy,-45,z),geologyProfile('canyon-wall',legacy,-45,z));
 for(const type of ['giant-rock','cliff-face','canyon-wall']){
  const original=geo.draftGeologyFeature(type,{},[0,0,0]);
  for(const patch of [{height:45},{width:110},{seed:5123},{edgeDeformation:.95},{scale:2},{rotation:40}])assert.notDeepEqual(signature(geo.draftGeologyFeature(type,{...original.definition,...patch},[0,0,0])),signature(original));
 }
 const rock1=geo.draftGeologyFeature('giant-rock',{},[0,0,0]),rock2=geo.draftGeologyFeature('giant-rock',{scale:2},[0,0,0]);assert.ok(Math.abs(field(rock2).heightAt(0,0)-field(rock1).heightAt(0,0)*2)<1e-10);
 const b1=geologyBounds(rock1),b2=geologyBounds(rock2);assert.ok(Math.abs((b2.maxX-b2.minX-8)/(b1.maxX-b1.minX-8)-2)<1e-10);
 const definition=geologyDefinition('cliff-face',{height:45,width:85,seed:1249,edgeDeformation:.8,rotation:37,scale:1.6});const draft=geo.draftGeologyFeature('cliff-face',definition,[0,0,0]);const placed=geo.createGeologyFeature('cliff-face',definition,[0,0,0]);assert.deepEqual(signature(draft),signature(geo.geologyFeatures()[placed]));
 const preview=geometry.createGeologyGeometry(geometry.previewGeologyRecord('cliff-face',definition));const previewPosition=preview.getAttribute('position');for(let i=0;i<previewPosition.count;i++)assert.ok(Math.abs(previewPosition.getY(i)-field(draft).heightAt(previewPosition.getX(i),previewPosition.getZ(i)))<1e-5);preview.dispose();
 pass('09B: all six real properties affect each terrain field; Scale doubles height/footprint and authored preview values match placement');
 reset();edits.applyTerrainBrush({x:0,z:0,radius:10,strength:4});const floorBefore=h(0,0),manual=JSON.stringify(terrain.terrainSettings.terrainEdits);
 const id=geo.createGeologyFeature('canyon-wall',{height:30,width:88,floorWidth:32},[0,0,0]),original=structuredClone(geo.geologyFeatures()[id]);assert.equal(h(0,0),floorBefore);for(const z of [-28,28]){assert.ok(h(0,z)>25);assert.ok(Math.abs(h(-20,z)-h(20,z))<4)}assert.equal(history.getState().undoStack.length,1);assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),manual);
 pass('09C: two raised relatively flat shoulders and an unchanged original lower corridor; placement retains one editable identity/history entry');
 const center=ops.analyzeCanyonWallAt(0,17),end=ops.analyzeCanyonWallAt(48,17);assert.equal(center.mode,'CENTER');assert.equal(center.featureId,id);assert.equal(end.mode,'END');
 assert.equal(traceTerrainEdge((x,z)=>z*1.2,0,0),null);assert.equal(traceTerrainEdge((x,z)=>40*Math.exp(-(x*x+z*z)/20),2,0),null);
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 const curved=(x,z)=>20*smooth(-4,4,z-.0015*x*x);const curve=traceTerrainEdge(curved,0,0);assert.equal(curve.mode,'CENTER');assert.ok(curve.path.length>10);assert.ok(curve.path.some(p=>Math.abs(p[2])>2));
 const parallel=traceTerrainEdge((x,z)=>20*smooth(-4,4,z)+15*smooth(26,34,z),0,0);assert.ok(parallel.path.every(p=>Math.abs(p[2])<6));
 pass('09D: authored center/end selection, curved continuity and nearby-edge stability; steep planes and isolated spikes are rejected');
 const prepared=ops.prepareCanyonOperation(center,'deform'),parameters={...ops.canyonSelectionParameters(center),edgeDeformation:.9,seed:5791};
 const proposal=ops.canyonChangeProposal(center,18,'deform',prepared,parameters),repeated=ops.canyonChangeProposal(center,18,'deform',prepared,parameters);assert.deepEqual(signature(proposal.record),signature(repeated.record));assert.equal(geo.geologyFeatures()[id].definition.sides.right.deformations,undefined);
 const opposite=Array.from({length:60},(_,i)=>[-48+(i%20)*5,-24-Math.floor(i/20)*4]);for(const p of opposite)assert.ok(Math.abs(field(original).heightAt(...p)-field(proposal.record).heightAt(...p))<1e-10);
 for(const x of [-48,-40,40,48])for(const z of [16,20,28]){
  // Local deformation list itself fades out; a deliberately changed base seed/e
  // is a separately staged bank setting. Compare with that same setting alone.
  const base=structuredClone(proposal.record);delete base.definition.sides.right.deformations;
  assert.ok(Math.abs(field(base).heightAt(x,z)-field(proposal.record).heightAt(x,z))<1e-10);
 }
 assert.ok(probes.some(p=>Math.abs(field(proposal.record).heightAt(...p)-field(original).heightAt(...p))>1));
 const before=history.getState().undoStack.length;ops.commitCanyonProposal(proposal);assert.equal(history.getState().undoStack.length,before+1);history.getState().undo();assert.deepEqual(geo.geologyFeatures()[id],original);history.getState().redo();assert.equal(geo.geologyFeatures()[id].definition.sides.right.deformations.length,1);
 pass('09E: seeded local Deform Edge changes actual terrain on one bank only, fades at section boundaries and commits one reversible operation');
 const afterDeform=structuredClone(geo.geologyFeatures()[id]);edits.applyTerrainBrush({x:0,z:20,radius:12,strength:3});const manualAfter=JSON.stringify(terrain.terrainSettings.terrainEdits);
 for(let n=0;n<20;n++)geo.updateGeologyFeature(id,{definition:{height:30+n%5,scale:1+n%3*.25}});geo.updateGeologyFeature(id,{definition:afterDeform.definition});assert.deepEqual(geo.geologyFeatures()[id].definition,afterDeform.definition);assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),manualAfter);
 geo.updateGeologyFeature(id,{definition:original.definition});assert.deepEqual(geo.geologyFeatures()[id].definition,original.definition);assert.deepEqual(signature(geo.geologyFeatures()[id]),signature(original));geo.updateGeologyFeature(id,{definition:afterDeform.definition});
 const {editObjectTarget}=await server.ssrLoadModule('/src/systems/objects/objectEditing.js');editObjectTarget({id},{scale:2,rotationY:Math.PI/2});assert.equal(geo.geologyFeatures()[id].definition.scale,2);assert.equal(geo.geologyFeatures()[id].definition.rotation,90);geo.updateGeologyFeature(id,{definition:afterDeform.definition});
 pass('Full-definition replacement removes obsolete refinements; partial changes retain them; repeated editing and shared transforms preserve independent sculpt');
 const selected=ops.analyzeCanyonWallAt(0,17),params=ops.canyonSelectionParameters(selected);ui.setState({selection:selected,draftParameters:params});const defaults=JSON.stringify(ui.getState().parameters),worldBefore=JSON.stringify(world.getState().world);ui.getState().setParameter('height',35);ui.getState().setParameter('seed',811);assert.equal(JSON.stringify(ui.getState().parameters),defaults);assert.equal(JSON.stringify(world.getState().world),worldBefore);ui.getState().reset();assert.equal(ui.getState().draftParameters,null);
 pass('Tool defaults, selected-wall parameter drafts and committed features remain separate; clearing a draft does not edit terrain');
 const {addTerrainChunk}=await server.ssrLoadModule('/src/systems/world/terrainExpansion.js');assert.ok(addTerrainChunk({grid:'G4'}).ok);assert.ok(addTerrainChunk({grid:'H4'}).ok);
 const seam=geo.createGeologyFeature('canyon-wall',{rotation:0,width:88,length:120},[300,0,50]);const r=geo.geologyFeatures()[seam],p=geologyWorldPoint(r,0,13),s=ops.analyzeCanyonWallAt(...p);ops.commitCanyonProposal(ops.canyonChangeProposal(s,16,'deform',ops.prepareCanyonOperation(s,'deform'),ops.canyonSelectionParameters(s)));
 assert.ok(h(300,25)>10);for(const z of [25,50,75,80])assert.ok(Math.abs(h(300-1e-5,z)-h(300+1e-5,z))<.001);const options={minX:275,maxX:325,minZ:15,maxZ:85,segmentsX:10,segmentsZ:14,origin:'world'};const exported=exporter.createTerrainExportGeometry(options),positions=exported.attributes.position;for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-h(positions.getX(i),positions.getZ(i)))<1e-5);exported.dispose();
 const heights=probes.map(p=>h(...p));persistence.saveWorldSnapshot();const stored=JSON.parse(storage.get(persistence.WORLD_STORAGE_KEY));assert.equal(JSON.stringify(stored.geology).includes('values'),false);persistence.loadWorldSnapshot();terrain.loadChunkTerrainSettings(undefined,true);assert.deepEqual(probes.map(p=>h(...p)),heights);assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),manualAfter);
 assert.throws(()=>normalizeGeologyRecord({...original,definition:{...original.definition,sides:{...original.definition.sides,right:{deformations:Array(65).fill({center:0,length:48,amount:1,seed:1})}}}}));
 pass('09F: refined cross-chunk terrain, committed export, Save/Load and bounded record validation preserve parameters, fields and manual edits');
 for(const [type,x] of [['cliff-face',-150],['giant-rock',150]]){
  geo.createGeologyFeature(type,{},[x,0,-140]);let selection=null;
  for(let dz=-24;dz<=24&&!selection;dz+=4)for(let dx=-32;dx<=32;dx+=4){const candidate=ops.analyzeCanyonWallAt(x+dx,-140+dz);if(candidate&&!candidate.featureId&&candidate.mode==='CENTER'){selection=candidate;break}}
  assert.ok(selection,'Usable ordinary edge on '+type);
  const samples=Array.from({length:121},(_,i)=>[selection.point[0]+(i%11-5)*4,selection.point[2]+(Math.floor(i/11)-5)*4]);
  const previous=samples.map(p=>h(...p)),independent=JSON.stringify(terrain.terrainSettings.terrainEdits),count=Object.keys(geo.geologyFeatures()).length;
  const refinement=ops.canyonChangeProposal(selection,16,'deform',ops.prepareCanyonOperation(selection,'deform'),ops.canyonSelectionParameters(selection));
  assert.ok(ops.commitCanyonProposal(refinement));assert.equal(Object.keys(geo.geologyFeatures()).length,count+1);assert.ok(samples.some((p,i)=>Math.abs(h(...p)-previous[i])>.1));assert.equal(JSON.stringify(terrain.terrainSettings.terrainEdits),independent);
 }
 pass('Cliff Face and Giant Rock expose real ordinary edges; local Deform Edge modifies their composed terrain without losing the source feature or manual sculpt');
 await fs.mkdir('geology-patch09.local',{recursive:true});await fs.writeFile('geology-patch09.local/unit-results.json',JSON.stringify({pass:true,passes},null,2));
}finally{await server.close()}
