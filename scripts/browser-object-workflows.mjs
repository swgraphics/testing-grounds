import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve(process.env.TG_OBJECT_ARTIFACT || "ui-revision-02b.local");
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
 const waitFor=async(expression,label,attempts=Number(process.env.TG_BROWSER_WAIT_ATTEMPTS || 100))=>{for(let i=0;i<attempts;i++){if(await evaluate(expression))return;await pause(200)}throw Error("Timeout: "+label)};
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
 await cdp("Page.navigate",{url:process.env.TG_TEST_URL || process.argv.find(arg => arg.startsWith("--url="))?.slice(6) || "http://127.0.0.1:5184/"});
 try { await waitFor("!!document.querySelector('.tg-title-v3')","title screen"); } catch { await cdp("Page.reload",{ignoreCache:true}); await waitFor("!!document.querySelector('.tg-title-v3')","title screen retry"); }

 await evaluate("document.fonts.ready");
 await waitFor("window.__titleFrames>=5","live title backdrop");
 await screenshot("01-title-desktop");
 assert.equal(await evaluate("document.querySelector('.tg-title-v3 h1').textContent"),"WELCOME!");
 assert.equal(await evaluate("document.querySelector('.tg-title-v3 h2')"),null);
 assert.equal(await evaluate("document.querySelectorAll('.tg-title-media span').length"),0);
 assert.ok(await evaluate("document.querySelector('.tg-title-version').textContent.startsWith('v')"));
 assert.ok(await evaluate("!!document.querySelector('.tg-title-credits img[src*=TCompass]')"));
 assert.equal(await evaluate("document.querySelector('.tg-title-media')"),null);
 assert.equal(await evaluate("getComputedStyle(document.querySelector('.tg-title-frame')).pointerEvents"),"none");
 record("Title: WELCOME!, full live world, perimeter frame, version and official branding");
 await evaluate("(async()=>{const r=await import('/src/systems/objects/objectRegistry.js');const base=r.BUILTIN_OBJECTS.find(m=>m.modelType==='crimson-tree');localStorage.setItem('testingGroundsSavedObjects',JSON.stringify(Array.from({length:18},(_,i)=>r.createSavedObject(base,{id:'qa-return-tree-'+(i+1),name:'QA CUSTOM TREE '+(i+1)}))))})()");
 await click(".tg-title-actions button");await waitFor("!!document.querySelector('.tg-compass-activate')","Enter World");
 await waitFor("!document.querySelector('.tg-loading-overlay')","World loaded");
 await evaluate("window.__frames=0;window.addEventListener('camera-heading-changed',()=>window.__frames++)");
 await waitFor("window.__frames>=5","3D scene rendering",300);

 await evaluate("(async()=>{window.__world=await import('/src/systems/world/worldStore.js');window.__terrain=await import('/src/systems/terrain/terrainSettings.js');window.__history=await import('/src/systems/history/historyStore.js');window.__tool=await import('/src/systems/interaction/interactionStore.js');window.__editor=await import('/src/systems/editor/editorStore.js');window.__nav=await import('/src/systems/ui/navigationStore.js');window.__input=await import('/src/systems/input/inputState.js');window.__padState=await import('/src/systems/input/gamepadState.js')})()");

 const currentTool=()=>evaluate("window.__tool.useInteractionStore.getState().activeTool");
 const visibleCount=()=>evaluate("document.querySelectorAll('[data-directional-panel]:not([hidden])').length");
 const noPanels=()=>evaluate("Object.values(window.__editor.useEditorStore.getState().visiblePanels).every(v=>!v) && !document.querySelector('[data-panel-expand]')");
 const openMenu=async()=>{await evaluate('document.activeElement?.blur()');if(await evaluate('!!document.querySelector("[aria-modal=true]:not([data-compass]),.tg-tree-interaction-panel")'))await click('.tg-compass-activate');if(!await evaluate('!!document.querySelector("[data-compass]")'))await key('Tab');if(!await evaluate('!!document.querySelector("[data-compass]")'))await key('Tab');await waitFor('!!document.querySelector("[data-compass]")','compass')};
 const choose=async direction=>{await click('[data-direction="'+direction+'"]')};
 const clickText=async(root,label)=>{
  await evaluate("document.querySelectorAll('[data-test-target]').forEach(e=>e.removeAttribute('data-test-target'));(()=>{const b=[...document.querySelectorAll("+JSON.stringify(root+" button")+")].find(e=>e.textContent.trim()==="+JSON.stringify(label)+");if(!b)throw Error('Missing button '+ "+JSON.stringify(label)+");b.setAttribute('data-test-target','true')})()");
  await click("[data-test-target]");
 };
 const sculpt=async()=>{
  const before=await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)");
  await click("canvas");await pause(400);
  const after=await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)");
  assert.notEqual(after,before,"native brush modifies terrain");return {before,after};
 };
 const layout=()=>evaluate("(()=>{const panels=[...document.querySelectorAll('[data-directional-panel]:not([hidden])')].map(e=>{const r=e.getBoundingClientRect();return{direction:e.dataset.directionalPanel,x:r.x,y:r.y,w:r.width,h:r.height}});const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{panels,canvas:{x:r.x,y:r.y,w:r.width,h:r.height},center:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===c}})()");
 const checkLayout=async(expected=4)=>{
  await waitFor("(()=>{const a=document.querySelector(\'canvas\').getBoundingClientRect(),b=document.querySelector(\'.tg-canvas-shell\').getBoundingClientRect();return Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1})()","canvas resize follows panel regions");
  const data=await layout();assert.equal(data.panels.length,expected);assert.ok(data.center,"central canvas receives pointer input");
  assert.ok(data.canvas.w>=80 && data.canvas.h>=100,"usable central world");
  for(const a of data.panels){assert.ok(a.x>=0&&a.y>=0&&a.w>0&&a.h>0);for(const b of data.panels)if(a!==b)assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<=1||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<=1,"no directional panel overlap")}
  return data;
 };
 const closeAll=async()=>{if(await evaluate("document.querySelector('.tg-compass-activate').dataset.compassState!=='orange'"))await click('.tg-compass-activate');assert.ok(await noPanels())};
 const objectCount=()=>evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks).reduce((n,c)=>n+Object.keys(c.objects||{}).length,0)");
 const historyCount=()=>evaluate("window.__history.useHistoryStore.getState().undoStack.length");
 await openMenu();await choose("south");await screenshot("01-library");
 const before=await objectCount();await click('.tg-mesh-card[title="BLOCK"]');
 assert.equal(await visibleCount(),1);assert.equal(await objectCount(),before);assert.equal(await evaluate("document.querySelector('.tg-mesh-card.selected').title"),"BLOCK");
 assert.notEqual(await evaluate("window.__tool.useInteractionStore.getState().activeMode"),"place","selection never starts placement");
 await screenshot("02-selected-object");await click(".tg-mesh-place-button");assert.ok(await noPanels());
 await click("canvas");await pause(500);assert.equal(await objectCount(),before+1);await screenshot("03-placement");
 await key("Escape");assert.equal(await visibleCount(),1);assert.equal(await evaluate("document.querySelector('.tg-mesh-card.selected').title"),"BLOCK");
 await click('.tg-mesh-card[title="PLATFORM"]');assert.equal(await visibleCount(),1);await click(".tg-mesh-place-button");await click("[data-placement-back]");
 assert.equal(await visibleCount(),1);assert.equal(await objectCount(),before+1);
 await click('[data-object-view="animation"]');assert.ok(await evaluate("document.querySelector('.tg-object-animation-host').innerText.includes('ACTIVE CHARACTER')"));
 await evaluate("window.__qaAction=null;window.addEventListener('crash-unit-action',event=>window.__qaAction=event.detail)");await click('.tg-animation-library-action');
 assert.ok(await evaluate("typeof window.__qaAction?.action==='string' && window.__qaAction.duration>0"),'existing animation event/playback contract');
 await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];const m=await import(url);const scene=m._roots.get(document.querySelector('canvas')).store.getState().scene;window.__actorState=null;scene.traverse(o=>{if(o.userData.tgCharacterId==='crashTester20')window.__actorState=o.userData.tgAnimationState})})()");
 assert.equal(await evaluate('window.__actorState'),await evaluate('window.__qaAction.action'),'South action reaches the live Crash Tester');
 await screenshot("08-animation-actions");await click('[data-object-view="select"]');
 record("Stage A: explicit selection/Place, real placement, contextual Back/selection retention, second-model cancellation and canonical character actions");
 if (process.argv.includes("--library-copy")) {
  const setColor=async value=>{
   const change=value=>{const input=document.querySelector('.tg-focused-object-editor [data-tree-property="leaves.color"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
   await evaluate('('+change.toString()+')('+JSON.stringify(value)+')');await pause(300);
  };
  const beforeCopies=await evaluate("JSON.parse(localStorage.getItem('testingGroundsSavedObjects')).length");const worldCount=await objectCount();
  await click('.tg-mesh-card[title="DEFAULT TREE"]');await click('[data-object-edit]');await setColor('#334455');await click('.tg-focused-object-editor .tg-mesh-save');
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('testingGroundsSavedObjects')).length"),beforeCopies+1);
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('testingGroundsSavedObjects'))[0].treeDefinition.leaves.color"),'#334455');
  await click('[data-object-edit]');await setColor('#556677');await click('[data-object-editor-close]');await click('[data-object-edit]');
  assert.equal(await evaluate("document.querySelector('.tg-focused-object-editor [data-tree-property=\"leaves.color\"]').value"),'#334455','Cancel discards only the library draft');await click('[data-object-editor-close]');assert.equal(await objectCount(),worldCount);
  const files=(await fs.readdir(path.resolve('task-0801-browser.local'))).filter(file=>file.endsWith('.glb'));assert.ok(files.length);
  const doc=await cdp('DOM.getDocument'),input=await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.tg-mesh-menu input[type=file]'});
  await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path.resolve('task-0801-browser.local',files.at(-1))]});await pause(1000);await click('[data-object-edit]');
  assert.equal(await evaluate("document.querySelector('.tg-focused-object-editor .tg-mesh-save').disabled"),true,'session-only GLB cannot create a persistent library copy');await click('[data-object-editor-close]');
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('testingGroundsSavedObjects')).length"),beforeCopies+1);assert.equal(await objectCount(),worldCount);
  record('Library Save Copy persists edited properties, Cancel discards its draft, world objects remain unchanged, local GLB copying is honestly disabled');
 }
 if (!process.argv.includes("--stage-a") && !process.argv.includes("--library-copy")) {
  const setValue=async(selector,value)=>{
   await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)throw Error('Missing input');const d=e.closest('details');if(d)d.open=true;const proto=e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()");await pause(500);
  };
  await closeAll();await evaluate("window.__world.useWorldStore.getState().initializeBlankWorld();window.__terrain.initializeBlankCanvasTerrain();window.dispatchEvent(new CustomEvent('tg-teleport-to-area',{detail:{areaId:'blank-d4'}}))");await pause(3000);
  await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];const m=await import(url);window.__root=m._roots.get(document.querySelector('canvas')).store;window.__scene=window.__root.getState().scene;window.__placeCamera={ref:{current:()=>{const c=window.__root.getState().camera;c.position.set(52,12,70);c.lookAt(52,0,52);c.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__placeCamera)})()");
  await openMenu();await choose('south');await click('.tg-mesh-card[title="DEFAULT TREE"]');await click('.tg-mesh-place-button');await click('canvas');await key('Escape');
  await evaluate("window.__targetId=Object.values(window.__world.useWorldStore.getState().world.chunks).flatMap(c=>Object.values(c.objects||{})).find(o=>o.modelType==='crimson-tree').id");
  const tree=()=>evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks).flatMap(c=>Object.values(c.objects||{})).find(o=>o.id===window.__targetId)");
  await click('[data-object-view="selected"]');await setValue('[aria-label="Select world object"]',await evaluate('window.__targetId'));await click('[data-object-edit]');
  await waitFor("!!document.querySelector('.tg-focused-object-editor')","focused world editor");
  const color='.tg-focused-object-editor [data-tree-property="leaves.color"]';
  await setValue(color,'#aa22ee');assert.equal((await tree()).treeDefinition.leaves.color,'#aa22ee');
  await setValue('[aria-label="Object rotation"]',45);await setValue('[aria-label="Object scale"]',1.4);
  assert.equal((await tree()).rotationY,Math.PI/4);assert.equal((await tree()).scale,1.4);
  await click('.tg-focused-object-editor [data-object-undo]');assert.equal((await tree()).scale,1);await click('.tg-focused-object-editor [data-object-redo]');assert.equal((await tree()).scale,1.4);
  await evaluate("window.__modalPaths=[...document.querySelectorAll('.tg-focused-object-editor [data-tree-property]')].map(e=>e.dataset.treeProperty)");
  await screenshot('04-focused-edit-object');await click('[data-object-editor-close]');await closeAll();
  await evaluate("(()=>{window.__root.getState().internal.subscribers=window.__root.getState().internal.subscribers.filter(s=>s!==window.__placeCamera);let trunk;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeTrunk&&o.userData.tgCrimsonTreeId===window.__targetId)trunk=o});if(!trunk)throw Error('Missing world tree');window.__worldColor=trunk.parent.children.filter(o=>o.material?.color).map(o=>o.material.color.getHexString());window.__treePoint=trunk.geometry.boundingBox.getCenter(trunk.position.clone()).applyMatrix4(trunk.matrixWorld);window.__treeCamera={ref:{current:()=>{const c=window.__root.getState().camera;c.position.copy(window.__treePoint).add({x:12,y:3,z:12});c.lookAt(window.__treePoint);c.updateMatrixWorld()}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__treeCamera)})()");
  assert.ok((await evaluate('window.__worldColor')).includes('aa22ee'),'focused color reaches live world material');
  // Close the preserved OBJECT selection tool before neutral-world Tree selection (Task 03 contract).
  if(await evaluate("!!document.querySelector('[aria-label=\"Exit active OBJECT tool\"]')"))await click('[aria-label="Exit active OBJECT tool"]');await pause(600);await click('canvas');await click('[data-tree-edit-selected]');await waitFor("!!document.querySelector('.tg-tree-interaction-panel')","native Tree Interaction");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.tg-tree-interaction-panel [data-tree-property]')].map(e=>e.dataset.treeProperty)"),await evaluate('window.__modalPaths'));
  await setValue('.tg-tree-interaction-panel [data-tree-property="leaves.color"]','#11aa22');assert.equal((await tree()).treeDefinition.leaves.color,'#11aa22');
  await screenshot('06-tree-interaction');await click('.tg-tree-interaction-panel [data-tree-property="leaves.gradientEnabled"]');
  await setValue('.tg-tree-interaction-panel [data-tree-property="leaves.gradientColor"]','#2244ee');await screenshot('07-tree-color-gradient');
  assert.equal((await tree()).treeDefinition.leaves.gradientEnabled,true,'native gradient checkbox updates the world');
  assert.ok(await evaluate("(()=>{let trunk;window.__scene.traverse(o=>{if(o.userData.tgCrimsonTreeTrunk&&o.userData.tgCrimsonTreeId===window.__targetId)trunk=o});const leaf=trunk.parent.children.find(o=>o.material?.vertexColors&&o.geometry?.attributes?.color);if(!leaf)return false;const a=leaf.geometry.attributes.color.array;return a.some((value,index)=>index>2&&Math.abs(value-a[index%3])>.0001)})()"),'gradient reaches varied live world vertex colors');
  await clickText('.tg-tree-interaction-panel','OBJECT//LIBRARY');await waitFor("!!document.querySelector('.tg-focused-object-editor')","same tree focused through South");
  assert.equal(await evaluate("document.querySelector('.tg-focused-object-editor [data-tree-property=\"leaves.color\"]').value"),'#11aa22');
  assert.equal(await evaluate("document.querySelector('.tg-focused-object-editor [data-tree-property=\"leaves.gradientColor\"]').value"),'#2244ee');
  await setValue('.tg-focused-object-editor [data-tree-property="trunk.height"]',0);assert.equal((await tree()).treeDefinition.trunk.height,0);
  await evaluate("window.__terrain.saveWorldSettings();window.__terrain.loadWorldSettings()");assert.equal((await tree()).treeDefinition.trunk.height,0);assert.equal((await tree()).treeDefinition.leaves.gradientColor,'#2244ee');
  await click('[data-object-editor-close]');await evaluate("window.__root.getState().internal.subscribers=window.__root.getState().internal.subscribers.filter(s=>s!==window.__treeCamera)");
  await closeAll();await evaluate("document.activeElement?.blur()");await key('r','KeyR');await key(']','BracketRight');assert.equal((await tree()).scale,1.5);assert.ok(Math.abs((await tree()).rotationY-Math.PI/3)<.001);
  await openMenu();await choose('south');await click('[data-object-edit]');assert.equal(await evaluate("document.querySelector('[aria-label=\"Object scale\"]').value"),'1.5');await click('[data-object-editor-close]');
  record('Stage B: same live world object, transforms, native Tree Interaction, identical properties, rendered color, gradients, zero values and saved-world round-trip');
  if (!process.argv.includes('--stage-b')) {
   const js=async(fn,...args)=>evaluate('('+fn.toString()+')('+args.map(value=>JSON.stringify(value)).join(',')+')');
   const seed=async()=>js(()=>{
    window.__world.useWorldStore.getState().upsertScatterProfile('qa-return-tree-2',{enabled:false,density:1,coverage:0,scaleVariation:0,treeDefinition:{trunk:{height:50},leaves:{color:'#229944',gradientEnabled:true,gradientColor:'#113355',floating:{enabled:false,density:0}}},treeOverrides:{legacy:{leaves:{color:'#ff3300'}}}});
   });
   await seed();await click('[data-object-view="select"]');await click('.tg-mesh-card[title="QA CUSTOM TREE 2"]');await click('[data-add-to-scatter="selected"]');
   const first=await js(()=>window.__world.useWorldStore.getState().world.scatterProfiles['qa-return-tree-2']);
   assert.equal(first.enabled,true);assert.equal(first.density,1);assert.equal(first.coverage,0);assert.equal(first.treeOverrides.legacy.leaves.color,'#ff3300');
   await pause(500);assert.ok(await js(()=>{let n=0;window.__scene.traverse(o=>{if(o.userData.tgForestTree?.startsWith('scatter-tree-qa-return-tree-2-'))n++});return n>0}),'added population renders through the existing forest');
   await screenshot('05-scatter-populations');
   await click('[data-scatter-profile="qa-return-tree-2"] .tg-mesh-scatter-remove');await seed();
   await openMenu();await click('[data-compass-action="editor-view"]');await checkLayout();
   await setValue('[aria-label="Object to add to Scatter"]','qa-return-tree-3');await setValue('[aria-label="Object to add to Scatter"]','qa-return-tree-2');await click('[data-add-to-scatter="population"]');
   assert.deepEqual(await js(()=>window.__world.useWorldStore.getState().world.scatterProfiles['qa-return-tree-2']),first,'both South contexts produce identical population data');
   const retained=await js(()=>JSON.stringify(window.__world.useWorldStore.getState().world.scatterProfiles));
   await click('[data-panel-collapse="east"]');await click('[data-panel-expand="east"]');await closeAll();await openMenu();await choose('south');
   assert.equal(await js(()=>JSON.stringify(window.__world.useWorldStore.getState().world.scatterProfiles)),retained);
   assert.equal(await js(()=>document.querySelector('[data-object-view="scatter"]').getAttribute('aria-pressed')),'true');
   assert.equal(await js(()=>document.querySelector('[aria-label="Object to add to Scatter"]').value),'qa-return-tree-2');
   await js(()=>{window.__terrain.saveWorldSettings();window.__world.useWorldStore.getState().removeScatterProfile('qa-return-tree-2');window.__terrain.loadWorldSettings()});
   assert.deepEqual(await js(()=>window.__world.useWorldStore.getState().world.scatterProfiles['qa-return-tree-2']),first);
   await click('[data-object-view="select"]');await click('.tg-mesh-card[title="BLOCK"]');assert.equal(await js(()=>document.querySelector('[data-add-to-scatter="selected"]').disabled),true);assert.ok((await js(()=>document.querySelector('[data-scatter-feedback]').textContent)).includes('no population renderer'));
   await click('.tg-mesh-card[title="QA CUSTOM TREE 2"]');await click('[data-object-view="selected"]');await screenshot('02-selected-object');await click('[data-object-view="select"]');
   await openMenu();await click('[data-compass-action="editor-view"]');await screenshot('09-south-editor-view');
   record('Stage C: equivalent Add to Scatter in World/Editor, real forest population, retained settings/legacy overrides/selection across panels and save/load, honest ineligible feedback');
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(artifact,process.argv.includes("--stage-a")?"stage-a.json":process.argv.includes("--library-copy")?"library-copy-results.json":"object-results.json"),JSON.stringify({passes,errors,failures,physicalXbox:"pending"},null,2));
} catch(error){console.error(error);try{console.error(await diagnosis());await captureFailure()}catch{}await fs.writeFile(path.join(artifact,"failure-results.json"),JSON.stringify({passes,errors,failures,error:String(error)},null,2));process.exitCode=1}
finally{socket?.close();chrome.kill()}
