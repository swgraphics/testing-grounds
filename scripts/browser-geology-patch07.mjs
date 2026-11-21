import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {browserSession,enterWorld,aimCamera,pause} from './cloudfield-browser-helpers.mjs';
const B=await browserSession(process.env.TG_GEOLOGY_ARTIFACT??'geology-patch07.local/browser');const passes=[];
const pass=s=>{passes.push(s);console.log('PASS '+s)};
const key=async(name,code=name,vk=39)=>{await B.cdp('Input.dispatchKeyEvent',{type:'keyDown',key:name,code,windowsVirtualKeyCode:vk});await B.cdp('Input.dispatchKeyEvent',{type:'keyUp',key:name,code,windowsVirtualKeyCode:vk})};
const pointer=(type,x=720,y=500)=>B.cdp('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'?'none':'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
try{
 await enterWorld(B);await aimCamera(B,[100,100,185],[100,0,50]);
 await B.evaluate("(async()=>{window.__geo=await import('/src/systems/geology/geologyFeatures.js');window.__height=await import('/src/systems/terrain/terrainHeight.js');window.__hist=await import('/src/systems/history/historyStore.js');window.__editor=await import('/src/systems/editor/editorStore.js');__terrain.updateTerrainSetting('sunHeight',85)})()");
 await B.evaluate("__nav.openObjectLibrary('select')");await B.click('.tg-mesh-card[title="GIANT ROCK"]');await B.click('[data-object-edit]');
 await B.waitFor("document.querySelector('[data-geology-editor]')",'geology editor');
 for(const property of ['height','width','seed','edgeDeformation','scale','rotation'])assert.equal(await B.evaluate(`Boolean(document.querySelector('[data-geology-property="${property}"]'))`),true);
 await B.evaluate("document.querySelector('[data-geology-property=scale]').focus()");for(let i=0;i<10;i++)await key('ArrowRight');
 await B.evaluate("document.querySelector('[data-geology-property=height]').focus()");for(let i=0;i<4;i++)await key('ArrowRight');
 await B.screenshot('giant-rock-editor');await B.click('[data-geology-apply]');await B.waitFor("!document.querySelector('[data-geology-editor]')",'template applied');
 const before=await B.evaluate("({edits:JSON.stringify(__terrain.terrainSettings.terrainEdits),preview:__terrain.terrainSettings.terrainPreviewVersion,history:__hist.useHistoryStore.getState().undoStack.length,geometry:(()=>{let found;__scene.traverse(o=>{if(o.userData.tgTerrainRegion==='base-terrain')found=o.geometry.uuid});return found})()})");
 await B.click('.tg-mesh-place-button');await pointer('mouseMoved');await B.waitFor("(()=>{let yes=false;__scene.traverse(o=>{if(o.userData.tgGeologyGhost)yes=true});return yes})()",'terrain-independent geology ghost');
 const preview=await B.evaluate("(()=>{let g;__scene.traverse(o=>{if(o.userData.tgGeologyGhost)g=o});return {definition:g.userData.definition,geometry:g.children[0].geometry.uuid}})()");
 assert.ok(Math.abs(preview.definition.scale-1.5)<1e-10);assert.equal(preview.definition.height,22);
 for(let i=0;i<4;i++){await pointer('mouseMoved',720+i*10,500);await pause(60);assert.equal(await B.evaluate("(()=>{let id;__scene.traverse(o=>{if(o.userData.tgGeologyGhost)id=o.children[0].geometry.uuid});return id})()"),preview.geometry)}
 assert.equal(await B.evaluate("JSON.stringify(__terrain.terrainSettings.terrainEdits)"),before.edits);assert.equal(await B.evaluate('__terrain.terrainSettings.terrainPreviewVersion'),before.preview);assert.equal(await B.evaluate('Object.keys(__geo.geologyFeatures()).length'),0);
 assert.equal(await B.evaluate("(()=>{let id;__scene.traverse(o=>{if(o.userData.tgTerrainRegion==='base-terrain')id=o.geometry.uuid});return id})()"),before.geometry);
 await B.screenshot('giant-rock-placement-ghost');await key('Escape','Escape',27);await B.waitFor("document.querySelector('.tg-mesh-library')",'placement back to Library');assert.equal(await B.evaluate('__hist.useHistoryStore.getState().undoStack.length'),before.history);
 pass('Six real geology controls; authored Scale/Height reach a reusable non-destructive placement ghost; Escape leaves no stamp/history');
 await B.click('.tg-mesh-place-button');await pointer('mouseMoved');await B.waitFor("(()=>{let yes=false;__scene.traverse(o=>{if(o.userData.tgGeologyGhost)yes=true});return yes})()",'ready placement ghost');await B.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await pause(250);await pointer('mousePressed');await pointer('mouseReleased');
 await B.waitFor('Object.keys(__geo.geologyFeatures()).length===1','persistent formation placement');
 const record=await B.evaluate('Object.values(__geo.geologyFeatures())[0]');assert.equal(record.definition.height,22);assert.ok(Math.abs(record.definition.scale-1.5)<1e-10);assert.equal(await B.evaluate('JSON.stringify(__terrain.terrainSettings.terrainEdits)'),before.edits);
 await pause(350);await B.screenshot('giant-rock-placed');await key('Escape','Escape',27);
 pass('Confirmation creates one feature using the exact preview parameters, without adding manual edit deltas');
 await B.evaluate("__nav.openObjectLibrary('edit')");await B.evaluate("document.querySelector('select[aria-label=\"Select world object\"]').focus()");await key('End','End',35);await B.waitFor(`document.querySelector('select[aria-label="Select world object"]').value===${JSON.stringify(record.id)}`,'placed formation selected');await B.click('[data-object-edit]');
 await B.waitFor("document.querySelector('[data-geology-editor][data-world-object-editor]')",'live geology editor');
 const undoBefore=await B.evaluate('__hist.useHistoryStore.getState().undoStack.length');
 await B.evaluate("document.querySelector('[data-geology-property=height]').focus()");for(let i=0;i<5;i++)await key('ArrowRight');await B.click('[data-object-editor-close]');
 assert.equal(await B.evaluate(`__geo.geologyFeatures()[${JSON.stringify(record.id)}].definition.height`),27);assert.equal(await B.evaluate('__hist.useHistoryStore.getState().undoStack.length'),undoBefore+1);
 await B.evaluate('__hist.useHistoryStore.getState().undo()');assert.equal(await B.evaluate(`__geo.geologyFeatures()[${JSON.stringify(record.id)}].definition.height`),22);await B.evaluate('__hist.useHistoryStore.getState().redo()');
 const samples=await B.evaluate(`(()=>{const r=__geo.geologyFeatures()[${JSON.stringify(record.id)}];return Array.from({length:25},(_,i)=>{const x=r.position[0]+(i%5-2)*4,z=r.position[2]+(Math.floor(i/5)-2)*4;return {x,z,y:__height.getCommittedTerrainHeightAt(x,z)}})})()`);
 await B.evaluate('__persist.saveWorldSnapshot();__persist.loadWorldSnapshot()');await pause(300);
 for(const p of samples)assert.ok(Math.abs(await B.evaluate(`__height.getCommittedTerrainHeightAt(${p.x},${p.z})`)-p.y)<1e-9);
 pass('Placed feature editor changes real world data; one gesture/Undo/Redo and World Save/Load retain identical terrain');
 for(const [type,title,x] of [['cliff-face','CLIFF FACE',-100],['canyon-wall','CANYON WALL',0]]){
  await B.evaluate('__nav.exitToDefaultWorld()');await aimCamera(B,[x,100,185],[x,0,50]);await B.evaluate("__nav.openObjectLibrary('select')");await B.click(`.tg-mesh-card[title="${title}"]`);await B.click('[data-object-edit]');
  await B.waitFor("document.querySelector('[data-geology-editor]')",type+' editor');
  await B.evaluate("document.querySelector('[data-geology-property=scale]').focus()");for(let n=0;n<5;n++)await key('ArrowRight');
  if(type==='canyon-wall'){assert.equal(await B.evaluate("Boolean(document.querySelector('[data-geology-property=floorWidth]'))"),true);await B.screenshot('canyon-object-editor')}
  await B.click('[data-geology-apply]');await B.click('.tg-mesh-place-button');await pointer('mouseMoved');await pause(150);
  const ghost=await B.evaluate("(()=>{let r;__scene.traverse(o=>{if(o.userData.tgGeologyGhost)r=o.userData.feature});return r})()");assert.equal(ghost.geologyType,type);assert.ok(Math.abs(ghost.definition.scale-1.25)<1e-9);
  const count=await B.evaluate('Object.keys(__geo.geologyFeatures()).length');await pointer('mousePressed');await pointer('mouseReleased');await B.waitFor(`Object.keys(__geo.geologyFeatures()).length===${count+1}`,type+' placement');
  const placed=await B.evaluate(`Object.values(__geo.geologyFeatures()).find(r=>r.geologyType===${JSON.stringify(type)})`);assert.deepEqual(placed.definition,ghost.definition);assert.equal(await B.evaluate('JSON.stringify(__terrain.terrainSettings.terrainEdits)'),before.edits);await B.screenshot(type+'-native-placement');
 }
 pass('Native Cliff Face and two-bank Canyon Wall Library/edit/ghost/placement preserve real authored Scale and all procedural parameters');
 assert.deepEqual(B.errors,[]);assert.deepEqual(B.failures,[]);await fs.writeFile(path.join(B.artifact,'results.json'),JSON.stringify({pass:true,passes,record,errors:B.errors,failures:B.failures},null,2));
}catch(error){await B.screenshot('failure').catch(()=>{});await fs.writeFile(path.join(B.artifact,'failure.json'),JSON.stringify({error:error.stack,passes,state:await B.evaluate('({interaction:__interaction.useInteractionStore.getState(),features:__geo.geologyFeatures(),history:__hist.useHistoryStore.getState().transaction})').catch(()=>null),errors:B.errors,failures:B.failures},null,2));throw error}finally{B.close()}
