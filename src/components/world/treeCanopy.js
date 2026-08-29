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

function createLeafPolygonGeometry() {
  /*
   * Canonical foliage shape.
   *
   * This remains a single flat polygon.
   * Every foliage instance is generated from
   * this same underlying shape.
   *
   * The vertices are intentionally explicit so
   * the eventual natural-editing system can
   * manipulate the shape directly.
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

  /*
   * Fan triangulation around the first vertex.
   */
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
  const targetCount =
    Math.max(
      1,
      Math.round(
        lerp(
          1,
          branches.length,
          density
        )
      )
    );

  const canopySize =
    lerp(
      0.35,
      1.35,
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

    const spread =
      lerp(
        1.15,
        0.25,
        clustering
      );

    const position =
      branch.end
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

  /*
   * Always provide a central top cluster when
   * there are branches.
   *
   * This prevents the tree from looking like a
   * collection of detached branch tips.
   */
  if (clusters.length > 0) {
    const highestBranch =
      branches.reduce(
        (highest, branch) =>
          branch.trunkT >
          highest.trunkT
            ? branch
            : highest,
        branches[0]
      );

    const topPosition =
      highestBranch.end
        .clone()
        .add(
          new THREE.Vector3(
            0,
            canopySize * 0.55,
            0
          )
        );

    clusters.push({
      index:
        clusters.length,

      branchIndex:
        highestBranch.index,

      position:
        topPosition,

      scale:
        canopySize *
        1.12,

      branchT:
        highestBranch.trunkT,

      direction:
        new THREE.Vector3(
          0,
          1,
          0
        ),
    });
  }

  return clusters;
}

/*
 * Convert canopy cluster data into render geometry.
 */
export function createProceduralCanopyGeometry(
  canopyData = []
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