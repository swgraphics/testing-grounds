import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve(process.env.TG_TASK03_ARTIFACT || "ui-revision-03.local");
const reportName = process.argv.includes('--title-default')?'title-controller-results.json':process.argv.includes('--tree-direct')?'tree-direct-results.json':process.argv.includes('--settings-probe')?'settings-probe-results.json':'task03-results.json';
const net = await import("node:net");
const port = await new Promise(resolve => { const listener=net.createServer(); listener.listen(0,"127.0.0.1",()=>{ const chosen=listener.address().port;listener.close(()=>resolve(chosen)); }); });
await fs.mkdir(artifact, { recursive: true });
const downloads = path.join(artifact, "downloads-" + process.pid);
await fs.mkdir(downloads, { recursive: true });
await fs.writeFile(path.join(artifact,"live-debugger.json"),JSON.stringify({port,pid:process.pid}));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
 "--headless=new","--disable-extensions","--disable-background-networking","--no-first-run","--no-default-browser-check","--remote-debugging-port="+port,
 "--user-data-dir="+path.resolve("node_modules/.cache/tg-ui-browser-"+process.pid),
 "--enable-unsafe-swiftshader","--window-size=1440,1000","about:blank",
], { windowsHide: true, stdio: "ignore" });
let socket;
let diagnosis=async()=>({}), captureFailure=async()=>{};
const errors=[], failures=[], passes=[];
const networkPending = new Map();
const record = message => { passes.push(message); console.log("PASS", message); };
try {
 let pages;
 for (let i=0;i<60;i++) { try { pages = await (await fetch("http://127.0.0.1:"+port+"/json/list")).json(); if(pages.length)break; } catch {} await pause(250); }
 assert.ok(pages?.length,"Chrome DevTools connection");
 socket = new WebSocket(pages.find(page=>page.type==="page").webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 let id=0; const pending = new Map();
 socket.onmessage=event=>{
  const value=JSON.parse(event.data);
  if(value.method==="Runtime.consoleAPICalled" && value.params.type==="error") errors.push(value.params.args.map(arg=>arg.value??arg.description??"").join(" "));
  if(value.method==="Network.requestWillBeSent") networkPending.set(value.params.requestId, value.params.request.url);
  if(value.method==="Network.loadingFinished" || value.method==="Network.loadingFailed") networkPending.delete(value.params.requestId);
  if(value.id){const entry=pending.get(value.id);if(entry){pending.delete(value.id);value.error?entry.reject(value.error):entry.resolve(value.result)}}
  if(value.method==="Runtime.exceptionThrown") errors.push(value.params.exceptionDetails.exception?.description || value.params.exceptionDetails.text);
  if(value.method==="Log.entryAdded" && value.params.entry.level==="error") errors.push(value.params.entry.text);
  if(value.method==="Network.responseReceived" && value.params.response.status>=400) failures.push({url:value.params.response.url,status:value.params.response.status});
 };
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});socket.send(JSON.stringify({id:request,method,params}))});
 const evaluate=async expression=>{const result=await cdp("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
 const waitFor=async(expression,label,attempts=Number(process.env.TG_BROWSER_WAIT_ATTEMPTS || 100))=>{for(let i=0;i<attempts;i++){if(await evaluate("Boolean("+expression+")"))return;await pause(200)}throw Error("Timeout: "+label)};
 const screenshot=async name=>{const shot=await cdp("Page.captureScreenshot",{format:"png"});await fs.writeFile(path.join(artifact,name+".png"),Buffer.from(shot.data,"base64"))};
 const key=async(key,code=key)=>{const codes={Tab:9,Enter:13,Escape:27,ArrowUp:38,ArrowRight:39,ArrowDown:40,ArrowLeft:37};await cdp("Input.dispatchKeyEvent",{type:"keyDown",key,code,windowsVirtualKeyCode:codes[key]||0,text:key==="Enter"?"\r":"",unmodifiedText:key==="Enter"?"\r":""});await cdp("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:codes[key]||0});await pause(1000)};
 const click=async selector=>{
  await waitFor("!document.querySelector('.tg-loading-overlay')","loading overlay");
  await waitFor("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");return e&&e.getClientRects().length>0})()","visible control "+selector);
  await evaluate("document.querySelector("+JSON.stringify(selector)+").scrollIntoView({block:'nearest',inline:'nearest'})");
  const point=await evaluate("(()=>{const r=document.querySelector("+JSON.stringify(selector)+").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cdp("Input.dispatchMouseEvent",{type:"mouseMoved",...point});await pause(1000);
  await cdp("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});
  await cdp("Input.dispatchMouseEvent",{type:"mouseReleased",...point,button:"left",clickCount:1});await pause(300);
 };
 diagnosis=async()=>({url:await evaluate("location.href"),text:await evaluate("document.body?.innerText.slice(0,1200)"),frames:await evaluate("window.__frames"),pending:[...networkPending.values()].filter(url=>!url.startsWith("data:")).slice(-12),expanded:await evaluate("document.querySelector('.tg-compass-activate')?.getAttribute('aria-expanded')"),nav:await evaluate("window.__nav ? {open:window.__nav.useNavigationStore.getState().compassOpen,menu:window.__nav.useNavigationStore.getState().menu}:null")});captureFailure=()=>screenshot("failure");
 await cdp("Browser.setDownloadBehavior",{behavior:"allow",downloadPath:downloads});
 await cdp("Page.enable");await cdp("Runtime.enable");await cdp("Network.enable");await cdp("Log.enable");
 await cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp("Page.addScriptToEvaluateOnNewDocument",{source:"window.__titleFrames=0;window.addEventListener('camera-heading-changed',()=>window.__titleFrames++)"});
 await cdp("Page.navigate",{url:process.env.TG_TEST_URL || process.argv.find(arg => arg.startsWith("--url="))?.slice(6) || "http://127.0.0.1:5193/"});
 try { await waitFor("!!document.querySelector('.tg-title-v3')","title screen"); } catch { await cdp("Page.reload",{ignoreCache:true}); await waitFor("!!document.querySelector('.tg-title-v3')","title screen retry"); }


 await evaluate("document.fonts.ready");
 await waitFor("window.__titleFrames>=5","live title backdrop",300);
 await evaluate("window.__pad={connected:true,mapping:'standard',buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]};navigator.getGamepads=()=>[window.__pad]");
 const tap=async(index,ms=110)=>{await evaluate('window.__pad.buttons['+index+'].pressed=true');await pause(ms);await evaluate('window.__pad.buttons['+index+'].pressed=false');await pause(180)};
 const tilt=async(x,y,ms=110)=>{await evaluate('window.__pad.axes[0]='+x+';window.__pad.axes[1]='+y);await pause(ms);await evaluate('window.__pad.axes[0]=window.__pad.axes[1]=0');await pause(180)};
 await evaluate(process.argv.includes('--title-default') ? "document.querySelector('.tg-title-actions button').focus()" : "document.querySelector('.tg-title-blank').focus()");await tap(0);
 await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')","controller Blank Canvas",300);
 await evaluate("window.__frames=0;window.__positions=[];window.addEventListener('camera-heading-changed',()=>window.__frames++);window.addEventListener('player-position-changed',e=>window.__positions.push(e.detail))");
 await waitFor("window.__frames>=10 && window.__positions.length>1","live world frames",300);
 await evaluate("(async()=>{window.__world=await import('/src/systems/world/worldStore.js');window.__terrain=await import('/src/systems/terrain/terrainSettings.js');window.__editor=await import('/src/systems/editor/editorStore.js');window.__nav=await import('/src/systems/ui/navigationStore.js');window.__tool=await import('/src/systems/interaction/interactionStore.js');window.__camera=await import('/src/systems/camera/cameraSettings.js');window.__dev=await import('/src/systems/dev/devSettings.js');window.__own=await import('/src/systems/input/inputOwnership.js')})()");

 if (process.argv.includes('--title-default')) {
  assert.equal(await evaluate('window.__world.useWorldStore.getState().world.worldType'),'default');
  await tap(9);assert.equal(await evaluate('window.__nav.useNavigationStore.getState().compassOpen'),true);await tap(1);
  record('Title controller A enters default World; Menu and B preserve startup ownership');
 } else if (process.argv.includes('--settings-probe')) {
  const rows=[];
  const measure=async(fpv,speed,value)=>{
   await evaluate("window.__dev.updateDevSetting('fpvMode',"+fpv+");window.__dev.updateDevSetting('speedMultiplier',"+speed+");window.__camera.updateCameraSetting('crashTester20','fpvMoveSpeed',"+value+");window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}));document.activeElement?.blur()");await pause(2500);
   const a=await evaluate('window.__positions.at(-1)');await evaluate('window.__pad.axes[1]=-.9');await pause(2200);await evaluate('window.__pad.axes[1]=0');const b=await evaluate('window.__positions.at(-1)');const row={fpv,speed,value,seconds:2.2,distance:Math.hypot(a.x-b.x,a.z-b.z)};rows.push(row);console.log(row);await pause(500);
  };
  await measure(true,1,1);await measure(true,1,50);for(const speed of [1,50,100,500])await measure(false,speed,15);
  await fs.writeFile(path.join(artifact,'settings-after.json'),JSON.stringify({rows,errors,failures},null,2));
 } else {
 const panel=()=>evaluate("document.activeElement?.closest('[data-directional-panel]')?.dataset.directionalPanel || document.activeElement?.dataset.panelExpand || null");
 const focus=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');
 const setValue=async(selector,value)=>{await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.closest("details")?.setAttribute("open","");const proto=e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));})()');await pause(300)};
 const movement=async(ms=900)=>{await evaluate('document.activeElement?.blur()');await pause(400);const a=await evaluate('window.__positions.at(-1)');await tilt(0,-.8,ms);const b=await evaluate('window.__positions.at(-1)');return Math.hypot(b.x-a.x,b.z-a.z)};
 const openEditor=async()=>{await tap(9);if(!await evaluate("window.__nav.useNavigationStore.getState().compassOpen"))await tap(9);await evaluate("window.__nav.useNavigationStore.getState().select('editor-view')");await tap(0);await waitFor("document.querySelectorAll('[data-directional-panel]:not([hidden])').length===4","Editor View")};
 if (!process.argv.includes('--tree-direct')) {
 await tap(9);assert.equal(await evaluate('window.__nav.useNavigationStore.getState().compassOpen'),true);await tilt(.9,0);assert.equal(await evaluate('window.__nav.useNavigationStore.getState().selected'),'east');await tap(0);assert.equal(await panel(),'east');await tap(1);
 await openEditor();
 const visited=new Set();for(let i=0;i<4;i++){visited.add(await panel());await tap(5)}assert.equal(visited.size,4,'bumpers reach every open panel');
 await focus('[data-dev-section-header="camera"]');await tap(0);
 // Find section by label; headers use sectionName in data attributes.
 await waitFor("[...document.querySelectorAll('.tg-dev-section')].find(s=>s.textContent.includes('FPV Move Speed'))?.querySelector('input[type=range]')","Camera controls");
 await focus('[data-dev-section-header="camera"]');await tilt(0,.9);assert.equal(await evaluate("document.activeElement.closest('.tg-dev-section')?.querySelector('[data-dev-section-header]')?.dataset.devSectionHeader"),'camera');
 // Traverse in order until reaching the FPV slider, including off-screen controls.
 let reached=false;for(let i=0;i<60;i++){if(await evaluate("document.activeElement.matches('input[type=range]') && document.activeElement.closest('.tg-dev-slider-group').textContent.includes('FPV Move Speed')")){reached=true;break}await tap(13)}assert.ok(reached,'scroll traversal reaches FPV slider');
 const before=Number(await evaluate('document.activeElement.value'));await tap(0);await tilt(.9,0);assert.equal(Number(await evaluate('document.activeElement.value')),before+1);assert.equal(await evaluate("document.activeElement.dataset.gamepadAdjusting"),'true');await tap(1);assert.equal(await panel(),'east');assert.equal(await evaluate("document.activeElement.hasAttribute('data-gamepad-adjusting')"),false);await tap(12);assert.notEqual(await evaluate('document.activeElement.type'),'range');
 await screenshot('01-controller-editor');
 // Collapse each panel using A and restore with its edge tab. Other open panels remain reachable.
 for(const direction of ['north','east','south','west']){await focus('[data-panel-collapse="'+direction+'"]');await tap(0);assert.equal(await evaluate('document.querySelector("#tg-panel-'+direction+'").hidden'),true);if(direction!=='west'){await tap(5);assert.notEqual(await panel(),direction)}}
 assert.equal(await evaluate("document.querySelectorAll('[data-directional-panel]:not([hidden])').length"),0);
 await tap(9);await tap(1);assert.equal(await evaluate('window.__own.getInputContext()'),'world');
 assert.ok(await movement()>.1,'controller movement resumes');
 record('Stage A: title A, Menu/analog/A/B, all shared panels via bumpers, scroll reachability, slider adjustment/B, collapse safety and real controller movement');
 }
 if (!process.argv.includes('--stage-a')) {


 await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];const m=await import(url);window.__root=m._roots.get(document.querySelector('canvas')).store;window.__scene=window.__root.getState().scene;window.__placeCamera={ref:{current:()=>{const c=window.__root.getState().camera;c.position.set(52,12,70);c.lookAt(52,0,52);c.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__placeCamera);window.__tool.useInteractionStore.getState().deactivate();window.__dev.updateDevSetting('fpvMode',false);window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}))})()");await pause(2500);
 await tap(9);await tap(13);await tap(0);await click('.tg-mesh-card[title="DEFAULT TREE"]');await click('.tg-mesh-place-button');await click('canvas');await key('Escape');await key('Escape');await evaluate("window.__root.getState().internal.subscribers=window.__root.getState().internal.subscribers.filter(s=>s!==window.__placeCamera)");
 await evaluate("window.__targetId=Object.values(window.__world.useWorldStore.getState().world.chunks).flatMap(c=>Object.values(c.objects||{})).find(o=>o.modelType==='crimson-tree').id");
 const tree=()=>evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks).flatMap(c=>Object.values(c.objects||{})).find(o=>o.id===window.__targetId)");
 await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];const m=await import(url);window.__root=m._roots.get(document.querySelector('canvas')).store;window.__scene=window.__root.getState().scene;let trunk;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeTrunk&&o.userData.tgCrimsonTreeId===window.__targetId)trunk=o});window.__treePoint=trunk.geometry.boundingBox.getCenter(trunk.position.clone()).applyMatrix4(trunk.matrixWorld);window.__treeCamera={ref:{current:()=>{const c=window.__root.getState().camera;c.position.copy(window.__treePoint).add({x:12,y:3,z:12});c.lookAt(window.__treePoint);c.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__treeCamera)})()");
 await pause(800);assert.equal(await evaluate("!!document.querySelector('.tg-tree-interaction-panel')"),false,'approaching/reticle does not edit');
 await click('canvas');assert.equal(await evaluate("!!document.querySelector('.tg-tree-interaction-panel')"),false);await waitFor("!!document.querySelector('[data-tree-edit-selected]')","selected contextual Edit");await screenshot('02-tree-selected');
 await tap(2);await waitFor("!!document.querySelector('.tg-tree-interaction-panel')","explicit Xbox X edit");assert.equal(await evaluate('window.__own.getInputContext()'),'modal');
 const gestureStart=Number(await evaluate("document.querySelector('.tg-tree-interaction-panel [data-tree-property=\"trunk.height\"]').value"));const gesturePosition=await evaluate('window.__positions.at(-1)');await evaluate('window.__pad.buttons[7].pressed=true');await tilt(0,-.8,220);await evaluate('window.__pad.buttons[7].pressed=false');assert.ok((await tree()).treeDefinition.trunk.height>gestureStart,'RT and stick retains direct tree gestures');const gestureEnd=await evaluate('window.__positions.at(-1)');assert.ok(Math.hypot(gestureEnd.x-gesturePosition.x,gestureEnd.z-gesturePosition.z)<.05,'direct tree input does not move character');
 await setValue('.tg-tree-interaction-panel [data-tree-property="trunk.height"]',62);assert.equal((await tree()).treeDefinition.trunk.height,62);await screenshot('03-tree-interaction');
 await tap(1);assert.equal(await evaluate("!!document.querySelector('.tg-tree-interaction-panel')"),false);assert.equal(await evaluate('window.__own.getInputContext()'),'world');
 for(let i=0;i<3;i++){await tap(2);await waitFor("!!document.querySelector('.tg-tree-interaction-panel')","reopen tree");assert.equal(await evaluate("document.querySelector('.tg-tree-interaction-panel [data-tree-property=\"trunk.height\"]').value"),'62');if(i===0)await key('Escape');else if(i===1)await click('.tg-tree-interaction-close');else await tap(1);assert.equal(await evaluate("!!document.querySelector('.tg-tree-interaction-panel')"),false)}
 await tap(2);await evaluate("[...document.querySelectorAll('.tg-tree-interaction-panel button')].find(b=>b.textContent==='LEAF VERTEX EDIT').click()");await waitFor("!!document.querySelector('.tg-leaf-editor-window')","nested vertex editor");await tap(1);assert.equal(await evaluate("!!document.querySelector('.tg-leaf-editor-window')"),false);assert.equal(await evaluate("!!document.querySelector('.tg-tree-interaction-panel')"),true);await tap(1);
 await evaluate("window.__root.getState().internal.subscribers=window.__root.getState().internal.subscribers.filter(s=>s!==window.__treeCamera)");assert.ok(await movement()>.1);
 await evaluate("window.__terrain.saveWorldSettings();window.__terrain.loadWorldSettings()");assert.equal((await tree()).treeDefinition.trunk.height,62);
 await pause(1800);await waitFor("!document.querySelector('.tg-loading-overlay')","save/load before repeated edit");
 for(let i=0;i<2;i++){await tap(2);await waitFor("!!document.querySelector('.tg-tree-interaction-panel')","repeated edit after save/load");await tap(1)}
 record('Stage B: native select without modal, explicit X/Edit, shared property persistence, repeated B/Escape/Close, nested leaf B priority and real movement recovery');
 if (!process.argv.includes('--stage-b')) {

 await pause(1800);await waitFor("!document.querySelector('.tg-loading-overlay')","load complete before editing");console.log('reopen state',await evaluate("({context:window.__own.getInputContext(),tool:window.__tool.useInteractionStore.getState().activeTool,target:window.__tool.useInteractionStore.getState().activeTarget})"));
 await tap(2);await waitFor("!!document.querySelector('.tg-tree-interaction-panel')","Tree Interaction for secondary geometry");
 const branchSnapshot=()=>evaluate("(()=>{let branch;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeBranch&&o.userData.tgCrimsonTreeId===window.__targetId)branch=o});return {count:branch.userData.tgTreeBranchData.length,vertices:branch.geometry.attributes.position.count}})()");
 const secondary='.tg-tree-interaction-panel [data-tree-property="branches.secondary.count"]';
 await setValue(secondary,0);await waitFor("(()=>{let n;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeBranch&&o.userData.tgCrimsonTreeId===window.__targetId)n=o.userData.tgTreeBranchData.length});return n===50})()","minimum branch geometry");const minimum=await branchSnapshot();await screenshot('04-secondary-min');
 await setValue(secondary,8);await waitFor("(()=>{let n;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeBranch&&o.userData.tgCrimsonTreeId===window.__targetId)n=o.userData.tgTreeBranchData.length});return n===450})()","maximum branch geometry");const maximum=await branchSnapshot();await screenshot('05-secondary-max');assert.ok(maximum.vertices>minimum.vertices);
 await evaluate("[...document.querySelectorAll('.tg-tree-interaction-panel button')].find(b=>b.textContent==='OBJECT//LIBRARY').click()");await waitFor("!!document.querySelector('.tg-focused-object-editor')","same tree focused editor");assert.equal(await evaluate("document.querySelector('.tg-focused-object-editor [data-tree-property=\"branches.secondary.count\"]').value"),'8');
 await setValue('.tg-focused-object-editor [data-tree-property="branches.secondary.count"]',0);await pause(400);assert.equal((await branchSnapshot()).count,50);await click('.tg-focused-object-editor [data-object-undo]');await pause(400);assert.equal((await tree()).treeDefinition.branches.secondary.count,8);await click('.tg-focused-object-editor [data-object-redo]');assert.equal((await tree()).treeDefinition.branches.secondary.count,0);await setValue('.tg-focused-object-editor [data-tree-property="branches.secondary.count"]',8);
 await evaluate("window.__terrain.saveWorldSettings();window.__terrain.loadWorldSettings()");assert.equal((await tree()).treeDefinition.branches.secondary.count,8);await click('[data-object-editor-close]');await key('Escape');
 await fs.writeFile(path.join(artifact,'secondary-geometry.json'),JSON.stringify({minimum,maximum},null,2));record('Stage C trees: live branch data/vertices 0 vs 8, same focused editor, Undo/Redo and world save/load');
 const showEast=async()=>{await tap(9);await evaluate("window.__nav.useNavigationStore.getState().select('east')");await tap(0)};
 const openSection=async name=>{if(await evaluate('document.querySelector("[data-dev-section-header='+name+']").getAttribute("aria-expanded")')!=='true')await click('[data-dev-section-header="'+name+'"]')};
 const speedRows=[];
 const measureSpeed=async(label)=>{await evaluate("window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}));document.activeElement?.blur()");await pause(2500);const a=await evaluate('window.__positions.at(-1)');await evaluate('window.__pad.axes[1]=-.9');await pause(2200);await evaluate('window.__pad.axes[1]=0');const b=await evaluate('window.__positions.at(-1)');const row={label,seconds:2.2,distance:Math.hypot(a.x-b.x,a.z-b.z),position:b};assert.ok(Object.values(b).every(Number.isFinite));speedRows.push(row);console.log(row);return row.distance};
 await showEast();await openSection('camera');
 // Find the actual Camera field by label, then use its existing native input handler.
 await evaluate("[...document.querySelectorAll('.tg-dev-slider-group')].find(e=>e.textContent.includes('FPV Move Speed')).querySelector('input[type=range]').setAttribute('data-fpv-test','')");
 if(!await evaluate('window.__dev.devSettings.fpvMode'))await evaluate("[...document.querySelectorAll('.tg-side-panel-button')].find(b=>b.textContent.includes('FPV Mode:')).click()");
 await openSection('physics');assert.equal(await evaluate("[...document.querySelectorAll('.tg-dev-speed-button')].every(b=>b.disabled)"),true,'FPV clearly owns its own speed');
 await setValue('[data-fpv-test]',1);await screenshot('06-fpv-low-setting');await key('Escape');const low=await measureSpeed('FPV 1');
 await showEast();await setValue('[data-fpv-test]',50);await screenshot('07-fpv-high-setting');await key('Escape');const high=await measureSpeed('FPV 50');assert.ok(high>low*5,'FPV movement responds to slider');
 await showEast();await evaluate("[...document.querySelectorAll('.tg-side-panel-button')].find(b=>b.textContent.includes('FPV Mode:')).click()");
 for(const label of ['NORMAL','50X','100X','500X','NORMAL']){
  await openSection('physics');await evaluate('document.querySelectorAll("[data-speed-test]").forEach(b=>b.removeAttribute("data-speed-test"));[...document.querySelectorAll(".tg-dev-speed-button")].find(b=>b.textContent.trim()==='+JSON.stringify(label)+').setAttribute("data-speed-test","")');await click('[data-speed-test]');
  const value=await evaluate('window.__dev.devSettings.speedMultiplier');await screenshot('08-physics-'+label.toLowerCase());
  await key('Escape');await measureSpeed('Physics '+label);await openEditor();assert.equal(await evaluate('window.__dev.devSettings.speedMultiplier'),value);await click('.tg-compass-activate');await showEast();
 }
 const normal=speedRows.find(r=>r.label==='Physics NORMAL').distance;assert.ok(normal>.1);assert.ok(speedRows.find(r=>r.label==='Physics 50X').distance>normal*5);assert.ok(speedRows.find(r=>r.label==='Physics 100X').distance>speedRows.find(r=>r.label==='Physics 50X').distance*1.3);assert.ok(speedRows.find(r=>r.label==='Physics 500X').distance>speedRows.find(r=>r.label==='Physics 100X').distance*2);
 await evaluate("window.__dev.updateDevSetting('speedMultiplier',100)");assert.equal(await evaluate("[...document.querySelectorAll('.tg-dev-speed-button')].find(b=>b.classList.contains('active')).textContent.trim()"),'100X','Dev Tools reflects settings changed outside its local click handler');
 await click('[aria-label="Lock physics"]');assert.equal(await evaluate("[...document.querySelectorAll('.tg-dev-speed-button')].every(b=>b.disabled)"),true);await click('[aria-label="Unlock physics"]');await key('Escape');await evaluate("window.__dev.updateDevSetting('speedMultiplier',1)");
 await fs.writeFile(path.join(artifact,'speed-results.json'),JSON.stringify({speedRows},null,2));record('Stage C speed: measured FPV contrast, all Physics presets/NORMAL restore, Editor/World retention, lock/unlock, external event synchronization and FPV-specific ownership');

 }

 }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={passes,errors,failures,physicalXbox:'pending'};console.log(JSON.stringify(report,null,2));await fs.writeFile(path.join(artifact,reportName),JSON.stringify(report,null,2));
} catch(error){console.error(error);try{console.error(await diagnosis());await captureFailure()}catch{}await fs.writeFile(path.join(artifact,reportName),JSON.stringify({passes,errors,failures,error:String(error)},null,2));process.exitCode=1}
finally{socket?.close();chrome.kill()}
