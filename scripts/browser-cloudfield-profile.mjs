import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, aimCamera, pause } from './cloudfield-browser-helpers.mjs';

const stage = process.env.TG_PROFILE_STAGE ?? 'before';
const git = args => execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args], { encoding: 'utf8' }).trim();
const sourcePaths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', 'src']).split(/\r?\n/))].filter(Boolean).sort();
const sourceFiles = await Promise.all(sourcePaths.map(async file => ({ file, sha256: createHash('sha256').update(await fs.readFile(file)).digest('hex') })));
const sourceDigest = createHash('sha256').update(JSON.stringify(sourceFiles)).digest('hex');
const B = await browserSession(`cloudfield-06-1.local/${stage}`);
const measurements = [], environments = [];
const key = async name => {
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: name === 'ArrowRight' ? 39 : 37, timestamp: Date.now() / 1000 });
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: name === 'ArrowRight' ? 39 : 37 });
};
const pointer = (type, x = 720, y = 500) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, timestamp: Date.now() / 1000 });
const nativeMetrics = async () => Object.fromEntries((await B.cdp('Performance.getMetrics')).metrics.map(entry => [entry.name, entry.value]));
async function phase(label, action) {
  const start = await nativeMetrics(); await B.evaluate(`__P.start(${JSON.stringify(label)})`);
  await action(); await pause(180);
  const result = await B.evaluate('__P.stop()'); const end = await nativeMetrics();
  result.cpu = Object.fromEntries(['ScriptDuration', 'TaskDuration', 'LayoutDuration', 'RecalcStyleDuration', 'JSHeapUsedSize'].map(key => [key, end[key] - start[key]]));
  return result;
}
const cases = [{ label: 'zero-disabled', count: 0, simulation: false, rendering: false }, { label: 'zero-full', count: 0, simulation: true, rendering: true }];
for (const count of [1, 3, 6]) for (const [label, simulation, rendering] of [['disabled', false, false], ['renderer-only', false, true], ['simulation-only', true, false], ['full', true, true]]) cases.push({ label: `${count}-${label}`, count, simulation, rendering });
cases.push(...[
  { label: '1-emitting', count: 1, emit: true }, { label: '6-fill', count: 6, fill: true }, { label: '6-cage-off', count: 6, cage: false },
  { label: '6-persistence-90', count: 6, persistence: 90 }, { label: '3-legacy-off', count: 3, legacy: false }, { label: '3-water-off', count: 3, water: false }, { label: '6-empty', count: 6, empty: true },
].map(value => ({ simulation: true, rendering: true, ...value })));
try {
  await B.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__reactCommits=0;window.addEventListener('pointerdown',e=>{window.__profilePointerHeld=true;if(window.__P?.enabled)__P.lastInput=e.timeStamp},true);window.addEventListener('pointermove',e=>{if(window.__P?.enabled)__P.lastInput=e.timeStamp},true);window.addEventListener('pointerup',()=>window.__profilePointerHeld=false,true);window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,renderers:new Map(),inject(renderer){this.renderers.set(1,renderer);return 1},onCommitFiberRoot:()=>{window.__reactCommits++},onCommitFiberUnmount:()=>{}}` });
  await B.cdp('Performance.enable');
  for (const blank of [true, false]) {
    await enterWorld(B, blank);
    await B.evaluate(`(async()=>{
      const text=await(await fetch('/src/systems/atmosphere/livingVapor/cloudObject.js')).text();const url=text.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/three[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];window.__THREE=await import(url);
      window.__height=await import('/src/systems/terrain/terrainHeight.js');window.__palette=await import('/src/systems/atmosphere/atmospherePalette.js');
      for(const [key,value] of Object.entries({sunHeight:75,sunRotation:50,waterHeight:1,waterWaveStrength:35,windStrength:25,windSpeed:35}))__terrain.updateTerrainSetting(key,value);
      for(const [key,value] of Object.entries(${JSON.stringify(blank ? {treeDensity:0,treeCoverage:0,foliageDensity:0,rockDensity:0} : {treeDensity:16,treeCoverage:50,foliageDensity:50,rockDensity:50})}))__terrain.updateTerrainSetting(key,value);
      if(${blank}){const world=__world.useWorldStore.getState().world;__world.useWorldStore.getState().replaceWorld({...world,scatterProfiles:{'crimson-tree':{enabled:false}}})}
      const random=Math.random;Math.random=()=>.37415;try{for(let index=0;index<6;index++){const id=__cloud.createCloud(['cumulus','stratus','cirrus'][index%3],[50+(index%3-1)*15,15+Math.floor(index/3)*8,55-Math.floor(index/3)*15]);__cloud.changeCloud(id,{persistencePercent:100},false)}}finally{Math.random=random}
      window.__templates=Object.values(__cloud.cloudRecords(__world.useWorldStore.getState().world));
    })()`);
    await B.waitFor('__cloud.runtimeClouds.size===6', 'six seeded cloud resources');
    await aimCamera(B, [50, 32, 105], [50, 2, 50]);
    const environment = await B.evaluate(`(async()=>{const m=await import('/scripts/cloudfield-profile-browser.js');return {...m.installCloudProfiler({THREE:__THREE,height:__height,palette:__palette}),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,settings:{...__terrain.terrainSettings},browser:navigator.userAgent}})()`);
    environments.push({ blank, ...environment });
    for (const config of cases) {
      if (process.env.TG_PROFILE_QUICK && !['zero-disabled', 'zero-full', '1-full', '6-full'].includes(config.label)) continue;
      await B.evaluate(`(()=>{
        __nav.exitToDefaultWorld();__P.mode=${JSON.stringify({ simulation: config.simulation, rendering: config.rendering })};
        const objects=Object.fromEntries(__templates.slice(0,${config.count}).map(record=>[record.id,{...record,cage:${config.cage !== false},fill:${Boolean(config.fill)},persistencePercent:${config.persistence ?? 100},vapor:JSON.parse(JSON.stringify(record.vapor))}]));
        const state=__world.useWorldStore.getState();state.replaceWorld({...state.world,livingVapor:{version:1,objects}});
        __cloud.useCloudUI.setState({selectedId:Object.keys(objects)[0]??null,panelOpen:false});
        __terrain.terrainSettings.terrainEdits={};__terrain.updateTerrainSetting('terrainEditVersion',__terrain.terrainSettings.terrainEditVersion+1);__terrain.updateTerrainSetting('sunHeight',75);__terrain.updateTerrainSetting('sunRotation',50);
      })()`);
      await B.waitFor(`__cloud.runtimeClouds.size===${config.count}`, 'cloud count');
      await B.evaluate(`__P.instrumentClouds();__P.visibility(${JSON.stringify({ water: config.water !== false, legacy: config.legacy !== false })});${config.empty ? 'for(const c of __cloud.runtimeClouds.values())c.sim.clear();' : ''}`);
      await pause(450);
      if (config.emit) {
        await B.evaluate("__cloud.setCloudTool('emit')");
        const point = await B.evaluate('(()=>{const c=[...__cloud.runtimeClouds.values()][0],p=c.root.position.clone().project(__camera);return {x:(p.x+1)*720,y:(1-p.y)*500}})()');
        await pointer('mousePressed', point.x, point.y);
      }
      const idle = await phase('idle', () => pause(1200));
      if (config.emit) { await pointer('mouseReleased'); await B.evaluate("window.dispatchEvent(new CustomEvent('tg-cloud-close'))"); }
      await B.evaluate("__nav.openIndependentDevTools('atmosphere')");
      await B.waitFor("[...document.querySelectorAll('.tg-dev-full-menu.open .tg-dev-slider-group')].some(e=>e.textContent.includes('Sun Height')&&e.querySelector('input'))", 'sun slider');
      await B.evaluate("(()=>{const row=[...document.querySelectorAll('.tg-dev-full-menu.open .tg-dev-slider-group')].find(e=>e.textContent.includes('Sun Height'));const input=row.querySelector('input');input.setAttribute('data-profile-sun','');input.scrollIntoView({block:'center'});input.focus()})()");
      const sun = await phase('native sun slider', async () => { for (let i = 0; i < 5; i++) { await key('ArrowRight'); await pause(100); } });
      await B.evaluate('__nav.exitToDefaultWorld();__nav.activateWorldTool("HEIGHT","sculpt")');
      const terrain = await phase('native terrain sculpt', async () => { await pointer('mousePressed'); for (let i = 0; i < 4; i++) { await pointer('mouseMoved', 720 + i * 2, 500 - i * 12); await pause(120); } await pointer('mouseReleased'); });
      const measurement = { world: blank ? 'blank' : 'populated', config, idle, sun, terrain };
      measurements.push(measurement); console.log(JSON.stringify({ world: measurement.world, case: config.label, fps: idle.fps, frame95: idle.p95FrameMs, gpu: idle.gpuMs, sunLatency: sun.latencies.map(v => Math.round(v.ms)), terrainLatency: terrain.latencies.map(v => Math.round(v.ms)), simulationMs: idle.times.step?.ms, raycastMs: idle.times.raycastScene?.ms }));
      await fs.writeFile(path.join(B.artifact, 'progress.json'), JSON.stringify({ stage, environments, measurements, errors: B.errors, failures: B.failures }, null, 2));
      if (config.label === '6-full') await B.screenshot((blank ? 'blank' : 'populated') + '-six-clouds');
    }
  }
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  const revision = git(['rev-parse', 'HEAD']);
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass: true, revision, sourceDigest, sourceFiles, stage, environments, measurements, errors: B.errors, failures: B.failures }, null, 2));
} catch (error) {
  await B.screenshot('failure').catch(() => {}); await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, stage, environments, measurements, errors: B.errors, failures: B.failures }, null, 2)); throw error;
} finally { B.close(); }
