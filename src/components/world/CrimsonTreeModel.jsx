import {
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
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
  createProceduralFloatingLeafData,
  createLeafPolygonGeometry,
} from "./treeCanopy";
import { terrainSettings } from "../../systems/terrain/terrainSettings";
/*
 * Testing Grounds
 * Crimson Tree — reusable visual model
 *
 * This component contains ONLY the visual tree.
 * Physics/collision behavior remains in Landscape.jsx.
 */
function getFloatingLeafReleaseDelay(density, phase) {
  const normalizedDensity =
    Math.max(0, Math.min(100, Number(density) || 0)) / 100;

  if (normalizedDensity <= 0) {
    return Infinity;
  }

  /*
   * Low density:
   * roughly one release every 5–10 seconds across the tree.
   *
   * High density:
   * allows several independent leaves to release
   * close together, creating overlapping activity.
   */
  const minimumDelay =
    THREE.MathUtils.lerp(8, 1.5, normalizedDensity);

  const maximumDelay =
    THREE.MathUtils.lerp(14, 4, normalizedDensity);

  const randomOffset =
    (Math.sin(phase * 3.17) * 0.5 + 0.5);

  return THREE.MathUtils.lerp(
    minimumDelay,
    maximumDelay,
    randomOffset
  );
}
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
const floatingLeavesDefinition =
  treeDefinition?.leaves ?? {
    size: 100,
    color: crownColor,
    floating: {
      enabled: true,
      density: 8,
    },
  };

const floatingLeafData = useMemo(
  () =>
    createProceduralFloatingLeafData(
      proceduralBranchData,
      floatingLeavesDefinition,
      treeDefinition?.seed ?? 1
    ),
  [
    proceduralBranchData,
    floatingLeavesDefinition,
    treeDefinition?.seed,
  ]
);
const floatingLeafGeometry = useMemo(
  () =>
    createLeafPolygonGeometry(),
  []
);
const floatingLeavesRef = useRef(null);
const generatorLeaves =
  treeDefinition?.leaves;
const proceduralCanopyGeometry = useMemo(
  () =>
    createProceduralCanopyGeometry(
      proceduralCanopyData,
      {
        gradientEnabled:
          generatorLeaves?.gradientEnabled ?? false,

        gradientColor:
          generatorLeaves?.gradientColor ?? "#181818",

        baseColor:
          generatorLeaves?.color ?? crownColor,
      }
    ),
  [
    proceduralCanopyData,
    generatorLeaves?.gradientEnabled,
    generatorLeaves?.gradientColor,
    generatorLeaves?.color,
    crownColor,
  ]
);
const proceduralCanopyEdges = useMemo(
  () =>
    proceduralCanopyGeometry?.attributes?.position
      ? new THREE.EdgesGeometry(
          proceduralCanopyGeometry,
          18
        )
      : null,
  [proceduralCanopyGeometry]
);

const resolvedLeafFillColor =
  generatorLeaves?.color ??
  crownColor;

