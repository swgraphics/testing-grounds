import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserSession, pause } from './cloudfield-browser-helpers.mjs';

const B = await browserSession(process.env.TG_MOVEMENT_ARTIFACT_ROOT || 'movement-regression.local/entry');
const url = process.env.TG_TEST_URL || 'http://127.0.0.1:5225/';
const passes = [], measurements = [];
const pass = message => { passes.push(message); console.log('PASS', message); };
const key = type => B.cdp('Input.dispatchKeyEvent', { type, key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
const position = () => B.evaluate('__entryPositions.at(-1)');
const travel = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

async function enter(action) {
  await B.cdp('Page.navigate', { url });
  await B.waitFor("document.querySelector('.tg-title-enter') && !document.querySelector('.tg-loading-overlay')", 'title', 480);
  await B.evaluate("window.__entryPositions=[];window.addEventListener('player-position-changed',e=>__entryPositions.push({...e.detail,time:performance.now()}))");
  await B.click(action);
  await B.waitFor("document.querySelector('.tg-compass-activate') && !document.querySelector('.tg-loading-overlay')", 'world', 480);
  await B.waitFor('__entryPositions.length>=15', 'player updates', 400);
  await pause(1000);
}

async function movement(world, control, start, stop, idle) {
  const before = await position();
  await start(); await pause(2500);
  const after = await position();
  const held = await B.evaluate("({focus:document.activeElement?.tagName,focusClass:document.activeElement?.className,tool:document.querySelector('.tg-interaction-state-tag')?.textContent,stick:document.querySelector('.tg-desktop-joystick .tg-joystick-top')?.style.transform,mobileStick:document.querySelector('.tg-mobile-controls .tg-joystick-top')?.style.transform,pad:window.__entryPad?.axes})");
  await stop(); await pause(350);
  const distance = travel(before, after);
  measurements.push({ world, control, before, after, distance, idle, held });
  assert.ok(distance > Math.max(.5, idle * 4), `${world} ${control}: ${distance.toFixed(3)} m, idle ${idle.toFixed(3)} m`);
  pass(`${world}: ${control} moves the player beyond idle drift`);
}

try {
  for (const world of ['default', 'blank']) {
    await enter(world === 'default' ? '.tg-title-enter' : '.tg-title-blank');
    const idleStart = await position(); await pause(1200);
    const idle = travel(idleStart, await position());
    await movement(world, 'keyboard immediately after entry', () => key('keyDown'), () => key('keyUp'), idle);
    await B.evaluate("window.__entryPad={connected:true,mapping:'standard',id:'entry-movement-test',buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]};navigator.getGamepads=()=>[__entryPad]");
    await pause(650);
    await movement(world, 'standard gamepad', () => B.evaluate('__entryPad.axes[1]=-1'), () => B.evaluate('__entryPad.axes[1]=0'), idle);
    // The project deliberately hides desktop joysticks for fine mouse pointers.
    // Exercise its visible mobile joystick with actual emulated touch input.
    await B.cdp('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true });
    await B.cdp('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:1 });
    await B.waitFor("document.querySelector('.tg-mobile-controls .tg-joystick')?.getBoundingClientRect().width>0", 'visible touch joystick');
    const joystick = await B.evaluate("(()=>{const r=document.querySelector('.tg-mobile-controls .tg-joystick').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:1}})()");
    await movement(world, 'on-screen touch joystick', async () => {
      await B.cdp('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[joystick] });
      await B.cdp('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{...joystick,y:joystick.y-40}] });
    }, () => B.cdp('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }), idle);
    await B.cdp('Emulation.setTouchEmulationEnabled', { enabled:false });
    await B.cdp('Emulation.setDeviceMetricsOverride', { width:1440, height:1000, deviceScaleFactor:1, mobile:false });
    await pause(400);
    await B.click('.tg-compass-activate');
    await B.evaluate("(()=>{const save=[...document.querySelectorAll('.tg-compass-footer button')].find(b=>b.textContent.trim()==='SAVE WORLD');if(!save)throw Error('Save control missing');save.dataset.entrySave='true'})()");
    await B.click('[data-entry-save]');
    await B.waitFor("localStorage.getItem('testingGroundsWorld')", 'disposable save');
    await enter('.tg-title-load');
    await movement(world, 'keyboard after saved-world load', () => key('keyDown'), () => key('keyUp'), idle);
    await B.screenshot(world);
  }
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass:true, url, passes, measurements, errors:B.errors, failures:B.failures, physicalController:'not tested' }, null, 2));
} catch (error) {
  await B.screenshot('failure').catch(() => {});
  await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error:error.stack, url, passes, measurements, body:await B.evaluate('document.body.innerText.slice(0,1500)').catch(() => null), errors:B.errors, failures:B.failures }, null, 2));
  throw error;
} finally { B.close(); }
