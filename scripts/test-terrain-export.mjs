import assert from "node:assert/strict";
import { createServer } from "vite";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

// Use Vite's module resolver for the app's existing extensionless imports.
const server = await createServer({ configFile: false, cacheDir: "node_modules/.vite-tg-tests", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: "custom" });
try {
  const api = await server.ssrLoadModule("/src/systems/terrain/terrainExport.js");
  const { terrainSettings } = await server.ssrLoadModule("/src/systems/terrain/terrainSettings.js");
  const { useWorldStore } = await server.ssrLoadModule("/src/systems/world/worldStore.js");
  const heights = await server.ssrLoadModule("/src/systems/terrain/terrainHeight.js");
  const options = { ...api.DEFAULT_EXPORT_OPTIONS, minX: -100, maxX: 200, minZ: -50, maxZ: 50, segmentsX: 3, segmentsZ: 2 };
  const close = (actual, expected, epsilon = 1e-5) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
  for (const invalid of [
    { maxX: -100 }, { minZ: 50 }, { minX: NaN }, { maxZ: Infinity },
    { segmentsX: 0 }, { segmentsZ: 513 }, { segmentsX: 1.5 }, { origin: "wrong" }, { maxX: 100001 },
  ]) assert.throws(() => api.validateTerrainExport({ ...options, ...invalid }));
  assert.deepEqual(api.validateTerrainExport(options), { width: 300, depth: 100, vertices: 12, triangles: 12 });
  assert.equal(api.terrainExportFilename('../a bad:name.glb'), 'a-bad-name.glb');
  assert.equal(api.terrainExportFilename('???'), 'terrain-region.glb');
  console.log("PASS bounds, non-square dimensions, resolution limits, filename sanitization");

  const calls = [];
  const flat = api.createTerrainExportGeometry(options, (x, z) => { calls.push([x, z]); return 7; });
  const p = flat.attributes.position, uv = flat.attributes.uv, n = flat.attributes.normal;
  assert.equal(p.count, 12); assert.equal(flat.index.count, 36);
  assert.deepEqual(calls[0], [-100, -50]); assert.deepEqual(calls.at(-1), [200, 50]);
  for (let i = 0; i < p.count; i++) { close(n.getY(i), 1); close(n.getX(i), 0); close(n.getZ(i), 0); }
  for (let i = 0; i < flat.index.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, flat.index.getX(i));
    const b = new THREE.Vector3().fromBufferAttribute(p, flat.index.getX(i + 1));
    const c = new THREE.Vector3().fromBufferAttribute(p, flat.index.getX(i + 2));
    assert.ok(b.sub(a).cross(c.sub(a)).y > 0);
  }
  close(uv.getX(0), 0); close(uv.getY(0), 0); close(uv.getX(11), 1); close(uv.getY(11), 1);
  for (let iz = 0; iz <= 2; iz++) for (let ix = 0; ix <= 3; ix++) {
    const i = iz * 4 + ix;
    close(p.getX(i), -100 + ix * 100); close(p.getZ(i), -50 + iz * 50);
  }
  assert.throws(() => api.createTerrainExportGeometry(options, () => NaN));
  const centered = api.createTerrainExportGeometry({ ...options, origin: 'centered' }, () => 7);
  close(centered.boundingBox.min.x, -150); close(centered.boundingBox.max.x, 150);
  close(centered.boundingBox.min.z, -50); close(centered.boundingBox.max.z, 50);
  close(centered.attributes.position.getY(0), 7);
  flat.dispose(); centered.dispose();
  console.log("PASS endpoint sampling, counts, every triangle +Y winding, normals, UVs, world/centered origin and continuous chunk-crossing grid");

  const oldSettings = { ...terrainSettings }, oldWorld = useWorldStore.getState().world;
  try {
    Object.assign(terrainSettings, { rollingHills: 0, mountainHeight: 0, ridgeStrength: 0, terrainEdits: { '0,0': 3 }, terrainVertexEdits: {}, terrainPreviewStamp: { x: 0, z: 0, width: 36, depth: 10, height: 12 } });
    useWorldStore.setState({ world: { ...oldWorld, worldType: 'blank', terrainVertexEdits: { '0,0': 5 } } });
    close(heights.getCommittedTerrainHeightAt(0, 0), 8);
    assert.ok(heights.getTerrainHeightAt(0, 0) > 8);
    const before = JSON.stringify({ world: useWorldStore.getState().world, settings: terrainSettings });
    const worldIdentity = useWorldStore.getState().world;
    const fixture = { ...options, minX: 0, maxX: 100, minZ: 0, maxZ: 20, segmentsX: 20, segmentsZ: 4 };
    const edited = api.createTerrainExportGeometry(fixture);
    close(edited.attributes.position.getY(0), 8);
    for (let i = 0; i < edited.attributes.position.count; i++) {
      const pos = edited.attributes.position;
      close(pos.getY(i), heights.getCommittedTerrainHeightAt(pos.getX(i), pos.getZ(i)));
    }
    edited.dispose();
    console.log("PASS committed sculpt + vertex edits, geology preview exclusion, all sampled heights match committed sampler");

    // GLTFExporter needs browser FileReader. This shim only supplies Blob reading;
    // geometry, exporter and loader are the actual installed Three.js modules.
    globalThis.FileReader = class {
      readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
      readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
    };
    let disposedGeometry = 0, disposedMaterial = 0;
    const disposeGeometry = THREE.BufferGeometry.prototype.dispose;
    const disposeMaterial = THREE.Material.prototype.dispose;
    THREE.BufferGeometry.prototype.dispose = function () { disposedGeometry++; return disposeGeometry.call(this); };
    THREE.Material.prototype.dispose = function () { disposedMaterial++; return disposeMaterial.call(this); };
    let buffer;
    try {
      buffer = await api.exportTerrainGLB(fixture);
      assert.equal(disposedGeometry, 1); assert.equal(disposedMaterial, 1);
      const successfulReader = globalThis.FileReader;
      globalThis.FileReader = class { readAsArrayBuffer() { throw new Error('Simulated read failure'); } };
      await assert.rejects(api.exportTerrainGLB(fixture), /Simulated read failure/);
      assert.equal(disposedGeometry, 2); assert.equal(disposedMaterial, 2);
      globalThis.FileReader = successfulReader;
    } finally {
      THREE.BufferGeometry.prototype.dispose = disposeGeometry;
      THREE.Material.prototype.dispose = disposeMaterial;
    }
    const view = new DataView(buffer);
    assert.equal(view.getUint32(0, true), 0x46546c67); assert.equal(view.getUint32(4, true), 2); assert.equal(view.getUint32(8, true), buffer.byteLength);
    const jsonSize = view.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonSize)));
    assert.equal(json.meshes.length, 1); assert.equal(json.materials.length, 1);
    assert.equal(json.materials[0].pbrMetallicRoughness.metallicFactor, 0);
    assert.equal(json.textures, undefined);
    const loaded = await new GLTFLoader().parseAsync(buffer, '');
    const meshes = []; loaded.scene.traverse(object => { if (object.isMesh) meshes.push(object); });
    assert.equal(meshes.length, 1);
    const mesh = meshes[0];
    assert.equal(mesh.geometry.attributes.position.count, 105);
    close(mesh.geometry.attributes.position.getY(0), 8);
    assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
    assert.deepEqual(mesh.rotation.toArray().slice(0, 3), [0, 0, 0]);
    mesh.geometry.dispose(); mesh.material.dispose();
    assert.equal(JSON.stringify({ world: useWorldStore.getState().world, settings: terrainSettings }), before);
    assert.equal(useWorldStore.getState().world, worldIdentity);
    console.log(`PASS real binary GLB (${buffer.byteLength} bytes), GLTFLoader round-trip, PBR material, surface only, no rotation/scaling, resource cleanup on success/failure, world/settings unchanged`);

    const savedDocument = globalThis.document, savedURL = globalThis.URL, savedTimeout = globalThis.setTimeout;
    let clicked = false, removed = false, revoked = false, scheduled;
    const anchor = { click() { clicked = true; }, remove() { removed = true; } };
    try {
      globalThis.document = { createElement: () => anchor, body: { appendChild() {} } };
      globalThis.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: value => { assert.equal(value, 'blob:test'); revoked = true; } };
      globalThis.setTimeout = callback => { scheduled = callback; };
      api.downloadTerrainGLB(buffer, 'test terrain');
      assert.ok(clicked && removed); assert.equal(anchor.download, 'test-terrain.glb');
      assert.equal(revoked, false); scheduled(); assert.ok(revoked);
      anchor.click = () => { throw new Error('Download failure'); };
      removed = false;
      assert.throws(() => api.downloadTerrainGLB(buffer, 'test'), /Download failure/);
      assert.ok(removed); scheduled();
    } finally { globalThis.document = savedDocument; globalThis.URL = savedURL; globalThis.setTimeout = savedTimeout; }
    console.log("PASS download initiation and delayed object URL/anchor cleanup, including download failures (DOM mock; browser NOT tested)");
  } finally {
    Object.assign(terrainSettings, oldSettings);
    useWorldStore.setState({ world: oldWorld });
    delete globalThis.FileReader;
  }
} finally { await server.close(); }