const resolvedLeafOutlineColor =
  generatorLeaves?.outlineColor ??
  outlineColor;

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
useFrame((state, delta) => {
  const group = floatingLeavesRef.current;
  if (!group) return;

  const windStrength =
    (Number(terrainSettings.windStrength) || 0) / 100;

  const windSpeed =
    0.25 +
    ((Number(terrainSettings.windSpeed) || 0) / 100) * 2.75;

  group.children.forEach((leaf) => {
    if (!leaf.userData.basePosition) {
      leaf.userData.basePosition = leaf.position.clone();
    }

    if (!leaf.userData.baseRotationVector) {
      leaf.userData.baseRotationVector = new THREE.Vector3(
        leaf.rotation.x,
        leaf.rotation.y,
        leaf.rotation.z
      );
    }

    if (leaf.userData.simulationInitialized !== true) {
      const phase = leaf.userData.driftSeed ?? 0;

      const outward =
        leaf.userData.driftDirection?.clone().normalize() ??
        new THREE.Vector3(1, 0, 0);

      const tangent =
        leaf.userData.tangentDirection?.clone().normalize() ??
        new THREE.Vector3(0, 0, 1);

      /*
       * Stagger release so all leaves do not detach together.
       */
      leaf.userData.life =
        -(
          0.15 +
          (Math.sin(phase * 2.17) * 0.5 + 0.5) * 1.8
        );

      leaf.userData.velocity =
        outward
          .clone()
          .multiplyScalar(
            0.18 +
              (Math.sin(phase * 3.71) * 0.5 + 0.5) * 0.32
          )
          .add(
            tangent
              .clone()
              .multiplyScalar(
                Math.cos(phase * 2.91) * 0.24
              )
          );

      leaf.userData.velocity.y =
        0.08 +
        (Math.sin(phase * 4.13) * 0.5 + 0.5) * 0.16;

      leaf.userData.angularVelocity = new THREE.Vector3(
        Math.sin(phase * 1.91) * 0.95,
        Math.cos(phase * 2.63) * 0.8,
        Math.sin(phase * 3.47) * 1.2
      );

      leaf.userData.tumblePhase = phase * 2.37;
      leaf.userData.hidden = false;
      leaf.userData.respawnTimer = 0;
      leaf.userData.simulationInitialized = true;
    }

    const basePosition = leaf.userData.basePosition;
    const baseRotation = leaf.userData.baseRotationVector;

    /*
     * Recycle fallen leaves after a short invisible pause.
     * This prevents an ever-growing pile of leaves.
     */
    if (leaf.userData.hidden) {
      leaf.userData.respawnTimer -= delta;
      leaf.visible = false;

      if (leaf.userData.respawnTimer <= 0) {
        leaf.visible = true;
        leaf.userData.hidden = false;

        const phase = leaf.userData.driftSeed ?? 0;

        const density =
          floatingLeavesDefinition?.floating?.density ?? 0;

        leaf.userData.life =
          -getFloatingLeafReleaseDelay(density, phase);

        leaf.position.copy(basePosition);
        leaf.rotation.set(
          baseRotation.x,
          baseRotation.y,
          baseRotation.z
        );

        leaf.userData.velocity =
          leaf.userData.driftDirection
            ?.clone()
            .normalize()
            .multiplyScalar(
              0.18 +
                (Math.sin(phase * 3.71) * 0.5 + 0.5) * 0.32
            ) ??
          new THREE.Vector3(0.2, 0.1, 0);

        if (leaf.userData.tangentDirection) {
          leaf.userData.velocity.add(
            leaf.userData.tangentDirection
              .clone()
              .normalize()
              .multiplyScalar(
                Math.cos(phase * 2.91) * 0.24
              )
          );
        }

        leaf.userData.velocity.y =
          0.08 +
          (Math.sin(phase * 4.13) * 0.5 + 0.5) * 0.16;
      }

      return;
    }

    leaf.userData.life += delta;

    /*
     * Negative life is the pre-release period.
     */
    if (leaf.userData.life < 0) {
      leaf.position.copy(basePosition);
      leaf.rotation.set(
        baseRotation.x,
        baseRotation.y,
        baseRotation.z
      );
      return;
    }

    const velocity = leaf.userData.velocity;
    const phase = leaf.userData.driftSeed ?? 0;

    const driftDirection =
      leaf.userData.driftDirection?.clone().normalize() ??
      new THREE.Vector3(1, 0, 0);

    const tangentDirection =
      leaf.userData.tangentDirection?.clone().normalize() ??
      new THREE.Vector3(0, 0, 1);

    const windTime = state.clock.elapsedTime * windSpeed;

    /*
     * Irregular gusts keep leaves from synchronizing into an orbit.
     */
    const gustX =
      Math.sin(windTime * 0.43 + phase * 1.73) * 0.32;

    const gustZ =
      Math.cos(windTime * 0.37 + phase * 2.19) * 0.28;

    const gustTangent =
      Math.sin(windTime * 0.71 + phase * 3.11) * 0.24;

    /*
     * Wind encourages the leaf away from the tree.
     */
    velocity.add(
      driftDirection
        .clone()
        .multiplyScalar(0.22 * windStrength * delta)
    );

    velocity.add(
      new THREE.Vector3(gustX, 0, gustZ)
        .multiplyScalar(windStrength * delta)
    );

    velocity.add(
      tangentDirection
        .clone()
        .multiplyScalar(gustTangent * windStrength * delta)
    );

    /*
     * Gravity always acts, even when wind is calm.
     */
    velocity.y -= 0.62 * delta;

    /*
     * Mild air resistance prevents runaway acceleration.
     */
    velocity.multiplyScalar(
      Math.pow(0.985, delta * 60)
    );

    leaf.position.add(
      velocity.clone().multiplyScalar(delta)
    );

    /*
     * Independent three-axis tumble.
     */
    const tumble = leaf.userData.angularVelocity;

    const flutter =
      Math.sin(
        windTime * 1.37 +
          leaf.userData.tumblePhase
      ) * 0.35;

    leaf.rotation.x +=
      (tumble.x + flutter) * delta;

    leaf.rotation.y +=
      (
        tumble.y +
        Math.cos(
          windTime * 1.11 +
            leaf.userData.tumblePhase * 1.31
        ) * 0.22
      ) * delta;

    leaf.rotation.z +=
      (
        tumble.z +
        Math.sin(
          windTime * 1.53 +
            leaf.userData.tumblePhase * 0.77
        ) * 0.28
      ) * delta;

    /*
     * Remove the leaf below the low world threshold.
     */
    if (leaf.position.y < -1.35) {
      leaf.visible = false;
      leaf.userData.hidden = true;
      leaf.userData.respawnTimer = 1.5;
    }
  });
});
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
  color={resolvedLeafFillColor}
  vertexColors={
    generatorLeaves?.gradientEnabled ?? false
  }
  emissive={crownEmissive}
  emissiveIntensity={0.3}
  roughness={0.92}
  metalness={0}
  flatShading
  side={THREE.DoubleSide}
/>
  </mesh>
  )}
  {proceduralCanopyEdges && (
  <lineSegments
    geometry={proceduralCanopyEdges}
    scale={1.006}
  >
    <lineBasicMaterial
      color={resolvedLeafOutlineColor}
      transparent
      opacity={0.82}
      depthWrite={false}
    />
  </lineSegments>
)}
<group ref={floatingLeavesRef}>
  {floatingLeafData.map((leaf) => (
    <mesh
      key={`floating-leaf-${leaf.index}`}
      geometry={floatingLeafGeometry}
      position={leaf.position}
      scale={leaf.scale}
      rotation={[
        0,
        0,
        leaf.rotation,
      ]}
      userData={{
        floatingLeaf: true,
        driftSeed: leaf.driftSeed,
      }}
    >
      <meshStandardMaterial
        color={
          treeDefinition?.leaves?.color ??
          "#080808"
        }
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  ))}
</group>
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
        side={THREE.DoubleSide}
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