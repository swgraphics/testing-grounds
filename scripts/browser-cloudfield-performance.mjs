import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, aimCamera, pause } from './cloudfield-browser-helpers.mjs';
const B = await browserSession('cloudfield-2.local/performance');
const measurements = [];
try {
  await enterWorld(B, false);
  await B.evaluate("__terrain.updateTerrainSetting('sunHeight',85);__terrain.updateTerrainSetting('treeDensity',65);__terrain.updateTerrainSetting('foliageDensity',65)");
  await aimCamera(B, [0, 48, 65], [0, 48, 0]);
  const stats = () => B.evaluate(`(()=>{const gl=__root.getState().gl;return {...__scene.getObjectByName('Living Vapor').userData.livingVaporStats,textures:gl.info.memory.textures,geometries:gl.info.memory.geometries,programs:gl.info.programs.length,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles}})()`);
  const measure = async label => {
    await pause(600); const start = await stats(); const time = performance.now(); await pause(3500); const end = await stats();
    const elapsed = performance.now() - time;
    const result = { label, clouds: end.count, elapsedMs: elapsed, frames: end.frames - start.frames, fps: (end.frames - start.frames) * 1000 / elapsed, simulationMsPerFrame: (end.totalSimulationMs - start.totalSimulationMs) / Math.max(1, end.frames - start.frames), stepsPerSecond: (end.steps - start.steps) * 1000 / elapsed, budgetHits: end.budgetHits - start.budgetHits, textures: end.textures, geometries: end.geometries, drawCalls: end.drawCalls, triangles: end.triangles };
    measurements.push(result); console.log(JSON.stringify(result));
  };
  await measure('no emitted clouds / dense foliage baseline');
  for (const count of [1, 3, 6]) {
    await B.evaluate(`(()=>{while(Object.keys(__cloud.cloudRecords(__world.useWorldStore.getState().world)).length<${count}){const i=Object.keys(__cloud.cloudRecords(__world.useWorldStore.getState().world)).length;const id=__cloud.createCloud(['cumulus','stratus','cirrus'][i%3],[(i-(${count}-1)/2)*13,48,0]);if(!id)throw Error('Cloud creation failed');__cloud.changeCloud(id,{persistencePercent:100})}})()`);
    await measure(`${count} idle evolving clouds / dense foliage`);
    if (count === 1) {
      await B.evaluate("__cloud.setCloudTool('emit')");
      await B.cdp('Input.dispatchMouseEvent', {type:'mousePressed',x:720,y:500,button:'left',clickCount:1});
      await measure('one cloud / active Emit');
      await B.cdp('Input.dispatchMouseEvent', {type:'mouseReleased',x:720,y:500,button:'left',clickCount:1});
      await B.evaluate("window.dispatchEvent(new CustomEvent('tg-cloud-close'))");
    }
  }
  const initial = await B.evaluate('[...__cloud.runtimeClouds.values()].map(c=>c.sim.stepCount)');
  await B.evaluate("for(const id of __cloud.runtimeClouds.keys())__cloud.changeCloud(id,{fill:true})");
  await measure('six clouds / continuous Fill');
  await B.evaluate("for(const id of __cloud.runtimeClouds.keys())__cloud.changeCloud(id,{fill:false})");
  await B.evaluate("__terrain.updateTerrainSetting('waterHeight',25);__terrain.updateTerrainSetting('waterWaveStrength',70)");
  await measure('six clouds / water / dense foliage');
  const final = await B.evaluate('[...__cloud.runtimeClouds.values()].map(c=>c.sim.stepCount)');
  assert.ok(final.every((steps, i) => steps > initial[i]), 'fair scheduler advances every cloud');
  await B.screenshot('six-clouds-water-foliage');
  await B.evaluate("for(const id of [...__cloud.runtimeClouds.keys()])__cloud.deleteCloud(id)"); await pause(800);
  const baseline = await stats();
  for (let i = 0; i < 4; i++) {
    await B.evaluate("window.__cycle=__cloud.createCloud('cumulus',[0,48,0])"); await pause(400);
    await B.evaluate('__cloud.deleteCloud(__cycle)'); await pause(400);
  }
  const after = await stats();
  assert.equal(after.count, 0); assert.ok(after.textures <= baseline.textures, 'removed cloud textures do not accumulate');
  assert.ok(after.geometries <= baseline.geometries + 2, 'shared cloud geometry released');
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  const backend = await B.evaluate("(()=>{const gl=__root.getState().gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()");
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass: true, backend, measurements, cleanup: { baseline, after }, errors: B.errors, failures: B.failures }, null, 2));
} catch (error) {
  await B.screenshot('failure').catch(() => {}); await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, measurements, errors: B.errors, failures: B.failures }, null, 2)); throw error;
} finally { B.close(); }
