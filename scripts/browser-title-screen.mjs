import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifact = path.resolve("task-0802-browser.local");
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
 const waitFor=async(expression,label)=>{for(let i=0;i<300;i++){if(await evaluate(expression))return;await pause(200)}throw Error("Timeout: "+label)};
 const screenshot=async name=>{const shot=await cdp("Page.captureScreenshot",{format:"png"});await fs.writeFile(path.join(artifact,name+".png"),Buffer.from(shot.data,"base64"))};
 const key=async(key,code=key)=>{const codes={Tab:9,Enter:13,Escape:27,ArrowUp:38,ArrowRight:39,ArrowDown:40,ArrowLeft:37};await cdp("Input.dispatchKeyEvent",{type:"keyDown",key,code,windowsVirtualKeyCode:codes[key]||0,...(key==="Enter"?{text:"\r",unmodifiedText:"\r"}:{})});await cdp("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:codes[key]||0});await pause(1000)};
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
 await waitFor("window.__titleFrames>=10","live title camera");
 const report={viewports:[],actions:[]};
 const intro="Testing Grounds combines procedural world generation, real-time 3D rendering, environmental systems, character exploration, physics, and live development controls into a single interactive environment.";
 for(const [width,height,mobile] of [[1920,1080,false],[1440,900,false],[390,844,true],[375,667,true]]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:mobile});await pause(1000);
  const layout=await evaluate(`(()=>{const bounds=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};const title=document.querySelector('.tg-title-screen');const logo=document.querySelector('.tg-title-brand');const range=document.createRange();range.selectNodeContents(document.querySelector('h1'));const heading=range.getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,titleScrollWidth:title.scrollWidth,titleWidth:title.clientWidth,titleScrollHeight:title.scrollHeight,titleHeight:title.clientHeight,frame:bounds('.tg-title-frame'),logo:bounds('.tg-title-brand'),logoRatio:logo.naturalWidth/logo.naturalHeight,headingRight:heading.right,content:bounds('.tg-title-content'),footer:bounds('.tg-title-credits'),compass:bounds('.tg-title-compass'),buttons:[...document.querySelectorAll('.tg-title-screen button')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,right:r.right,y:r.y,bottom:r.bottom,height:r.height}}),intro:document.querySelector('.tg-title-intro').textContent.trim(),copySize:parseFloat(getComputedStyle(document.querySelector('.tg-title-intro')).fontSize),headingFont:getComputedStyle(document.querySelector('h1')).fontFamily,framePointerEvents:getComputedStyle(document.querySelector('.tg-title-frame')).pointerEvents,canvases:document.querySelectorAll('canvas').length,loadedImages:[...document.querySelectorAll('.tg-title-screen img')].every(i=>i.complete&&i.naturalWidth>0),version:document.querySelector('.tg-title-version').textContent}})()`);
  assert.equal(layout.canvases,1);assert.equal(layout.intro,intro);assert.ok(layout.loadedImages);assert.ok(layout.headingFont.includes('Special Gothic Expanded One'));
  assert.equal(layout.framePointerEvents,'none');assert.ok(layout.frame.x>0&&layout.frame.y>0&&layout.frame.right<width&&layout.frame.bottom<height);
  assert.ok(layout.scrollWidth<=width && layout.titleScrollWidth<=layout.titleWidth,'no horizontal overflow');
  assert.ok(layout.titleScrollHeight<=layout.titleHeight+1,'no vertical clipping at required viewport');
  assert.ok(layout.headingRight<layout.frame.right,'heading inside frame');assert.ok(layout.copySize>=14);
  assert.ok(Math.abs(layout.logo.width/layout.logo.height/layout.logoRatio-1)<.01,'official logo proportions');
  for(const b of layout.buttons){assert.ok(b.height>=44);assert.ok(b.x>layout.frame.x&&b.right<layout.frame.right&&b.y>layout.frame.y&&b.bottom<layout.frame.bottom,'button inside frame: '+b.text)}
  assert.ok(layout.footer.bottom<layout.frame.bottom);assert.ok(layout.content.y>layout.frame.y);
  if(mobile){assert.ok(layout.logo.y>height*.3,'clear upper world view');assert.ok(layout.compass.y<height*.15)}
  await screenshot(`title-${width}x${height}`);report.viewports.push(layout);
 }
 assert.equal(await evaluate("document.querySelector('h1').textContent"),'WELCOME!');
 assert.equal(await evaluate("document.querySelector('.tg-title-load').disabled"),true);
 assert.equal(await evaluate("document.querySelector('.tg-title-media')"),null);
 // Native keyboard action preserves the original default-world path.
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await evaluate("document.activeElement?.blur()");await key('Tab');
 assert.equal(await evaluate("document.activeElement.dataset.titleAction"),'enter');await key('Enter');
 await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')",'default world');
 const worldType=()=>evaluate("import('/src/systems/world/worldStore.js').then(m=>m.useWorldStore.getState().world.worldType)");
 assert.equal(await worldType(),'default');report.actions.push('PASS native Tab/Enter opens default world');
 // Persist a recognizable world via the existing API, then load via title button.
 await evaluate(`(async()=>{const w=await import('/src/systems/world/worldStore.js'),p=await import('/src/systems/world/worldPersistence.js');const world=w.useWorldStore.getState().world;p.saveWorldSnapshot({...world,metadata:{...world.metadata,titleScreenProbe:'task-0802-saved-world'}})})()`);
 await cdp('Page.reload');await waitFor("!!document.querySelector('.tg-title-v3') && !document.querySelector('.tg-title-load').disabled",'saved-world title');
 const nativeClick=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1})};
 await nativeClick('.tg-title-load');await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')",'load saved world');
 assert.equal(await evaluate("import('/src/systems/world/worldStore.js').then(m=>m.useWorldStore.getState().world.metadata.titleScreenProbe)"),'task-0802-saved-world');report.actions.push('PASS native mouse Load Saved World restores persisted marker');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp('Page.reload');
 await waitFor("!!document.querySelector('.tg-title-v3')",'touch title');await evaluate('document.fonts.ready');await pause(1000);
 const touch=await evaluate("(()=>{const r=document.querySelector('.tg-title-blank').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await waitFor("!!document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')",'touch blank canvas');assert.equal(await worldType(),'blank');report.actions.push('PASS native touch Blank Canvas');
 report.errors=[...new Set(errors)];report.failures=failures;
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);
 await fs.writeFile(path.join(artifact,'title-results.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({viewports:report.viewports.map(v=>[v.width,v.height]),actions:report.actions,errors:report.errors,failures},null,2));
}catch(error){console.error(error,[...new Set(errors)].slice(0,5));try{await captureFailure()}catch{}process.exitCode=1}
finally{socket?.close();chrome.kill()}
