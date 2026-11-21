import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {browserSession,enterWorld,aimCamera,pause} from './cloudfield-browser-helpers.mjs';

const B=await browserSession('geology-patch09.local/performance');
const measurements=[];
const pointer=(type,x=720,y=500)=>B.cdp('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'?'none':'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
const key=async(key,code=key,vk=39)=>{
  await B.cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk});
  await B.cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});
};
const frameMeasure=async(action)=>{
  await B.evaluate('window.__sampleStart=performance.now()');
  await action();
  return B.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(performance.now()-__sampleStart))))');
};
try{
  await enterWorld(B);
  await B.evaluate(`(async()=>{
    window.__geo=await import('/src/systems/geology/geologyFeatures.js');
    window.__height=await import('/src/systems/terrain/terrainHeight.js');
    window.__canyon=await import('/src/systems/geology/canyonEdgeStore.js');
    const expand=await import('/src/systems/world/terrainExpansion.js');expand.addTerrainChunk({grid:'G4'});expand.addTerrainChunk({grid:'H4'});
    const visit=n=>{if(!n)return;const v=n.memoizedProps?.value;if(v?.rapier?.Ray&&v.world?.castRayAndGetNormal)window.__physics=v;visit(n.child);visit(n.sibling)};visit(__fiberRoot.fiber.current);
    __terrain.updateTerrainSetting('sunHeight',85);__guides.useWorldGuideStore.getState().setVisible(false);
    window.__id=__geo.createGeologyFeature('canyon-wall',{height:30,width:100,length:120,floorWidth:40},[300,0,50]);
    window.__original=structuredClone(__geo.geologyFeatures()[__id]);
    window.__regions=()=>{const result={};__scene.traverse(o=>{if(o.userData.tgTerrainRegion)result[o.userData.tgTerrainRegion]=o.geometry.uuid});return result};
    window.__ghost=()=>{let result;__scene.traverse(o=>{if(o.userData.tgGeologyGhost)result=o.children[0].geometry.uuid});return result};
    window.__arm=(eventType)=>{
      const regions=__regions();window.__profile=new Promise(resolve=>{
        window.addEventListener(eventType,()=>{
          const start=performance.now();let geometryMs=null,collisionMs=null,frames=0,firstFrameMs=null;
          const tick=()=>{
            frames++;const now=performance.now()-start;if(firstFrameMs===null)firstFrameMs=now;
            const current=__regions(),changed=Object.keys(current).filter(id=>current[id]!==regions[id]);
            if(changed.length&&geometryMs===null)geometryMs=now;
            const expected=__height.getCommittedTerrainHeightAt(300,75),ray=new __physics.rapier.Ray({x:300,y:expected+100,z:75},{x:0,y:-1,z:0}),hit=__physics.world.castRayAndGetNormal(ray,200,true,undefined,undefined,undefined,undefined,c=>c.shape.type===__physics.rapier.ShapeType.TriMesh);
            if(geometryMs!==null&&hit&&Math.abs(expected+100-hit.timeOfImpact-expected)<.03&&collisionMs===null)collisionMs=now;
            if(geometryMs!==null&&collisionMs!==null&&frames>=2)resolve({firstFrameMs,geometryMs,collisionMs,twoOrMoreFramesMs:now,changed,regions,current});
            else if(now>15000)resolve({timeout:true,geometryMs,collisionMs,changed});else requestAnimationFrame(tick);
          };requestAnimationFrame(tick);
        },{capture:true,once:true});
      });
    };
  })()`);
  await pause(400);
  const h4=await B.evaluate("Object.values(__world.useWorldStore.getState().world.chunks).find(c=>c.grid==='H4').id");
  for(const count of [1,6]){
    const existing=await B.evaluate("__scene.getObjectByName('Living Vapor').userData.livingVaporStats.count");
    for(let i=existing;i<count;i++)await B.evaluate(`__cloud.createCloud('cumulus',[${270+i*12},80,50])`);
    await B.waitFor(`__scene.getObjectByName('Living Vapor').userData.livingVaporStats.count===${count}`,'active cloud count');
    await B.evaluate('__geo.updateGeologyFeature(__id,{definition:__original.definition});__nav.exitToDefaultWorld();__nav.openObjectLibrary("edit")');
    await B.evaluate('document.querySelector(\'select[aria-label="Select world object"]\').focus()');await key('End','End',35);await B.click('[data-object-edit]');
    await B.evaluate("document.querySelector('[data-geology-property=height]').focus()");
    const sliders=[];
    for(let i=0;i<5;i++){
      await B.evaluate("__arm('keydown')");await key('ArrowRight');const sample=await B.evaluate('__profile');
      assert.ok(!sample.timeout,JSON.stringify(sample));assert.equal(sample.current[h4],sample.regions[h4]);assert.equal(sample.changed.length,2);sliders.push(sample);
    }
    await B.click('[data-object-editor-close]');await B.evaluate('__nav.exitToDefaultWorld()');
    await aimCamera(B,[100,100,160],[100,0,40]);await B.evaluate('__nav.openObjectLibrary("select")');await B.click('.tg-mesh-card[title="GIANT ROCK"]');await B.click('.tg-mesh-place-button');await pointer('mouseMoved');
    await B.waitFor('Boolean(__ghost())','placement ghost');const ghost=await B.evaluate('__ghost()'),regions=await B.evaluate('__regions()'),features=await B.evaluate('JSON.stringify(__geo.geologyFeatures())'),placement=[];
    for(let i=0;i<5;i++){
      placement.push(await frameMeasure(()=>pointer('mouseMoved',720+i*8,500)));
      assert.equal(await B.evaluate('__ghost()'),ghost);assert.deepEqual(await B.evaluate('__regions()'),regions);
    }
    await key('Escape','Escape',27);assert.equal(await B.evaluate('JSON.stringify(__geo.geologyFeatures())'),features);
    await B.evaluate('__nav.exitToDefaultWorld();__nav.activateWorldTool("CANYON_EDGE")');await aimCamera(B,[300,65,45],[300,16,71.2]);await B.click('[data-canyon-operation=deform]');
    await pointer('mousePressed');await B.waitFor('Boolean(__canyon.useCanyonEdgeStore.getState().selection)','selected bank');
    const dragging=[];let dragGhost=null;const beforeDrag=await B.evaluate('__regions()');
    for(let i=0;i<5;i++){
      dragging.push(await frameMeasure(()=>pointer('mouseMoved',720,535+i*14)));
      const current=await B.evaluate('__ghost()');if(dragGhost===null)dragGhost=current;assert.ok(current);assert.equal(current,dragGhost);assert.deepEqual(await B.evaluate('__regions()'),beforeDrag);
    }
    const proposal=await B.evaluate('__canyon.useCanyonEdgeStore.getState().proposal');assert.ok(proposal);
    await B.evaluate("__arm('pointerup')");await pointer('mouseReleased',720,591);const commit=await B.evaluate('__profile');assert.ok(!commit.timeout,JSON.stringify(commit));assert.equal(commit.current[h4],commit.regions[h4]);
    measurements.push({clouds:count,sliders,placementMoveToTwoFramesMs:placement,canyonDragToTwoFramesMs:dragging,commit,renderer:await B.evaluate("__scene.getObjectByName('Living Vapor').userData.livingVaporStats")});
    await B.screenshot('six-phase-profile-'+count+'-clouds');console.log('PASS profiled sliders, placement, drag, commit, colliders and affected chunks with '+count+' active clouds');
    await B.evaluate('__nav.exitToDefaultWorld()');
  }
  assert.deepEqual(B.errors,[]);assert.deepEqual(B.failures,[]);
  await fs.writeFile(path.join(B.artifact,'results.json'),JSON.stringify({pass:true,environment:'Native headless Chrome, 1440x1000 DPR 1; installed GPU backend; elapsed browser timing includes rendering and CDP scheduling; no matched baseline speedup claimed',measurements,errors:B.errors,failures:B.failures},null,2));
}catch(error){await B.screenshot('failure').catch(()=>{});await fs.writeFile(path.join(B.artifact,'failure.json'),JSON.stringify({error:error.stack,measurements,errors:B.errors,failures:B.failures},null,2));throw error}finally{B.close()}
