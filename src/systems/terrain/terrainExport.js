import { useWorldStore } from "../world/worldStore";
import { terrainCoversRectangle } from "../world/terrainRegions";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { getCommittedTerrainHeightAt } from "./terrainHeight";

export const MAX_SEGMENTS = 512;
export const DEFAULT_EXPORT_OPTIONS = Object.freeze({
  minX: -50, maxX: 50, minZ: -50, maxZ: 50,
  segmentsX: 40, segmentsZ: 40, origin: "world", filename: "terrain-region",
});

export function validateTerrainExport(options) {
  const { minX, maxX, minZ, maxZ, segmentsX, segmentsZ, origin } = options;
  if (![minX, maxX, minZ, maxZ].every(Number.isFinite)) throw new Error("Enter finite X/Z bounds.");
  if (minX >= maxX || minZ >= maxZ) throw new Error("Each maximum must exceed its minimum (nonzero area).");
  if ([minX, maxX, minZ, maxZ].some(value => Math.abs(value) > 100000)) throw new Error("Keep coordinates within ±100,000 world units for reliable precision.");
  if (![segmentsX, segmentsZ].every(value => Number.isInteger(value) && value >= 1 && value <= MAX_SEGMENTS)) {
    throw new Error(`X and Z segments must be whole numbers from 1 to ${MAX_SEGMENTS}.`);
  }
  if (!["world", "centered"].includes(origin)) throw new Error("Choose World Position or Centered Origin.");
  const width = maxX - minX, depth = maxZ - minZ;
  return { width, depth, vertices: (segmentsX + 1) * (segmentsZ + 1), triangles: 2 * segmentsX * segmentsZ };
}

export function terrainExportFilename(value) {
  const stem = String(value ?? "").replace(/\.glb$/i, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return `${stem || "terrain-region"}.glb`;
}

// Standalone mesh: never reads or detaches a scene object. Both endpoints are sampled.
export function createTerrainExportGeometry(options, sampleHeight = getCommittedTerrainHeightAt) {
  const { width, depth, vertices } = validateTerrainExport(options);
  const world=useWorldStore.getState().world;
  if(world.terrainSurface&&sampleHeight===getCommittedTerrainHeightAt&&!terrainCoversRectangle(options,world))throw new Error("The selected region includes space without terrain. Choose bounds inside the connected world.");
  const { minX, maxX, minZ, maxZ, segmentsX, segmentsZ, origin } = options;
  const offsetX = origin === "centered" ? (minX + maxX) / 2 : 0;
  const offsetZ = origin === "centered" ? (minZ + maxZ) / 2 : 0;
  const positions = new Float32Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const indices = [];
  for (let iz = 0; iz <= segmentsZ; iz++) {
    const z = iz === segmentsZ ? maxZ : minZ + depth * iz / segmentsZ;
    for (let ix = 0; ix <= segmentsX; ix++) {
      const x = ix === segmentsX ? maxX : minX + width * ix / segmentsX;
      const i = iz * (segmentsX + 1) + ix;
      const y = sampleHeight(x, z);
      if (!Number.isFinite(y)) throw new Error("Terrain returned an invalid elevation. Check terrain settings.");
      positions.set([x - offsetX, y, z - offsetZ], i * 3);
      uvs.set([ix / segmentsX, iz / segmentsZ], i * 2);
      if (ix < segmentsX && iz < segmentsZ) {
        const next = i + segmentsX + 1;
        // +Z cross +X yields +Y on a flat X/Z surface.
        indices.push(i, next, i + 1, i + 1, next, next + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export async function exportTerrainGLB(options) {
  const geometry = createTerrainExportGeometry(options);
  // Portable fallback; intentionally no app shaders, previews, textures or gizmos.
  const material = new THREE.MeshStandardMaterial({ color: "#777f87", roughness: 0.94, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Committed terrain surface";
  try {
    const result = await new GLTFExporter().parseAsync(mesh, { binary: true });
    if (!(result instanceof ArrayBuffer)) throw new Error("Exporter did not produce a binary GLB.");
    return result;
  } finally {
    geometry.dispose();
    material.dispose();
  }
}

export function downloadTerrainGLB(buffer, filename) {
  const url = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = terrainExportFilename(filename);
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Give the browser time to start consuming the download before revocation.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
