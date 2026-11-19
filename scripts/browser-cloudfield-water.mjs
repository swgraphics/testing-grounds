import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, aimCamera, pause } from './cloudfield-browser-helpers.mjs';
const B = await browserSession('cloudfield-2.local/water');
const measurements = [];
const legacy = process.argv.includes('--legacy');
try {
  await enterWorld(B);
  await B.evaluate("__terrain.updateTerrainSetting('waterHeight',1);__terrain.updateTerrainSetting('waterWaveStrength',60)");
  if (legacy) await B.evaluate(`(async()=>{
    const source=await(await fetch('/src/systems/atmosphere/livingVapor/waterMaterial.js')).text();
    const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/three[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];
    const THREE=await import(url);
    window.__legacyMaterials=[];
    window.__legacyWater={ref:{current:()=>{__scene.traverse(object=>{const material=object.material;if(material?.userData?.livingWaterUniforms){const replacement=material.clone();replacement.userData={};replacement.flatShading=material.opacity===0.72;replacement.needsUpdate=true;object.material=replacement;__legacyMaterials.push(replacement)}})}},priority:0,store:__root};
    __root.getState().internal.subscribers.push(__legacyWater);
  })()`);
  await aimCamera(B, [40, 12, 90], [50, 1, 35]);
  const frames = async () => {
    const value = await B.evaluate(`new Promise(resolve=>{const start=performance.now();let frames=0;const step=()=>{frames++;if(performance.now()-start>=2500)resolve({frames,elapsedMs:performance.now()-start});else requestAnimationFrame(step)};requestAnimationFrame(step)})`);
    return { ...value, fps: value.frames * 1000 / value.elapsedMs };
  };
  for (const [name, sun] of [['day', 85], ['sunset', 35], ['night', 10]]) {
    await B.evaluate(`__terrain.updateTerrainSetting('sunHeight',${sun})`); await pause(700); await B.screenshot((legacy ? 'water-before-' : 'water-after-') + name);
  }
  await B.evaluate("__terrain.updateTerrainSetting('sunHeight',85)");
  for (const wind of [0, 100]) {
    await B.evaluate(`__terrain.updateTerrainSetting('windStrength',${wind});__terrain.updateTerrainSetting('windSpeed',${wind})`);
    await pause(700); measurements.push({ scene: 'base-water', wind, ...await frames() }); await B.screenshot('wind-' + wind);
  }
  await B.evaluate(`(()=>{const world=__world.useWorldStore.getState().world;__world.useWorldStore.getState().updateChunk(world.currentChunkId,{water:{bodies:[{id:'cloudfield-test-pond',x:50,y:3,z:45,diameter:32}]}});window.dispatchEvent(new CustomEvent('tg-water-bodies-changed'))})()`);
  await pause(500); await B.screenshot('pond-and-waterfall');
  await B.evaluate(`(async()=>{const expansion=await import('/src/systems/world/terrainExpansion.js');window.__expansion=expansion})()`);
  await B.evaluate("__expansion.addTerrainChunk({grid:'G4',name:'WATER SEAM CHECK'})");
  // The world-coordinate surface is also inspected beyond the base footprint.
  await aimCamera(B, [340, 12, 95], [350, 1, 40]); await B.screenshot('expanded-boundary-water');
  measurements.push({ scene: 'pond-and-base', ...await frames() });
  assert.deepEqual(B.errors, [], 'water shader compiles and renders without console errors');
  assert.deepEqual(B.failures, []);
  const backend = await B.evaluate("(()=>{const gl=__root.getState().gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()");
  await fs.writeFile(path.join(B.artifact, legacy ? 'legacy-measurements.json' : 'measurements.json'), JSON.stringify({ pass: true, legacy, backend, measurements, errors: B.errors, failures: B.failures }, null, 2));
  console.log(JSON.stringify({ pass: true, measurements }));
} catch (error) {
  await B.screenshot('failure').catch(() => {});
  await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, errors: B.errors, failures: B.failures }, null, 2));
  throw error;
} finally { B.close(); }
