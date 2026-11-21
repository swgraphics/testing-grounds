import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function browserSession(directory) {
  const artifact = path.resolve(process.env.TG_CLOUD_ARTIFACT_ROOT ? path.join(process.env.TG_CLOUD_ARTIFACT_ROOT, path.basename(directory)) : directory); await fs.mkdir(artifact, { recursive: true });
  const port = await new Promise(resolve => { const listener = net.createServer(); listener.listen(0, '127.0.0.1', () => { const chosen = listener.address().port; listener.close(() => resolve(chosen)); }); });
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port, '--user-data-dir=' + path.resolve('node_modules/.cache/cloudfield-' + process.pid), '--enable-unsafe-swiftshader', '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  await fs.writeFile(path.join(artifact, 'live-debugger.json'), JSON.stringify({ port, pid: process.pid, chromePid: chrome.pid }));
  let socket, pages;
  try {
    for (let i = 0; i < 120; i++) { try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (pages.length) break; } catch {} await pause(250); }
    assert.ok(pages?.length, 'Chrome debugger connected');
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const errors = [], failures = [], pending = new Map(), requests = new Map(); let requestId = 0;
    socket.onmessage = event => {
      const value = JSON.parse(event.data);
      if (value.id) { const entry = pending.get(value.id); if (entry) { pending.delete(value.id); clearTimeout(entry.timer); value.error ? entry.reject(Error(JSON.stringify(value.error))) : entry.resolve(value.result); } }
      if (value.method === 'Runtime.exceptionThrown' && errors.length < 100) errors.push(value.params.exceptionDetails.exception?.description ?? value.params.exceptionDetails.text);
      if (value.method === 'Runtime.consoleAPICalled' && value.params.type === 'error' && errors.length < 100) errors.push(value.params.args.map(arg => arg.value ?? arg.description).join(' '));
      if (value.method === 'Network.responseReceived' && value.params.response.status >= 400) failures.push({ url: value.params.response.url, status: value.params.response.status });
      if (value.method === 'Network.requestWillBeSent') requests.set(value.params.requestId,value.params.request.url);
      if (value.method === 'Network.loadingFailed' && !value.params.canceled && value.params.errorText!=='net::ERR_ABORTED') failures.push({url:requests.get(value.params.requestId),error:value.params.errorText});
      if (['Network.loadingFinished','Network.loadingFailed'].includes(value.method)) requests.delete(value.params.requestId);
    };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++requestId; const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 90000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const value = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (value.exceptionDetails) throw Error(value.exceptionDetails.exception?.description ?? value.exceptionDetails.text); return value.result.value; };
    const waitFor = async (expression, label, attempts = 200) => { for (let i = 0; i < attempts; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(250); } throw Error('Timeout: ' + label); };
    const screenshot = async name => { const value = await cdp('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(path.join(artifact, name + '.png'), Buffer.from(value.data, 'base64')); };
    const click = async selector => {
      await waitFor(`document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`, 'control ' + selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'nearest'})`);
      const point = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
      await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 }); await pause(200);
    };
    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    return { artifact, cdp, evaluate, waitFor, screenshot, click, errors, failures, close: () => { socket.close(); chrome.kill(); } };
  } catch (error) { socket?.close(); chrome.kill(); throw error; }
}

export async function enterWorld(B, blank = true, loadSaved = false) {
  await B.cdp('Page.navigate', { url: process.env.TG_TEST_URL ?? 'http://127.0.0.1:5196/' });
  await B.waitFor("document.querySelector('.tg-title-blank')", 'title');
  await B.waitFor("!document.querySelector('.tg-loading-overlay')", 'title load');
  // Title fonts can move the start buttons after their first layout.
  await B.evaluate('document.fonts.ready');
  await pause(250);
  await B.click(loadSaved ? '.tg-title-load' : blank ? '.tg-title-blank' : '.tg-title-enter');
  await B.waitFor("document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')", 'world');
  await B.evaluate(`(async()=>{
    const cloudSource=await(await fetch('/src/components/world/LivingVaporSystem.jsx')).text();
    const cloudURL=cloudSource.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*cloudState[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];
    window.__cloud=await import(cloudURL);
    window.__world=await import('/src/systems/world/worldStore.js');
    const appSource=await(await fetch('/src/App.jsx')).text();
    const terrainURL=appSource.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*terrainSettings[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];
    window.__terrain=await import(terrainURL);
    window.__nav=await import('/src/systems/ui/navigationActions.js');
    window.__interaction=await import('/src/systems/interaction/interactionStore.js');
    const persistURL=appSource.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*worldPersistence[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];
    window.__persist=await import(persistURL);
    window.__guides=await import('/src/systems/ui/worldGuideStore.js');
    window.__colors=await import('/src/systems/atmosphere/clouds/CloudSettings.js');
    const source=await(await fetch('/src/App.jsx')).text();
    const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/@react-three_fiber[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];
    const m=await import(url);window.__fiberRoot=m._roots.get(document.querySelector('canvas'));window.__root=__fiberRoot.store;
    window.__camera=window.__root.getState().camera;window.__scene=window.__root.getState().scene;
    window.__positions=[];window.addEventListener('player-position-changed',e=>__positions.push(e.detail));
    window.__pin={ref:{current:()=>{}},priority:0,store:window.__root};window.__root.getState().internal.subscribers.push(window.__pin);
  })()`);
  await B.waitFor("__scene.getObjectByName('Living Vapor')?.userData.livingVaporStats", 'Living Vapor mounted and updating');
  await pause(1000);
}

export async function aimCamera(B, position, at) {
  await B.evaluate(`(()=>{const internal=__root.getState().internal;internal.subscribers=internal.subscribers.filter(entry=>entry!==__pin);internal.subscribers.push(__pin);__pin.ref.current=()=>{window.__camera=__root.getState().camera;window.__camera.position.set(...${JSON.stringify(position)});window.__camera.lookAt(...${JSON.stringify(at)});window.__camera.updateMatrixWorld()}})()`);
  await pause(1000);
}
