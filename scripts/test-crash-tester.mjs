import fs from "node:fs";
import assert from "node:assert/strict";
import * as THREE from "three";
import { characterRegistry, activeCharacterId } from "../src/components/character/characterRegistry.js";
import { buildCharacterClips } from "../src/components/character/characterAnimations.js";

function readAsset(path) {
  const bytes = fs.readFileSync(path);
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const size = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.toString("utf8", 20, 20 + size)), bin: bytes.subarray(28 + size), bytes: bytes.length };
}
function accessor(asset, index) {
  const { json: j, bin } = asset, a = j.accessors[index], view = j.bufferViews[a.bufferView];
  assert.equal(a.sparse, undefined);
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  assert.ok(components && size);
  const result = [];
  for (let i = 0; i < a.count; i++) for (let k = 0; k < components; k++) {
    const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (view.byteStride ?? components * size) + k * size;
    let value = a.componentType === 5126 ? bin.readFloatLE(offset) : a.componentType === 5125 ? bin.readUInt32LE(offset) : a.componentType === 5123 ? bin.readUInt16LE(offset) : bin[offset];
    if (a.normalized) value /= a.componentType === 5121 ? 255 : 65535;
    result.push(value);
  }
  return result;
}
function rig(asset) {
  const j = asset.json;
  const nodes = j.nodes.map(n => {
    const node = new THREE.Object3D(); node.name = n.name;
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(node.position, node.quaternion, node.scale);
    else { node.position.fromArray(n.translation ?? [0, 0, 0]); node.quaternion.fromArray(n.rotation ?? [0, 0, 0, 1]); node.scale.fromArray(n.scale ?? [1, 1, 1]); }
    return node;
  });
  j.nodes.forEach((n, i) => n.children?.forEach(child => nodes[i].add(nodes[child])));
  j.scenes[j.scene ?? 0].nodes.forEach(i => nodes[i].updateMatrixWorld(true));
  return new Map(j.skins[0].joints.map(i => [nodes[i].name, nodes[i]]));
}
assert.equal(activeCharacterId, "crashTester20");
assert.equal(characterRegistry.crashTester20.scale, 1.5);
assert.equal(characterRegistry.crashTester20.height, -.8);
const old = readAsset("public/models/characters/crash-testers/Crash_Unit_01.glb");
const current = readAsset("public" + characterRegistry.crashTester20.modelPath);
const oldRig = rig(old), newRig = rig(current);
assert.equal(newRig.size, 66);
assert.deepEqual([...newRig.keys()].sort(), [...oldRig.keys()].sort());
let restError = 0;
for (const [name, node] of newRig) {
  const previous = oldRig.get(name);
  assert.equal(node.parent?.name, previous.parent?.name, name + " parent");
  node.matrixWorld.elements.forEach((v, i) => { restError = Math.max(restError, Math.abs(v - previous.matrixWorld.elements[i])); });
}
assert.ok(restError < .00001, "same rest-pose hierarchy/transforms");
const j = current.json, inverse = accessor(current, j.skins[0].inverseBindMatrices);
for (let i = 0; i < j.skins[0].joints.length; i++) {
  const bone = newRig.get(j.nodes[j.skins[0].joints[i]].name);
  const bind = bone.matrixWorld.clone().multiply(new THREE.Matrix4().fromArray(inverse, i * 16));
  bind.elements.forEach((v, k) => assert.ok(Math.abs(v - (k % 5 === 0 ? 1 : 0)) < .00001));
}
let triangles = 0, vertices = 0;
for (const mesh of j.meshes) for (const p of mesh.primitives) {
  assert.equal(p.mode ?? 4, 4);
  const weights = accessor(current, p.attributes.WEIGHTS_0), joints = accessor(current, p.attributes.JOINTS_0);
  vertices += j.accessors[p.attributes.POSITION].count;
  triangles += j.accessors[p.indices].count / 3;
  for (let v = 0; v < weights.length; v += 4) {
    const sum = weights.slice(v, v + 4).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < .00001);
    for (let k = 0; k < 4; k++) { assert.ok(Number.isFinite(weights[v + k]) && weights[v + k] >= 0); assert.ok(joints[v + k] < newRig.size); }
  }
}
assert.equal(j.materials.length, 1);
assert.equal(j.images.length, 3);
for (const image of j.images) {
  assert.equal(image.mimeType, "image/png");
  const view = j.bufferViews[image.bufferView], offset = view.byteOffset;
  assert.equal(current.bin.toString("ascii", offset + 1, offset + 4), "PNG");
  assert.equal(current.bin.readUInt32BE(offset + 16), 2048);
  assert.equal(current.bin.readUInt32BE(offset + 20), 2048);
}
const ual1 = readAsset("public/assets/crash-testers/animations/Universal Animation Library/UAL1_Standard.glb");
const ual2 = readAsset("public/assets/crash-testers/animations/Universal Animation Library 2/UAL2_Standard.glb");
const clips = asset => asset.json.animations.map(a => new THREE.AnimationClip(a.name, 1, []));
const modelClips = clips(current);
const assembled = buildCharacterClips(characterRegistry.crashTester20, modelClips, clips(ual1), clips(ual2));
assert.equal(assembled.find(c=>c.name==="jump").tracks,modelClips.find(c=>c.name==="Jump_Loop").tracks);
assert.equal(assembled.find(c=>c.name==="runJump").tracks,modelClips.find(c=>c.name==="Jump_Loop").tracks);
const names = assembled.map(a => a.name);
assert.equal(new Set(names).size, names.length);
assert.ok(!names.some(n => /\.\d+$/.test(n) || n.startsWith("A_TPose")));
for (const [alias, original] of Object.entries(characterRegistry.crashTester20.animationMap)) {
  assert.ok(names.includes(alias), alias + " gameplay alias"); assert.ok(names.includes(original), original + " library name");
}
assert.ok(names.includes("runJump") && names.includes("jump"));
for (const source of [current, ual1, ual2]) for (const animation of source.json.animations) {
  for (const channel of animation.channels) assert.ok(newRig.has(source.json.nodes[channel.target.node].name), "animation target exists");
}
for (const id of ["crashTester01", "crashTester02", "crashTester03", "crashTester04", "crashTester05"]) assert.equal(characterRegistry[id].modelPath, "/models/characters/crash-testers/Crash_Unit_01.glb");
console.log("PASS Crash Tester 2: skeleton/rest pose/bind matrices, normalized weights, 2K textures, original fallbacks, canonical and gameplay clips", { vertices, triangles, restError, fileBytes: current.bytes, originalBytes: old.bytes, actions: names.length });
