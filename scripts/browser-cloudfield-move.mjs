import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, pause } from './cloudfield-browser-helpers.mjs';

const B = await browserSession('cloudfield-2.local/move');
const passes = [], measurements = [];
const pass = message => { passes.push(message); console.log('PASS', message); };
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const pointer = (type, { x, y }) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const center = () => B.evaluate(`(()=>{const p=__cloud.runtimeClouds.get(__id).root.position.clone().project(__camera);return {x:(p.x+1)*720,y:(1-p.y)*500}})()`);
const metrics = () => B.evaluate(`(()=>{
  const c=__cloud.runtimeClouds.get(__id), record=__cloud.cloudRecords(__world.useWorldStore.getState().world)[__id];
  return {position:record.position,root:c.root.position.toArray(),mass:c.sim.mass(),steps:c.sim.stepCount,
    camera:__camera.position.toArray(),player:__positions.at(-1),fillPoint:c.fillPoint,
    owner:__interaction.useInteractionStore.getState().gestureOwner,undo:__history.useHistoryStore.getState().undoStack.length,
    resourcesStable:c===__original&&c.sim===__sim&&c.texture===__texture};
})()`);
try {
  await enterWorld(B); await B.waitFor('__positions.length>=2', 'settled player telemetry');
  await B.evaluate(`(async()=>{
    window.__history=await import('/src/systems/history/historyStore.js');
    __terrain.updateTerrainSetting('sunHeight',85);
    window.__id=__cloud.createCloud('cumulus',[150,12,20]);__cloud.changeCloud(__id,{persistencePercent:100,fill:false});
    const internal=__root.getState().internal;internal.subscribers=internal.subscribers.filter(entry=>entry!==__pin);internal.subscribers.push(__pin);
    __camera.lookAt(150,12,20);__camera.updateMatrixWorld();const orientation=__camera.quaternion.clone();
    // Lock only aim, never camera/player translation, so input leakage remains observable.
    __pin.ref.current=()=>{__camera=__root.getState().camera;__camera.quaternion.copy(orientation);__camera.updateMatrixWorld()};
  })()`);
  await pause(1000);
  await B.evaluate("__nav.openIndependentDevTools('clouds')");
  await B.waitFor("document.querySelector('[data-cloud-tool=move]')?.getClientRects().length", 'Dev Tools Move');
  await B.click('[data-cloud-tool=move]');
  assert.equal(await B.evaluate('__cloud.useCloudUI.getState().tool'), 'move');
  await B.screenshot('dev-tools-move');
  await B.evaluate('__nav.exitToDefaultWorld()');
  const selectedPoint = await center();
  await pointer('mousePressed', selectedPoint); await pointer('mouseReleased', selectedPoint);
  await B.click('[data-cloud-edit-selected]');
  await B.waitFor("document.querySelector('.tg-cloud-interaction-panel [data-cloud-tool=move]')", 'context Move');
  await B.click('.tg-cloud-interaction-panel [data-cloud-tool=move]');
  await B.screenshot('context-move');
  pass('MOVE is available and activates from both Dev Tools / CLOUDS and Cloud Interaction');

  await B.evaluate('window.__original=__cloud.runtimeClouds.get(__id);window.__sim=__original.sim;window.__texture=__original.texture;window.__density=__sim.d.slice()');
  const start = await metrics(), point = await center(), grab = { x: point.x + 12, y: point.y + 8 };
  await pointer('mousePressed', grab); await pointer('mouseMoved', grab);
  assert.equal((await metrics()).owner, 'cloud-gesture');
  assert.ok(distance(start.position, (await metrics()).position) < 0.00001, 'off-centre grab has no initial jump');
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  const destination = { x: grab.x + 110, y: grab.y - 55 };
  for (let i = 1; i <= 5; i++) { await pointer('mouseMoved', { x: grab.x + 22 * i, y: grab.y - 11 * i }); await pause(70); }
  await pointer('mouseReleased', destination);
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  const moved = await metrics();
  assert.ok(distance(start.position, moved.position) > 1, 'drag changes world position');
  assert.ok(moved.position[1] > start.position[1], 'upward drag raises the aerial cloud');
  assert.ok(distance(moved.position, moved.root) < 0.00001, 'world and visual transforms agree');
  assert.equal(moved.owner, null); assert.equal(moved.undo, start.undo + 1, 'one drag creates one Undo command');
  assert.ok(distance(start.camera, moved.camera) < 0.001, 'camera translation is stable while moving cloud');
  assert.ok(Math.hypot(start.player.x - moved.player.x, start.player.z - moved.player.z) < 0.001, 'W does not move player during cloud drag');
  assert.ok(Math.abs(moved.mass / start.mass - 1) < 0.0001, '100% persistence retains vapor');
  assert.ok(moved.steps > start.steps); assert.equal(moved.resourcesStable, true);
  assert.deepEqual(moved.fillPoint, start.fillPoint, 'Move leaves the emitter point unchanged');
  assert.equal(await B.evaluate('__sim.d.some((value,index)=>value!==__density[index])'), true, 'vapor continues evolving');
  measurements.push({ mouse: { start, moved } });
  pass('off-centre mouse drag moves the cloud/cage, owns input and preserves evolving vapor');

  await B.click('[data-object-undo]'); const undone = await metrics();
  assert.ok(distance(undone.position, start.position) < 0.00001);
  assert.ok(undone.steps >= moved.steps); assert.equal(undone.resourcesStable, true);
  await B.click('[data-object-redo]'); const redone = await metrics();
  assert.ok(distance(redone.position, moved.position) < 0.00001);
  assert.ok(redone.steps >= undone.steps); assert.equal(redone.resourcesStable, true);
  pass('native Undo / Redo restores cloud positions without rewinding the simulation');

  for (const cancel of ["window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1}))", "window.dispatchEvent(new Event('blur'))"]) {
    const before = await metrics(), at = await center();
    await pointer('mousePressed', at); await pointer('mouseMoved', { x: at.x + 18, y: at.y });
    assert.equal((await metrics()).owner, 'cloud-gesture');
    await B.evaluate(cancel); const cancelled = await metrics();
    assert.equal(cancelled.owner, null); assert.equal(cancelled.undo, before.undo + 1);
    await pointer('mouseReleased', { x: at.x + 18, y: at.y });
  }
  pass('pointer cancellation and blur finish Move and release input ownership');

  await B.click('[data-cloud-tool=move]');
  await B.evaluate("window.__pad={connected:true,mapping:'standard',id:'move-test-pad',buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]};navigator.getGamepads=()=>[__pad]");
  const controllerStart = await metrics();
  await B.evaluate('__pad.buttons[7].pressed=true;__pad.axes[0]=0.55;__pad.axes[1]=-0.35'); await pause(500);
  assert.equal((await metrics()).owner, 'cloud-gesture');
  await B.evaluate('__pad.buttons[7].pressed=false;__pad.axes[0]=0;__pad.axes[1]=0'); await pause(150);
  const controllerPlane = await metrics();
  assert.ok(distance(controllerStart.position, controllerPlane.position) > 0.5);
  assert.equal(controllerPlane.owner, null); assert.equal(controllerPlane.undo, controllerStart.undo + 1);
  await B.evaluate('__pad.buttons[7].pressed=true;__pad.axes[3]=-0.6'); await pause(450);
  await B.evaluate('__pad.buttons[7].pressed=false;__pad.axes[3]=0'); await pause(150);
  const controllerDepth = await metrics();
  assert.ok(distance(controllerPlane.position, controllerDepth.position) > 0.5);
  assert.equal(controllerDepth.owner, null);
  assert.ok(distance(controllerStart.camera, controllerDepth.camera) < 0.001);
  assert.ok(Math.hypot(controllerStart.player.x - controllerDepth.player.x, controllerStart.player.z - controllerDepth.player.z) < 0.001);
  assert.ok(Math.abs(controllerDepth.mass / controllerStart.mass - 1) < 0.0001); assert.equal(controllerDepth.resourcesStable, true);
  measurements.push({ controller: { controllerStart, controllerPlane, controllerDepth } });
  pass('controller RT + left stick moves in the view plane; right stick changes depth without player/camera drift');

  await B.evaluate('__pad.buttons[7].pressed=true;__pad.axes[0]=0.5'); await pause(120);
  await B.evaluate('__pad.buttons[1].pressed=true'); await pause(200);
  const dismissed = await metrics(); await pause(300); const idle = await metrics();
  assert.equal(dismissed.owner, null); assert.equal(idle.owner, null);
  assert.equal(await B.evaluate('__cloud.useCloudUI.getState().panelOpen'), false);
  assert.ok(distance(dismissed.position, idle.position) < 0.00001, 'held RT cannot restart after B');
  await B.evaluate('__pad.buttons[7].pressed=false;__pad.buttons[1].pressed=false;__pad.axes[0]=0');
  pass('B dismisses Move while RT is held and prevents a stuck/restarted gesture');

  const saved = await metrics();
  await B.evaluate('__persist.saveWorldSnapshot();__cloud.changeCloud(__id,{position:[150,12,20]});__persist.loadWorldSnapshot()');
  await pause(350); const loaded = await metrics();
  assert.ok(distance(loaded.position, saved.position) < 0.00001);
  assert.ok(Math.abs(loaded.mass / saved.mass - 1) < 0.001);
  pass('Save / Load restores the moved world position and current vapor');
  await B.screenshot('moved-cloud');
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass: true, passes, measurements, errors: B.errors, failures: B.failures }, null, 2));
} catch (error) {
  await B.screenshot('failure').catch(() => {});
  await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, passes, measurements, errors: B.errors, failures: B.failures }, null, 2)); throw error;
} finally { B.close(); }
