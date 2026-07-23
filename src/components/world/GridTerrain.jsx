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

const MINOR_GRID_STEP = 10;
const MAJOR_GRID_STEP = 50;
const SECTOR_GRID_STEP = 100;

/*
 * Each visible grid line is divided into smaller
 * segments so it can follow the terrain surface.
 */
const GRID_SAMPLE_STEP = 5;

/*
 * Prevents grid lines from flickering against
 * the solid terrain.
 */
const GRID_OFFSET = 0.08;

const TERRAIN_BASE_COLOR = new THREE.Color(
  "#080b10"
);

const TERRAIN_HIGH_COLOR = new THREE.Color(
  "#4a535c"
);

const TERRAIN_MAX_GRADIENT_HEIGHT = 85;

const MINOR_GRID_COLOR = "#71808d";
const MAJOR_GRID_COLOR = "#b8c5cf";
const SECTOR_GRID_COLOR = "#f2f7fa";

/*
 * Returns true when a number lands exactly on
 * the requested grid interval.
 */
function isGridMultiple(value, interval) {
  return (
    Math.abs(value % interval) <
    0.001
  );
}

/*
 * Creates one set of terrain-conforming grid
 * lines.
 *
 * Lines can be excluded when they belong to a
 * stronger hierarchy level.
 */
function createTerrainGridGeometry({
  lineStep,
  excludeStep = null,
  verticalOffset,
}) {
  const halfSize = TERRAIN_SIZE / 2;

  const linePositions = [];

  /*
   * East/west lines.
   */
  for (
    let z = -halfSize;
    z <= halfSize;
    z += lineStep
  ) {
    if (
      excludeStep &&
      isGridMultiple(z, excludeStep)
    ) {
      continue;
    }

    for (
      let x = -halfSize;
      x < halfSize;
      x += GRID_SAMPLE_STEP
    ) {
      const nextX = Math.min(
        x + GRID_SAMPLE_STEP,
        halfSize
      );

      const startHeight =
        getTerrainHeightAt(x, z) +
        verticalOffset;

      const endHeight =
        getTerrainHeightAt(nextX, z) +
        verticalOffset;

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
   */
  for (
    let x = -halfSize;
    x <= halfSize;
    x += lineStep
  ) {
    if (
      excludeStep &&
      isGridMultiple(x, excludeStep)
    ) {
      continue;
    }

    for (
      let z = -halfSize;
      z < halfSize;
      z += GRID_SAMPLE_STEP
    ) {
      const nextZ = Math.min(
        z + GRID_SAMPLE_STEP,
        halfSize
      );

      const startHeight =
        getTerrainHeightAt(x, z) +
        verticalOffset;

      const endHeight =
        getTerrainHeightAt(x, nextZ) +
        verticalOffset;

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
}

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
  const terrainGeometry = useMemo(() => {
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
   * Minor grid:
   *
   * Every 10 meters, excluding lines that belong
   * to the 50-meter major grid.
   */
  const minorGridGeometry = useMemo(() => {
    return createTerrainGridGeometry({
      lineStep: MINOR_GRID_STEP,
      excludeStep: MAJOR_GRID_STEP,
      verticalOffset: GRID_OFFSET,
    });
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
   * Major grid:
   *
   * Every 50 meters, excluding lines that belong
   * to the 100-meter sector grid.
   */
  const majorGridGeometry = useMemo(() => {
    return createTerrainGridGeometry({
      lineStep: MAJOR_GRID_STEP,
      excludeStep: SECTOR_GRID_STEP,
      verticalOffset: GRID_OFFSET + 0.01,
    });
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
   * Sector grid:
   *
   * Every 100 meters. These are the strongest
   * lines and correspond to future A1, B1, C1
   * world regions.
   */
  const sectorGridGeometry = useMemo(() => {
    return createTerrainGridGeometry({
      lineStep: SECTOR_GRID_STEP,
      verticalOffset: GRID_OFFSET + 0.02,
    });
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
   * Dispose old geometry after terrain settings
   * rebuild it.
   */
  useEffect(() => {
    return () => {
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);

  useEffect(() => {
    return () => {
      minorGridGeometry.dispose();
    };
  }, [minorGridGeometry]);

  useEffect(() => {
    return () => {
      majorGridGeometry.dispose();
    };
  }, [majorGridGeometry]);

  useEffect(() => {
    return () => {
      sectorGridGeometry.dispose();
    };
  }, [sectorGridGeometry]);

  /*
   * Only terrain-shape settings rebuild the
   * Rapier terrain body.
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
          geometry={terrainGeometry}
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

      {/* Minor 10-meter grid. */}
      <lineSegments
        geometry={minorGridGeometry}
        frustumCulled={false}
      >
        <lineBasicMaterial
          color={MINOR_GRID_COLOR}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </lineSegments>

      {/* Major 50-meter grid. */}
      <lineSegments
        geometry={majorGridGeometry}
        frustumCulled={false}
      >
        <lineBasicMaterial
          color={MAJOR_GRID_COLOR}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </lineSegments>

      {/* Sector 100-meter grid. */}
      <lineSegments
        geometry={sectorGridGeometry}
        frustumCulled={false}
      >
        <lineBasicMaterial
          color={SECTOR_GRID_COLOR}
          transparent
          opacity={0.68}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}