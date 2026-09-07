// treeBranches.js

import * as THREE from "three";

/*
 * Testing Grounds
 * Tree Generator — primary branch system
 *
 * Branch data is generated separately from geometry so the same
 * structure can eventually drive rendering, canopy placement,
 * leaf attachment, cursor editing, controller editing, and
 * future secondary branches.
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
    Math.round(branchDefinition.count ?? 0)
  );

  if (count === 0) {
    return [];
  }

  const height = lerp(
    4.5,
    8.5,
    clamp01((trunkDefinition?.height ?? 50) / 100)
  );

  const radius = lerp(
    0.16,
    0.42,
    clamp01((trunkDefinition?.radius ?? 50) / 100)
  );

  const maxBend = lerp(
    0,
    0.85,
    clamp01((trunkDefinition?.bend ?? 50) / 100)
  );

  const taper = clamp01(
    (trunkDefinition?.taper ?? 50) / 100
  );

  const baseBranchLength = lerp(
    0.7,
    3.8,
    clamp01((branchDefinition.length ?? 50) / 100)
  );

  const baseBranchThickness = lerp(
    0.035,
    0.16,
    clamp01((branchDefinition.thickness ?? 50) / 100)
  );

  /*
   * Branch Angle is the main elevation angle.
   * Lower values create more upward branches.
   * Higher values create flatter branches.
   */
  const baseBranchAngle = lerp(
    0.35,
    1.35,
    clamp01((branchDefinition.angle ?? 50) / 100)
  );

  /*
   * Verticality remains an additional multiplier so the existing
   * editor control keeps its meaning.
   */
  const verticality = lerp(
    -0.45,
    0.65,
    clamp01((branchDefinition.verticality ?? 50) / 100)
  );

  const randomness = clamp01(
    (branchDefinition.randomness ?? 50) / 100
  );

  const branchFrequency = clamp01(
    (branchDefinition.frequency ?? 50) / 100
  );

  const minimumBranchT = clamp01(
    (branchDefinition.baseTrunk ?? 25) / 100
  );

  /*
   * The highest quarter of the trunk transitions into the pointed crown.
   */
  const upperBranchThreshold = 0.70;

  /*
   * Golden-angle spacing prevents the branches from accidentally
   * stacking into the same few radial directions. Seeded jitter
   * then breaks the mathematical pattern for each individual tree.
   */
  const goldenAngle =
    Math.PI * (3 - Math.sqrt(5));

  const branches = [];

  for (
    let branchIndex = 0;
    branchIndex < count;
    branchIndex += 1
  ) {
    const normalizedIndex =
      count === 1
        ? 0.5
        : branchIndex / (count - 1);

    /*
     * Frequency controls where the branch population concentrates.
     * Lower frequency pushes more branches upward.
     * Higher frequency distributes more branches toward the lower/mid tree.
     */
    const frequencyPower = lerp(
      0.72,
      1.18,
      branchFrequency
    );

    const frequencyBias =
      Math.pow(normalizedIndex, frequencyPower);

    const distributionT =
      minimumBranchT +
      frequencyBias * (1 - minimumBranchT);

    /*
     * Strong primary variation breaks the remaining visible "ladder"
     * pattern. A second smaller variation gives the tree a less
     * mechanically repeated structural rhythm.
     */
    const heightVariation =
      (seededRandom(
        seed + branchIndex * 43.71 + 19.27
      ) - 0.5) *
      randomness *
      0.32;

    const secondaryHeightVariation =
      (seededRandom(
        seed + branchIndex * 71.43 + 5.82
      ) - 0.5) *
      randomness *
      0.12;

    const trunkT = Math.min(
      0.95,
      Math.max(
        minimumBranchT,
        distributionT +
          heightVariation +
          secondaryHeightVariation
      )
    );

    const y = trunkT * height;

    const upperZoneProgress =
      trunkT >= upperBranchThreshold
        ? clamp01(
            (trunkT - upperBranchThreshold) /
              (1 - upperBranchThreshold)
          )
        : 0;

    /*
     * Branches begin shortening before the very top so the crown
     * closes naturally instead of ending in a flat final tier.
     */
    const crownLengthMultiplier =
      trunkT >= 0.56
        ? lerp(
            1.0,
            0.30,
            clamp01(
              (trunkT - 0.56) / 0.44
            )
          )
        : 1;

    const branchLengthVariation = lerp(
      0.72,
      1.28,
      seededRandom(
        seed + branchIndex * 57.19 + 11.42
      )
    );

    const branchLength =
      baseBranchLength *
      crownLengthMultiplier *
      branchLengthVariation;

    /*
     * Use golden-angle spacing plus deterministic jitter.
     * This gives each tree balanced radial coverage without
     * making opposite sides mirror each other.
     */
    const azimuthJitter =
      (seededRandom(
        seed + branchIndex * 17.31 + 2.41
      ) - 0.5) *
      randomness *
      0.95;

    const azimuth =
      seed * 0.173 +
      branchIndex * goldenAngle +
      azimuthJitter;

    /*
     * Each branch gets its own elevation. Upper branches are
     * encouraged slightly upward, while the random component
     * still allows some flatter and gently drooping branches.
     */
    const elevationVariation =
      (seededRandom(
        seed + branchIndex * 31.73 + 7.19
      ) - 0.5) *
      randomness *
      0.62;

    const crownLift =
      trunkT > 0.52
        ? -0.24 *
          clamp01(
            (trunkT - 0.52) / 0.48
          )
        : 0;

    const branchElevation = THREE.MathUtils.clamp(
      baseBranchAngle +
        elevationVariation +
        crownLift,
      0.40,
      1.30
    );

    /*
     * Small per-branch verticality variation prevents every branch
     * from having the same pitch while preserving the editor slider.
     */
    const verticalityVariation = lerp(
      0.88,
      1.12,
      seededRandom(
        seed + branchIndex * 67.13 + 13.77
      )
    );

    const horizontal =
      Math.sin(branchElevation);

    const vertical =
      Math.cos(branchElevation) *
      verticality *
      verticalityVariation;

    const direction = new THREE.Vector3(
      Math.cos(azimuth) * horizontal,
      vertical,
      Math.sin(azimuth) * horizontal
    ).normalize();

    const topRadius =
      THREE.MathUtils.lerp(
        radius * 0.95,
        radius * 0.22,
        taper
      );

    const localRadius =
      THREE.MathUtils.lerp(
        radius,
        topRadius,
        trunkT
      );

    /*
     * Branches originate on the same curved centerline used by
     * treeGeometry.js.
     */
    const bendAmount =
      Math.sin(
        trunkT * Math.PI * 0.5
      ) * maxBend;

    const centerX = bendAmount;

    const centerZ =
      Math.sin(
        trunkT * Math.PI
      ) *
      maxBend *
      0.22;

    const origin = new THREE.Vector3(
      centerX,
      y,
      centerZ
    );

    const end = origin
      .clone()
      .add(
        direction
          .clone()
          .multiplyScalar(branchLength)
      );

    /*
     * Lower branches are naturally thicker. Individual variation
     * prevents the forest from looking like copies of one scaffold.
     */
    const thicknessVariation = lerp(
      0.86,
      1.14,
      seededRandom(
        seed + branchIndex * 89.17 + 21.44
      )
    );

    const structuralThickness =
      baseBranchThickness *
      lerp(1.14, 0.72, trunkT) *
      thicknessVariation;

    branches.push({
      index: branchIndex,
      trunkT,
      origin,
      end,
      direction,
      length: branchLength,
      thickness: structuralThickness,
      localRadius,
      azimuth,
      elevation: branchElevation,
    });
  }

  return branches;
}

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

  if (!branches.length) {
    return geometry;
  }

  const positions = [];
  const indices = [];
  const sides = 6;

  branches.forEach((branch) => {
    const {
      origin,
      end,
      thickness,
      localRadius,
    } = branch;

    const axis = end
      .clone()
      .sub(origin)
      .normalize();

    const reference =
      Math.abs(axis.y) > 0.9
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);

    const sideA = new THREE.Vector3()
      .crossVectors(axis, reference)
      .normalize();

    const sideB = new THREE.Vector3()
      .crossVectors(axis, sideA)
      .normalize();

    const baseIndex =
      positions.length / 3;

    /*
     * A stronger taper at the tip makes the branch read as a
     * living limb rather than a uniform pipe.
     */
    const baseThickness =
      thickness +
      localRadius * 0.08;

    const tipThickness =
      thickness * 0.24;

    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const angleAround =
        (sideIndex / sides) *
        Math.PI *
        2;

      const radial = sideA
        .clone()
        .multiplyScalar(
          Math.cos(angleAround)
        )
        .add(
          sideB
            .clone()
            .multiplyScalar(
              Math.sin(angleAround)
            )
        );

      const basePoint = origin
        .clone()
        .add(
          radial
            .clone()
            .multiplyScalar(baseThickness)
        );

      const tipPoint = end
        .clone()
        .add(
          radial
            .clone()
            .multiplyScalar(tipThickness)
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
        (sideIndex + 1) % sides;

      const current =
        baseIndex + sideIndex * 2;

      const currentTip =
        current + 1;

      const nextBase =
        baseIndex + next * 2;

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
  });

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
