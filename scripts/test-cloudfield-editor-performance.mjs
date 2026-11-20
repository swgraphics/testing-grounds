import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as THREE from 'three';

const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-cloud-editor-tests', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' });
globalThis.window = new EventTarget();
globalThis.document = { activeElement: { blur() {} }, querySelector: () => null };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
try {
  const { useWorldStore } = await server.ssrLoadModule('/src/systems/world/worldStore.js');
  const terrain = await server.ssrLoadModule('/src/systems/terrain/terrainSettings.js');
  const { terrainHeightKey, terrainHeightChanged, terrainGridSampler } = await server.ssrLoadModule('/src/systems/terrain/terrainRenderState.js');
  const { TERRAIN_SHAPE_KEYS } = await server.ssrLoadModule('/src/systems/world/terrainRegions.js');
  useWorldStore.getState().initializeBlankWorld(); terrain.initializeBlankCanvasTerrain();
  const key = () => terrainHeightKey(useWorldStore.getState().world);
  let baseline = key();
  for (const name of ['sunHeight', 'sunRotation', 'waterHeight', 'windStrength', 'cloudAmount']) { terrain.updateTerrainSetting(name, 42); assert.equal(key(), baseline, name + ' does not invalidate sampled terrain'); assert.equal(terrainHeightChanged({ detail: { key: name } }), false); }
  for (const name of [...TERRAIN_SHAPE_KEYS, 'terrainEditVersion', 'terrainPreviewVersion', 'terrainVertexEditVersion']) {
    terrain.updateTerrainSetting(name, Number(terrain.terrainSettings[name]) + 1);
    assert.notEqual(key(), baseline, name + ' invalidates sampled terrain'); baseline = key();
    assert.equal(terrainHeightChanged({ detail: { key: name } }), true);
  }
  console.log('PASS terrain cache invalidation tracks shape/sculpt/preview/vertex versions and ignores sun/cloud/water metadata');
  for (const [segments, size, originX, originZ] of [[120, 600, 0, 0], [20, 100, 350, 50], [20, 100, -350, -50]]) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments); geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setY(i, Math.sin((positions.getX(i) + originX) * 0.1) * 8 + Math.cos((positions.getZ(i) + originZ) * 0.03) * 4);
    const heightAt = terrainGridSampler(geometry, segments, originX, originZ);
    for (let i = 0; i < positions.count; i++) assert.equal(heightAt(positions.getX(i) + originX, positions.getZ(i) + originZ), positions.getY(i), 'guides exactly reuse every base/extension grid sample including boundaries');
    geometry.dispose();
  }
  console.log('PASS all base and positive/negative extension guide coordinates reuse their exact mesh heights');
  const { CloudObject } = await server.ssrLoadModule('/src/systems/atmosphere/livingVapor/cloudObject.js');
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 12, 30);
  const cloud = new CloudObject({ id: 'profile-cloud', position: [0, 12, 0] });
  const update = () => cloud.updateVisuals({ camera, sunWorld: new THREE.Vector3(0, 1, 0), sunColor: new THREE.Color('#fff'), skyColor: new THREE.Color('#bbccee'), groundColor: new THREE.Color('#556677'), guides: true, time: 1, selected: true });
  update(); assert.equal(cloud.volume.visible, false); assert.equal(cloud.cage.visible, true);
  cloud.sim.emit(0, 0, 0, 0.4, 0.8, 1 / 24); update(); assert.equal(cloud.volume.visible, true);
  const textureVersion = cloud.texture.version, texture = cloud.texture, material = cloud.volumeMaterial;
  cloud.root.rotation.y = Math.PI / 2; cloud.root.scale.set(10, 8, 6); update(); update();
  assert.equal(cloud.texture.version, textureVersion, 'unchanged density does not trigger another upload');
  assert.equal(cloud.texture, texture); assert.equal(cloud.volumeMaterial, material);
  cloud.sim.clear(); update(); assert.equal(cloud.volume.visible, false); assert.equal(cloud.cage.visible, true);
  cloud.dispose();
  console.log('PASS empty volumes keep selectable cages, resume on emission and reuse texture/material resources across transforms');
} finally { await server.close(); }
