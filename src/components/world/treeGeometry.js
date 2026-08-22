// treeGeometry.js

import * as THREE from "three";

/*
 * Testing Grounds
 * Procedural Tree Geometry
 *
 * This file converts Tree Generator data into Three.js geometry.
 *
 * treeGenerator.js = WHAT the tree is
 * treeGeometry.js  = HOW the tree is constructed
 *
 * Branches and leaves will be added to this system later.
 */

function mapRange(value, min, max, outMin, outMax) {
  const normalized =
    THREE.MathUtils.clamp(value, min, max) / (max - min);

  return THREE.MathUtils.lerp(
    outMin,
    outMax,
    normalized
  );
}

export function createProceduralTrunkGeometry(
  trunk = {}
) {
  const heightValue = trunk.height ?? 50;
  const radiusValue = trunk.radius ?? 50;
  const taperValue = trunk.taper ?? 50;
  const bendValue = trunk.bend ?? 50;
  const segmentationValue =
    trunk.segmentation ?? 50;

  /*
   * Generator ranges.
   *
   * These are deliberately conservative for
   * the first vertical slice. We can expand
   * the ranges later without changing the
   * underlying architecture.
   */

  const height = mapRange(
    heightValue,
    0,
    100,
    4.5,
    8.5
  );

  const baseRadius = mapRange(
    radiusValue,
    0,
    100,
    0.16,
    0.42
  );

  const topRadius = mapRange(
    taperValue,
    0,
    100,
    baseRadius * 0.95,
    baseRadius * 0.22
  );

  const maxBend = mapRange(
    bendValue,
    0,
    100,
    0,
    0.85
  );

  /*
   * Segmentation controls how many
   * independently shaped rings form the trunk.
   *
   * More segments = smoother / more
   * controllable bending.
   */

  const segments = Math.round(
    mapRange(
      segmentationValue,
      0,
      100,
      4,
      18
    )
  );

  const radialSegments = 7;

  const positions = [];
  const indices = [];

  /*
   * Build the trunk from horizontal rings.
   *
   * Each ring can:
   * - change radius
   * - move horizontally
   *
   * That gives us the foundation for
   * future branch attachment points.
   */

  for (
    let segmentIndex = 0;
    segmentIndex <= segments;
    segmentIndex += 1
  ) {
    const t =
      segmentIndex / segments;

    const y = t * height;

    /*
     * Smooth bend curve.
     *
     * The trunk begins at the origin
     * and gradually bends toward the top.
     */

    const bendAmount =
      Math.sin(t * Math.PI * 0.5) *
      maxBend;

    const centerX = bendAmount;
    const centerZ =
      Math.sin(t * Math.PI) *
      maxBend *
      0.22;

    /*
     * Taper is applied continuously
     * from base to top.
     */

    const radius = THREE.MathUtils.lerp(
      baseRadius,
      topRadius,
      t
    );

    for (
      let radialIndex = 0;
      radialIndex < radialSegments;
      radialIndex += 1
    ) {
      const angle =
        (radialIndex / radialSegments) *
        Math.PI *
        2;

      /*
       * Slight deterministic irregularity
       * prevents the trunk from looking like
       * a perfect manufactured cylinder.
       */

      const irregularity =
        1 +
        Math.sin(
          radialIndex * 2.31 +
          segmentIndex * 1.71
        ) *
          0.055;

      const ringRadius =
        radius * irregularity;

      positions.push(
        centerX +
          Math.cos(angle) *
            ringRadius,

        y,

        centerZ +
          Math.sin(angle) *
            ringRadius
      );
    }
  }

  /*
   * Connect neighboring rings.
   */

  for (
    let segmentIndex = 0;
    segmentIndex < segments;
    segmentIndex += 1
  ) {
    for (
      let radialIndex = 0;
      radialIndex < radialSegments;
      radialIndex += 1
    ) {
      const nextRadial =
        (radialIndex + 1) %
        radialSegments;

      const current =
        segmentIndex *
          radialSegments +
        radialIndex;

      const currentNext =
        segmentIndex *
          radialSegments +
        nextRadial;

      const above =
        (segmentIndex + 1) *
          radialSegments +
        radialIndex;

      const aboveNext =
        (segmentIndex + 1) *
          radialSegments +
        nextRadial;

      indices.push(
        current,
        above,
        currentNext
      );

      indices.push(
        currentNext,
        above,
        aboveNext
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