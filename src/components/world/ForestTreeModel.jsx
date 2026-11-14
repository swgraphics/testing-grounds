import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createProceduralTrunkGeometry } from "./treeGeometry";
import { createProceduralBranchData, createProceduralBranchGeometry } from "./treeBranches";
import { createProceduralCanopyData, createProceduralCanopyGeometry, createProceduralFloatingLeafData } from "./treeCanopy";
import { createForestLeafShape, createForestLeafInstances, configureForestOutline } from "./forestGeometry";

const resources = new Map();
function retainResource(key, resource) {
  resource.users++;
  return () => {
    resource.users--;
    queueMicrotask(() => {
      if (resource.users === 0) {
        resource.value.dispose();
        if (resources.get(key) === resource) resources.delete(key);
      }
    });
  };
}
function useSharedResource(key, create) {
  const resource = useMemo(() => {
    if (!resources.has(key)) resources.set(key, { value: create(), users: 0 });
    return resources.get(key);
    // Keys include all material/geometry inputs; factories do not own identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => retainResource(key, resource), [key, resource]);
  return resource.value;
}

function useDisposeGeometry(geometry) {
  useEffect(() => () => geometry?.dispose(), [geometry]);
}

function ForestTreeModel({ treeDefinition: definition, treeId, scale = 1, rotation = 0, windPhase = 0, crownRef }) {
  const trunkKey = JSON.stringify(definition.trunk);
  const branchKey = JSON.stringify(definition.branches);
  const leavesKey = JSON.stringify(definition.leaves);
  const trunk = useMemo(() => JSON.parse(trunkKey), [trunkKey]);
  const branches = useMemo(() => JSON.parse(branchKey), [branchKey]);
  const leaves = useMemo(() => JSON.parse(leavesKey), [leavesKey]);
  const seed = definition.seed;
  const shape = useSharedResource(`leaf:${JSON.stringify(leaves.vertices ?? null)}`, () => createForestLeafShape(leaves.vertices));
  const trunkGeometry = useSharedResource(`trunk:${JSON.stringify(trunk)}`, () => createProceduralTrunkGeometry(trunk));
  const branchData = useMemo(() => createProceduralBranchData(trunk, branches, seed), [trunk, branches, seed]);
  const branchGeometry = useMemo(() => createProceduralBranchGeometry(trunk, branches, seed), [trunk, branches, seed]);
  // Color edits do not rebuild branch distribution or leaf transforms.
  const canopy = useMemo(() => createProceduralCanopyData(branchData, trunk, branches, leaves, seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branchData, trunk, branches, seed, leaves.size, leaves.density, leaves.clustering, leaves.distribution]);
  useDisposeGeometry(branchGeometry);
  const instances = useMemo(() => createForestLeafInstances(canopy, shape), [canopy, shape]);
  useEffect(() => () => instances.outline.dispose(), [instances]);
  const wood = useSharedResource("wood", () => new THREE.MeshStandardMaterial({ color: "#10080a", roughness: 0.96 }));
  const fill = useSharedResource(`fill:${leaves.color}:${Boolean(leaves.gradientEnabled)}`, () => new THREE.MeshStandardMaterial({
    color: leaves.color, vertexColors: Boolean(leaves.gradientEnabled), emissive: "#353434", emissiveIntensity: 0.3,
    roughness: 0.92, flatShading: true, side: THREE.DoubleSide,
  }));
  // Falling leaves share the tree's leaf-fill palette, including saved overrides.
  const fallingColor = leaves.color;
  const fallingMaterial = useSharedResource(`falling:${fallingColor}`, () => new THREE.MeshStandardMaterial({
    color: fallingColor, emissive: "#353434", emissiveIntensity: 0.3,
    roughness: 0.92, flatShading: true, side: THREE.DoubleSide,
  }));
  const outlineMaterial = useSharedResource(`outline:${leaves.outlineColor}`, () => {
    const material = new THREE.LineBasicMaterial({ color: leaves.outlineColor, transparent: true, opacity: 0.82, depthWrite: false });
    material.onBeforeCompile = configureForestOutline;
    material.customProgramCacheKey = () => "forest-leaf-outline-v1";
    return material;
  });
  // Saved gradient/vertex edits retain the editor's exact merged color behavior.
  const gradient = useMemo(() => leaves.gradientEnabled ? createProceduralCanopyGeometry(canopy, {
    gradientEnabled: true, gradientColor: leaves.gradientColor, baseColor: leaves.color, leafVertices: leaves.vertices,
  }) : null, [canopy, leaves.gradientEnabled, leaves.gradientColor, leaves.color, leaves.vertices]);
  useDisposeGeometry(gradient);
  const leafMesh = useRef();
  useLayoutEffect(() => {
    if (!leafMesh.current) return;
    const mesh = leafMesh.current;
    mesh.instanceMatrix.array.set(instances.matrices);
    leafMesh.current.instanceMatrix.needsUpdate = true;
    leafMesh.current.boundingBox = instances.bounds.clone();
    leafMesh.current.boundingSphere = instances.bounds.getBoundingSphere(new THREE.Sphere());
    return () => mesh.dispose();
  }, [instances, gradient, fill, shape]);
  const floating = useRef();
  // Detached leaves remain instanced and animate only near the camera. The
  // attached leaves never change detail or model when editing starts.
  const floatingData = useMemo(() => createProceduralFloatingLeafData(branchData, leaves, seed), [branchData, leaves, seed]);
  const floatingCount = floatingData.length;
  useLayoutEffect(() => {
    const mesh = floating.current;
    return () => mesh?.dispose();
  }, [shape, fallingMaterial, floatingCount]);
  const scratchRef = useRef(null);
  if (scratchRef.current === null) scratchRef.current = { matrix: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(), world: new THREE.Vector3() };
  useFrame(({ camera, clock }) => {
    if (!floating.current) return;
    const scratch = scratchRef.current;
    floating.current.getWorldPosition(scratch.world);
    const distance = camera.position.distanceToSquared(scratch.world);
    const animationDistance = floating.current.visible ? 70 : 60;
    floating.current.visible = distance < animationDistance * animationDistance;
    if (!floating.current.visible || !floatingCount) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < floatingCount; i++) {
      const leaf = floatingData[i];
      const phase = (t * 0.14 + i * 0.47 + seed * 0.01) % 1;
      scratch.position.copy(leaf.position);
      scratch.position.x += Math.sin(t * 0.6 + i) * phase;
      scratch.position.y -= phase * 7;
      scratch.position.z += Math.cos(t * 0.4 + i) * phase;
      scratch.quaternion.setFromAxisAngle(scratch.world.set(0, 1, 0), t * 0.7 + i);
      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale.setScalar(leaf.scale));
      floating.current.setMatrixAt(i, scratch.matrix);
    }
    floating.current.instanceMatrix.needsUpdate = true;
  });
  return <group scale={scale} dispose={null} userData={{ tgForestTree: treeId }}>
    <group ref={crownRef} rotation={[0, rotation, 0]} userData={{ windPhase, baseRotationY: rotation }}>
      <mesh geometry={trunkGeometry} material={wood} castShadow receiveShadow
        userData={{ tgCrimsonTreeTrunk: true, tgCrimsonTreeId: treeId, tgTreeDefinition: definition }} />
      <mesh geometry={branchGeometry} material={wood} castShadow receiveShadow
        userData={{ tgCrimsonTreeBranch: true, tgCrimsonTreeId: treeId, tgTreeDefinition: definition, tgTreeBranchData: branchData }} />
      {gradient ? <mesh geometry={gradient} material={fill} castShadow receiveShadow raycast={() => {}} /> :
        <instancedMesh ref={leafMesh} args={[shape, fill, canopy.length]} castShadow receiveShadow raycast={() => {}} />}
      <lineSegments geometry={instances.outline} material={outlineMaterial} scale={1.006} raycast={() => {}} />
      {floatingCount > 0 && <instancedMesh ref={floating} args={[shape, fallingMaterial, floatingCount]} frustumCulled={false} raycast={() => {}} />}
    </group>
  </group>;
}

export default memo(ForestTreeModel, (previous, next) =>
  previous.treeId === next.treeId && previous.scale === next.scale &&
  previous.rotation === next.rotation && previous.windPhase === next.windPhase &&
  JSON.stringify(previous.treeDefinition) === JSON.stringify(next.treeDefinition));
