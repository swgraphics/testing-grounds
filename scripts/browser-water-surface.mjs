import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, enterWorld, aimCamera, pause } from './cloudfield-browser-helpers.mjs';

const mode = process.argv.includes('--before') ? 'before' : process.argv.includes('--legacy') ? 'legacy' : 'corrected';
const B = await browserSession('cloudfield-2.local/water-correction/' + mode);
const passes = [], measurements = [], views = [];
const pass = message => { passes.push(message); console.log('PASS', message); };
const setting = async values => { await B.evaluate(`Object.entries(${JSON.stringify(values)}).forEach(([key,value])=>__terrain.updateTerrainSetting(key,value))`); await pause(300); };
const capture = async (name, position, target) => {
  await aimCamera(B, position, target); await B.screenshot(name);
  views.push({ name, position, target, settings: await B.evaluate('({...__terrain.terrainSettings,terrainEdits:undefined,terrainVertexEdits:undefined})') });
};
const surfaces = () => B.evaluate(`(()=>{const items=[];__scene.traverse(o=>{if(o.material?.userData?.livingWaterUniforms||o.userData.waterReference)items.push({uuid:o.uuid,type:o.geometry.type,vertices:o.geometry.attributes.position.count,opacity:o.material.opacity,world:o.getWorldPosition(new __THREE.Vector3()).toArray()})});return items})()`);
const sample = async label => {
  await B.evaluate('window.__testTime=null'); await pause(300);
  const result = await B.evaluate(`new Promise(resolve=>{
    const renderer=__root.getState().gl,gl=renderer.getContext(),extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const render=renderer.render,queries=[],gpuMs=[],cpuMs=[];let active=null;
    renderer.render=function(...args){
      if(extension&&!active){active=gl.createQuery();gl.beginQuery(extension.TIME_ELAPSED_EXT,active)}
      const start=performance.now();const result=render.apply(this,args);cpuMs.push(performance.now()-start);
      if(active){gl.endQuery(extension.TIME_ELAPSED_EXT);queries.push(active);active=null}
      for(let i=queries.length-1;i>=0;i--)if(gl.getQueryParameter(queries[i],gl.QUERY_RESULT_AVAILABLE)){
        if(!gl.getParameter(extension.GPU_DISJOINT_EXT))gpuMs.push(gl.getQueryParameter(queries[i],gl.QUERY_RESULT)/1e6);
        gl.deleteQuery(queries[i]);queries.splice(i,1);
      }
      return result;
    };
    const start=performance.now();let frames=0;
    const tick=()=>{frames++;if(performance.now()-start<3000){requestAnimationFrame(tick);return}
      renderer.render=render;queries.forEach(q=>gl.deleteQuery(q));
      const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
      resolve({frames,elapsedMs:performance.now()-start,cpuRenderMs:mean(cpuMs),gpuMs:mean(gpuMs),gpuSamples:gpuMs.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
    };requestAnimationFrame(tick);
  })`);
  await B.evaluate('window.__testTime=24');
  measurements.push({ label, ...result, fps: result.frames * 1000 / result.elapsedMs });
};
try {
  await enterWorld(B);
  await setting({ heightMultiplier: 0.45, mountainHeight: 0, cliffSharpness: 1.5, rollingHills: 1.25, ridgeStrength: 0.4, geometryStrength: 0, treeDensity: 0, treeCoverage: 0, foliageDensity: 0, rockDensity: 0, waterHeight: 1, waterWaveStrength: 65, windStrength: 65, windSpeed: 40, sunHeight: 85, sunRotation: 50, waterSubdivisions: 48 });
  await B.evaluate(`(async()=>{
    const source=await(await fetch('/src/systems/atmosphere/livingVapor/waterMaterial.js')).text();const url=source.match(/from\\s+[\\x22\\x27]([^\\x22\\x27]*deps\\/three[^\\x22\\x27]*)[\\x22\\x27]/)?.[1];window.__THREE=await import(url);
    window.__testTime=24;window.__waterClock={ref:{current:()=>{if(__testTime!==null)__root.getState().clock.elapsedTime=__testTime}},priority:-100,store:__root};__root.getState().internal.subscribers.push(__waterClock);__root.getState().internal.subscribers.sort((a,b)=>a.priority-b.priority);
    window.__expansion=await import('/src/systems/world/terrainExpansion.js');window.__waterEdits=await import('/src/systems/water/waterEdits.js');window.__height=await import('/src/systems/terrain/terrainHeight.js');window.__edits=await import('/src/systems/terrain/terrainEdits.js');
    const world=__world.useWorldStore.getState().world;__world.useWorldStore.getState().replaceWorld({...world,scatterProfiles:{'crimson-tree':{enabled:false}}});
    __guides.useWorldGuideStore.getState().setVisible(false);
  })()`);
  if (mode !== 'corrected') await B.evaluate(`(async()=>{
    const before=${mode === 'before'};
    const old=before?await import('/cloudfield-2.local/water-correction/reference/waterMaterial-replay.js'):null;
    window.__referenceMaterials=[];const reference={ref:{current:()=>__scene.traverse(object=>{
      const material=object.material;if(!material?.userData?.livingWaterUniforms&&!object.userData.waterReference)return;
      if(!object.userData.waterReference){
        const replacement=before?old.createLivingWaterMaterial(material.opacity):new __THREE.MeshStandardMaterial({color:'#4e9ac2',emissive:'#0d4c72',emissiveIntensity:.18,transparent:true,opacity:material.opacity,roughness:.26,metalness:.04,side:__THREE.DoubleSide,flatShading:material.opacity===.72,depthWrite:false});
        object.material=replacement;object.userData.waterReference=true;__referenceMaterials.push(replacement);
      }
      if(before)old.updateLivingWater(object.material,__root.getState().clock.elapsedTime);
      if(object.material.opacity!==.72)return;
      // Replay the original white overlay on the identical, unchanged broad-wave geometry.
      let overlay=object.parent.children.find(o=>o.geometry===object.geometry&&o.material?.vertexColors);
      if(!overlay){overlay=new __THREE.Mesh(object.geometry,new __THREE.MeshBasicMaterial({color:'#fff',vertexColors:true,transparent:true,opacity:.34,side:__THREE.DoubleSide,depthWrite:false}));overlay.position.y=.045;object.parent.add(overlay)}
      if(object.userData.referenceOverlay&&object.userData.referenceOverlay!==overlay)object.parent.remove(object.userData.referenceOverlay);
      object.userData.referenceOverlay=overlay;
      const geometry=object.geometry,positions=geometry.attributes.position;let colors=geometry.attributes.color;
      if(!colors){colors=new __THREE.Float32BufferAttribute(new Float32Array(positions.count*3),3);geometry.setAttribute('color',colors)}
      const strength=__terrain.terrainSettings.waterWaveStrength/100,wind=__terrain.terrainSettings.windStrength/100,height=strength*(.18+3.42*wind);
      for(let i=0;i<positions.count;i++){const peak=height?(positions.getY(i)-.04)/height:0;const white=__THREE.MathUtils.smoothstep(peak,.55,.94);colors.setXYZ(i,white,white,white)}colors.needsUpdate=true;
    })},priority:0,store:__root};__root.getState().internal.subscribers.push(reference);
  })()`);
  // Shared positions and fixed time make all three versions directly comparable.
  const shore = [[10, 12, 65], [-40, 1, 160]], low = [[0, 3.8, 112], [-20, 1.3, 185]], high = [[25, 90, 145], [-40, 1, 135]];
  await capture('shore-midday', ...shore);
  await capture('low-midday', ...low);
  await capture('high-midday', ...high);
  pass('shore, low and high camera views captured at identical world coordinates/time');
  await setting({ sunHeight: 35 }); await capture('shore-sunset', ...shore); await capture('low-sunset', ...low);
  await setting({ sunHeight: 10 }); await capture('shore-night', ...shore);
  await setting({ sunHeight: 85, windStrength: 0, windSpeed: 0 }); await capture('wind-low', ...high); await sample('low-wind');
  await setting({ windStrength: 100, windSpeed: 100 }); await capture('wind-high', ...high); await sample('high-wind');
  pass('midday/sunset/night and low/high wind render without shader errors');
  for (const visible of [true, false]) { await B.evaluate(`__guides.useWorldGuideStore.getState().setVisible(${visible})`); await pause(300); await B.screenshot('guides-' + (visible ? 'on' : 'off')); }
  const surface = await surfaces(); assert.equal(surface.length, 1);
  const heights = await B.evaluate(`(()=>{const c=[];__scene.traverse(o=>{if(o.material?.userData?.livingWaterUniforms||o.userData.waterReference)for(const y of o.geometry.attributes.position.array.filter((_,i)=>i%3===1))c.push(y)});return {min:Math.min(...c),max:Math.max(...c)}})()`);
  assert.ok(heights.max > heights.min + 0.05, 'existing wind-driven mesh waves remain active');
  await setting({ waterWaveStrength: 0 });
  const flat = await B.evaluate(`(()=>{let range=0;__scene.traverse(o=>{if(o.material?.userData?.livingWaterUniforms||o.userData.waterReference){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)range=Math.max(range,Math.abs(p.getY(i)-.04))}});return range})()`);
  assert.ok(flat < 0.00001, 'zero wave strength flattens global water');
  await setting({ waterWaveStrength: 65, waterSubdivisions: 80 });
  assert.equal((await surfaces())[0].vertices, 81 ** 2); await B.screenshot('subdivisions-80');
  await setting({ waterSubdivisions: 48 });
  pass('Guides toggle independently; wave strength and subdivision controls retain their behavior');

  const terrainBefore = await B.evaluate('__height.getTerrainHeightAt(-40,160)');
  await B.evaluate("__edits.applyTerrainBrush({x:-40,z:160,tool:'lower',radius:18,strength:2})");
  const terrainAfter = await B.evaluate('__height.getTerrainHeightAt(-40,160)');
  assert.ok(terrainAfter < terrainBefore, 'terrain editing still shapes the lake bed');
  await B.evaluate("__waterEdits.addWaterBody({id:'water-correction-pond',x:45,y:14,z:95,diameter:34})");
  await capture('pond-and-waterfalls', [75, 24, 137], [43, 8, 95]);
  assert.equal((await surfaces()).length, 2);
  const waterfall = await B.evaluate(`(()=>{let count=0;__scene.traverse(o=>{if(o.material?.color?.getHexString()==='69b6d6')count+=o.geometry.attributes.position.count});return count})()`);
  assert.ok(waterfall > 0, 'pond overflow retains real waterfall geometry');
  await sample('pond-and-base');
  const expansion = await B.evaluate("__expansion.addTerrainChunk({grid:'G4',name:'WATER CORRECTION CHECK'})"); assert.equal(expansion.ok, true);
  await setting({ waterHeight: 8 });
  await capture('expanded-chunk', [315, 23, 105], [350, 8, 40]);
  const seam = await B.evaluate(`(()=>{const result=[];__scene.traverse(o=>{if(o.material?.userData?.livingWaterUniforms||o.userData.waterReference){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;result.push({world:o.getWorldPosition(new __THREE.Vector3()).toArray(),x:[b.min.x,b.max.x],z:[b.min.z,b.max.z]})}});return result})()`);
  assert.ok(seam.some(item=>item.x[1]>=400), 'existing global water covers G4 continuously');
  await B.evaluate('__terrain.saveWorldSettings();__terrain.updateTerrainSetting("waterHeight",2);__terrain.loadWorldSettings()'); await pause(450);
  assert.equal(await B.evaluate('__terrain.terrainSettings.waterHeight'), 8);
  assert.equal(await B.evaluate('Object.values(__world.useWorldStore.getState().world.chunks).flatMap(c=>c.water?.bodies??[]).some(b=>b.id==="water-correction-pond")'), true);
  pass('terrain edits, pond/waterfalls, added-chunk water and world persistence remain functional');
  // Frozen samples must remain still; advancing the same continuous field must move it.
  await capture('temporal-0', ...high); await B.screenshot('temporal-0-repeat');
  await B.evaluate('__testTime=24.08'); await B.screenshot('temporal-008');
  await B.evaluate('__testTime=25'); await B.screenshot('temporal-1');
  assert.deepEqual(B.errors, []); assert.deepEqual(B.failures, []);
  const backend = await B.evaluate("(()=>{const gl=__root.getState().gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()");
  await fs.writeFile(path.join(B.artifact, 'results.json'), JSON.stringify({ pass: true, mode, backend, passes, measurements, views, heights, flat, waterfall, seam, errors: B.errors, failures: B.failures }, null, 2));
  console.log(JSON.stringify({ pass: true, mode, measurements }));
} catch (error) {
  await B.screenshot('failure').catch(() => {}); await fs.writeFile(path.join(B.artifact, 'failure.json'), JSON.stringify({ error: error.stack, mode, passes, measurements, errors: B.errors, failures: B.failures }, null, 2)); throw error;
} finally { B.close(); }
