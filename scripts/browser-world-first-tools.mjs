import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve(process.env.TG_UI_ARTIFACT || (process.argv.includes("--panel-layout") ? "ui-revision-02b.local/regression/layout" : "ui-revision-02b.local/regression"));
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
 diagnosis=async()=>({url:await evaluate("location.href"),text:await evaluate("document.body?.innerText.slice(0,1200)"),frames:await evaluate("window.__frames"),expanded:await evaluate("document.querySelector('.tg-compass-activate')?.getAttribute('aria-expanded')"),nav:await evaluate("window.__nav ? {open:window.__nav.useNavigationStore.getState().compassOpen,menu:window.__nav.useNavigationStore.getState().menu}:null")});captureFailure=()=>screenshot("failure");
 await cdp("Browser.setDownloadBehavior",{behavior:"allow",downloadPath:downloads});
 await cdp("Page.enable");await cdp("Runtime.enable");await cdp("Network.enable");await cdp("Log.enable");
 await cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp("Page.addScriptToEvaluateOnNewDocument",{source:"window.__titleFrames=0;window.addEventListener('camera-heading-changed',()=>window.__titleFrames++)"});
 await cdp("Page.navigate",{url:process.env.TG_TEST_URL || process.argv.find(arg => arg.startsWith("--url="))?.slice(6) || "http://127.0.0.1:5181/"});
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
 const togglePanel=async direction=>{if(!await evaluate("document.querySelector('.tg-panel-visibility').open"))await click('.tg-panel-visibility summary');await click('[data-panel-toggle="'+direction+'"]')};
 const closeAll=async()=>{if(await evaluate("document.querySelector('.tg-compass-activate').dataset.compassState!=='orange'"))await click('.tg-compass-activate');assert.ok(await noPanels())};
 const objectCount=()=>evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks).reduce((n,c)=>n+Object.keys(c.objects||{}).length,0)");
 const historyCount=()=>evaluate("window.__history.useHistoryStore.getState().undoStack.length");
 const selectAndPlace=async selector=>{await click(selector);assert.equal(await visibleCount(),1,"selection preserves South");await click(".tg-mesh-place-button")};
 if (process.argv.includes("--panel-layout")) {
  const snapshots=[];
  const assertContained=async()=>{
    const overflow=await evaluate("[...document.querySelectorAll('[data-directional-panel]:not([hidden]) > .tg-directional-content')].map(e=>({panel:e.parentElement.dataset.directionalPanel,width:e.clientWidth,scroll:e.scrollWidth})).filter(e=>e.panel!=='north'&&e.scroll>e.width+1)");
    assert.deepEqual(overflow,[],"no unintended horizontal panel overflow (North toolbar scrolls intentionally)");
    const gallery=await evaluate("(()=>{const g=document.querySelector('.tg-mesh-library'),p=document.querySelector('#tg-panel-south .tg-directional-content'),r=g.getBoundingClientRect(),v=p.getBoundingClientRect();return{width:g.clientWidth,space:p.clientWidth,count:g.children.length,scroll:g.scrollWidth,bottom:r.bottom,viewBottom:v.bottom,desktop:innerWidth>=900,top:p.scrollTop}})()");
    if(await evaluate("!document.querySelector('#tg-panel-south').hidden")){assert.ok(gallery.width>=gallery.space*.9,"gallery uses the full bottom region");assert.ok(gallery.scroll>gallery.width,"gallery is horizontally scrollable");assert.ok(gallery.count>50,"all objects are mounted in the gallery");if(gallery.desktop&&gallery.top===0)assert.ok(gallery.bottom<=gallery.viewBottom+1,"desktop gallery cards and scrollbar are fully visible")}
  };
  assert.ok(await noPanels());
  await cdp("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await waitFor("window.__frames>=60 && !document.querySelector('.tg-area-discovery')","settled clean world capture",300);await screenshot("01-clean-world");
  for(const direction of ["north","south","west","east"]){
    await openMenu();await choose(direction);await checkLayout(1);
    assert.equal(await evaluate("!!document.querySelector('.tg-panel-visibility')"),true,"World panels expose shared PANELS control");
    await assertContained();await screenshot("0"+({north:2,south:3,west:4,east:5}[direction])+"-"+direction);
    if(direction==="west"){
      assert.ok(await evaluate("(()=>{const r=document.querySelector('.tg-world-map-viewport').getBoundingClientRect();return r.width>=180&&r.height>=70})()"),"usable mini-map");
    }
    if(direction==="south"){
      const left=await evaluate("document.querySelector('.tg-mesh-library').scrollLeft");await click(".tg-mesh-next");assert.ok(await evaluate("document.querySelector('.tg-mesh-library').scrollLeft")>left,"native gallery scroll action");
      await evaluate("(()=>{const g=document.querySelector('.tg-mesh-library');g.scrollLeft=g.scrollWidth;g.lastElementChild.querySelector('.tg-mesh-card').focus({preventScroll:true})})()");
      await cdp("Input.dispatchKeyEvent",{type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9,modifiers:8});
      await cdp("Input.dispatchKeyEvent",{type:"keyUp",key:"Tab",code:"Tab",windowsVirtualKeyCode:9,modifiers:8});await pause(300);
      assert.ok(await evaluate("(()=>{const e=document.activeElement,g=e.closest('.tg-mesh-library');if(!g)return false;const a=e.getBoundingClientRect(),b=g.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1})()"),"keyboard can reach objects at the far end");
      await evaluate("document.querySelector('.tg-mesh-library').scrollLeft=0;void 0");
    }
    if(direction==="north")assert.ok(await evaluate("[...document.querySelectorAll('.tg-project-planned button')].every(e=>e.disabled)"),"Project placeholders are disabled");
    if(direction==="east"){
      assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-dev-section-header]')].map(e=>e.dataset.devSectionHeader)"),["character","terrain","camera","physics","atmosphere","world","materials"]);
      await evaluate("document.querySelectorAll('[data-dev-section-header]').forEach(e=>{if(e.getAttribute('aria-expanded')==='false')e.click()})");await pause(300);
      await assertContained();
      assert.ok(await evaluate("document.querySelector('#tg-panel-east .tg-directional-content').scrollHeight>document.querySelector('#tg-panel-east .tg-directional-content').clientHeight"),"Dev Tools scrolls vertically");
    }
    await click('[data-panel-collapse="'+direction+'"]');assert.ok(await noPanels());
  }
  record("Single-panel organization, full-width horizontal gallery, keyboard reachability, mini-map, planned Project entries and canonical settings");
  await openMenu();await click('[data-compass-action="tools"]');await choose("north");await choose("north");
  await openMenu();await choose("north");await togglePanel("south")
  await checkLayout(2);await sculpt();await screenshot("06-two-panels");
  await togglePanel("west");await checkLayout(3);await sculpt();await screenshot("07-three-panels");
  await openMenu();await click('[data-compass-action="editor-view"]');await checkLayout();await sculpt();await screenshot("08-four-panels");
  await click(".tg-panel-visibility summary");
  assert.equal(await evaluate("document.querySelector('.tg-panel-visibility').open"),true);
  await screenshot("08a-panels-control");
  await click('[data-panel-toggle="east"]');assert.equal(await visibleCount(),3);
  await click('[data-panel-toggle="east"]');assert.equal(await visibleCount(),4);
  await key("Escape");assert.equal(await evaluate("document.querySelector('.tg-panel-visibility').open"),false);assert.equal(await visibleCount(),4);
  await click(".tg-panel-visibility summary");await click('[data-panel-toggle="north"]');assert.equal(await visibleCount(),3);
  await click('[data-panel-expand="north"]');assert.equal(await visibleCount(),4,"edge tab restores top panel");
  await click('[data-panel-collapse="east"]');await screenshot("09-collapsed-panel");await click('[data-panel-expand="east"]');
  record("Editor PANELS uses shared visibility; Compass recovers hidden top panel; native world sculpt works with two, three and four panels");
  for(const [width,height]of [[1920,1080],[1440,900],[1280,720],[960,720],[640,800],[390,844]]){
    await cdp("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<500});await pause(600);
    const data=await checkLayout();await assertContained();
    const east=await evaluate("(()=>{const c=document.querySelector('#tg-panel-east .tg-directional-content'),r=c.getBoundingClientRect();const bad=[...c.querySelectorAll('input,select,button')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>r.left+c.clientWidth+1).map(e=>({tag:e.tagName,type:e.type,cls:e.className,right:e.getBoundingClientRect().right}));return{width:c.clientWidth,bad:bad.slice(0,6)}})()");
    assert.deepEqual(east.bad,[],"Dev Tools controls stay within their region at "+width);
    await screenshot("editor-"+width+"x"+height);
    snapshots.push({width,height,...data});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  record("1920x1080, 1440x900, 1280x720, narrow desktop and mobile dimensions: no overlap or unintended horizontal clipping");
  const focused=[];
  await evaluate("window.__world.useWorldStore.getState().upsertObject({id:'qa-layout-target',type:'procedural',modelType:'crimson-tree',name:'LAYOUT TREE',position:[0,0,0],rotationY:0,scale:1})");
  await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];window.__fiber=await import(url)})()");
  for(const [width,height]of [[1280,720],[390,844]]){
    await cdp("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<500});await pause(400);
    await evaluate("window.dispatchEvent(new CustomEvent('tg-object-focus-edit',{detail:{id:'qa-layout-target',chunkId:window.__world.useWorldStore.getState().world.currentChunkId}}))");
    await waitFor("!!document.querySelector('.tg-focused-object-editor')","focused editor layout");
    await waitFor("(()=>{const canvas=document.querySelector('.tg-focused-object-editor canvas');return canvas&&window.__fiber._roots.get(canvas)?.store.getState().gl.info.render.calls>0})()","live focused tree preview");
    const bounds=await evaluate("(()=>{const e=document.querySelector('.tg-focused-object-editor'),r=e.getBoundingClientRect(),c=e.querySelector('.tg-mesh-edit-controls');return{x:r.x,y:r.y,width:r.width,height:r.height,contentWidth:c.clientWidth,scrollWidth:c.scrollWidth,previewHeight:e.querySelector('.tg-mesh-edit-preview').getBoundingClientRect().height,controlsHeight:c.clientHeight}})()");
    assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height);
    assert.ok(bounds.height>300&&bounds.width>=(width<500?300:700),'focused editor provides useful preview/control space');
    assert.ok(bounds.previewHeight>=(width<500?140:400)&&bounds.controlsHeight>=(width<500?300:400),'preview and controls use the expanded window');
    assert.ok(bounds.scrollWidth<=bounds.contentWidth+1,'focused controls do not clip horizontally');
    await screenshot('focused-editor-'+width+'x'+height);focused.push({width,height,...bounds});await click('[data-object-editor-close]');await waitFor("!document.querySelector('.tg-focused-object-editor')","Back closes focused editor");
  }
  record("Focused South editor fits 1280x720 and 390x844 with contained scrollable controls and reachable Back");
  await fs.writeFile(path.join(artifact,"layout-results.json"),JSON.stringify({passes,errors,failures,snapshots,focused,physicalXbox:"pending"},null,2));
 } else if (process.argv.includes("--panel-focus")) {
  await openMenu(); await click('[data-compass-action="editor-view"]'); await checkLayout();
  for(const direction of ["east","west","north","south"]){
   await click('[data-panel-collapse="'+direction+'"]');await pause(500);
   console.log("COLLAPSED",direction,await evaluate("({focus:document.activeElement?.outerHTML.slice(0,500),focused:document.hasFocus(),tabs:[...document.querySelectorAll('[data-panel-expand]')].map(e=>({name:e.dataset.panelExpand,rect:e.getBoundingClientRect().toJSON()}))})"));
   await key("Enter");console.log("ENTER",await visibleCount(),await evaluate("document.activeElement?.outerHTML.slice(0,500)"));
   assert.equal(await visibleCount(),4,"native Enter restores edge tab");
  }
  record("Independent panel focus and native keyboard restore");
 } else {
 assert.ok(await noPanels());
 const persistent=await evaluate("[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.className)");
 assert.deepEqual(persistent,["tg-compass-activate"],"clean World View has only Compass and no collapsed tabs");
 await screenshot("02-world-clean");
 await openMenu();await screenshot("03-compass");
 let count=0;
 for(const direction of ["north","south","west","east"]){
  if(!count)await choose(direction);else await togglePanel(direction);
  assert.equal(await visibleCount(),++count);await checkLayout(count);
  assert.equal(await evaluate("[...document.querySelectorAll('.tg-directional-heading h2')].some(e=>/\\b(NORTH|SOUTH|EAST|WEST)\\b/.test(e.textContent))"),false);
  if(count===2)await screenshot("04-two-panels");if(count===3)await screenshot("05-three-panels");
 }
 await togglePanel("east");assert.equal(await visibleCount(),3,"PANELS toggles only its own direction");
 await closeAll();
 record("World preset: zero panels/tabs, one/two/three/four independent panels, PANELS toggle, actual panel names");
 await openMenu();await choose("west");
 const teleportId=await evaluate("Object.values(window.__world.useWorldStore.getState().world.chunks)[1].id");
 await click('#tg-panel-west .tg-teleport-controls button:nth-child(2)');
 assert.equal(await evaluate("window.__world.useWorldStore.getState().world.currentChunkId"),teleportId);
 await click('#tg-panel-west .tg-teleport-controls button:first-child');
 await clickText("#tg-panel-west","ADD CHUNK");await waitFor("!!document.querySelector('.tg-chunk-dialog')","chunk dialog");
 await key("Escape");await waitFor("!document.querySelector('.tg-chunk-dialog')","chunk dialog closes");
 await click('[data-panel-collapse="west"]');assert.ok(await noPanels());
 record("Shared map: native teleport, Add Chunk dialog and clean final collapse");
 await key("Tab");await key("ArrowUp");await key("ArrowUp");await key("ArrowRight");await key("Enter");
 await waitFor("window.__nav.useNavigationStore.getState().menu==='tools'","keyboard Tools");
 await key("ArrowDown");await key("ArrowUp");await key("Enter");await waitFor("window.__nav.useNavigationStore.getState().menu==='terrain'","Terrain hierarchy");
 await key("Enter");assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");await sculpt();
 await openMenu();await click('[data-compass-action="editor-view"]');await waitFor("document.querySelectorAll('[data-directional-panel]:not([hidden])').length===4","Editor preset");
 const desktopLayout=await checkLayout();await screenshot("06-editor-full");
 await evaluate("window.__libraryNode=document.querySelector('.tg-mesh-menu');window.__mapNode=document.querySelector('.tg-world-map-shell');void 0");
 for(const direction of ["east","west","north","south"]){
  const before=await layout();await click('[data-panel-collapse="'+direction+'"]');
  assert.equal(await visibleCount(),3);const after=await checkLayout(3);
  assert.ok(["east","west"].includes(direction)?after.canvas.w>before.canvas.w:after.canvas.h>before.canvas.h,"collapse expands central viewport");
  assert.equal(await currentTool(),"RAISE");
  if(direction==="east")await screenshot("07-editor-collapsed");
  await key("Enter");assert.equal(await visibleCount(),4,"keyboard restores focused edge tab");await checkLayout();
 }
 assert.ok(await evaluate("window.__libraryNode===document.querySelector('.tg-mesh-menu') && window.__mapNode===document.querySelector('.tg-world-map-shell')"),"collapse retains content instances");
 await screenshot("08-editor-reopened");
 const transaction=await sculpt();
 await clickText("#tg-panel-north","UNDO");assert.equal(await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)"),transaction.before);
 await clickText("#tg-panel-north","REDO");assert.equal(await evaluate("JSON.stringify(window.__terrain.terrainSettings.terrainEdits)"),transaction.after);
 record("Editor preset: all panels, independent mouse collapse/keyboard restore, expanded viewport, same content, native sculpt and Undo/Redo");
 await click('[data-dev-section-header="terrain"]');
 const terrainRange='#tg-panel-east input[type="range"]';
 const settingBefore=await evaluate("window.__terrain.terrainSettings.heightMultiplier");
 await evaluate("window.__rangeNode=document.querySelector("+JSON.stringify(terrainRange)+");window.__rangeNode.focus()");
 await key("ArrowRight");const settingAfter=await evaluate("window.__terrain.terrainSettings.heightMultiplier");
 assert.notEqual(settingAfter,settingBefore);
 await click('[data-panel-collapse="east"]');await key("Enter");
 assert.ok(await evaluate("window.__rangeNode===document.querySelector("+JSON.stringify(terrainRange)+")"));
 await click('.tg-compass-activate');assert.ok(await noPanels());
 await openMenu();await choose("east");
 assert.equal(await evaluate("Number(document.querySelector("+JSON.stringify(terrainRange)+").value)"),settingAfter);
 await evaluate("document.querySelector("+JSON.stringify(terrainRange)+").focus()");await key("ArrowLeft");
 assert.equal(await evaluate("window.__terrain.terrainSettings.heightMultiplier"),settingBefore);
 await click('[data-dev-section-header="terrain"]');await click('[data-panel-collapse="east"]');assert.ok(await noPanels());
 record("Shared settings and DOM identity persist across collapse and both starting layouts");
 await evaluate("window.__pad={connected:true,id:'TG flexible-panel simulated Xbox',mapping:'standard',axes:[0,0,0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]})");
 const pad=async(index,pressed)=>{await evaluate("window.__pad.buttons["+index+"].pressed="+pressed);await pause(350)};
 const tap=async index=>{await pad(index,true);await pad(index,false)};
 for(let cycle=0;cycle<2;cycle++){
  await tap(9);await tap(12);await tap(0);assert.equal(await visibleCount(),1);
  let n=1;for(const direction of ['south','west','east']){
   if(!await evaluate("document.querySelector('.tg-panel-visibility').open")){await evaluate("document.querySelector('.tg-panel-visibility summary').focus()");await tap(0)}
   await evaluate("document.querySelector('[data-panel-toggle="+direction+"]').focus()");await tap(0);assert.equal(await visibleCount(),++n);
  }
  await tap(1);await evaluate("document.querySelector('[data-panel-collapse=east]').focus()");await tap(1);assert.equal(await visibleCount(),3,"B closes focused panel only");
  await tap(9);await tap(9);await tap(12);await tap(12);assert.equal(await evaluate("window.__nav.useNavigationStore.getState().selected"),"editor-view");
  await tap(0);assert.equal(await visibleCount(),4);
  await evaluate("document.querySelector('[data-panel-collapse=north]').focus()");assert.equal(await evaluate("document.activeElement.dataset.panelCollapse"),"north");
  await tap(0);assert.equal(await visibleCount(),3);assert.equal(await evaluate("document.activeElement.dataset.panelExpand"),"north");
  await tap(0);assert.equal(await visibleCount(),4);
  await closeAll();
 }
 await tap(9);await evaluate("window.__pad.axes[0]=.85");await waitFor("window.__nav.useNavigationStore.getState().selected==='east'","analog east");await evaluate("window.__pad.axes[0]=0");await tap(0);
 assert.equal(await visibleCount(),1);await tap(1);assert.ok(await noPanels());
 await tap(9);await click('[data-compass-action="tools"]');await choose("north");await choose("north");await tap(9);await tap(1);
 assert.ok(await noPanels());assert.equal(await currentTool(),"RAISE");assert.equal(await evaluate("window.__input.inputState.jump"),false);
 record("Simulated Xbox: Menu/D-pad/analog/A/B, independent panel combinations, edge-tab restore and neutral handoff");
 await tap(9);await choose("south");
 await evaluate("document.querySelector('.tg-mesh-card[title=\"BLOCK\"]').focus()");await tap(0);
 assert.equal(await visibleCount(),1,"Xbox A selects the card without entering placement");
 await evaluate("document.querySelector('.tg-mesh-place-button').focus()");await tap(0);assert.ok(await noPanels());
 await tap(1);assert.equal(await visibleCount(),1);assert.equal(await evaluate("document.querySelector('.tg-mesh-card.selected').title"),"BLOCK");await tap(1);assert.ok(await noPanels());
 record("Simulated Xbox explicit card selection, Place action and contextual B return; focused action contract, with broader spatial traversal deferred");
 // Real GLB download and independent preview lifecycle.
 await openMenu();await choose("north");await clickText("#tg-panel-north","TERRAIN EXPORT");
 await waitFor("!!document.querySelector('.tg-terrain-export')","export");
 await evaluate("(async()=>{const source=await(await fetch('/src/App.jsx')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];if(!url)throw Error('Missing R3F module URL');window.__fiber=await import(url);window.__scene=window.__fiber._roots.get(document.querySelector('canvas')).store.getState().scene})()");
 await waitFor("!!window.__scene.getObjectByName('Terrain export boundary')","preview boundary");
 const previousGLBs=new Set((await fs.readdir(downloads)).filter(p=>p.endsWith(".glb")));
 await click('.tg-terrain-export button[type="submit"]');await waitFor("document.querySelector('.tg-terrain-export [role=status]')?.textContent.includes('download started')","GLB download");
 let glbs=[];for(let i=0;i<40;i++){glbs=(await fs.readdir(downloads)).filter(p=>p.endsWith(".glb")&&!previousGLBs.has(p));if(glbs.length)break;await pause(250)}
 assert.ok(glbs.length);assert.equal((await fs.readFile(path.join(downloads,glbs.at(-1)))).toString("ascii",0,4),"glTF");
 await key("Escape");await waitFor("!window.__scene.getObjectByName('Terrain export boundary')","preview cleanup");await key("Escape");

 // Library-origin placement restores saved custom-tree browsing state.
 await openMenu();await choose("south");await click(".tg-mesh-next");
 assert.ok(await evaluate("document.querySelector('.tg-mesh-library').scrollLeft>0"));
 const custom='.tg-mesh-card[title="QA CUSTOM TREE 13"]';
 await evaluate("document.querySelector("+JSON.stringify(custom)+").scrollIntoView({block:'nearest',inline:'nearest'})");await pause(100);
 const browsing=await evaluate("({left:document.querySelector('.tg-mesh-library').scrollLeft,scroll:document.querySelector('#tg-panel-south .tg-directional-content').scrollTop})");
 const beforeBack=await objectCount(),beforeHistory=await historyCount();
 await selectAndPlace(custom);assert.ok(await noPanels());assert.equal(await currentTool(),"OBJECT");
 assert.equal(await evaluate("window.__nav.useNavigationStore.getState().placementOrigin"),"south");
 await waitFor("!!document.querySelector('[data-placement-back]')","contextual Back action");await screenshot("09-object-placement");
 await key("Escape");assert.equal(await visibleCount(),1);
 assert.equal(await evaluate("document.querySelector('#tg-panel-south').hidden"),false);
 assert.equal(await evaluate("document.querySelector('.tg-mesh-card.selected').title"),"QA CUSTOM TREE 13");
 assert.equal(await evaluate("document.activeElement.title"),"QA CUSTOM TREE 13","Library Back restores controller focus to the selected card");
 assert.ok(Math.abs(await evaluate("document.querySelector('.tg-mesh-library').scrollLeft")-browsing.left)<=1,"horizontal browsing position restored");
 assert.ok(Math.abs(await evaluate("document.querySelector('#tg-panel-south .tg-directional-content').scrollTop")-browsing.scroll)<=1,"Library scroll restored");
 assert.equal(await objectCount(),beforeBack);assert.equal(await historyCount(),beforeHistory);
 await screenshot("10-returned-library");
 await selectAndPlace('.tg-mesh-card[title="QA CUSTOM TREE 14"]');assert.ok(await noPanels());
 assert.equal(await evaluate("window.__tool.useInteractionStore.getState().activeTarget"),"object:qa-return-tree-14");
 // Back wins over a simultaneous RT placement edge.
 await evaluate("window.__pad.buttons[1].pressed=true;window.__pad.buttons[7].pressed=true");await pause(400);
 await waitFor("!document.querySelector('#tg-panel-south').hidden","Xbox B returns directly");
 await evaluate("window.__pad.buttons[1].pressed=false;window.__pad.buttons[7].pressed=false");await pause(400);
 assert.equal(await objectCount(),beforeBack);assert.equal(await historyCount(),beforeHistory);
 assert.equal(await evaluate("document.querySelector('.tg-mesh-card.selected').title"),"QA CUSTOM TREE 14");
 await tap(1);assert.ok(await noPanels(),"next B closes Library to clear world");
 await openMenu();await choose("south");await selectAndPlace(custom);await click("[data-placement-back]");
 assert.equal(await visibleCount(),1);assert.equal(await objectCount(),beforeBack);
 await closeAll();
 await evaluate("(async()=>{const r=await import('/src/systems/objects/objectRegistry.js');window.dispatchEvent(new CustomEvent('tg-mesh-place-request',{detail:{mesh:r.BUILTIN_OBJECTS.find(m=>m.name==='BLOCK')}}))})()");
 await waitFor("window.__tool.useInteractionStore.getState().activeMode==='place'","external placement");
 assert.equal(await evaluate("window.__nav.useNavigationStore.getState().placementOrigin"),null);
 assert.equal(await evaluate("!!document.querySelector('[data-placement-back]')"),false);
 await key("Escape");assert.ok(await noPanels(),"outside placement cancels without assuming SOUTH");
 assert.equal(await objectCount(),beforeBack);
 await evaluate("window.__pad.connected=false");
 record("Custom-tree placement: Escape/B/mouse Back, preserved horizontal scroll/selection, immediate object switching, no accidental RT/history edits, external-source cancellation");
 // Real object placement and the existing Scatter/save/load actions.
 await openMenu();await choose("south");
 const countBeforePlacement=await objectCount();await selectAndPlace('.tg-mesh-card[title="BLOCK"]');
 assert.ok(await noPanels());await click("canvas");await pause(500);
 const objectsAfter=await objectCount();assert.ok(objectsAfter>countBeforePlacement,"actual object placed");
 await key("Escape");assert.equal(await visibleCount(),1);await key("Escape");assert.ok(await noPanels());
 await openMenu();await choose("south");await click('[data-object-view="scatter"]');
 await waitFor("!!document.querySelector('.tg-mesh-scatter-manager')","existing Scatter");
 await togglePanel("north");assert.equal(await visibleCount(),2);
 await clickText("#tg-panel-north","SAVE WORLD");assert.ok(await evaluate("!!localStorage.getItem('testingGroundsWorld')"));
 assert.equal(await evaluate("[...document.querySelectorAll('#tg-panel-north button')].find(e=>e.textContent==='LOAD WORLD').disabled"),false);
 await evaluate("(()=>{const w=window.__world.useWorldStore.getState();w.removeObject(Object.keys(w.world.chunks[w.world.currentChunkId].objects).at(-1))})()");
 assert.equal(await objectCount(),objectsAfter-1);await clickText("#tg-panel-north","LOAD WORLD");assert.equal(await objectCount(),objectsAfter);
 record("Real placement, contextual return, shared Scatter and native world save/load restore");
 // Compact Editor View must keep every panel and a usable center.
 await openMenu();await click('[data-compass-action="editor-view"]');
 await cdp("Emulation.setDeviceMetricsOverride",{width:640,height:800,deviceScaleFactor:1,mobile:false});await pause(500);
 const compactLayout=await checkLayout();await screenshot("11-editor-640");
 await click('.tg-compass-activate');
 await cdp("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(300);
 await openMenu();await click('[data-compass-action="editor-view"]');await checkLayout();await screenshot("12-editor-mobile");await click('.tg-compass-activate');
 await cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 // Movement/camera run after UI handoff, with the existing algorithms.
 await evaluate("document.activeElement?.blur();window.__positions=[];window.addEventListener('player-position-changed',e=>window.__positions.push(e.detail));window.__headings=[];window.addEventListener('camera-heading-changed',e=>window.__headings.push(e.detail.degrees))");
 await waitFor("window.__positions.length>1","player telemetry");
 const p0=await evaluate("window.__positions.at(-1)");
 await cdp("Input.dispatchKeyEvent",{type:"keyDown",key:"w",code:"KeyW",windowsVirtualKeyCode:87});await pause(1800);await cdp("Input.dispatchKeyEvent",{type:"keyUp",key:"w",code:"KeyW",windowsVirtualKeyCode:87});await pause(400);
 const p1=await evaluate("window.__positions.at(-1)");assert.ok(Math.hypot(p1.x-p0.x,p1.z-p0.z)>.1,"native movement after menu cycle");
 const h0=await evaluate("window.__headings.at(-1)");
 await cdp("Input.dispatchMouseEvent",{type:"mousePressed",x:850,y:450,button:"right",clickCount:1});await cdp("Input.dispatchMouseEvent",{type:"mouseMoved",x:1050,y:480,buttons:2,button:"right"});await cdp("Input.dispatchMouseEvent",{type:"mouseReleased",x:1050,y:480,button:"right",clickCount:1});await pause(500);
 assert.ok(Math.abs(await evaluate("window.__headings.at(-1)")-h0)>.1,"native camera after menu cycle");
 record("Desktop/640/mobile panel bounds, internal scrolling, central pointer access, native character movement/camera");
 await cdp("Emulation.setDeviceMetricsOverride",{width:640,height:800,deviceScaleFactor:1,mobile:false});
 await cdp("Page.reload");await waitFor("!!document.querySelector('.tg-title-v3') && window.__titleFrames>=5","small live title");
 await screenshot("13-title-small");await click(".tg-title-blank");
 await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')","Blank Canvas");
 assert.equal(await evaluate("(async()=>{const m=await import('/src/systems/world/worldStore.js');return m.useWorldStore.getState().world.worldType})()"),"blank");
 record("Approved title composition and native default/Blank Canvas entry preserved");
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={passes,errors,failures,desktopLayout,compactLayout,physicalXbox:"pending"};
 console.log(JSON.stringify(report,null,2));await fs.writeFile(path.join(artifact,"browser-results.json"),JSON.stringify(report,null,2));
}
} catch(error){console.error(error);try{console.error(await diagnosis());await captureFailure()}catch{}await fs.writeFile(path.join(artifact,"browser-results.json"),JSON.stringify({passes,errors,failures,error:String(error)},null,2));process.exitCode=1}
finally{socket?.close();chrome.kill()}
