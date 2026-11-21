import * as THREE from 'three';
import { FluidVolume, CLOUD_FAMILIES, SIM_GRID, SIM_STEP as STEP } from './fluidVolume.js';
import { VOLUME_VERTEX, VOLUME_FRAGMENT, CAGE_VERTEX, CAGE_FRAGMENT } from './volumeShader.js';
import { buildCagePositions } from './cageGeometry.js';

export const GRID = SIM_GRID; // simulation resolution per cloud
export const SIM_STEP = STEP; // fixed simulation step

let sharedBox = null;
let sharedCage = null;
let instances = 0;
function boxGeometry() {
  if (!sharedBox) sharedBox = new THREE.BoxGeometry(2, 2, 2);
  return sharedBox;
}
function cageGeometry() {
  if (!sharedCage) {
    sharedCage = new THREE.BufferGeometry();
    sharedCage.setAttribute('position', new THREE.BufferAttribute(buildCagePositions(), 3));
  }
  return sharedCage;
}

// One cloud in the world: its fluid simulation, the 3D texture the GPU reads, the volume
// mesh, and the cage lines. Move / Rotate / Scale only change `root` (position, rotation,
// scale); the vapor lives in cage space, so transforming never disturbs it.
export class CloudObject {
  constructor({ id, family = 'cumulus', seed = 1, position, quaternion, scale = 1, persistence = 110 }) {
    this.id = id;
    this.disposed = false;
    instances += 1;
    this.seed = seed;
    this.userScale = scale;
    this.cageVisible = true;
    this.fillLock = false;
    this.fillPoint = [0, -0.3, 0];
    this.sim = new FluidVolume(GRID, seed);
    this.sim.family = family;
    this.sim.persistence = persistence;
    this.accumulator = 0;
    this.uploadedVersion = -1;

    this.bytes = new Uint8Array(GRID * GRID * GRID);
    this.texture = new THREE.Data3DTexture(this.bytes, GRID, GRID, GRID);
    this.texture.format = THREE.RedFormat;
    this.texture.type = THREE.UnsignedByteType;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = this.texture.wrapR = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.unpackAlignment = 1;
    this.texture.needsUpdate = true;

    this.volumeMaterial = new THREE.ShaderMaterial({
      vertexShader: VOLUME_VERTEX,
      fragmentShader: VOLUME_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide, // march from inside the box so the camera may sit inside the cloud
      uniforms: {
        uDensity: { value: this.texture },
        uCamLocal: { value: new THREE.Vector3() },
        uSunLocal: { value: new THREE.Vector3(0, 1, 0) },
        uUpLocal: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1, 0.8, 0.65) },
        uSkyColor: { value: new THREE.Color(0.8, 0.86, 0.96) },
        uGroundColor: { value: new THREE.Color(0.72, 0.55, 0.58) },
        uRimColor: { value: new THREE.Color(1, 1, 1) },
        uDensityScale: { value: 1 },
        uTime: { value: 0 },
        uSeed: { value: seed % 97 },
        uOpacity: { value: 1 },
      },
    });
    this.cageMaterial = new THREE.ShaderMaterial({
      vertexShader: CAGE_VERTEX,
      fragmentShader: CAGE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: seed % 97 },
        uCamLocal: { value: new THREE.Vector3() },
        uColor: { value: new THREE.Color(0.8, 0.92, 1) },
        uAlpha: { value: 0.3 },
      },
    });

    this.root = new THREE.Group();
    this.root.position.set(position[0], position[1], position[2]);
    if (quaternion) this.root.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    this.applyScale();
    this.volume = new THREE.Mesh(boxGeometry(), this.volumeMaterial);
    this.volume.renderOrder = 1;
    this.volume.frustumCulled = true; // The exact containing box conservatively bounds all vapor.
    this.volume.raycast = () => {}; // Cage-space picking belongs to the native cloud system.
    this.cage = new THREE.LineSegments(cageGeometry(), this.cageMaterial);
    this.cage.renderOrder = 2;
    this.cage.frustumCulled = false;
    this.root.add(this.volume, this.cage);
    this.root.userData.cloudId = id;

    this._inv = new THREE.Matrix4();
    this._tmp = new THREE.Vector3();
  }

  get family() { return this.sim.family; }
  set family(f) { this.sim.family = f; this.applyScale(); }

  get dims() { return CLOUD_FAMILIES[this.sim.family].dims; }

  applyScale() {
    const d = this.dims;
    this.root.scale.set(d[0] * this.userScale, d[1] * this.userScale, d[2] * this.userScale);
  }

  setUserScale(s) {
    this.userScale = Math.min(3.5, Math.max(0.3, s));
    this.applyScale();
  }

  // Plain-array view used by the picking math in cloudMath.js
  get frame() {
    const p = this.root.position; const q = this.root.quaternion; const s = this.root.scale;
    return { pos: [p.x, p.y, p.z], quat: [q.x, q.y, q.z, q.w], axes: [s.x, s.y, s.z] };
  }

  // Per-frame: send the camera/sun (converted into cloud-local space) to the shaders.
  updateVisuals({ camera, sunWorld, sunColor, skyColor, groundColor, rimColor, guides = true, time, selected }) {
    this.root.updateMatrixWorld(true);
    this._inv.copy(this.root.matrixWorld).invert();
    const u = this.volumeMaterial.uniforms;
    u.uCamLocal.value.copy(camera.position).applyMatrix4(this._inv);
    u.uSunLocal.value.copy(sunWorld).transformDirection(this._inv);
    u.uUpLocal.value.set(0, 1, 0).transformDirection(this._inv);
    u.uSunColor.value.copy(sunColor);
    u.uSkyColor.value.copy(skyColor);
    u.uGroundColor.value.copy(groundColor);
    u.uRimColor.value.copy(rimColor ?? sunColor);
    u.uTime.value = time;
    const c = this.cageMaterial.uniforms;
    c.uTime.value = time;
    c.uCamLocal.value.copy(u.uCamLocal.value);
    c.uAlpha.value = selected ? 0.62 : 0.26;
    this.cage.visible = this.cageVisible && guides;
    this.volume.visible = !this.sim.isEmpty();
    this.syncTexture();
  }

  syncTexture() {
    if (this.uploadedVersion === this.sim.version) return;
    this.sim.fillBytes(this.bytes);
    // Quantize a normalized texture in retention mode so numerical spreading
    // cannot round all remaining vapor to zero or fall below the optical cutoff.
    // This changes sampling precision, never the solver's density or total mass.
    const peak = this.sim.maxDensity();
    if (this.sim.persistence === Infinity && peak > 0) this.opticalScale = Math.max(this.opticalScale ?? 1, 0.3 / peak);
    const textureScale = this.opticalScale ?? 1;
    if (textureScale > 1) {
      for (let i = 0; i < this.bytes.length; i++) this.bytes[i] = Math.min(255, Math.round(this.sim.d[i] * textureScale * 255));
    }
    this.texture.needsUpdate = true;
    this.uploadedVersion = this.sim.version;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeFromParent();
    this.texture.dispose();
    this.volumeMaterial.dispose();
    this.cageMaterial.dispose();
    instances -= 1;
    if (instances === 0) {
      sharedBox?.dispose(); sharedCage?.dispose();
      sharedBox = null; sharedCage = null;
    }
  }
}
