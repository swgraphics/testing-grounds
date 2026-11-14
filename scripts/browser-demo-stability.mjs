import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve("task-12-qa.local/" + (process.argv[2] ? 'browser-' + process.argv[2].replace(/[^a-z0-9-]/gi, '_') : 'browser'));
const net = await import("node:net");
const port = await new Promise(resolve => { const listener=net.createServer(); listener.listen(0,"127.0.0.1",()=>{ const chosen=listener.address().port;listener.close(()=>resolve(chosen)); }); });
await fs.mkdir(artifact, { recursive: true });
await fs.writeFile(path.join(artifact,"live-debugger.json"),JSON.stringify({port,pid:process.pid}));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
 "--headless=new","--disable-extensions","--disable-background-networking","--no-first-run","--no-default-browser-check","--remote-debugging-port="+port,
 "--user-data-dir="+path.resolve("node_modules/.cache/tg-demo-browser-"+process.pid),
 "--enable-unsafe-swiftshader","--window-size=1440,1000","about:blank",
], { windowsHide: true, stdio: "ignore" });
let socket;
let diagnosis=async()=>({}), captureFailure=async()=>{};
const errors=[], failures=[], passes=[];
try {
 let pages;
 for (let i=0;i<60;i++) { try { pages = await (await fetch("http://127.0.0.1:"+port+"/json/list")).json(); if(pages.length)break; } catch {} await pause(250); }
 assert.ok(pages?.length,"Chrome DevTools connection");
 socket = new WebSocket(pages.find(page=>page.type==="page").webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 let id=0; const pending = new Map();
 socket.onmessage=event=>{
  const value=JSON.parse(event.data);
  if(value.id){const entry=pending.get(value.id);if(entry){pending.delete(value.id);value.error?entry.reject(value.error):entry.resolve(value.result)}}
  if(value.method==="Runtime.exceptionThrown") errors.push(value.params.exceptionDetails.exception?.description || value.params.exceptionDetails.text);
  if(value.method==="Log.entryAdded" && value.params.entry.level==="error") errors.push(value.params.entry.text);
  if(value.method==="Network.responseReceived" && value.params.response.status>=400) failures.push({url:value.params.response.url,status:value.params.response.status});
 };
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});socket.send(JSON.stringify({id:request,method,params}))});
 const evaluate=async expression=>{const result=await cdp("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
 const waitFor=async(expression,label)=>{for(let i=0;i<150;i++){try{if(await evaluate(expression))return}catch(error){if(error.code!==-32000&&!String(error).includes('Execution context was destroyed'))throw error}await pause(200)}throw Error("Timeout: "+label)};
 const screenshot=async name=>{const shot=await cdp("Page.captureScreenshot",{format:"png"});await fs.writeFile(path.join(artifact,name+".png"),Buffer.from(shot.data,"base64"))};
 const key=async(key,code=key)=>{const codes={Tab:9,Enter:13,Escape:27,ArrowUp:38,ArrowRight:39,ArrowDown:40,ArrowLeft:37};await cdp("Input.dispatchKeyEvent",{type:"keyDown",key,code,windowsVirtualKeyCode:codes[key]||0});await cdp("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:codes[key]||0});await pause(1000)};
 const click=async selector=>{
  await waitFor("!document.querySelector('.tg-loading-overlay')","loading overlay");
  await waitFor("!!document.querySelector("+JSON.stringify(selector)+")","control "+selector);
  if(selector!=="canvas" && selector!==".tg-compass-activate"){await evaluate("document.querySelector("+JSON.stringify(selector)+").click()");await pause(300);return}
  const point=await evaluate("(()=>{const r=document.querySelector("+JSON.stringify(selector)+").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cdp("Input.dispatchMouseEvent",{type:"mouseMoved",...point});await pause(1000);
  await cdp("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});
  await cdp("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});await pause(300);
 };
 diagnosis=async()=>({url:await evaluate("location.href"),text:await evaluate("document.body?.innerText.slice(0,1200)"),frames:await evaluate("window.__frames"),expanded:await evaluate("document.querySelector('.tg-compass-activate')?.getAttribute('aria-expanded')"),nav:await evaluate("window.__nav ? {open:window.__nav.useNavigationStore.getState().compassOpen,menu:window.__nav.useNavigationStore.getState().menu}:null")});captureFailure=()=>screenshot("failure");
 await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable'); await cdp('Log.enable');
 await cdp('Page.navigate',{url:process.env.TG_TEST_URL || 'http://127.0.0.1:5181/'});
 await waitFor("!!document.querySelector('.tg-title-enter')",'title');
 await click('.tg-title-enter');
 await waitFor("!document.querySelector('.tg-loading-overlay')",'loaded');
 await evaluate(`(async()=>{
  for(const [key,url] of Object.entries({world:'world/worldStore',settings:'terrain/terrainSettings',edits:'terrain/terrainEdits',vertices:'terrain/terrainVertexEditing',height:'terrain/terrainHeight',editor:'editor/editorStore',nav:'ui/navigationStore',actions:'ui/navigationActions',tool:'interaction/interactionStore',history:'history/historyStore',cloud:'atmosphere/clouds/CloudSettings',persist:'world/worldPersistence'})) window['__'+key]=await import('/src/systems/'+url+'.js');
  const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];
  const fiber=await import(url);window.__root=fiber._roots.get(document.querySelector('canvas')).store;window.__scene=window.__root.getState().scene;
 })()`);
 const results=[];
 const check=async(name,fn)=>{const filter=process.argv[2]==='extras'?/Chunk save|Object placement/:process.argv[2]?new RegExp(process.argv[2],'i'):null;if(filter&&!filter.test(name))return;try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name,JSON.stringify(detail??''));}catch(error){results.push({name,status:'FAIL',error:String(error)});console.log('FAIL',name,String(error));await screenshot('failure-'+results.length)}finally{await fs.writeFile(path.join(artifact,'results.json'),JSON.stringify({results,errors,failures},null,2))}};
 const textClick=async(root,text)=>{await evaluate(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(root+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Button missing: '+${JSON.stringify(text)});b.click()})()`);await pause(400)};
 const setValue=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await pause(300)};
 const reset=()=>evaluate("window.__actions.returnToWorldView();window.__tool.useInteractionStore.getState().clear();document.activeElement?.blur()");
 await check('Cloud save/load restores runtime settings',async()=>{
  await evaluate("window.__cloud.updateCloudSetting('density',.31);window.__cloud.updateCloudSetting('upperColor','#123456');window.__settings.saveWorldSettings();window.__cloud.updateCloudSetting('density',.87);window.__cloud.updateCloudSetting('upperColor','#abcdef');window.__settings.loadWorldSettings()");
  const values=await evaluate("({runtime:window.__cloud.cloudSettings.density,saved:window.__world.useWorldStore.getState().world.atmosphere.clouds.density,color:window.__cloud.cloudSettings.upperColor})");
  assert.equal(values.runtime,.31);assert.equal(values.color,'#123456');return values;
 });
 await check('Terrain brush operations alter actual sampled heights and history',async()=>{
  const values=await evaluate(`(()=>{const out=[];for(const tool of ['raise','lower','smooth','flatten','slope']){window.__settings.updateTerrainSetting('terrainEdits',{});window.__edits.applyTerrainBrush({x:20,z:20,tool:'raise',radius:22,strength:4});const before=JSON.stringify(window.__settings.terrainSettings.terrainEdits);const h=window.__height.getTerrainHeightAt(25,20);window.__edits.beginTerrainHistory(tool);window.__edits.applyTerrainBrush({x:20,z:20,tool,radius:22,strength:2});window.__edits.commitTerrainHistory();const after=JSON.stringify(window.__settings.terrainSettings.terrainEdits);const h2=window.__height.getTerrainHeightAt(25,20);window.__history.useHistoryStore.getState().undo();out.push({tool,changed:before!==after,heightChanged:h!==h2,undo:JSON.stringify(window.__settings.terrainSettings.terrainEdits)===before})}return out})()`);
  for(const v of values){assert.ok(v.changed,v.tool);assert.ok(v.heightChanged,v.tool+' height');assert.ok(v.undo,v.tool+' undo')}return values;
 });
 await check('Vertex edits change sampled height and survive save/load',async()=>{
  const values=await evaluate(`(()=>{const before=window.__height.getTerrainHeightAt(30,30);window.__vertices.setTerrainVertexEdit(30,30,6);const after=window.__height.getTerrainHeightAt(30,30);window.__settings.saveWorldSettings();window.__vertices.setTerrainVertexEdit(30,30,0);window.__settings.loadWorldSettings();return {before,after,loaded:window.__height.getTerrainHeightAt(30,30)}})()`);assert.ok(Math.abs(values.after-values.before-6)<1e-6);assert.equal(values.loaded,values.after);return values;
 });
 await check('World map Add Chunk exposes an available grid and creates named chunk',async()=>{
  await reset();await evaluate("window.__actions.openWorkspace('map')");await pause(500);await textClick('.tg-editor-bottom-bar','ADD CHUNK');
  const info=await evaluate("({disabled:document.querySelector('.tg-chunk-dialog select').disabled,value:document.querySelector('.tg-chunk-dialog select').value,options:[...document.querySelector('.tg-chunk-dialog select').options].filter(o=>o.value&&!o.disabled).map(o=>o.value),occupied:Object.values(window.__world.useWorldStore.getState().world.chunks).map(c=>c.grid)})");
  if(info.disabled && info.occupied.includes(info.value))throw Error('Grid locked to occupied '+info.value);
  if(!info.disabled)await setValue('.tg-chunk-dialog select',info.options[0]);
  await setValue('.tg-chunk-dialog input','QA CHUNK');await click('.tg-chunk-dialog button[type=submit]');
  assert.ok(await evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks).some(c=>c.name==='QA CHUNK')"));return info;
 });
 // Continue even if the creation dialog exposed a failure.
 if(await evaluate("!!document.querySelector('.tg-chunk-dialog')"))await textClick('.tg-chunk-dialog','CANCEL');
 await check('Area rename Escape cancels without saving',async()=>{
  await evaluate("window.__actions.openWorkspace('map')");await pause(350);
  const before=await evaluate("window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].name");
  await evaluate("document.querySelector('.tg-editor-area-button.active').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))");await pause(200);
  await setValue('.tg-editor-area-rename-input','SHOULD CANCEL');await key('Escape');
  const after=await evaluate("window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].name");assert.equal(after,before);return {before,after};
 });
 await check('Chunk save/load/reset controls restore isolated chunk settings',async()=>{
  await evaluate("window.__actions.openWorkspace('map')");await pause(300);await textClick('.tg-editor-bottom-bar','SAVE CHUNK');
  const before=await evaluate("window.__settings.terrainSettings.heightMultiplier");await evaluate("window.__settings.updateTerrainSetting('heightMultiplier',.37)");await textClick('.tg-editor-bottom-bar','LOAD CHUNK');assert.equal(await evaluate("window.__settings.terrainSettings.heightMultiplier"),before);
  await textClick('.tg-editor-bottom-bar','RESET CHUNK');assert.equal(await evaluate("window.__settings.terrainSettings.heightMultiplier"),.5);return {restored:before,reset:.5};
 });
 await check('Help dialog traps input and Escape restores world ownership',async()=>{
  await reset();await evaluate("window.__nav.useNavigationStore.getState().setHelp(true)");await pause(300);await key('Tab');assert.ok(await evaluate("!!document.activeElement.closest('.tg-help-dialog')"));await key('Escape');assert.equal(await evaluate("!!document.querySelector('.tg-help-dialog')"),false);return 'Help opens, focuses and closes';
 });
 await check('Sun drag changes lighting; lake and river tools alter world data',async()=>{
  await reset();await evaluate("window.__actions.runNavigationAction('sun')");await pause(300);
  const sunBefore=await evaluate("[window.__settings.terrainSettings.sunRotation,window.__settings.terrainSettings.sunHeight]");
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:800,y:450,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:510,buttons:1,button:'left'});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:900,y:510,button:'left',clickCount:1});await pause(400);
  const sunAfter=await evaluate("[window.__settings.terrainSettings.sunRotation,window.__settings.terrainSettings.sunHeight]");assert.notDeepEqual(sunAfter,sunBefore);
  await evaluate("window.__actions.runNavigationAction('lake')");
  const count=()=>evaluate("window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].water.bodies?.length??0");const before=await count();await click('canvas');const after=await count();assert.equal(after,before+1,'pond body created');
  await evaluate("window.__actions.runNavigationAction('river')");const edits=await evaluate("JSON.stringify(window.__settings.terrainSettings.terrainEdits)");await click('canvas');assert.notEqual(await evaluate("JSON.stringify(window.__settings.terrainSettings.terrainEdits)"),edits,'river cuts terrain');
  await screenshot('environment');return {sunBefore,sunAfter,pondBodies:after};
 });
 await check('Plateau settings change terrain; Region exposes validated export',async()=>{
  await reset();await evaluate("window.__settings.updateTerrainSetting('plateauAmount',50)");const before=await evaluate("window.__height.getTerrainHeightAt(160,-170)");await evaluate("window.__settings.updateTerrainSetting('plateauAmount',0)");const after=await evaluate("window.__height.getTerrainHeightAt(160,-170)");assert.notEqual(after,before);
  await evaluate("window.__actions.runNavigationAction('export')");await pause(300);await setValue('.tg-terrain-export input[type=number]',99999);assert.ok(await evaluate("document.querySelector('.tg-terrain-export [role=status]')?.textContent.length>0 && document.querySelector('.tg-terrain-export button[type=submit]').disabled"));await reset();return {before,after,invalidBoundsRejected:true};
 });
 await check('Dev Tools cloud control changes live shader uniform',async()=>{
  await reset();await evaluate("window.__actions.runNavigationAction('clouds')");await pause(600);
  const selector=await evaluate(`(()=>{const row=[...document.querySelectorAll('.tg-dev-full-menu.open .tg-dev-slider-row')].find(e=>e.textContent.toUpperCase().includes('DENSE')&&e.querySelector('input'));const input=row?.querySelector('input');if(!input)throw Error('Cloud density input unavailable');input.setAttribute('data-qa-density','');return '[data-qa-density]'})()`);
  const before=await evaluate("window.__cloud.cloudSettings.density");await evaluate("document.querySelector('[data-qa-density]').focus()");await key('ArrowRight');
  const after=await evaluate("window.__cloud.cloudSettings.density");assert.notEqual(after,before);await pause(300);
  const uniforms=await evaluate("(()=>{const out=[];window.__scene.traverse(o=>{if(o.material?.uniforms?.density)out.push(o.material.uniforms.density.value)});return out})()");assert.ok(uniforms.includes(after),'live cloud shader');
  await evaluate("[...document.querySelectorAll('.tg-dev-full-menu.open .tg-dev-slider-row')].find(e=>e.textContent.includes('Cloud Puffiness')).querySelector('input').focus()");await key('ArrowRight');
  const puffiness=await evaluate("({settings:window.__cloud.cloudSettings.puffiness,shader:(()=>{let value;window.__scene.traverse(o=>{if(o.material?.uniforms?.puffiness)value=o.material.uniforms.puffiness.value});return value})()})");assert.equal(puffiness.settings,puffiness.shader);assert.equal(puffiness.settings,.51);return {selector,before,after,uniforms,puffiness};
 });
 await check('Object placement, rotation and scale use live controls and persist',async()=>{
  // Isolate object gestures from AreaDiscovery automatically changing the active
  // authored area as the player settles after earlier terrain/chunk scenarios.
  await reset();await evaluate("window.__world.useWorldStore.getState().initializeBlankWorld();window.__settings.initializeBlankCanvasTerrain();window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}))");await pause(3000);
  await evaluate("window.__actions.openWorkspace('terrain');window.__objectCamera={ref:{current:()=>{const camera=window.__root.getState().camera;camera.position.set(52,12,70);camera.lookAt(52,0,52);camera.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__objectCamera)");await pause(400);
  await textClick('.tg-library-strip','BLOCK');await pause(300);await click('canvas');await pause(400);
  const id=await evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects).find(o=>o.modelType==='building-block')?.id");assert.ok(id,'placed block');
  await evaluate("window.dispatchEvent(new CustomEvent('tg-mesh-cancel-placement'));window.__actions.returnToWorldView()");await pause(300);await click('canvas');
  assert.equal(await evaluate("window.__tool.useInteractionStore.getState().activeTarget"),'object:'+id);
  const originalPosition=await evaluate(`window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects[${JSON.stringify(id)}].position`);
  const dragPoint=await evaluate(`(()=>{const camera=window.__root.getState().camera;const p=camera.position.clone().fromArray(${JSON.stringify(originalPosition)}).project(camera);const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}})()`);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...dragPoint,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:dragPoint.x+80,y:dragPoint.y+30,buttons:1,button:'left'});await pause(300);await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:dragPoint.x+80,y:dragPoint.y+30,button:'left',clickCount:1});await pause(300);
  const movedPosition=await evaluate(`window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects[${JSON.stringify(id)}].position`);assert.notDeepEqual(movedPosition,originalPosition,'native drag moves object');
  assert.ok(Math.abs(movedPosition[1]-originalPosition[1])<.02,'block stays grounded after dragging');await evaluate("window.__history.useHistoryStore.getState().undo()");assert.deepEqual(await evaluate(`window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects[${JSON.stringify(id)}].position`),originalPosition,'drag undo restores object');await evaluate("window.__history.useHistoryStore.getState().redo()");
  await key('r','KeyR');await key(']','BracketRight');
  const object=()=>evaluate(`window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects[${JSON.stringify(id)}]`);
  const transformed=await object();assert.ok(transformed.rotationY>0);assert.equal(transformed.scale,1.1);await evaluate("window.__settings.saveWorldSettings();window.__settings.loadWorldSettings()");const restored=await object();assert.equal(restored.scale,1.1);assert.equal(restored.rotationY,transformed.rotationY);
  await screenshot('object-transform');await evaluate("window.__root.getState().internal.subscribers=window.__root.getState().internal.subscribers.filter(s=>s!==window.__objectCamera)");return {id,originalPosition,movedPosition,rotationY:restored.rotationY,scale:restored.scale};
 });
 await reset();
 await check('Unsupported uploads explain accepted format without starting importer',async()=>{
  await evaluate("window.__actions.openObjectLibrary('upload')");await pause(300);const file=path.resolve(artifact,'unsupported.obj');await fs.writeFile(file,'o unsupported\n');
  const doc=await cdp('DOM.getDocument');const input=await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.tg-mesh-menu input[type=file]'});await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[file]});await pause(300);
  assert.ok(await evaluate("document.querySelector('.tg-mesh-menu [role=alert]')?.textContent.includes('self-contained .glb')"));return 'Visible format explanation; no loader call';
 });
 await check('Local GLB upload loads a preview and places an object',async()=>{
  await evaluate("window.__actions.openObjectLibrary('upload')");await pause(500);
  // A tiny self-contained GLB exported by the real Terrain Export suite.
  const files=(await fs.readdir(path.resolve('task-0801-browser.local'))).filter(p=>p.endsWith('.glb'));
  assert.ok(files.length,'existing real browser export');const file=path.resolve('task-0801-browser.local',files.at(-1));
  const doc=await cdp('DOM.getDocument');const input=await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.tg-mesh-menu input[type=file]'});await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[file]});await pause(1500);
  await textClick('.tg-mesh-menu-actions','PLACE');await evaluate("window.__actions.returnToWorldView();window.__inspection={ref:{current:()=>{const camera=window.__root.getState().camera;camera.position.set(0,50,60);camera.lookAt(0,0,0);camera.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__inspection)");await pause(700);await click('canvas');await pause(500);
  const objects=await evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects)");
  const uploaded=objects.find(o=>o.source==='uploaded');await evaluate("window.__root.getState().internal.subscribers=window.__root.getState().internal.subscribers.filter(s=>s!==window.__inspection)");assert.ok(uploaded,'upload placed');return {id:uploaded.id,modelPath:uploaded.modelPath??null,persistence:uploaded.modelPath?'modelPath':'session-only'};
 });
 await reset();
 await check('Denser forest sample renders and restores default population',async()=>{
  const sample=()=>evaluate("new Promise(resolve=>{const start=performance.now();let frames=0;function tick(){frames++;if(performance.now()-start<2000)requestAnimationFrame(tick);else resolve({frames,elapsed:performance.now()-start,render:{...window.__root.getState().gl.info.render},memory:{...window.__root.getState().gl.info.memory}})}requestAnimationFrame(tick)})");
  const baseline=await sample();await evaluate("window.__world.useWorldStore.getState().upsertScatterProfile('crimson-tree',{density:32})");await pause(800);const dense=await sample();
  const count=await evaluate("(()=>{let n=0;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeTrunk)n++});return n})()");assert.equal(count,288);assert.ok(dense.frames>0);await screenshot('dense-288');
  await evaluate("window.__world.useWorldStore.getState().upsertScatterProfile('crimson-tree',{density:16})");await pause(800);return {baseline,dense,count};
 });
 await check('Rapid movement and camera changes keep character root upright',async()=>{
  await evaluate("window.__world.useWorldStore.getState().initializeBlankWorld();window.__settings.initializeBlankCanvasTerrain();window.__tool.useInteractionStore.getState().clear();window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}))");await pause(3000);
  const samples=[];
  for(const [key,code,number] of [['w','KeyW',87],['a','KeyA',65],['d','KeyD',68],['s','KeyS',83],['w','KeyW',87],['d','KeyD',68]]){
   await cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number});await pause(250);
   samples.push(await evaluate("(()=>{let character;window.__scene.traverse(o=>{if(o.userData.tgCharacterId)character=o});if(!character)throw Error('No character');return {rotation:character.getWorldQuaternion(character.quaternion.clone()).toArray(),position:character.getWorldPosition(character.position.clone()).toArray()}})()"));await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});
  }
  assert.ok(samples.every(s=>s.rotation.every(Number.isFinite)&&Math.abs(s.rotation[0])<.01&&Math.abs(s.rotation[2])<.01),'root remains yaw-only');assert.ok(samples.some(s=>Math.hypot(s.position[0]-samples[0].position[0],s.position[2]-samples[0].position[2])>.1),'real movement during direction changes');return {samples,limitation:'short synthetic sequence; intermittent skeletal pose tilt still requires longer manual play'};
 });
 await check('Repeated panels/tools/save/load have bounded GPU resources',async()=>{
  const samples=[];
  for(let i=0;i<6;i++){
   await evaluate("window.__actions.openWorkspace('terrain');window.__actions.activateWorldTool('RAISE');window.__actions.returnToWorldView();window.__actions.runNavigationAction('export');window.__actions.returnToWorldView();window.__settings.saveWorldSettings();window.__settings.loadWorldSettings()");await pause(700);
   samples.push(await evaluate("({geometries:window.__root.getState().gl.info.memory.geometries,textures:window.__root.getState().gl.info.memory.textures,heap:performance.memory?.usedJSHeapSize})"));
  }
  assert.ok(Math.max(...samples.slice(-3).map(s=>s.geometries))-Math.min(...samples.slice(-3).map(s=>s.geometries))<=4);return samples;
 });
 await check('Saved title entry restores world and cloud settings after reload',async()=>{
  await evaluate("window.__cloud.updateCloudSetting('density',.34);window.__settings.saveWorldSettings()");await cdp('Page.reload');await waitFor("!!document.querySelector('.tg-title-load')",'reload title');assert.equal(await evaluate("document.querySelector('.tg-title-load').disabled"),false);await click('.tg-title-load');await pause(1200);
  const cloud=await evaluate("(async()=>{const c=await import('/src/systems/atmosphere/clouds/CloudSettings.js');return c.cloudSettings.density})()");assert.equal(cloud,.34);return cloud;
 });
 await screenshot('final');
 await fs.writeFile(path.join(artifact,'results.json'),JSON.stringify({results,errors,failures},null,2));
 console.log(JSON.stringify({results,errors,failures},null,2));
 if(results.some(r=>r.status==='FAIL')||errors.length||failures.length)process.exitCode=1;
} catch(error){console.error(error);await captureFailure().catch(()=>{});process.exitCode=1}finally{socket?.close();chrome.kill()}
