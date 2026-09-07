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
  if (!leavesDefinition || !branches.length) {
    return [];
  }

  const size = clamp01(
    (leavesDefinition.size ?? 50) / 100
  );

  const density = clamp01(
    (leavesDefinition.density ?? 50) / 100
  );

  const clustering = clamp01(
    (leavesDefinition.clustering ?? 50) / 100
  );

  const distribution = clamp01(
    (leavesDefinition.distribution ?? 50) / 100
  );

  /*
   * Keep the same general density control, but guarantee foliage
   * on every branch instead of concentrating too many leaves on
   * the upper branches.
   */
  const leavesPerBranch = Math.max(
    2,
    Math.round(
      lerp(2, 14, density)
    )
  );

  /*
   * Smaller physical leaf scale. The Tree Editor's SIZE slider
   * still controls the result, but the default Crimson Tree now
   * uses compact foliage rather than oversized polygons.
   */
  const canopySize = lerp(
    0.08,
    0.30,
    size
  );

  const clusters = [];

  branches.forEach((branch, branchIndex) => {
    for (
      let leafIndex = 0;
      leafIndex < leavesPerBranch;
      leafIndex += 1
    ) {
      const clusterIndex =
        branchIndex * leavesPerBranch +
        leafIndex;

      const branchProgress =
        leavesPerBranch === 1
          ? 0.5
          : leafIndex /
            (leavesPerBranch - 1);

      /*
       * Deliberately place foliage through the inner, middle,
       * and outer portions of every branch.
       *
       * The first group builds the dense center.
       * The middle group fills the crown.
       * The final group reaches the branch tips.
       */
      const zone =
        branchProgress < 0.30
          ? 0
          : branchProgress < 0.72
            ? 1
            : 2;

      const randomAlong =
        seededRandom(
          seed +
            clusterIndex * 83.61 +
            3.17
        );

      let alongStart;
      let alongEnd;

      if (zone === 0) {
        alongStart = 0.16;
        alongEnd = 0.44;
      } else if (zone === 1) {
        alongStart = 0.34;
        alongEnd = 0.76;
      } else {
        alongStart = 0.64;
        alongEnd = 1.02;
      }

      /*
       * Distribution still affects where the canopy favors foliage,
       * but only gently. It no longer removes the important center fill.
       */
      const upperBias =
        distribution * 0.18;

      const alongBranch = THREE.MathUtils.clamp(
        lerp(
          alongStart,
          alongEnd,
          randomAlong
        ) +
          upperBias *
            (branch.trunkT - 0.35),
        0.12,
        1.0
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
       * High clustering keeps foliage near the branch.
       * Lower clustering allows a softer crown silhouette.
       */
      const spread = lerp(
        0.34,
        0.07,
        clustering
      );

      const randomX =
        seededRandom(
          seed +
            clusterIndex * 31.17 +
            9.11
        ) - 0.5;

      const randomY =
        seededRandom(
          seed +
            clusterIndex * 47.91 +
            4.73
        ) - 0.5;

      const randomZ =
        seededRandom(
          seed +
            clusterIndex * 73.43 +
            6.29
        ) - 0.5;

      const position =
        anchor
          .clone()
          .add(
            new THREE.Vector3(
              randomX * spread,
              randomY * spread * 0.75,
              randomZ * spread
            )
          );

      /*
       * Fan foliage slightly outward from the tree center.
       * This is especially useful for the inner leaves, which
       * otherwise all inherit the same branch direction.
       */
      const outward =
        new THREE.Vector3(
          position.x,
          0,
          position.z
        );

      if (outward.lengthSq() > 0.0001) {
        outward.normalize();
      } else {
        outward.set(0, 0, 1);
      }

      const foliageDirection =
        branch.direction
          .clone()
          .lerp(
            outward,
            0.16
          )
          .normalize();

      /*
       * Individual leaves remain varied without changing the
       * editable master leaf shape.
       */
      const variation = lerp(
        0.76,
        1.18,
        seededRandom(
          seed +
            clusterIndex * 91.27 +
            2.88
        )
      );

      clusters.push({
        index: clusterIndex,
        branchIndex: branch.index,
        position,
        scale:
          canopySize *
          variation,
        branchT: branch.trunkT,
        direction: foliageDirection,
      });
    }
  });

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