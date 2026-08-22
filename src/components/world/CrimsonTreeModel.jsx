import { useMemo } from "react";
import * as THREE from "three";
import {
  createProceduralTrunkGeometry,
} from "./treeGeometry";

import {
  createProceduralBranchGeometry,
  createProceduralBranchData,
} from "./treeBranches";
import {
  createProceduralCanopyData,
  createProceduralCanopyGeometry,
} from "./treeCanopy";
/*
 * Testing Grounds
 * Crimson Tree — reusable visual model
 *
 * This component contains ONLY the visual tree.
 * Physics/collision behavior remains in Landscape.jsx.
 */

function createMatureTreeCrownGeometry() {
  const sides = 7;

  const rings = [
    { y: 0, radius: 0.08 },
    { y: -0.65, radius: 0.82 },
    { y: -1.05, radius: 0.48 },
    { y: -1.55, radius: 1.22 },
    { y: -1.95, radius: 0.7 },
    { y: -2.55, radius: 1.55 },
    { y: -3, radius: 0.88 },
    { y: -3.55, radius: 1.42 },
    { y: -4.05, radius: 0.3 },
  ];

  const positions = [];
  const indices = [];

  rings.forEach((ring, ringIndex) => {
    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const angle =
        (sideIndex / sides) * Math.PI * 2 +
        ringIndex * 0.19;

      const irregularity =
        1 +
        Math.sin(
          sideIndex * 2.17 +
            ringIndex * 1.43
        ) *
          0.12;

      const radius =
        ring.radius * irregularity;

      positions.push(
        Math.cos(angle) * radius,
        ring.y,
        Math.sin(angle) * radius
      );
    }
  });

  for (
    let ringIndex = 0;
    ringIndex < rings.length - 1;
    ringIndex += 1
  ) {
    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const nextSide =
        (sideIndex + 1) % sides;

      const current =
        ringIndex * sides + sideIndex;

      const currentNext =
        ringIndex * sides + nextSide;

      const below =
        (ringIndex + 1) * sides +
        sideIndex;

      const belowNext =
        (ringIndex + 1) * sides +
        nextSide;

      indices.push(
        current,
        below,
        currentNext
      );

      indices.push(
        currentNext,
        below,
        belowNext
      );
    }
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  geometry.setIndex(indices);

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

export default function CrimsonTreeModel({
  scale = 1,
  rotation = 0,
  variant = 0.5,
  windPhase = 0,
  crownRef,
  legacyCrown = false,

  treeDefinition,

  trunkHeight = 6.3,
  trunkTopRadius = 0.11,
  trunkBottomRadius = 0.27,

  crownWidth,
  crownHeight,

  trunkColor = "#10080a",
  crownColor = "#080808",
  crownEmissive = "#353434",
  outlineColor = "#fc0303",
}) {
  const crownGeometry = useMemo(
    () => createMatureTreeCrownGeometry(),
    []
  );

  const crownEdges = useMemo(
    () =>
      new THREE.EdgesGeometry(
        crownGeometry,
        18
      ),
    [crownGeometry]
  );

  const proceduralTrunkGeometry = useMemo(
  () =>
    createProceduralTrunkGeometry(
      treeDefinition?.trunk
    ),
  [treeDefinition]
);
const proceduralTrunkTop =
  proceduralTrunkGeometry?.boundingBox?.max.y ??
  trunkHeight;
const proceduralBranchGeometry = useMemo(
  () =>
    createProceduralBranchGeometry(
      treeDefinition?.trunk,
      treeDefinition?.branches,
      treeDefinition?.seed ?? 1
    ),
  [
    treeDefinition?.trunk,
    treeDefinition?.branches,
    treeDefinition?.seed,
  ]
);
const proceduralBranchData = useMemo(
  () =>
    createProceduralBranchData(
      treeDefinition?.trunk,
      treeDefinition?.branches,
      treeDefinition?.seed ?? 1
    ),
  [
    treeDefinition?.trunk,
    treeDefinition?.branches,
    treeDefinition?.seed,
  ]
);
const proceduralCanopyData = useMemo(
  () =>
    createProceduralCanopyData(
      proceduralBranchData,
      treeDefinition?.trunk,
      treeDefinition?.branches,
      treeDefinition?.leaves,
      treeDefinition?.seed ?? 1
    ),
  [
    proceduralBranchData,
    treeDefinition?.trunk,
    treeDefinition?.branches,
    treeDefinition?.leaves,
    treeDefinition?.seed,
  ]
);

const proceduralCanopyGeometry = useMemo(
  () =>
    createProceduralCanopyGeometry(
      proceduralCanopyData
    ),
  [proceduralCanopyData]
);
  const generatorLeaves =
  treeDefinition?.leaves;

const resolvedCrownWidth =
  generatorLeaves?.size != null
    ? 0.72 + (generatorLeaves.size / 100) * 0.42
    : crownWidth ??
      0.88 + variant * 0.26;

const resolvedCrownHeight =
  generatorLeaves?.clustering != null
    ? 0.78 + (generatorLeaves.clustering / 100) * 0.42
    : crownHeight ??
      0.92 + (1 - variant) * 0.18;

  const trunkLean =
    (variant - 0.5) * 0.045;

  return (
    <group scale={scale}>
      <group
        ref={crownRef}
        rotation={[
          0,
          rotation,
          0,
        ]}
        userData={{
          windPhase,
          baseRotationY: rotation,
        }}
      >
        <mesh
  geometry={proceduralTrunkGeometry}
  castShadow
  receiveShadow
>
  <meshStandardMaterial
    color={trunkColor}
    roughness={0.96}
    metalness={0}
  />
</mesh>
{proceduralBranchGeometry?.attributes?.position && (
  <mesh
    geometry={proceduralBranchGeometry}
    castShadow
    receiveShadow
  >
    <meshStandardMaterial
      color={trunkColor}
      roughness={0.96}
      metalness={0}
    />
  </mesh>
)}
        {proceduralCanopyGeometry?.attributes?.position && (
  <mesh
    geometry={proceduralCanopyGeometry}
    castShadow
    receiveShadow
  >
    <meshStandardMaterial
      color={crownColor}
      emissive={crownEmissive}
      emissiveIntensity={0.3}
      roughness={0.92}
      metalness={0}
      flatShading
    />
  </mesh>
)}
{legacyCrown && (
  <group
    position={[
      0,
      proceduralTrunkTop + 0.9,
      0,
    ]}
    scale={[
      resolvedCrownWidth,
      resolvedCrownHeight,
      1.02 - variant * 0.12,
    ]}
    rotation={[
      0,
      variant * Math.PI * 0.7,
      0,
    ]}
  >
    <mesh
      geometry={crownGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={crownColor}
        emissive={crownEmissive}
        emissiveIntensity={0.3}
        roughness={0.92}
        metalness={0}
        flatShading
      />
    </mesh>

    <lineSegments
      geometry={crownEdges}
      scale={1.006}
    >
      <lineBasicMaterial
        color={outlineColor}
        transparent
        opacity={0.82}
        depthWrite={false}
      />
    </lineSegments>
  </group>
)}
      </group>
    </group>
  );
}