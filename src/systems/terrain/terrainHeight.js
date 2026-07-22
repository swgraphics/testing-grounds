import * as THREE from "three";
import { terrainSettings } from "./terrainSettings";

export function smoothStep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function getTerrainHeightAt(x, z) {
  const distance = Math.sqrt(x * x + z * z);

  const flatSquareSize = 90;

  const terrainBlend = smoothStep(95, 190, distance);

  let rolling = 0;

  rolling += Math.sin(x * 0.018) * 10 * terrainSettings.rollingHills;
  rolling += Math.cos(z * 0.022) * 8 * terrainSettings.rollingHills;
  rolling += Math.sin((x + z) * 0.012) * 6 * terrainSettings.rollingHills;

  const mountainDistance = Math.sqrt(
    (x - 160) * (x - 160) + (z + 170) * (z + 170)
  );

  const mountain = Math.max(
    0,
    70 * terrainSettings.mountainHeight - mountainDistance * 0.35
  );

  const ridge =
    Math.max(
      0,
      Math.sin((x - 80) * 0.025 * terrainSettings.cliffSharpness) * 22
    ) * terrainSettings.ridgeStrength;

  let height =
    (rolling + mountain + ridge) *
    terrainBlend *
    terrainSettings.heightMultiplier;

const plateauStrength =
  (terrainSettings.plateauAmount ?? 0) /
  100;

const plateauLevel =
  42 * terrainSettings.heightMultiplier;

if (height > plateauLevel) {
  const flattenedHeight =
    plateauLevel +
    (height - plateauLevel) * 0.16;

  height = THREE.MathUtils.lerp(
    height,
    flattenedHeight,
    plateauStrength
  );
}

/*
 * Geometric Terrain V1
 *
 * Quantizes the final terrain height into broader
 * vertical steps. The original terrain shape remains
 * intact, but the surface becomes more angular and
 * stylized as geometryStrength increases.
 */
const geometryStrength =
  THREE.MathUtils.clamp(
    (terrainSettings.geometryStrength ?? 0) /
      100,
    0,
    1
  );

if (geometryStrength > 0) {
  const minimumStep = 0.25;
  const maximumStep = 8;

  const geometryStep =
    THREE.MathUtils.lerp(
      minimumStep,
      maximumStep,
      geometryStrength
    );

  const quantizedHeight =
    Math.round(height / geometryStep) *
    geometryStep;

  height = THREE.MathUtils.lerp(
    height,
    quantizedHeight,
    geometryStrength
  );
}

const insideSpawnSquare =
  Math.abs(x) < flatSquareSize &&
  Math.abs(z) < flatSquareSize;

  if (insideSpawnSquare) {
    height = 0;
  }

  return height;
}