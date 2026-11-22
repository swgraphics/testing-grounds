import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserSession, enterWorld, pause } from './cloudfield-browser-helpers.mjs';

const B = await browserSession(process.env.TG_HANDSHAKE_ARTIFACT_ROOT || 'movement-regression.local/handshake');
const passes = [], measurements = [];
const pass = message => { passes.push(message); console.log('PASS', message); };
const state = () => B.evaluate(`(()=>{const p=__positions.at(-1);let closest=Infinity,body;__physics.world.forEachRigidBody(b=>{if(!b.isDynamic())return;const t=b.translation(),d=Math.hypot(t.x-p.x,t.y-p.y,t.z-p.z);if(d<closest){closest=d;body=b}});let geometry;__scene.traverse(o=>{if(o.isMesh&&o.userData.tgTerrainRegion==='base-terrain')geometry=o.geometry.uuid});const colliders=[];__physics.world.forEachCollider(c=>{if(c.shape.type===__physics.rapier.ShapeType.TriMesh)colliders.push(c.handle)});return {enabled:body.isEnabled(),position:body.translation(),geometry,colliders:colliders.sort((a,b)=>a-b)}})()`);

try {
  for (const world of ['default', 'blank']) {
    await enterWorld(B, world === 'blank');
    await B.evaluate("(()=>{const visit=n=>{if(!n)return;const v=n.memoizedProps?.value;if(v?.rapier?.Ray&&v.world?.castRayAndGetNormal)window.__physics=v;visit(n.child);visit(n.sibling)};visit(__fiberRoot.fiber.current)})()");
    await pause(1000);
    const before = await state();
    for (const operation of ['loadChunkTerrainSettings()', 'broadcastAllTerrainSettings(false)', 'loadChunkTerrainSettings();__terrain.loadChunkTerrainSettings();__terrain.loadChunkTerrainSettings()']) {
      await B.evaluate('__terrain.' + operation); await pause(750);
      const after = await state();
      assert.equal(after.enabled, true, world + ': player must resume after unchanged settings');
      assert.equal(after.geometry, before.geometry, 'unchanged terrain reuses geometry');
      assert.deepEqual(after.colliders, before.colliders, 'unchanged terrain reuses colliders');
      measurements.push({ world, operation, before, after });
    }
    pass(world + ': unchanged settings, full broadcasts and repeated loads release physics without rebuilding terrain');
    await B.evaluate("__terrain.updateTerrainSetting('heightMultiplier',__terrain.terrainSettings.heightMultiplier+.02)");
    await B.waitFor(`(()=>{let id;__scene.traverse(o=>{if(o.isMesh&&o.userData.tgTerrainRegion==='base-terrain')id=o.geometry.uuid});return id&&id!==${JSON.stringify(before.geometry)}})()`, 'actual terrain geometry replacement');
    await pause(750);
    assert.equal((await state()).enabled, true, 'player resumes after a real collider rebuild');
    pass(world + ': real terrain rebuild also releases physics');
    await B.cdp('Input.dispatchKeyEvent', { type:'keyDown', key:'w', code:'KeyW', windowsVirtualKeyCode:87 });
    const start = await state(); await pause(2000); const finish = await state();
    await B.cdp('Input.dispatchKeyEvent', { type:'keyUp', key:'w', code:'KeyW', windowsVirtualKeyCode:87 });
    assert.ok(Math.hypot(start.position.x-finish.position.x,start.position.z-finish.position.z)>.5, 'native movement after terrain updates');
    pass(world + ': native keyboard movement survives terrain handoffs');
  }
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  await fs.writeFile(path.join(B.artifact,'results.json'),JSON.stringify({pass:true,passes,measurements,errors:B.errors,failures:B.failures},null,2));
} catch(error) {
  await fs.writeFile(path.join(B.artifact,'failure.json'),JSON.stringify({error:error.stack,passes,measurements,state:await state().catch(()=>null),errors:B.errors,failures:B.failures},null,2));throw error;
} finally { B.close(); }
