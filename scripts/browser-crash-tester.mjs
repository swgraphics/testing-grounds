import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve(process.env.TG_CHARACTER_ARTIFACT || "task-10-browser.local");
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
  if(value.method==="Runtime.consoleAPICalled" && ['warning','warn','error'].includes(value.params.type)){const message=value.params.args.map(a=>a.value??a.description??'').join(' ');if(/PropertyBinding|No target node|No property|No tracks/i.test(message))errors.push(message)}
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
 await evaluate(`(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];window.__fiber=await import(url);window.__root=window.__fiber._roots.get(document.querySelector('canvas')).store;window.__world=await import('/src/systems/world/worldStore.js');window.__tool=await import('/src/systems/interaction/interactionStore.js');window.__state=window.__root.getState();window.__scene=window.__state.scene;window.__THREE=await import('/node_modules/.vite/deps/three.js');})()`);
 const snapshot=()=>evaluate(`(()=>{const a=[];window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeTrunk)a.push({id:o.userData.tgCrimsonTreeId,uuid:o.uuid,geometry:o.geometry.uuid,definition:o.userData.tgTreeDefinition,position:o.getWorldPosition(new window.__THREE.Vector3()).toArray()})});return {trees:a,position:window.__state.camera.position.toArray()}})()`);
 const measure=async(label)=>{
 await pause(2000);
 const result=await evaluate(`new Promise(resolve=>{const samples=[];let last=performance.now(),start=last;function tick(t){samples.push(t-last);last=t;if(t-start<5000)requestAnimationFrame(tick);else{samples.sort((a,b)=>a-b);resolve({frames:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p50Ms:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],render:{...window.__state.gl.info.render},memory:{...window.__state.gl.info.memory},gpu:window.__state.gl.getContext().getParameter(window.__state.gl.getContext().RENDERER)})}}requestAnimationFrame(tick)})`);
 console.log(label,JSON.stringify(result));return result};
 const report={phase:process.argv[2]||'staged',movement:[],clips:[],switches:[]};
 await evaluate(`(async()=>{window.__registry=await import('/src/components/character/characterRegistry.js');window.__dev=await import('/src/systems/dev/devSettings.js');window.__terrainHeight=await import('/src/systems/terrain/terrainHeight.js');window.__editor=await import('/src/systems/editor/editorStore.js');window.__playerPositions=[];window.addEventListener('player-position-changed',e=>window.__playerPositions.push(e.detail));window.__avatar=()=>{let group;window.__scene.traverse(o=>{if(o.userData.tgCharacterId)group=o});return group};window.__avatarSnapshot=()=>{const group=window.__avatar();if(!group)return null;let mesh;group.traverse(o=>{if(o.isSkinnedMesh)mesh=o});if(!mesh)return null;window.__scene.updateMatrixWorld(true);mesh.skeleton.update();mesh.computeBoundingBox();const bounds=mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld),center=bounds.getCenter(new window.__THREE.Vector3()),size=bounds.getSize(new window.__THREE.Vector3());return {id:group.userData.tgCharacterId,state:group.userData.tgAnimationState,vertices:mesh.geometry.attributes.position.count,triangles:mesh.geometry.index.count/3,bones:mesh.skeleton.bones.length,material:mesh.material.uuid,geometry:mesh.geometry.uuid,skeleton:mesh.skeleton.uuid,textureSizes:[mesh.material.map,mesh.material.normalMap,mesh.material.roughnessMap].map(t=>({width:t.image.width,height:t.image.height})),position:group.getWorldPosition(new window.__THREE.Vector3()).toArray(),rotation:group.getWorldQuaternion(new window.__THREE.Quaternion()).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray(),center:center.toArray()},terrain:window.__terrainHeight.getTerrainHeightAt(center.x,center.z),bonePose:Object.fromEntries(mesh.skeleton.bones.filter(b=>['upperarm_l','lowerarm_l','hand_l','thigh_l','calf_l','foot_l','upperarm_r','lowerarm_r','hand_r','thigh_r','calf_r','foot_r'].includes(b.name)).map(b=>[b.name,b.quaternion.toArray()])),resources:{...window.__state.gl.info.memory},camera:window.__state.camera.position.toArray()}}})()`);
 const avatar=()=>evaluate('window.__avatarSnapshot()');
 await waitFor('!!window.__avatarSnapshot()','initial avatar');await pause(1500);
 report.initial=await avatar();if(report.phase==='final')assert.equal(report.initial.id,'crashTester20','new default after runtime gate');console.log('initial',JSON.stringify(report.initial));
 // Existing UI controls select the preview; no movement/controller implementation is changed.
 await evaluate('window.__editor.useEditorStore.getState().openDevToolsMenu()');
 await evaluate("[...document.querySelectorAll('[data-dev-section-header]')].find(b=>b.textContent.includes('CHARACTER')).click()");
 await waitFor("!!document.querySelector('.tg-character-selector')",'compact character selector');
 const start=Date.now();
 await click('[aria-label="Next character"]');await waitFor("document.querySelector('[data-character-id]').dataset.characterId==='crashTester01'",'previous model selection');
 await click('[aria-label="Previous character"]');await waitFor("document.querySelector('[data-character-id]').dataset.characterId==='crashTester20'",'new model selection');
 await evaluate("window.__editor.useEditorStore.getState().closeDevTools();document.activeElement?.blur()");
 await waitFor("window.__avatarSnapshot()?.id==='crashTester20' && window.__avatarSnapshot()?.vertices===15279",'new skinned model');
 report.previewReadyMs=Date.now()-start;await pause(2000);report.newIdle=await avatar();
 assert.equal(report.newIdle.bones,66);assert.equal(report.newIdle.triangles,10403);assert.equal(report.newIdle.state,'idle');assert.ok(report.newIdle.textureSizes.every(t=>t.width===2048&&t.height===2048));
 const press=(key,code,windowsVirtualKeyCode,type)=>cdp('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode});
 const hold=async(key,code,number,ms)=>{await press(key,code,number,'keyDown');await pause(ms);await press(key,code,number,'keyUp')};
 await press('w','KeyW',87,'keyDown');await pause(900);const walking=await avatar();assert.equal(walking.state,'walk');report.movement.push({action:'walk',snapshot:walking});
 await press('Shift','ShiftLeft',16,'keyDown');await pause(900);const sprint=await avatar();assert.equal(sprint.state,'run');report.movement.push({action:'sprint',snapshot:sprint});
 await press(' ','Space',32,'keyDown');await pause(300);const runJump=await avatar();assert.equal(runJump.state,'runJump');report.movement.push({action:'runJump',snapshot:runJump});
 await press(' ','Space',32,'keyUp');await press('Shift','ShiftLeft',16,'keyUp');await press('w','KeyW',87,'keyUp');await pause(2200);
 const resting=await avatar();assert.ok(Math.hypot(resting.position[0]-report.newIdle.position[0],resting.position[2]-report.newIdle.position[2])>.5,'native movement');
 const jumpStart=await avatar();await press(' ','Space',32,'keyDown');await pause(300);report.movement.push({action:'jump',snapshot:await avatar()});assert.equal(report.movement.at(-1).snapshot.state,'jump');await press(' ','Space',32,'keyUp');await pause(2200);report.landed=await avatar();assert.equal(report.landed.state,'idle');
 assert.ok(report.movement.at(-1).snapshot.position[1]>jumpStart.position[1]+.1,'actual physical jump');
 await hold('a','KeyA',65,1200);report.turned=await avatar();
 assert.ok(JSON.stringify(walking.bonePose)!==JSON.stringify(sprint.bonePose),'walk and sprint deform the skeleton');
 // Native camera orbit and first-person toggle use the unchanged existing handlers.
 const cameraBefore=(await avatar()).camera;
 await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:850,y:450,button:'right',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:510,buttons:2,button:'right'});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:1100,y:510,button:'right',clickCount:1});await pause(600);
 assert.notDeepEqual((await avatar()).camera,cameraBefore);report.cameraOrbit='PASS native right-drag';
 await evaluate("window.dispatchEvent(new CustomEvent('tg-toggle-fpv-request'))");await waitFor('!window.__avatar()','first-person hides model');await hold('w','KeyW',87,600);await evaluate("window.dispatchEvent(new CustomEvent('tg-toggle-fpv-request'))");await waitFor("window.__avatarSnapshot()?.id==='crashTester20'",'third-person restores model');report.firstPerson='PASS toggle, hidden body, movement, third-person return';
 // Inspection camera exists only in this test, after native camera behavior was checked.
 await evaluate(`window.__inspection={ref:{current:()=>{const a=window.__avatarSnapshot();if(!a)return;const c=a.bounds.center;window.__state.camera.position.set(c[0]+(window.__side??1.8),c[1]+.6,c[2]+(window.__front??5));window.__state.camera.lookAt(...c);window.__state.camera.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__inspection)`);
 await pause(400);await screenshot(report.phase+'-idle-front');
 await evaluate('window.__front=-5');await pause(300);await screenshot(report.phase+'-idle-back');await evaluate('window.__front=5');
 // Representative UAL1/UAL2 actions through the actual existing action buttons.
 await evaluate('window.__editor.useEditorStore.getState().open()');await waitFor("document.body.classList.contains('tg-editor-active')",'editor context');
 await click('[data-object-view="animation"]');await waitFor("!!document.querySelector('.tg-animation-library-panel')",'animation library');
 const sample=['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Jump_Start','Jump_Loop','Jump_Land','Interact','Punch_Jab','Punch_Cross','Roll','PickUp_Table','Dance_Loop','Sword_Heavy_Combo','ClimbUp_1m','TreeChopping_Loop','Zombie_Walk_Fwd_Loop','Yes'];
 for(const name of sample){
  await evaluate(`(()=>{const b=[...document.querySelectorAll('.tg-animation-library-action')].find(b=>b.title.startsWith(${JSON.stringify(name.replaceAll('_',' '))}+' '));const all=[...document.querySelectorAll('.tg-animation-library-action')];const wanted=all.find(b=>b.title.split(' — ')[0]===${JSON.stringify(name.replaceAll('_',' '))});if(!wanted&&!b)throw Error('No UI action '+${JSON.stringify(name)});(wanted??b).click()})()`);
  await pause(550);const pose=await avatar();assert.equal(pose.state,name,'library '+name);assert.ok(pose.bounds.size.every(n=>Number.isFinite(n)&&n>=0&&n<9),'finite bounded deformation');report.clips.push({name,pose});
  if(['Jog_Fwd_Loop','Interact','Punch_Jab','Jump_Land','Sword_Heavy_Combo'].includes(name))await screenshot(report.phase+'-'+name);
 }
 await evaluate('window.__editor.useEditorStore.getState().close();window.__editor.useEditorStore.getState().closeDevTools();document.activeElement?.blur()');await pause(1700);
 // Model resources should be reused while skeleton ownership remains independent.
 for(const id of ['crashTester01','crashTester20','crashTester01','crashTester20','crashTester01','crashTester20']){
  await evaluate(`window.dispatchEvent(new CustomEvent('change-character',{detail:{characterId:${JSON.stringify(id)}}}))`);await waitFor(`window.__avatarSnapshot()?.id===${JSON.stringify(id)}`,'reselection '+id);await pause(400);report.switches.push(await avatar());
 }
 const newest=report.switches.filter(s=>s.id==='crashTester20');assert.equal(new Set(newest.map(s=>s.material)).size,1);assert.equal(new Set(newest.map(s=>s.geometry)).size,1);assert.equal(new Set(newest.map(s=>s.skeleton)).size,3);
 assert.ok(Math.max(...newest.map(s=>s.resources.geometries))-Math.min(...newest.map(s=>s.resources.geometries))<=1);assert.ok(Math.max(...newest.map(s=>s.resources.textures))-Math.min(...newest.map(s=>s.resources.textures))<=1);
 report.resources='PASS shared materials/geometry, independent skeletons, bounded reselection resources';

 // Flat Blank Canvas isolates model grounding and rendering from terrain slope.
 await evaluate(`(async()=>{const t=await import('/src/systems/terrain/terrainSettings.js');window.__world.useWorldStore.getState().initializeBlankWorld();t.initializeBlankCanvasTerrain();window.__tool.useInteractionStore.getState().deactivate()})()`);await pause(1500);
 await evaluate("window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}))");await pause(3500);
 report.flatGround=[];report.performance=[];
 for(const id of ['crashTester01','crashTester20','crashTester01','crashTester20']){
  await evaluate(`window.dispatchEvent(new CustomEvent('change-character',{detail:{characterId:${JSON.stringify(id)}}}))`);await waitFor(`window.__avatarSnapshot()?.id===${JSON.stringify(id)}`,'flat '+id);await pause(1800);const pose=await avatar();
  report.flatGround.push(pose);console.log('flat-ground',id,pose.bounds.min[1]-pose.terrain,JSON.stringify(pose.bounds));
  await evaluate("window.__inspection.ref.current=()=>{window.__state.camera.position.set(53,2.7,55);window.__state.camera.lookAt(50,1.3,50);window.__state.camera.updateMatrixWorld()}");
  report.performance.push({id,...await measure('isolated '+id)});await screenshot(report.phase+'-flat-'+id);
 }
 const newGround=report.flatGround.find(p=>p.id==='crashTester20');assert.ok(Math.abs(newGround.bounds.min[1]-newGround.terrain)<.02,'new feet meet flat terrain');
 report.modelLoads=await evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('/models/characters/crash-testers/')).map(r=>({url:r.name,durationMs:r.duration,encodedBytes:r.encodedBodySize,decodedBytes:r.decodedBodySize}))");
 const characterCount=await evaluate("(()=>{let count=0;window.__scene.traverse(o=>{if(o.userData.tgCharacterId)count++});return count})()");assert.equal(characterCount,1,'one mounted character');
 report.errors=[...new Set(errors)];assert.deepEqual(report.errors,[]);
 await fs.writeFile(path.join(artifact,report.phase+'-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase:report.phase,previewReadyMs:report.previewReadyMs,clips:report.clips.map(c=>c.name),resources:report.resources,errors:report.errors},null,2));
}catch(error){console.error(error,[...new Set(errors)].slice(0,8));try{await captureFailure()}catch{}process.exitCode=1}
finally{socket?.close();chrome.kill()}
