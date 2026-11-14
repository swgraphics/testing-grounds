import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve("task-0801-browser.local");
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
 const waitFor=async(expression,label)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(200)}throw Error("Timeout: "+label)};
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
 await cdp("Browser.setDownloadBehavior",{behavior:"allow",downloadPath:artifact});
 await cdp("Page.enable");await cdp("Runtime.enable");await cdp("Network.enable");await cdp("Log.enable");
 await cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp("Page.addScriptToEvaluateOnNewDocument",{source:"window.__titleFrames=0;window.addEventListener('camera-heading-changed',()=>window.__titleFrames++)"});
 await cdp("Page.navigate",{url:process.env.TG_TEST_URL || "http://127.0.0.1:5181/"});
 try { await waitFor("!!document.querySelector('.tg-title-v3')","title screen"); } catch { await cdp("Page.reload",{ignoreCache:true}); await waitFor("!!document.querySelector('.tg-title-v3')","title screen retry"); }

 await evaluate("document.fonts.ready");
 await waitFor("window.__titleFrames>=5","live title backdrop");
 await screenshot("01-explore-title");
 assert.equal(await evaluate("document.querySelector('.tg-title-v3 h1').textContent"),"WELCOME!");
 assert.equal(await evaluate("document.querySelector('.tg-title-v3 h2')"),null);
 assert.equal(await evaluate("document.querySelectorAll('.tg-title-media span').length"),0);
 assert.ok(await evaluate("document.querySelector('.tg-title-version').textContent.startsWith('v')"));
 assert.ok(await evaluate("!!document.querySelector('.tg-title-credits img[src*=TCompass]')"));
 assert.equal(await evaluate("document.querySelector('.tg-title-media')"),null);
 assert.equal(await evaluate("getComputedStyle(document.querySelector('.tg-title-frame')).pointerEvents"),"none");
 passes.push("Title: WELCOME!, full live world, perimeter frame, version and official branding");
 await click(".tg-title-actions button");await waitFor("!!document.querySelector('.tg-compass-activate')","Enter World");
 await waitFor("!document.querySelector('.tg-loading-overlay')","World loaded");
 await evaluate("window.__frames=0;window.addEventListener('camera-heading-changed',()=>window.__frames++)");
 await waitFor("window.__frames>=5","3D scene rendering");
 const currentTool=()=>evaluate("window.__tool.useInteractionStore.getState().activeTool");
 const noPanels=()=>evaluate("!window.__editor.useEditorStore.getState().isOpen && Object.values(window.__editor.useEditorStore.getState().panels).every(v=>!v)");
 const openMenu=async()=>{await click(".tg-compass-activate");console.log("Compass activation",await evaluate("({store:window.__nav?.useNavigationStore.getState().compassOpen,dom:!!document.querySelector('[data-compass]')})"));await waitFor("!!document.querySelector('[data-compass]')","compass")};
 const choose=async(direction,menu)=>{await click('[data-direction="'+direction+'"]');if(menu)await waitFor("document.querySelector('[data-compass]')?.getAttribute('aria-label')==="+JSON.stringify(menu+" compass"),menu)};
 const sculpt=async()=>{const before=await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)");await click("canvas");await pause(300);const after=await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)");assert.notEqual(after,before,"Brush modifies terrain");return {before,after}};
 await openMenu();await choose("east","tools");await choose("north","terrain");await choose("north");
 await waitFor("!document.querySelector('[data-compass]')","tool confirmation closes compass");
 await evaluate("(async()=>{window.__world=await import('/src/systems/world/worldStore.js');window.__terrain=await import('/src/systems/terrain/terrainSettings.js');window.__history=await import('/src/systems/history/historyStore.js');window.__tool=await import('/src/systems/interaction/interactionStore.js');window.__editor=await import('/src/systems/editor/editorStore.js');window.__nav=await import('/src/systems/ui/navigationStore.js');window.__actions=await import('/src/systems/ui/navigationActions.js');window.__input=await import('/src/systems/input/inputState.js');window.__padState=await import('/src/systems/input/gamepadState.js');})()");
 assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");
 const initial=await sculpt();
 await screenshot("02-world-raise");
 passes.push("A: World > Tools > Terrain > Raise activates and sculpts with all panels closed");
 for(const [id,label] of [["left","left tools"],["right","right quick tools"],["library","library"],["scatter","scatter"]]) {
  await evaluate("document.querySelector('.tg-panel-switcher').open=true");
  await click('.tg-panel-switcher button[aria-controls="tg-panel-'+id+'"]');
  await waitFor("!!document.querySelector('#tg-panel-"+id+"')",id+" open");
  assert.equal(await currentTool(),"RAISE");
  await click('[aria-label="Collapse '+label+'"]');
  assert.equal(await evaluate("!!document.querySelector('#tg-panel-"+id+"')"),false);
  assert.equal(await currentTool(),"RAISE");
  await sculpt();
 }
 await evaluate("document.querySelector('.tg-panel-switcher').open=false");
 passes.push("B: left/right/Library/Scatter open and close independently; Raise remains selected and sculpts after each closure");
 await openMenu();await choose("west","editor");await choose("north");
 await waitFor("!!document.querySelector('.tg-workspace-v2')","full editor");
 for(const id of ["left","right","library","scatter"])assert.ok(await evaluate("!!document.querySelector('#tg-panel-"+id+"')"));
 assert.equal(await currentTool(),"RAISE");await screenshot("03-full-composition");
 await click('[aria-label="Collapse left tools"]');assert.equal(await evaluate("!!document.querySelector('#tg-panel-left')"),false);
 assert.ok(await evaluate("!!document.querySelector('#tg-panel-right')"));await sculpt();
 passes.push("C: all independent panels compose Full Editor; collapsing one preserves others and world editing");
 await openMenu();await click('[data-compass-action="world-view"]');
 assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");
 await openMenu();await click('[data-compass-action="devtools"]');
 await waitFor("!!document.querySelector('.tg-dev-full-menu.open')","independent Dev Tools");
 assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");
 await click('.tg-dev-full-menu.open .tg-side-panel-close');assert.equal(await currentTool(),"RAISE");await sculpt();
 passes.push("D: upper-right World View closes panels; Dev Tools opens/closes independently with Raise preserved");
 await evaluate("document.activeElement?.blur()");
 await key("Tab");await choose("east","tools");await choose("north","terrain");await key("Escape");
 assert.equal(await evaluate("!!document.querySelector('[data-compass]')"),false);assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");
 await openMenu();await choose("east","tools");await choose("north","terrain");await click('[data-compass-action="parent"]');
 assert.equal(await evaluate("document.querySelector('[data-compass]').getAttribute('aria-label')"),"tools compass");await key("Escape");
 await openMenu();await key("ArrowRight");await key("Enter");await waitFor("window.__nav.useNavigationStore.getState().menu==='tools'","keyboard tools");await key("ArrowUp");await key("Enter");await waitFor("window.__nav.useNavigationStore.getState().menu==='terrain'","keyboard terrain");await key("Enter");
 assert.equal(await currentTool(),"RAISE");assert.ok(await noPanels());
 await evaluate("window.__pad={connected:true,id:'TG 0801 simulated Xbox',mapping:'standard',axes:[0,0,0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]})");
 const pad=async(index,pressed)=>{await evaluate("window.__pad.buttons["+index+"].pressed="+pressed);await pause(1000)};
 await pad(9,true);await waitFor("!!document.querySelector('[data-compass]')","Menu opens");await pad(9,false);
 await evaluate("window.__pad.axes[0]=.8");await waitFor("window.__nav.useNavigationStore.getState().selected==='east'","analog east");await evaluate("window.__pad.axes[0]=0");
 await pad(0,true);await waitFor("window.__nav.useNavigationStore.getState().menu==='tools'","A tools");await pad(0,false);
 await pad(12,true);await pad(12,false);await pad(1,true);await waitFor("!document.querySelector('[data-compass]')","B dismisses nested compass");await pad(1,false);
 assert.equal(await currentTool(),"RAISE");assert.ok(await noPanels());
 await pad(9,true);await waitFor("!!document.querySelector('[data-compass]')","Menu reopen");await pad(9,false);
 await pad(12,true);await pad(12,false);await pad(12,true);await waitFor("window.__nav.useNavigationStore.getState().selected==='world-view'","D-pad reaches upper action");await pad(12,false);
 await pad(15,true);await waitFor("window.__nav.useNavigationStore.getState().selected==='devtools'","D-pad reaches Dev Tools");await pad(15,false);
 await pad(0,true);await waitFor("!!document.querySelector('.tg-dev-full-menu.open')","A independent Dev Tools");await pad(0,false);
 await pad(13,true);await pad(13,false);assert.ok(await evaluate("!!document.activeElement.closest('.tg-dev-full-menu.open')"));
 await pad(1,true);await waitFor("!document.querySelector('.tg-dev-full-menu.open')","B closes Dev Tools");await pad(1,false);
 assert.equal(await currentTool(),"RAISE");await evaluate("window.__pad.connected=false");
 passes.push("E: Tab/mouse/keyboard, visible Parent, Escape dismissal, simulated Menu/analog/D-pad/A/B and upper-action/panel focus");
 // Export is independent too, and download uses the actual browser exporter.
 await openMenu();await choose("west","editor");await choose("south");
 await waitFor("!!document.querySelector('.tg-terrain-export')","Terrain Export");assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");
 await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];if(!url)throw Error('Missing R3F module URL');window.__fiber=await import(url);window.__scene=window.__fiber._roots.get(document.querySelector('canvas')).store.getState().scene})()");
 await waitFor("!!window.__scene.getObjectByName('Terrain export boundary')","export boundary without Full Editor");
 await click('.tg-terrain-export button[type=submit]');await waitFor("document.querySelector('.tg-terrain-export [role=status]')?.textContent.includes('download started')","real GLB");
 let glbs=[];for(let i=0;i<40;i++){glbs=(await fs.readdir(artifact)).filter(p=>p.endsWith(".glb"));if(glbs.length)break;await pause(250)}assert.ok(glbs.length);assert.equal((await fs.readFile(path.join(artifact,glbs.at(-1)))).toString("ascii",0,4),"glTF");
 await key("Escape");assert.equal(await currentTool(),"RAISE");
 await waitFor("!window.__scene.getObjectByName('Terrain export boundary')","export boundary cleanup");
 // Existing history and save/load buttons remain available in composed panels.
 await openMenu();await choose("west","editor");await choose("north");
 await evaluate("document.querySelector('.tg-panel-switcher').open=false");
 const transaction=await sculpt();
 await evaluate("[...document.querySelectorAll('.tg-editor-header button')].find(e=>e.textContent==='UNDO').click()");assert.equal(await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)"),transaction.before);
 await evaluate("[...document.querySelectorAll('.tg-editor-header button')].find(e=>e.textContent==='REDO').click()");assert.equal(await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)"),transaction.after);
 const objectCount=await evaluate("Object.keys(window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects).length");
 await evaluate("[...document.querySelectorAll('.tg-library-strip button')].find(e=>e.textContent==='BLOCK').click()");
 assert.ok(await noPanels());assert.equal(await currentTool(),"OBJECT");await click("canvas");await pause(500);
 const objectsAfter=await evaluate("Object.keys(window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects).length");assert.ok(objectsAfter>objectCount);
 // Panel visibility operations must also preserve placement, not just terrain tools.
 await openMenu();await click('[data-compass-action="devtools"]');await click('.tg-dev-full-menu.open .tg-side-panel-close');assert.equal(await currentTool(),"OBJECT");
 await evaluate("window.dispatchEvent(new CustomEvent('tg-mesh-cancel-placement'));window.__tool.useInteractionStore.getState().deactivate();window.dispatchEvent(new CustomEvent('tg-mesh-menu-close'))");
 await openMenu();await choose("west","editor");await choose("north");
 await evaluate("[...document.querySelectorAll('.tg-editor-bottom-bar button')].find(e=>e.textContent==='SAVE WORLD').click()");assert.ok(await evaluate("!!localStorage.getItem('testingGroundsWorld')"));
 await evaluate("[...document.querySelectorAll('.tg-editor-bottom-bar button')].find(e=>e.textContent==='LOAD WORLD').click()");
 assert.equal(await evaluate("Object.keys(window.__world.useWorldStore.getState().world.chunks[window.__world.useWorldStore.getState().world.currentChunkId].objects).length"),objectsAfter);
 await cdp("Emulation.setDeviceMetricsOverride",{width:640,height:800,deviceScaleFactor:1,mobile:false});await screenshot("04-small-composition");
 await click('[aria-label="Close all panels"]');
 await evaluate("document.activeElement?.blur();window.__positions=[];window.addEventListener('player-position-changed',e=>window.__positions.push(e.detail));window.__headings=[];window.addEventListener('camera-heading-changed',e=>window.__headings.push(e.detail.degrees))");
 await waitFor("window.__positions.length>1","player telemetry");
 const p0=await evaluate("window.__positions.at(-1)");
 await cdp("Input.dispatchKeyEvent",{type:"keyDown",key:"w",code:"KeyW",windowsVirtualKeyCode:87});await pause(1800);await cdp("Input.dispatchKeyEvent",{type:"keyUp",key:"w",code:"KeyW",windowsVirtualKeyCode:87});await pause(400);
 const p1=await evaluate("window.__positions.at(-1)");assert.ok(Math.hypot(p1.x-p0.x,p1.z-p0.z)>.1);
 const h0=await evaluate("window.__headings.at(-1)");
 const point=await evaluate("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x+r.width*.55,y:r.y+r.height*.5}})()");
 await cdp("Input.dispatchMouseEvent",{type:"mousePressed",...point,button:"left",clickCount:1});await cdp("Input.dispatchMouseEvent",{type:"mouseMoved",x:point.x+80,y:point.y+20,buttons:1,button:"left"});await cdp("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x+80,y:point.y+20,button:"left",clickCount:1});await pause(500);
 assert.ok(Math.abs(await evaluate("window.__headings.at(-1)")-h0)>.1);
 passes.push("F: real GLB download, Undo/Redo, world-first object placement, persistence, small composition, movement and camera");
 await cdp("Page.reload");
 await waitFor("!!document.querySelector('.tg-title-v3') && window.__titleFrames>=5","small title backdrop");
 await screenshot("05-small-explore-title");
 await click(".tg-title-blank");
 await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')","Blank Canvas");
 await evaluate("(async()=>{const m=await import('/src/systems/world/worldStore.js');window.__blankType=m.useWorldStore.getState().world.worldType})()");
 assert.equal(await evaluate("window.__blankType"),"blank");
 passes.push("Cinematic title captured with live rotating backdrop at desktop/small sizes; Blank Canvas entry");
 console.log(JSON.stringify({passes,errors,failures},null,2));
 await fs.writeFile(path.join(artifact,"browser-results.json"),JSON.stringify({passes,errors,failures},null,2));
 if(errors.length)process.exitCode=1;
} catch(error){console.error(error);try{console.error(await diagnosis());await captureFailure()}catch{}await fs.writeFile(path.join(artifact,"browser-results.json"),JSON.stringify({passes,errors,failures,error:String(error)},null,2));process.exitCode=1}
finally{socket?.close();chrome.kill()}
