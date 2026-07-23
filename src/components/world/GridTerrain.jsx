import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const TERRAIN_SIZE = 600;
const TERRAIN_SEGMENTS = 120;

/*
 * Distance between visible Testing Grounds
 * grid lines.
 */
const TERRAIN_GRID_STEP = 10;

/*
 * Distance between sampled vertices along
 * each grid line.
 *
 * Smaller values conform more accurately but
 * create more geometry.
 */
const TERRAIN_GRID_SAMPLE_STEP = 5;

/*
 * Raises the grid slightly above the solid
 * terrain to prevent z-fighting.
 */
const TERRAIN_GRID_OFFSET = 0.08;

const TERRAIN_BASE_COLOR = new THREE.Color(
  "#080b10"
);

const TERRAIN_HIGH_COLOR = new THREE.Color(
  "#4a535c"
);

const TERRAIN_MAX_GRADIENT_HEIGHT = 85;

const TERRAIN_GRID_COLOR = "#dfefff";

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

  /*
   * Solid terrain geometry.
   */
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS
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

      const height =
        getTerrainHeightAt(x, z);

      positions.setY(i, height);

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
    terrainSettings.geometryStrength,
  ]);

  /*
   * Terrain Grid V1
   *
   * Creates square north/south and east/west
   * lines. Every point samples the exact same
   * terrain-height function as the solid mesh.
   */
  const terrainGridGeometry = useMemo(() => {
    const halfSize = TERRAIN_SIZE / 2;

    const linePositions = [];

    /*
     * East/west lines.
     *
     * Z remains fixed while X moves across
     * the terrain.
     */
    for (
      let z = -halfSize;
      z <= halfSize;
      z += TERRAIN_GRID_STEP
    ) {
      for (
        let x = -halfSize;
        x < halfSize;
        x += TERRAIN_GRID_SAMPLE_STEP
      ) {
        const nextX = Math.min(
          x + TERRAIN_GRID_SAMPLE_STEP,
          halfSize
        );

        const startHeight =
          getTerrainHeightAt(x, z) +
          TERRAIN_GRID_OFFSET;

        const endHeight =
          getTerrainHeightAt(nextX, z) +
          TERRAIN_GRID_OFFSET;

        linePositions.push(
          x,
          startHeight,
          z,

          nextX,
          endHeight,
          z
        );
      }
    }

    /*
     * North/south lines.
     *
     * X remains fixed while Z moves across
     * the terrain.
     */
    for (
      let x = -halfSize;
      x <= halfSize;
      x += TERRAIN_GRID_STEP
    ) {
      for (
        let z = -halfSize;
        z < halfSize;
        z += TERRAIN_GRID_SAMPLE_STEP
      ) {
        const nextZ = Math.min(
          z + TERRAIN_GRID_SAMPLE_STEP,
          halfSize
        );

        const startHeight =
          getTerrainHeightAt(x, z) +
          TERRAIN_GRID_OFFSET;

        const endHeight =
          getTerrainHeightAt(x, nextZ) +
          TERRAIN_GRID_OFFSET;

        linePositions.push(
          x,
          startHeight,
          z,

          x,
          endHeight,
          nextZ
        );
      }
    }

    const gridGeometry =
      new THREE.BufferGeometry();

    gridGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        linePositions,
        3
      )
    );

    gridGeometry.computeBoundingBox();
    gridGeometry.computeBoundingSphere();

    return gridGeometry;
  }, [
    terrainSettings.heightMultiplier,
    terrainSettings.mountainHeight,
    terrainSettings.cliffSharpness,
    terrainSettings.rollingHills,
    terrainSettings.ridgeStrength,
    terrainSettings.plateauAmount,
    terrainSettings.geometryStrength,
  ]);

  /*
   * Dispose rebuilt geometry to avoid retaining
   * old GPU buffers after slider changes.
   */
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      terrainGridGeometry.dispose();
    };
  }, [terrainGridGeometry]);

  /*
   * Only terrain-shape settings should rebuild
   * the Rapier terrain body.
   */
  const terrainPhysicsKey = [
    terrainSettings.heightMultiplier,
    terrainSettings.mountainHeight,
    terrainSettings.cliffSharpness,
    terrainSettings.rollingHills,
    terrainSettings.ridgeStrength,
    terrainSettings.plateauAmount,
    terrainSettings.geometryStrength,
  ].join("-");

  return (
    <>
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
            flatShading
            roughness={0.94}
            metalness={0}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      </RigidBody>

      <lineSegments
        geometry={terrainGridGeometry}
        frustumCulled={false}
      >
        <lineBasicMaterial
          color={TERRAIN_GRID_COLOR}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}