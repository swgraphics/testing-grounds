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

/*
 * Creates one low-poly foliage cluster.
 *
 * The cluster is intentionally simple at this stage.
 * The important part is its position and relationship
 * to the generated branches.
 */
function createClusterGeometry(
  sides = 7,
  rings = 4
) {
  const positions = [];
  const indices = [];

  for (
    let ringIndex = 0;
    ringIndex < rings;
    ringIndex += 1
  ) {
    const t =
      ringIndex /
      (rings - 1);

    const y =
      lerp(
        -1,
        1,
        t
      );

    /*
     * Bulge toward the middle of the cluster.
     */
    const radius =
      Math.sin(
        t * Math.PI
      );

    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const angle =
        (sideIndex /
          sides) *
        Math.PI *
        2;

      const irregularity =
        1 +
        Math.sin(
          sideIndex * 2.31 +
            ringIndex * 1.71
        ) *
          0.12;

      const finalRadius =
        radius *
        irregularity;

      positions.push(
        Math.cos(angle) *
          finalRadius,

        y,

        Math.sin(angle) *
          finalRadius
      );
    }
  }

  for (
    let ringIndex = 0;
    ringIndex < rings - 1;
    ringIndex += 1
  ) {
    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const nextSide =
        (sideIndex + 1) %
        sides;

      const current =
        ringIndex * sides +
        sideIndex;

      const currentNext =
        ringIndex * sides +
        nextSide;

      const below =
        (ringIndex + 1) *
          sides +
        sideIndex;

      const belowNext =
        (ringIndex + 1) *
          sides +
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

/*
 * Generate foliage cluster placement data.
 *
 * This is deliberately separate from geometry so the same
 * foliage structure can eventually drive:
 *
 * - visual foliage
 * - leaf attachment
 * - cursor editing
 * - controller editing
 * - saved object data
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

  const clusterGeometry =
    createClusterGeometry();

  const basePositions =
    clusterGeometry
      .getAttribute(
        "position"
      )
      .array;

  const baseIndices =
    clusterGeometry.index
      ?.array ?? [];

  const positions = [];
  const indices = [];

  canopyData.forEach(
    (cluster) => {
      const baseIndex =
        positions.length / 3;

      for (
        let i = 0;
        i <
        basePositions.length;
        i += 3
      ) {
        positions.push(
          basePositions[i] *
            cluster.scale +
            cluster.position.x,

          basePositions[i + 1] *
            cluster.scale +
            cluster.position.y,

          basePositions[i + 2] *
            cluster.scale +
            cluster.position.z
        );
      }

      for (
        let i = 0;
        i <
        baseIndices.length;
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