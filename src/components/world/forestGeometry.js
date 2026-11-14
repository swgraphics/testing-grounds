import * as THREE from "three";
import { createLeafPolygonGeometry } from "./treeCanopy.js";

// The same editable eight-vertex leaf used by the tree editor. Each forest
// tree supplies transforms, rather than duplicating all leaf vertices/normals.
export function createForestLeafShape(vertices) {
  const geometry = createLeafPolygonGeometry();
  if (Array.isArray(vertices) && vertices.length === geometry.attributes.position.array.length) {
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  return geometry;
}

export function createForestLeafInstances(clusters, shape) {
  const matrices = new Float32Array(clusters.length * 16);
  const matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const rotation = new THREE.Quaternion();
  const alignment = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const bounds = new THREE.Box3();
  clusters.forEach((cluster, index) => {
    const direction = cluster.direction.clone().normalize();
    const random = Math.sin((cluster.index * 137.17 + cluster.branchIndex * 41.73) * 12.9898) * 43758.5453;
    alignment.setFromUnitVectors(up, direction);
    rotation.setFromAxisAngle(direction, (random - Math.floor(random)) * Math.PI * 2).multiply(alignment);
    matrix.compose(cluster.position, rotation, scale.setScalar(cluster.scale));
    matrix.toArray(matrices, index * 16);
    bounds.union(shape.boundingBox.clone().applyMatrix4(matrix));
  });
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(), new THREE.Vector3());
  const edges = new THREE.EdgesGeometry(shape, 18);
  const outline = new THREE.InstancedBufferGeometry();
  outline.setAttribute("position", edges.attributes.position);
  outline.setAttribute("leafMatrix", new THREE.InstancedBufferAttribute(matrices, 16));
  outline.instanceCount = clusters.length;
  outline.boundingBox = bounds.clone();
  outline.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
  edges.dispose();
  return { matrices, outline, bounds };
}

export function configureForestOutline(shader) {
  shader.vertexShader = `attribute mat4 leafMatrix;\n${shader.vertexShader}`.replace(
    "#include <begin_vertex>",
    "vec3 transformed = (leafMatrix * vec4(position, 1.0)).xyz;",
  );
}
