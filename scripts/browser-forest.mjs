import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve("task-09-browser.local");
const net = await import("node:net");
const port = await new Promise(resolve => { const listener=net.createServer(); listener.listen(0,"127.0.0.1",()=>{ const chosen=listener.address().port;listener.close(()=>resolve(chosen)); }); });
await fs.mkdir(artifact, { recursive: true });
await fs.writeFile(path.join(artifact,"live-debugger.json"),JSON.stringify({port,pid:process.pid}));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
 "--headless=new","--disable-extensions","--disable-background-networking","--no-first-run","--no-default-browser-check","--remote-debugging-port="+port,
 "--user-data-dir="+path.resolve("node_modules/.cache/tg-ui-browser-"+process.pid),
 "--enable-unsafe-swiftshader","--window-size=1440,1000","about:blank",
], { windowsHide: true, stdio: "ignore" });
let socket;
let captureFailure=async()=>{};

const errors=[], failures=[];
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
 const waitFor=async(expression,label)=>{for(let i=0;i<300;i++){if(await evaluate(expression))return;await pause(200)}throw Error("Timeout: "+label)};
 const screenshot=async name=>{const shot=await cdp("Page.captureScreenshot",{format:"png"});await fs.writeFile(path.join(artifact,name+".png"),Buffer.from(shot.data,"base64"))};
 captureFailure=()=>screenshot("failure");
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
 await cdp("Browser.setDownloadBehavior",{behavior:"allow",downloadPath:artifact});
 await cdp("Page.enable");await cdp("Runtime.enable");await cdp("Network.enable");await cdp("Log.enable");
 await cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp("Page.addScriptToEvaluateOnNewDocument",{source:"window.__titleFrames=0;window.addEventListener('camera-heading-changed',()=>window.__titleFrames++)"});
 await cdp("Page.navigate",{url:process.env.TG_TEST_URL || "http://127.0.0.1:5181/"});
 try { await waitFor("!!document.querySelector('.tg-title-v3')","title screen"); } catch { await cdp("Page.reload",{ignoreCache:true}); await waitFor("!!document.querySelector('.tg-title-v3')","title screen retry"); }
 await click(".tg-title-actions button");
 await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')","world");
 await evaluate(`(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];window.__fiber=await import(url);window.__root=window.__fiber._roots.get(document.querySelector('canvas')).store;window.__world=await import('/src/systems/world/worldStore.js');window.__tool=await import('/src/systems/interaction/interactionStore.js');window.__state=window.__root.getState();window.__scene=window.__state.scene;window.__THREE=await import('/node_modules/.vite/deps/three.js');window.__pose={position:[0,35,65],target:[0,5,0]};window.__root.getState().internal.subscribers.push({ref:{current:()=>{const c=window.__state.camera;c.position.set(...window.__pose.position);c.lookAt(...window.__pose.target);c.updateMatrixWorld()}},priority:0,store:window.__root});})()`);
 const snapshot=()=>evaluate(`(()=>{const a=[];window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeTrunk)a.push({id:o.userData.tgCrimsonTreeId,uuid:o.uuid,geometry:o.geometry.uuid,definition:o.userData.tgTreeDefinition,position:o.getWorldPosition(new window.__THREE.Vector3()).toArray()})});return {trees:a,position:window.__state.camera.position.toArray()}})()`);
 const measure=async(label)=>{
 await pause(2000);
 const result=await evaluate(`new Promise(resolve=>{const samples=[];let last=performance.now(),start=last;function tick(t){samples.push(t-last);last=t;if(t-start<5000)requestAnimationFrame(tick);else{samples.sort((a,b)=>a-b);resolve({frames:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p50Ms:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],render:{...window.__state.gl.info.render},memory:{...window.__state.gl.info.memory},gpu:window.__state.gl.getContext().getParameter(window.__state.gl.getContext().RENDERER)})}}requestAnimationFrame(tick)})`);
 console.log(label,JSON.stringify(result));return result};
 const phase=process.argv[2]||process.env.TG_FOREST_PHASE||"optimized";
 const report={phase,overview:await measure("overview"),initial:await snapshot()};
 await screenshot(phase+"-overview");
 const target=report.initial.trees.filter(t=>t.id?.startsWith('scatter-tree-')).sort((a,b)=>Math.hypot(a.position[0],a.position[2])-Math.hypot(b.position[0],b.position[2]))[0];
 assert.ok(target,'scattered target');
 await evaluate(`window.__target=${JSON.stringify(target)};window.__pose={position:[__target.position[0],__target.position[1]+2.7,__target.position[2]+7],target:[__target.position[0],__target.position[1]+2.7,__target.position[2]]}`);
 report.near=await measure("near");await screenshot(phase+"-before");
 await click("canvas");await pause(1000);
 report.entered={tool:await evaluate("window.__tool.useInteractionStore.getState().activeTool"),snapshot:await snapshot()};
 console.log('entered',report.entered.tool,'trees',report.entered.snapshot.trees.length);
 await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-change',{detail:{treeId:__target.id,scope:'single',patch:{trunk:{height:65}}}}))`);
 await pause(2000);report.edited=await snapshot();report.editPerformance=await measure('edited');await screenshot(phase+"-edited");

 if(phase!=="baseline"){
  assert.equal(report.initial.trees.length,144,'unchanged default density');
  assert.deepEqual(report.edited.trees.map(t=>t.id),report.initial.trees.map(t=>t.id));
  assert.equal(report.entered.tool,'TREE','native reticle click enters tree edit');
  for(const before of report.initial.trees){const after=report.edited.trees.find(t=>t.id===before.id);assert.equal(after.uuid,before.uuid,'same tree mesh on editing');assert.equal(after.definition.seed,before.definition.seed,'procedural seed preserved');assert.deepEqual(after.position,before.position);if(before.id!==target.id)assert.equal(after.geometry,before.geometry,'neighbor geometry unchanged')}
  assert.equal(report.edited.trees.find(t=>t.id===target.id).definition.trunk.height,65);
  const inventory=await evaluate(`(()=>{const result={forest:0,leafInstances:0,outlineColors:[],fillColors:[],fallingColors:[],fernFills:[],fernAccents:[]};window.__scene.traverse(o=>{if(o.userData.tgForestTree)result.forest++;if(o.isInstancedMesh){result.leafInstances+=o.count;if(o.count===2)result.fallingColors.push(o.material.color.getHexString());else result.fillColors.push(o.material.color.getHexString())}if(o.isLineSegments&&o.geometry.isInstancedBufferGeometry)result.outlineColors.push(o.material.color.getHexString());if(o.isMesh&&o.material?.emissive?.getHexString()==='3a8c0e'){result.fernAccents.push(o.material.emissive.getHexString());result.fernFills.push(o.material.color.getHexString())}});return result})()`);
  assert.equal(inventory.forest,144);assert.ok(inventory.leafInstances>=144*750);assert.ok(inventory.outlineColors.every(c=>c==='3a8c0e'));assert.ok(inventory.fernAccents.length>0);assert.ok(inventory.fernFills.every(c=>c==='3a8c0e'));assert.ok(inventory.fillColors.every(c=>c==='8bcf6a'));assert.equal(inventory.fallingColors.length,144);assert.ok(inventory.fallingColors.every(c=>c==='8bcf6a'));report.inventory=inventory;
  await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-change',{detail:{treeId:__target.id,scope:'single',patch:{branches:{length:62},leaves:{size:44,outlineColor:'#123456'}}}}))`);
  await pause(600);const changed=await snapshot();const def=changed.trees.find(t=>t.id===target.id).definition;assert.equal(def.branches.length,62);assert.equal(def.leaves.size,44);assert.equal(def.leaves.outlineColor,'#123456');
  await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-exit-request'))`);await pause(300);await click('canvas');assert.equal(await evaluate("window.__tool.useInteractionStore.getState().activeTool"),'TREE');
  await evaluate(`(async()=>{window.__persist=await import('/src/systems/world/worldPersistence.js');window.__persist.saveWorldSnapshot();window.__persist.loadWorldSnapshot()})()`);await pause(1000);
  const loaded=await snapshot();assert.deepEqual(loaded.trees.find(t=>t.id===target.id).definition,def);assert.equal(loaded.trees.length,144);
  report.persistence='PASS trunk, branch, leaf settings, custom color, same seed/IDs/position after save/load';
  const baseline=await fs.readFile(path.join(artifact,'baseline.json'),'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error});
  if(baseline)assert.deepEqual(report.initial.trees.map(t=>({id:t.id,position:t.position})),baseline.initial.trees.map(t=>({id:t.id,position:t.position})),'baseline placement unchanged');
  report.placementComparison=baseline?'PASS exact pre-change IDs and positions':'No pre-change artifact available';
  // Use the real React controls with browser keyboard input as well as event-path probes.
  await evaluate("document.querySelector('.tg-tree-interaction-slider input').focus()");
  const oldHeight=await evaluate("Number(document.querySelector('.tg-tree-interaction-slider input').value)");
  await key('ArrowRight');const uiState=await snapshot();assert.equal(uiState.trees.find(t=>t.id===target.id).definition.trunk.height,oldHeight+1);
  report.uiSlider='PASS native keyboard changes the real trunk slider';
  for(const [tab,label,section,field] of [['BRANCHES','BRANCH LENGTH','branches','length'],['LEAVES','LEAF SIZE','leaves','size']]){
   await evaluate(`[...document.querySelectorAll('.tg-tree-interaction-mode')].find(b=>b.textContent===${JSON.stringify(tab)}).click()`);
   const old=await evaluate(`(()=>{const input=[...document.querySelectorAll('.tg-tree-interaction-slider')].find(l=>l.textContent.startsWith(${JSON.stringify(label)})).querySelector('input');input.focus();return Number(input.value)})()`);
   await key('ArrowRight');const state=await snapshot();assert.equal(state.trees.find(t=>t.id===target.id).definition[section][field],old+1);
  }
  await evaluate("document.activeElement?.blur()");report.uiSlider='PASS native keyboard changes real trunk, branch, and leaf sliders';
  const repeated=[];
  for(let i=0;i<8;i++){
   await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-change',{detail:{treeId:__target.id,scope:'single',patch:{trunk:{height:${60+i%2}}}}}))`);await pause(250);
   repeated.push(await evaluate('window.__state.gl.info.memory.geometries'));
  }
  assert.ok(Math.max(...repeated.slice(-4))-Math.min(...repeated.slice(-4))<=2,'no progressive geometry accumulation');report.repeatedGeometryCounts=repeated;
  for(const other of loaded.trees.slice(0,4)){
   await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-exit-request'));window.__pose={position:[${other.position[0]},${other.position[1]+2.7},${other.position[2]+7}],target:[${other.position[0]},${other.position[1]+2.7},${other.position[2]}]}`);await pause(500);await click('canvas');
   assert.equal(await evaluate("window.__tool.useInteractionStore.getState().activeTool"),'TREE');
   assert.equal(await evaluate("window.__tool.useInteractionStore.getState().activeTarget"),'tree:'+other.id);
   await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-change',{detail:{treeId:${JSON.stringify(other.id)},scope:'single',patch:{leaves:{outlineColor:'#fc0303',gradientEnabled:true,gradientColor:'#224466'}}}}))`);await pause(300);
  }
  await evaluate('window.__persist.saveWorldSnapshot();window.__persist.loadWorldSnapshot()');await pause(800);
  const final=await snapshot();assert.equal(final.trees.length,144);for(const other of loaded.trees.slice(0,4)){const d=final.trees.find(t=>t.id===other.id).definition;assert.equal(d.leaves.outlineColor,'#fc0303');assert.equal(d.leaves.gradientColor,'#224466')}
  report.multipleTrees='PASS native selection of four trees; explicit legacy-red and gradients survive save/load';
  await evaluate(`window.dispatchEvent(new CustomEvent('crimson-tree-edit-exit-request'));window.__incomplete={...window.__world.useWorldStore.getState().world.scatterProfiles['crimson-tree']};delete window.__incomplete.density;delete window.__incomplete.coverage;window.__world.useWorldStore.setState(s=>({world:{...s.world,scatterProfiles:{...s.world.scatterProfiles,'crimson-tree':window.__incomplete}}}))`);await pause(600);assert.equal((await snapshot()).trees.length,144,'old incomplete profile inherits terrain density');
  await evaluate("window.__world.useWorldStore.getState().upsertScatterProfile('crimson-tree',{density:0})");await pause(500);assert.equal((await snapshot()).trees.length,0,'explicit zero density preserved');
  await evaluate("window.__world.useWorldStore.getState().upsertScatterProfile('crimson-tree',{density:16})");await pause(800);assert.equal((await snapshot()).trees.length,144,'forest restores after density change');
  report.legacyProfile='PASS missing density/coverage fall back; explicit zero remains zero';
  report.gpu=await evaluate("(()=>{const g=window.__state.gl.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)})()");
  report.errors=[...new Set(errors)];assert.deepEqual(report.errors,[],'no browser runtime errors');
  console.log('PASS forest identity, neighbor geometry, palette, edits, persistence and repeat resource checks');
 }
 await fs.writeFile(path.join(artifact,phase+".json"),JSON.stringify(report,null,2));
 console.log('report',phase,'initial',report.initial.trees.length,'edited',report.edited.trees.length,'errors',[...new Set(errors)].slice(0,5));
} catch(error){console.error(error,[...new Set(errors)].slice(0,8));await captureFailure().catch(()=>{});process.exitCode=1;}finally{socket?.close();chrome.kill();}
