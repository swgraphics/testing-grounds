// treeCanopy.js

import * as THREE from "three";

/*
 * Testing Grounds
 * Tree Generator — procedural foliage system
 *
 * This file defines HOW foliage is distributed around
 * the generated branch structure.
 *
 * It does not own the tree definition.
 *
 * Current foliage model:
 * - branch-aware foliage clusters
 * - deterministic variation
 * - size
 * - density
 * - clustering
 * - distribution
 *
 * Future:
 * - individual leaf geometry
 * - leaf shapes
 * - leaf orientation
 * - secondary branch attachment
 * - natural cursor foliage editing
 */

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function seededRandom(seed) {
  const value =
    Math.sin(seed * 12.9898) *
    43758.5453;

  return value - Math.floor(value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createLeafPolygonGeometry() {
  /*
   * Canonical editable leaf.
   *
   * IMPORTANT:
   * This is the master shape.
   *
   * Every leaf instance uses this same geometry.
   * Future vertex editing should modify ONLY this
   * canonical geometry/data and regenerate the tree.
   */

  const positions = [
     0.00,  0.00,  0.00,
     0.42,  0.12,  0.00,
     0.78,  0.38,  0.00,
     0.48,  0.82,  0.00,
     0.05,  1.00,  0.00,
    -0.38,  0.72,  0.00,
    -0.58,  0.28,  0.00,
    -0.32, -0.08,  0.00,
  ];

  const indices = [];

  for (
    let i = 1;
    i < positions.length / 3 - 1;
    i += 1
  ) {
    indices.push(
      0,
      i,
      i + 1
    );
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

function orientLeafVertex(
  vertex,
  direction,
  rotation
) {
  const oriented =
    vertex.clone();

  /*
   * Align the leaf's local Y axis with
   * the branch direction.
   */
  const up =
    new THREE.Vector3(0, 1, 0);

  const target =
    direction.clone().normalize();

  const quaternion =
    new THREE.Quaternion();

  quaternion.setFromUnitVectors(
    up,
    target
  );

  oriented.applyQuaternion(
    quaternion
  );

  /*
   * Additional rotation around the
   * branch direction prevents every
   * leaf from presenting the exact
   * same face to the camera.
   */
  if (rotation !== 0) {
    const rotationQuaternion =
      new THREE.Quaternion();

    rotationQuaternion.setFromAxisAngle(
      target,
      rotation
    );

    oriented.applyQuaternion(
      rotationQuaternion
    );
  }

  return oriented;
}

/*
 * Generate foliage cluster placement data.
 */
export function createProceduralCanopyData(
  branches = [],
  trunkDefinition,
  branchDefinition,
  leavesDefinition,
  seed = 1
) {
  if (!leavesDefinition) {
    return [];
  }

  if (!branches.length) {
    return [];
  }

  const size =
    clamp01(
      (leavesDefinition.size ?? 50) /
        100
    );

  const density =
    clamp01(
      (leavesDefinition.density ?? 50) /
        100
    );

  const clustering =
    clamp01(
      (leavesDefinition.clustering ?? 50) /
        100
    );

  const distribution =
    clamp01(
      (leavesDefinition.distribution ?? 50) /
        100
    );

  /*
   * Density controls how many branch endpoints
   * receive foliage.
   *
   * Keep the minimum useful count high enough that
   * the tree doesn't become visually empty at low
   * density.
   */
  const leavesPerBranch =
  Math.max(
    2,
    Math.round(
      lerp(
        2,
        14,
        density
      )
    )
  );

const targetCount =
  Math.max(
    1,
    branches.length *
      leavesPerBranch
  );

  const canopySize =
    lerp(
      0.12,
      0.42,
      size
    );

  const clusters = [];

  /*
   * Prefer the upper portions of the tree as
   * distribution increases.
   */
  const sortedBranches =
    [...branches].sort(
      (a, b) =>
        b.trunkT -
        a.trunkT
    );

  for (
    let clusterIndex = 0;
    clusterIndex < targetCount;
    clusterIndex += 1
  ) {
    /*
     * Spread selection through the available branches.
     */
    const normalized =
      targetCount === 1
        ? 0.5
        : clusterIndex /
          (targetCount - 1);

    /*
     * Distribution pushes selection toward
     * branches higher on the trunk.
     */
    const distributionBias =
      Math.pow(
        normalized,
        lerp(
          1.5,
          0.35,
          distribution
        )
      );

    const branchIndex =
      Math.min(
        sortedBranches.length - 1,
        Math.floor(
          distributionBias *
            sortedBranches.length
        )
      );

    const branch =
      sortedBranches[
        branchIndex
      ];

    if (!branch) {
      continue;
    }

    /*
     * Deterministic offset around the branch endpoint.
     *
     * Higher clustering = tighter around the endpoint.
     * Lower clustering = more spread.
     */
    const randomX =
      seededRandom(
        seed +
          clusterIndex *
            31.17
      ) -
      0.5;

    const randomY =
      seededRandom(
        seed +
          clusterIndex *
            47.91
      ) -
      0.5;

    const randomZ =
      seededRandom(
        seed +
          clusterIndex *
            73.43
      ) -
      0.5;

const alongBranch =
  lerp(
    0.45,
    1.0,
    seededRandom(
      seed +
        clusterIndex *
          83.61
    )
  );

const branchLength =
  branch.length ??
  branch.origin.distanceTo(
    branch.end
  );

const anchor =
  branch.origin
    .clone()
    .add(
      branch.direction
        .clone()
        .multiplyScalar(
          branchLength *
            alongBranch
        )
    );

/*
 * Higher clustering keeps leaves closer
 * to the branch centerline.
 */
const spread =
  lerp(
    0.42,
    0.10,
    clustering
  );

const position =
  anchor
    .clone()
    .add(
      new THREE.Vector3(
        randomX * spread,
        randomY * spread * 0.7,
        randomZ * spread
      )
    );

    /*
     * Slight deterministic size variation.
     */
    const variation =
      lerp(
        0.78,
        1.22,
        seededRandom(
          seed +
            clusterIndex *
              91.27
        )
      );

    clusters.push({
      index: clusterIndex,

      branchIndex:
        branch.index,

      position,

      scale:
        canopySize *
        variation,

      branchT:
        branch.trunkT,

      direction:
        branch.direction.clone(),
    });
  }
  return clusters;
}
/*
 * Generate detached floating leaf placement data.
 *
 * Floating leaves use the same canonical leaf shape and
 * scale family as canopy leaves. Their initial positions
 * are biased toward the outer branch/canopy area so they
 * do not appear to originate from the crown center.
 */
export function createProceduralFloatingLeafData(
  branches = [],
  leavesDefinition,
  seed = 1
) {
  if (!leavesDefinition?.floating?.enabled) {
    return [];
  }

  if (!branches.length) {
    return [];
  }

  const density =
    clamp01(
      (leavesDefinition.floating.density ?? 8) /
        100
    );

  const targetCount =
    density <= 0
      ? 0
      : Math.max(
          2,
          Math.round(
            lerp(
              2,
              10,
              density
            )
          )
        );

  if (targetCount <= 0) {
    return [];
  }

  const leafSize =
    clamp01(
      (leavesDefinition.size ?? 50) /
        100
    );

  const canopySize =
    lerp(
      0.12,
      0.42,
      leafSize
    );

  const floatingLeaves = [];

  for (
    let floatingLeafIndex = 0;
    floatingLeafIndex < targetCount;
    floatingLeafIndex += 1
  ) {
    const branchIndex =
      Math.floor(
        seededRandom(
          seed +
            floatingLeafIndex *
              61.73
        ) *
          branches.length
      );

    const branch =
      branches[branchIndex];

    if (!branch) {
      continue;
    }

    const index =
      floatingLeafIndex;

    const randomA =
      seededRandom(
        seed +
          index *
            17.31
      );

    const randomB =
      seededRandom(
        seed +
          index *
            29.73
      );

    const randomC =
      seededRandom(
        seed +
          index *
            43.19
      );

    const branchLength =
      branch.length ??
      branch.origin.distanceTo(
        branch.end
      );

    /*
     * Keep the starting point close to the outer
     * portion of the branch rather than the trunk.
     */
    const branchT =
      lerp(
        0.78,
        1.0,
        randomA
      );

    const position =
      branch.origin
        .clone()
        .add(
          branch.direction
            .clone()
            .multiplyScalar(
              branchLength *
                branchT
            )
        );

    /*
     * Bias the detached leaf outward from the
     * tree's center. This gives each leaf its own
     * escape direction instead of a shared orbit.
     */
    const radialDirection =
      new THREE.Vector3(
        position.x,
        0,
        position.z
      );

    if (
      radialDirection.lengthSq() <
      0.0001
    ) {
      radialDirection.set(
        branch.direction.x,
        0,
        branch.direction.z
      );
    }

    radialDirection.normalize();

    const tangentDirection =
      new THREE.Vector3(
        -radialDirection.z,
        0,
        radialDirection.x
      );

    const outwardDistance =
      lerp(
        0.18,
        0.7,
        randomB
      );

    position.add(
      radialDirection
        .clone()
        .multiplyScalar(
          outwardDistance
        )
    );

    const scaleVariation =
      lerp(
        0.82,
        1.18,
        randomC
      );

    floatingLeaves.push({
      index,
      position,

      direction:
        branch.direction
          .clone()
          .normalize(),

      rotation:
        randomB *
        Math.PI *
        2,

      scale:
        canopySize *
        scaleVariation,

      driftSeed:
        randomA *
        Math.PI *
        2,

      driftDirection:
        radialDirection,

      tangentDirection,

      driftDistance:
        lerp(
          0.45,
          1.5,
          randomB
        ),

      driftSpeed:
        lerp(
          0.18,
          0.42,
          randomC
        ),

      driftPhaseOffset:
        randomC *
        Math.PI *
        2,
    });
  }

  return floatingLeaves;
}

/*
 * Convert canopy cluster data into render geometry.
 */
export function createProceduralCanopyGeometry(
  canopyData = [],
  {
    gradientEnabled = false,
    gradientColor = "#181818",
    baseColor = "#080808",
  } = {}
) {
  const geometry =
    new THREE.BufferGeometry();

  if (!canopyData.length) {
    return geometry;
  }

  const leafGeometry =
    createLeafPolygonGeometry();
  const basePositions =
    leafGeometry
      .getAttribute(
        "position"
      )
      .array;

  const baseIndices =
    leafGeometry.index
      ?.array ?? [];

  const positions = [];
  const indices = [];
  const useGradient =
  gradientEnabled &&
  baseColor &&
  gradientColor;

  const baseColorValue =
  new THREE.Color(
    baseColor
  );

  const gradientColorValue =
  new THREE.Color(
    gradientColor
  );
  canopyData.forEach(
  (cluster) => {
    const baseIndex =
      positions.length / 3;

    const direction =
      cluster.direction?.clone().normalize() ??
      new THREE.Vector3(0, 1, 0);

    /*
     * Deterministic rotation around the
     * branch direction.
     *
     * This keeps the foliage reproducible
     * for the same tree seed while preventing
     * every polygon from facing identically.
     */
    const leafRotation =
      seededRandom(
        cluster.index * 137.17 +
          cluster.branchIndex * 41.73
      ) *
      Math.PI *
      2;

    for (
      let i = 0;
      i < basePositions.length;
      i += 3
    ) {
      const vertex =
        new THREE.Vector3(
          basePositions[i],
          basePositions[i + 1],
          basePositions[i + 2]
        );

      const orientedVertex =
        orientLeafVertex(
          vertex,
          direction,
          leafRotation
        );

      positions.push(
        orientedVertex.x *
          cluster.scale +
          cluster.position.x,

        orientedVertex.y *
          cluster.scale +
          cluster.position.y,

        orientedVertex.z *
          cluster.scale +
          cluster.position.z
      );
    }

    for (
      let i = 0;
      i < baseIndices.length;
      i += 1
    ) {
      indices.push(
        baseIndex +
          baseIndices[i]
      );
    }
  }
);
if (useGradient) {
  const colors = [];

  let minY = Infinity;
  let maxY = -Infinity;

  for (
    let i = 1;
    i < positions.length;
    i += 3
  ) {
    minY = Math.min(
      minY,
      positions[i]
    );

    maxY = Math.max(
      maxY,
      positions[i]
    );
  }

  const heightRange =
    Math.max(
      0.0001,
      maxY - minY
    );

  for (
    let i = 0;
    i < positions.length;
    i += 3
  ) {
    const y =
      positions[i + 1];

    const normalizedY =
      THREE.MathUtils.clamp(
        (y - minY) /
          heightRange,
        0,
        1
      );

    /*
     * Keep the gradient restrained.
     * The secondary color contributes
     * only partially rather than replacing
     * the primary color completely.
     */
    const gradientAmount =
      normalizedY * 0.5;

    const color =
      baseColorValue
        .clone()
        .lerp(
          gradientColorValue,
          gradientAmount
        );

    colors.push(
      color.r,
      color.g,
      color.b
    );
  }

  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      colors,
      3
    )
  );
}
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