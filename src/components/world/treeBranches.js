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

    const overrides = branchDefinition?.overrides?.[branchIndex] ?? null;
    let resolvedDirection = direction.clone();
    let resolvedLength = branchLength;
    let resolvedThickness = structuralThickness;
    let resolvedTaper = clamp01((branchDefinition?.taper ?? 50) / 100);

    if (overrides) {
      if (Number.isFinite(Number(overrides.length))) {
        resolvedLength = THREE.MathUtils.lerp(0.45, 6, clamp01(Number(overrides.length) / 100));
      }
      if (Number.isFinite(Number(overrides.thickness))) {
        resolvedThickness = THREE.MathUtils.lerp(0.02, 0.22, clamp01(Number(overrides.thickness) / 100));
      }
      if (Number.isFinite(Number(overrides.verticality))) {
        const targetVerticality = lerp(-0.45, 0.65, clamp01(Number(overrides.verticality) / 100));
        const horizontal = Math.sqrt(Math.max(0.02, 1 - targetVerticality * targetVerticality));
        resolvedDirection.set(
          Math.cos(azimuth) * horizontal,
          targetVerticality,
          Math.sin(azimuth) * horizontal,
        ).normalize();
      }
      if (Number.isFinite(Number(overrides.taper))) {
        resolvedTaper = clamp01(Number(overrides.taper) / 100);
      }
    }

    const resolvedEnd = origin
      .clone()
      .add(resolvedDirection.clone().multiplyScalar(resolvedLength));

    branches.push({
      index: branchIndex,
      trunkT,
      origin,
      end: resolvedEnd,
      direction: resolvedDirection,
      length: resolvedLength,
      thickness: resolvedThickness,
      localRadius,
      azimuth,
      elevation: Math.acos(THREE.MathUtils.clamp(resolvedDirection.y, -1, 1)),
      taper: resolvedTaper,
    });
  }

  return [
    ...branches,
    ...createCustomBranchData(
      trunkDefinition,
      branchDefinition,
      seed,
      branches.length
    ),
  ];
}


function createCustomBranchData(trunkDefinition, branchDefinition, seed, proceduralCount) {
  const custom = Array.isArray(branchDefinition?.custom) ? branchDefinition.custom : [];
  if (!custom.length) return [];

  const height = lerp(4.5, 8.5, clamp01((trunkDefinition?.height ?? 50) / 100));
  const radius = lerp(0.16, 0.42, clamp01((trunkDefinition?.radius ?? 50) / 100));
  const taper = clamp01((trunkDefinition?.taper ?? 50) / 100);
  const maxBend = lerp(0, 0.85, clamp01((trunkDefinition?.bend ?? 50) / 100));
  const baseThickness = lerp(0.035, 0.16, clamp01((branchDefinition?.thickness ?? 50) / 100));
  const secondaryCount = Math.max(0, Math.min(8, Math.round(branchDefinition?.secondary?.count ?? 0)));

  const trunkPoint = (t) => {
    const clampedT = THREE.MathUtils.clamp(Number(t) || 0.5, 0.05, 0.95);
    const bendAmount = Math.sin(clampedT * Math.PI * 0.5) * maxBend;
    return new THREE.Vector3(
      bendAmount,
      clampedT * height,
      Math.sin(clampedT * Math.PI) * maxBend * 0.22,
    );
  };

  const result = [];
  custom.forEach((entry, customIndex) => {
    const origin = Array.isArray(entry?.origin)
      ? new THREE.Vector3(Number(entry.origin[0]) || 0, Number(entry.origin[1]) || 0, Number(entry.origin[2]) || 0)
      : trunkPoint(entry?.trunkT ?? 0.55);
    const direction = new THREE.Vector3(
      Number(entry?.direction?.[0]) || 1,
      Number(entry?.direction?.[1]) || 0.12,
      Number(entry?.direction?.[2]) || 0,
    ).normalize();
    const length = THREE.MathUtils.clamp(Number(entry?.length) || 2.2, 0.45, 6);
    const thickness = THREE.MathUtils.clamp(Number(entry?.thickness) || baseThickness, 0.02, 0.22);
    const end = origin.clone().add(direction.clone().multiplyScalar(length));
    const primary = {
      index: proceduralCount + result.length,
      custom: true,
      customIndex,
      trunkT: Number(entry?.trunkT ?? 0.55),
      origin,
      end,
      direction,
      length,
      thickness,
      localRadius: radius,
      azimuth: Math.atan2(direction.z, direction.x),
      elevation: Math.acos(THREE.MathUtils.clamp(direction.y, -1, 1)),
      taper,
    };
    result.push(primary);

    for (let childIndex = 0; childIndex < secondaryCount; childIndex += 1) {
      const t = 0.32 + ((childIndex + 1) / (secondaryCount + 1)) * 0.45;
      const childOrigin = origin.clone().lerp(end, t);
      const phase = seed * 0.17 + customIndex * 2.41 + childIndex * 2.399;
      const radial = new THREE.Vector3(Math.cos(phase), 0, Math.sin(phase));
      const childDirection = direction.clone().multiplyScalar(0.58).add(radial.multiplyScalar(0.78));
      childDirection.y += 0.16 + (childIndex % 2) * 0.08;
      childDirection.normalize();
      const childLength = length * THREE.MathUtils.lerp(0.38, 0.62, (childIndex % 5) / 4);
      result.push({
        index: proceduralCount + result.length,
        custom: true,
        customIndex,
        secondary: true,
        trunkT: primary.trunkT,
        origin: childOrigin,
        end: childOrigin.clone().add(childDirection.clone().multiplyScalar(childLength)),
        direction: childDirection,
        length: childLength,
        thickness: thickness * 0.56,
        localRadius: radius,
        azimuth: Math.atan2(childDirection.z, childDirection.x),
        elevation: Math.acos(THREE.MathUtils.clamp(childDirection.y, -1, 1)),
        taper,
      });
    }
  });
  return result;
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
      thickness * THREE.MathUtils.lerp(0.46, 0.08, clamp01(Number(branch.taper ?? 50) / 100));

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
