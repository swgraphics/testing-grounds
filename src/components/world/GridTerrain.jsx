import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const TERRAIN_BASE_COLOR = new THREE.Color(
  "#080b10"
);

const TERRAIN_HIGH_COLOR = new THREE.Color(
  "#4a535c"
);

const TERRAIN_MAX_GRADIENT_HEIGHT = 85;

export default function GridTerrain() {
  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange() {
      refresh((value) => value + 1);
    }

    window.addEventListener(
      "terrain-settings-changed",
      handleTerrainChange
    );

    return () => {
      window.removeEventListener(
        "terrain-settings-changed",
        handleTerrainChange
      );
    };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      600,
      600,
      120,
      120
    );

    geo.rotateX(-Math.PI / 2);

    const positions =
      geo.attributes.position;

    const colors = [];

    const vertexColor = new THREE.Color();

    for (
      let i = 0;
      i < positions.count;
      i += 1
    ) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const height = getTerrainHeightAt(x, z);

      positions.setY(i, height);

      /*
       * Terrain at ground level uses the exact same
       * color as GridFloor.
       *
       * Higher terrain gradually becomes lighter.
       */
      const normalizedHeight =
        THREE.MathUtils.clamp(
          height /
            TERRAIN_MAX_GRADIENT_HEIGHT,
          0,
          1
        );

      const smoothedHeight =
        THREE.MathUtils.smoothstep(
          normalizedHeight,
          0,
          1
        );

      vertexColor.lerpColors(
        TERRAIN_BASE_COLOR,
        TERRAIN_HIGH_COLOR,
        smoothedHeight
      );

      colors.push(
        vertexColor.r,
        vertexColor.g,
        vertexColor.b
      );
    }

    geo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        colors,
        3
      )
    );

    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }, [
    terrainSettings.heightMultiplier,
    terrainSettings.mountainHeight,
    terrainSettings.cliffSharpness,
    terrainSettings.rollingHills,
    terrainSettings.ridgeStrength,
    terrainSettings.plateauAmount,
  ]);

  /*
   * Only terrain-shape settings should rebuild the
   * Rapier terrain body.
   *
   * Wind, fog, sun and scatter changes should not
   * remount the terrain collider.
   */
  const terrainPhysicsKey = [
    terrainSettings.heightMultiplier,
    terrainSettings.mountainHeight,
    terrainSettings.cliffSharpness,
    terrainSettings.rollingHills,
    terrainSettings.ridgeStrength,
    terrainSettings.plateauAmount,
  ].join("-");

  return (
    <RigidBody
      key={terrainPhysicsKey}
      type="fixed"
      colliders="trimesh"
    >
      <mesh
        geometry={geometry}
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    </RigidBody>
  );
}