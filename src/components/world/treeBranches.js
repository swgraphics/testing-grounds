// treeBranches.js

import * as THREE from "three";

/*
 * Testing Grounds
 * Tree Generator — primary branch system
 *
 * This file defines HOW primary branches are generated.
 *
 * Branch data is generated separately from geometry so the
 * same branch structure can eventually drive:
 *
 * - branch geometry
 * - canopy placement
 * - leaf attachment
 * - natural cursor editing
 * - controller editing
 * - future secondary branches
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
 * Generate the structural data for the primary branches.
 *
 * This does NOT create Three.js geometry.
 *
 * Each branch contains:
 *
 * - index
 * - normalized trunk position
 * - origin
 * - end
 * - direction
 * - thickness
 * - length
 */
export function createProceduralBranchData(
  trunkDefinition,
  branchDefinition,
  seed = 1
) {
  if (!branchDefinition) {
    return [];
  }

  const count = Math.max(
    0,
    Math.round(
      branchDefinition.count ?? 0
    )
  );

  if (count === 0) {
    return [];
  }

  const segmentation = Math.max(
    2,
    Math.round(
      trunkDefinition?.segmentation ?? 50
    )
  );

  const height =
    lerp(
      2.5,
      9,
      clamp01(
        (trunkDefinition?.height ?? 50) /
          100
      )
    );

  const radius =
    lerp(
      0.12,
      0.42,
      clamp01(
        (trunkDefinition?.radius ?? 50) /
          100
      )
    );

  const branchLength =
    lerp(
      0.7,
      3.8,
      clamp01(
        (branchDefinition.length ?? 50) /
          100
      )
    );

  const branchThickness =
    lerp(
      0.035,
      0.16,
      clamp01(
        (branchDefinition.thickness ?? 50) /
          100
      )
    );

  const branchAngle =
    lerp(
      0.35,
      1.35,
      clamp01(
        (branchDefinition.angle ?? 50) /
          100
      )
    );

  const verticality =
    lerp(
      -0.45,
      0.65,
      clamp01(
        (branchDefinition.verticality ?? 50) /
          100
      )
    );

  const randomness =
    clamp01(
      (branchDefinition.randomness ?? 50) /
        100
    );

  const branchFrequency =
    clamp01(
      (branchDefinition.frequency ?? 50) /
        100
    );

  const usableSegments =
    Math.max(
      1,
      segmentation - 2
    );

  const branches = [];

  for (
    let branchIndex = 0;
    branchIndex < count;
    branchIndex += 1
  ) {
    const normalizedIndex =
      count === 1
        ? 0.5
        : branchIndex /
          (count - 1);

    const frequencyBias =
      Math.pow(
        normalizedIndex,
        lerp(
          0.6,
          1.8,
          branchFrequency
        )
      );

    const segmentFloat =
      1 +
      frequencyBias *
        usableSegments;

    const segmentIndex =
      Math.min(
        segmentation - 2,
        Math.max(
          1,
          Math.floor(
            segmentFloat
          )
        )
      );

    const trunkT =
      segmentIndex /
      (segmentation - 1);

    const y =
      trunkT * height;

    const baseAngle =
      (branchIndex /
        count) *
        Math.PI *
        2;

    const randomAngle =
      (seededRandom(
        seed +
          branchIndex *
            17.31
      ) -
        0.5) *
      randomness *
      0.9;

    const angle =
      baseAngle +
      randomAngle;

    const horizontal =
      Math.sin(
        branchAngle
      );

    const vertical =
      Math.cos(
        branchAngle
      ) *
      verticality;

    const direction =
      new THREE.Vector3(
        Math.cos(angle) *
          horizontal,
        vertical,
        Math.sin(angle) *
          horizontal
      ).normalize();

    const localRadius =
      radius *
      (
        1 -
        trunkT *
          (
            (trunkDefinition?.taper ??
              50) /
            100
          ) *
          0.45
      );

    const origin =
      new THREE.Vector3(
        0,
        y,
        0
      );

    const end =
      origin
        .clone()
        .add(
          direction
            .clone()
            .multiplyScalar(
              branchLength
            )
        );

    branches.push({
      index: branchIndex,

      trunkT,

      origin,
      end,

      direction,

      length: branchLength,

      thickness:
        branchThickness,

      localRadius,
    });
  }

  return branches;
}

/*
 * Convert the reusable branch data into render geometry.
 */
export function createProceduralBranchGeometry(
  trunkDefinition,
  branchDefinition,
  seed = 1
) {
  const geometry =
    new THREE.BufferGeometry();

  const branches =
    createProceduralBranchData(
      trunkDefinition,
      branchDefinition,
      seed
    );

  if (
    branches.length === 0
  ) {
    return geometry;
  }

  const positions = [];
  const indices = [];

  const sides = 6;

  branches.forEach(
    (branch) => {
      const {
        origin,
        end,
        thickness,
        localRadius,
      } = branch;

      const axis =
        end
          .clone()
          .sub(origin)
          .normalize();

      const reference =
        Math.abs(axis.y) > 0.9
          ? new THREE.Vector3(
              1,
              0,
              0
            )
          : new THREE.Vector3(
              0,
              1,
              0
            );

      const sideA =
        new THREE.Vector3()
          .crossVectors(
            axis,
            reference
          )
          .normalize();

      const sideB =
        new THREE.Vector3()
          .crossVectors(
            axis,
            sideA
          )
          .normalize();

      const baseIndex =
        positions.length / 3;

      for (
        let sideIndex = 0;
        sideIndex < sides;
        sideIndex += 1
      ) {
        const angleAround =
          (sideIndex /
            sides) *
          Math.PI *
          2;

        const radial =
          sideA
            .clone()
            .multiplyScalar(
              Math.cos(
                angleAround
              )
            )
            .add(
              sideB
                .clone()
                .multiplyScalar(
                  Math.sin(
                    angleAround
                  )
                )
            );

        const basePoint =
          origin
            .clone()
            .add(
              radial
                .clone()
                .multiplyScalar(
                  thickness +
                    localRadius *
                      0.08
                )
            );

        const tipPoint =
          end
            .clone()
            .add(
              radial
                .clone()
                .multiplyScalar(
                  thickness *
                    0.45
                )
            );

        positions.push(
          basePoint.x,
          basePoint.y,
          basePoint.z,

          tipPoint.x,
          tipPoint.y,
          tipPoint.z
        );
      }

      for (
        let sideIndex = 0;
        sideIndex < sides;
        sideIndex += 1
      ) {
        const next =
          (sideIndex + 1) %
          sides;

        const current =
          baseIndex +
          sideIndex * 2;

        const currentTip =
          current + 1;

        const nextBase =
          baseIndex +
          next * 2;

        const nextTip =
          nextBase + 1;

        indices.push(
          current,
          nextBase,
          currentTip
        );

        indices.push(
          currentTip,
          nextBase,
          nextTip
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