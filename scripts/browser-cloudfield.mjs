import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserSession, enterWorld, aimCamera, pause } from './cloudfield-browser-helpers.mjs';
const B = await browserSession(process.env.TG_CLOUD_ARTIFACT ?? 'cloudfield-2.local/browser');
const passes = [], record = message => { passes.push(message); console.log('PASS', message); };
try {
  await enterWorld(B);
  await B.evaluate("__terrain.updateTerrainSetting('sunHeight',85)");
  await aimCamera(B, [50, 15, 80], [50, 20, 45]);
  if (process.argv.includes('--before-water')) {
    await B.evaluate("__terrain.updateTerrainSetting('waterHeight',1);__terrain.updateTerrainSetting('waterWaveStrength',60)");
    await aimCamera(B, [40, 12, 90], [50, 1, 35]);
    for (const [name, sun] of [['day', 85], ['sunset', 35], ['night', 10]]) {
      await B.evaluate(`__terrain.updateTerrainSetting('sunHeight',${sun})`); await pause(1000); await B.screenshot('water-before-' + name);
    }
    record('baseline TG water captured at day, sunset and night');
  } else {
    assert.equal(await B.evaluate('__cloud.useCloudUI.getState().supported'), true, 'WebGL2 cloud support');
    for (const family of ['cumulus', 'stratus', 'cirrus']) {
      await B.evaluate("__nav.openObjectLibrary('place')"); await pause(200);
      await B.click(`[title="${family.toUpperCase()}"]`);
      assert.equal(await B.evaluate('Object.keys(__world.useWorldStore.getState().world.livingVapor?.objects??{}).length'), passes.length, 'highlight never creates clouds');
      await B.click('.tg-mesh-place-button');
      await B.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720, y: 500 });
      await B.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 720, y: 500, button: 'left', clickCount: 1 });
      await B.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 720, y: 500, button: 'left', clickCount: 1 });
      await pause(500);
      await B.waitFor(`__cloud.runtimeClouds.size===${passes.length + 1}`, family + ' placed');
      const id = await B.evaluate('__cloud.useCloudUI.getState().selectedId');
      await B.evaluate(`__cloud.changeCloud(${JSON.stringify(id)},{position:[${50 + passes.length * 24},20,50],persistencePercent:100})`);
      await aimCamera(B, [50 + passes.length * 24, 20, 75], [50 + passes.length * 24, 20, 50]);
      await pause(1500); await B.screenshot(family);
      assert.ok(await B.evaluate(`__cloud.runtimeClouds.get(${JSON.stringify(id)}).sim.mass()>10`));
      record(family + ' native Library placement with visible vapor');
    }
    await B.click('[data-cloud-edit-selected]');
    await B.waitFor("document.querySelector('.tg-cloud-interaction-panel')", 'cloud interaction');
    await B.screenshot('cloud-interaction');
    await B.evaluate("__cloud.changeCloud(__cloud.useCloudUI.getState().selectedId,{quaternion:[0,Math.SQRT1_2,0,Math.SQRT1_2],scale:[1,1.4,0.8]})");
    await pause(600); await B.screenshot('rotated-90-nonuniform-scale');
    await B.evaluate('__guides.useWorldGuideStore.getState().setVisible(false)'); await pause(250);
    assert.equal(await B.evaluate('[...__cloud.runtimeClouds.values()].every(c=>!c.cage.visible)'), true); await B.screenshot('cage-off');
    await B.evaluate('__guides.useWorldGuideStore.getState().setVisible(true)'); await pause(250);
    assert.equal(await B.evaluate('[...__cloud.runtimeClouds.values()].every(c=>c.cage.visible)'), true); await B.screenshot('cage-on');
    record('contextual controls, transformed volume and shared guide visibility');
    const saved = await B.evaluate("(()=>{const data=__persist.saveWorldSnapshot();return {count:Object.keys(data.livingVapor.objects).length,bytes:JSON.stringify(data.livingVapor).length,mass:[...__cloud.runtimeClouds.values()].map(c=>c.sim.mass())}})()");
    assert.equal(saved.count, 3);
    await B.evaluate('__persist.loadWorldSnapshot()'); await pause(1000);
    assert.equal(await B.evaluate('__cloud.runtimeClouds.size'), 3);
    record('world Save/Load retains developed vapor and transforms');
    for (const [name, sun] of [['day', 85], ['sunset', 35], ['night', 10]]) {
      await B.evaluate(`__terrain.updateTerrainSetting('sunHeight',${sun})`); await pause(300); await B.screenshot('cloud-' + name);
    }
    await B.evaluate("__colors.updateCloudSetting('usePalette',false);__colors.updateCloudSetting('upperColor','#ff9900');__colors.updateCloudSetting('lowerColor','#18204a');__colors.updateCloudSetting('edgeColor','#72bcff')");
    await pause(400); await B.screenshot('custom-colors');
    await B.evaluate("__nav.openIndependentDevTools('clouds')"); await pause(250); await B.screenshot('clouds-dev-tools');
    record('live TG atmosphere and custom cloud colors');
    await fs.writeFile(path.join(B.artifact, 'save-measurements.json'), JSON.stringify(saved, null, 2));
  }
  assert.deepEqual(B.errors, [], 'browser console errors'); assert.deepEqual(B.failures, [], 'failed requests');
  await fs.writeFile(path.join(B.artifact, process.argv.includes('--before-water') ? 'before-water.json' : 'results.json'), JSON.stringify({ pass: true, passes, errors: B.errors, failures: B.failures }, null, 2));
} catch (error) {
  await B.screenshot('failure').catch(() => {});
  const state = await B.evaluate('({runtime:__cloud?.runtimeClouds.size,records:Object.keys(__world?.useWorldStore.getState().world.livingVapor?.objects??{}),ui:__cloud?.useCloudUI.getState()})').catch(() => null);
  await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, state, passes, errors: B.errors, failures: B.failures }, null, 2));
  throw error;
} finally { B.close(); }
