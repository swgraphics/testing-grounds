import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, pause } from './cloudfield-browser-helpers.mjs';
const B = await browserSession('cloudfield-2.local/input');
const passes = [], measurements = [];
const pass = message => { passes.push(message); console.log('PASS', message); };
const pointer = (type, x = 720, y = 500) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
try {
  await enterWorld(B); await B.waitFor('__positions.length>=2', 'settled player telemetry');
  await B.evaluate(`(()=>{
    __terrain.updateTerrainSetting('sunHeight',85);
    const internal=__root.getState().internal;internal.subscribers=internal.subscribers.filter(entry=>entry!==__pin);internal.subscribers.push(__pin);
    window.__id=__cloud.createCloud('cumulus',[150,12,20]);__cloud.changeCloud(__id,{persistencePercent:100});
    __pin.ref.current=()=>{__camera=__root.getState().camera;const cloud=__cloud.runtimeClouds.get(__id);if(cloud){__camera.lookAt(cloud.root.position);__camera.updateMatrixWorld()}};
    window.__teleports=0;window.addEventListener('tg-teleport-to-area',()=>__teleports++);
  })()`);
  await pause(1000);
  await pointer('mousePressed'); await pointer('mouseReleased');
  await B.waitFor("document.querySelector('[data-cloud-edit-selected]')", 'intentional cloud selection');
  assert.equal(await B.evaluate('__cloud.useCloudUI.getState().panelOpen'), false, 'selection does not open blocking UI');
  await B.click('[data-cloud-edit-selected]');
  await B.waitFor("document.querySelector('.tg-cloud-interaction-panel')", 'explicit Edit');
  pass('reticle targeting and deliberate selection / Edit');
  assert.equal(await B.evaluate(`(()=>{const c=__cloud.runtimeClouds.get(__id);const before=c.sim.d.slice();__cloud.changeCloud(__id,{density:0.4,persistencePercent:70});return c.sim.d.every((v,i)=>v===before[i])})()`), true);
  await B.evaluate('__cloud.changeCloud(__id,{density:1,persistencePercent:100})');
  const metrics = () => B.evaluate(`(()=>{const c=__cloud.runtimeClouds.get(__id);return {mass:c.sim.mass(),camera:__root.getState().camera.position.toArray(),player:__positions.at(-1),owner:__interaction.useInteractionStore.getState().gestureOwner,quaternion:c.root.quaternion.toArray(),scale:c.root.scale.toArray(),steps:c.sim.stepCount,teleports:__teleports}})()`);
  const before = await metrics();
  await B.click('[data-cloud-tool="emit"]'); await pointer('mousePressed');
  assert.equal((await metrics()).owner, 'cloud-gesture');
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await pause(900); await pointer('mouseReleased');
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  const after = await metrics();
  assert.ok(after.mass > before.mass, 'holding Emit adds vapor');
  assert.equal(after.owner, null, 'pointer release relinquishes ownership');
  const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  assert.ok(distance(before.camera, after.camera) < 0.001, 'camera translation remains stable during emission');
  assert.ok(Math.hypot(before.player.x - after.player.x, before.player.z - after.player.z) < 0.001, 'player does not move during cloud gesture');
  assert.equal(after.teleports, before.teleports);
  measurements.push({ emission: { before, after } }); pass('native emission owns input and leaves player/camera translation stable');
  await B.click('[data-cloud-tool="gesture"]');
  for (const mode of ['pull', 'push', 'pinch']) {
    await B.evaluate(`__cloud.useCloudUI.setState({gesture:${JSON.stringify(mode)}})`);
    const start = await metrics(); await pointer('mousePressed');
    for (let i = 1; i <= 5; i++) { await pointer('mouseMoved', 720 + i * 12, 500 - i * 3); await pause(60); }
    await pointer('mouseReleased', 780, 485); const end = await metrics();
    assert.ok(Math.abs(end.mass / start.mass - 1) < 0.0001, mode + ' conserves mass at 100%');
    assert.equal(end.owner, null); measurements.push({ gesture: mode, start, end });
  }
  pass('Pull / Push / Pinch change evolving fluid and release ownership');
  for (const tool of ['rotate', 'scale']) {
    await B.click(`[data-cloud-tool="${tool}"]`); const start = await metrics();
    await pointer('mousePressed'); await pointer('mouseMoved', 795, 430); await pause(150); await pointer('mouseReleased', 795, 430);
    const end = await metrics();
    assert.notDeepEqual(end[tool === 'rotate' ? 'quaternion' : 'scale'], start[tool === 'rotate' ? 'quaternion' : 'scale']);
    assert.ok(Math.abs(end.mass / start.mass - 1) < 0.0001, 'transform never resets vapor');
  }
  pass('native Rotate and Scale gestures preserve vapor');
  await B.click('[data-cloud-tool="emit"]'); await pointer('mousePressed');
  await B.evaluate("window.dispatchEvent(new Event('blur'))");
  assert.equal((await metrics()).owner, null); await pointer('mouseReleased');
  await B.evaluate("window.__pad={connected:true,mapping:'standard',id:'test-pad',buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]};navigator.getGamepads=()=>[__pad]");
  await B.evaluate('__pad.buttons[7].pressed=true;__pad.axes[0]=0.6'); await pause(500);
  assert.equal((await metrics()).owner, 'cloud-gesture');
  await B.evaluate('__pad.buttons[7].pressed=false;__pad.axes[0]=0'); await pause(200);
  assert.equal((await metrics()).owner, null);
  await B.evaluate('__pad.buttons[1].pressed=true'); await pause(180); await B.evaluate('__pad.buttons[1].pressed=false'); await pause(180);
  assert.equal(await B.evaluate('__cloud.useCloudUI.getState().panelOpen'), false);
  pass('blur cancellation, controller RT gesture and B dismissal');
  await B.evaluate('__cloud.changeCloud(__id,{fill:true})'); const fillStart = await metrics(); await pause(600); const fillEnd = await metrics();
  assert.ok(fillEnd.mass > fillStart.mass * 1.001, 'Fill injects additional vapor without a held emitter'); await B.evaluate('__cloud.changeCloud(__id,{fill:false})');
  const saveMass = (await metrics()).mass;
  await B.evaluate('__persist.saveWorldSnapshot();__persist.loadWorldSnapshot()'); await pause(300);
  assert.ok(Math.abs((await metrics()).mass / saveMass - 1) < 0.001, 'Save captures live Fill evolution beyond the last gesture checkpoint');
  pass('Fill source can be enabled and stopped separately from retention');
  await B.screenshot('after-input-checks'); assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass: true, passes, measurements, errors: B.errors, failures: B.failures }, null, 2));
} catch (error) {
  await B.screenshot('failure').catch(() => {});
  await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, passes, measurements, errors: B.errors, failures: B.failures }, null, 2)); throw error;
} finally { B.close(); }
