import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, aimCamera, pause } from './cloudfield-browser-helpers.mjs';
const B = await browserSession('cloudfield-2.local/retention/browser');
try {
  await enterWorld(B);
  await B.evaluate(`(async()=>{
    const objects={};let index=0;
    for(const family of ['cumulus','stratus','cirrus']){
      const source=await(await fetch('/cloudfield-2.local/retention/'+family+'.json')).json();
      const id='retention-'+family;objects[id]={...source,id,position:[50+index++*25,20,50],scale:[1,1,1],quaternion:[0,0,0,1],density:0.8,persistencePercent:100,radius:0.38,fill:false,cage:false,fillPoint:[0,-0.3,0]};
    }
    const world=__world.useWorldStore.getState().world;__world.useWorldStore.getState().replaceWorld({...world,livingVapor:{version:1,objects}});
    __terrain.updateTerrainSetting('sunHeight',85);
  })()`);
  await B.waitFor('__cloud.runtimeClouds.size===3', 'retained volumes reconstructed');
  let index = 0;
  for (const family of ['cumulus', 'stratus', 'cirrus']) {
    await aimCamera(B, [50 + index * 25, 20, 75], [50 + index * 25, 20, 50]); index++;
    assert.ok(await B.evaluate(`__cloud.runtimeClouds.get('retention-${family}').sim.mass()>0`));
    await B.screenshot(family + '-after-120-seconds-no-emission');
  }
  await aimCamera(B, [100, 20, 50], [100, 20, 49]); await pause(200); await B.screenshot('camera-inside-cloud');
  const saved = await B.evaluate("(()=>{__terrain.saveWorldSettings();return Object.fromEntries([...__cloud.runtimeClouds].map(([id,c])=>[id,c.sim.mass()]))})()");
  await enterWorld(B, true, true);
  await B.waitFor('__cloud.runtimeClouds.size===3', 'saved clouds restored after page navigation');
  const loaded = await B.evaluate('Object.fromEntries([...__cloud.runtimeClouds].map(([id,c])=>[id,c.sim.mass()]))');
  for (const id of Object.keys(saved)) assert.ok(Math.abs(loaded[id] / saved[id] - 1) < 0.001, 'full-page load preserves developed vapor mass');
  await aimCamera(B, [50, 20, 75], [50, 20, 50]); await B.screenshot('retained-vapor-after-full-page-load');
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass: true, observed: 'All three source fields after 120 simulated seconds without emission rendered in integrated TG, camera-inside rendering and saved reconstruction after full page navigation.', saved, loaded, errors: B.errors, failures: B.failures }, null, 2));
  console.log('PASS retained 120-second fields render in integrated TG; camera-inside shader compiles/renders');
} catch (error) {
  await B.screenshot('failure').catch(() => {}); await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, errors: B.errors, failures: B.failures }, null, 2)); throw error;
} finally { B.close(); }
