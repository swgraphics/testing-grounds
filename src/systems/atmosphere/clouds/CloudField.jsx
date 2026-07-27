import * as THREE from "three";
import { useMemo } from "react";

import { createCloudMaterial }
from "./CloudMaterial";

import { getAtmospherePalette }
from "../atmospherePalette";

export default function CloudField() {
  const palette =
    getAtmospherePalette();

const material =
    useMemo(
        () =>
            createCloudMaterial(),
        []
    );
    material.uniforms.upperColor.value.copy(
    palette.cloudTopColor
);

material.uniforms.lowerColor.value.copy(
    palette.cloudBottomColor
);
  return (
    <mesh rotation={[0, 0, 0]}>
      <sphereGeometry
        args={[
          420,
          96,
          48,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ]}
      />

      <primitive object={material} attach="material" />
    </mesh>
  );
}