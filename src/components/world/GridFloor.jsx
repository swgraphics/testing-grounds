import {
  useEffect,
  useState,
} from "react";

import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";

import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const SIZE = 400;
const MINOR_STEP = 10;
const MAJOR_STEP = 50;
const CELL_STEP = 100;

const FLOOR_COLOR = "#080b10";

const BEBAS_FONT_URL =
  "/fonts/BebasNeue-Regular.ttf";

const OSWALD_FONT_URL =
  "/fonts/Oswald-Regular.ttf";

/*
 * Raises labels above the terrain surface.
 *
 * This prevents the letters from flickering
 * against the terrain mesh or grid lines.
 */
const DISTANCE_LABEL_OFFSET = 0.16;
const SECTOR_LABEL_OFFSET = 0.22;

/*
 * Small meter labels.
 *
 * Oswald keeps them technical and readable
 * without competing with the larger region IDs.
 */
function DistanceLabel({
  children,
  x,
  z,
  rotationZ = 0,
}) {
  const terrainHeight =
    getTerrainHeightAt(x, z);

  return (
    <Text
      position={[
        x,
        terrainHeight +
          DISTANCE_LABEL_OFFSET,
        z,
      ]}
      rotation={[
        -Math.PI / 2,
        0,
        rotationZ,
      ]}
      font={OSWALD_FONT_URL}
      fontSize={4.2}
      color="#c8d0d7"
      anchorX="center"
      anchorY="middle"
      fillOpacity={0.72}
      outlineWidth={0.015}
      outlineColor="#080b10"
      outlineOpacity={0.65}
    >
      {children}
    </Text>
  );
}

/*
 * Large A1–H8 world-region labels.
 *
 * Bebas Neue gives these identifiers the same
 * tall, condensed visual language as the main
 * Testing Grounds branding.
 */
function SectorLabel({
  children,
  x,
  z,
}) {
  const terrainHeight =
    getTerrainHeightAt(x, z);

  return (
    <Text
      position={[
        x,
        terrainHeight +
          SECTOR_LABEL_OFFSET,
        z,
      ]}
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
      font={BEBAS_FONT_URL}
      fontSize={13}
      letterSpacing={0.04}
      color="#e7edf1"
      anchorX="center"
      anchorY="middle"
      fillOpacity={0.34}
      outlineWidth={0.02}
      outlineColor="#080b10"
      outlineOpacity={0.55}
    >
      {children}
    </Text>
  );
}

export default function GridFloor() {
  /*
   * Forces labels to recalculate their terrain
   * height whenever terrain sliders change.
   */
  const [, refreshLabels] = useState(0);

  useEffect(() => {
    function handleTerrainChange() {
      refreshLabels(
        (value) => value + 1
      );
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
   * Keep the original flat grid-line generation
   * code available for possible use beyond the
   * 600 × 600 terrain later.
   *
   * It remains hidden for Terrain Grid V1.
   */
  const lines = [];

  for (
    let i = -SIZE;
    i <= SIZE;
    i += MINOR_STEP
  ) {
    const isMajor =
      i % MAJOR_STEP === 0;

    const isAxis =
      i === 0;

    const color = isAxis
      ? "#dfefff"
      : isMajor
        ? "#9ca8b3"
        : "#3b4654";

    const opacity = isAxis
      ? 0.9
      : isMajor
        ? 0.62
        : 0.32;

    lines.push(
      <line key={`x-${i}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([
                -SIZE,
                0.02,
                i,

                SIZE,
                0.02,
                i,
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
        />
      </line>
    );

    lines.push(
      <line key={`z-${i}`}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([
                i,
                0.02,
                -SIZE,

                i,
                0.02,
                SIZE,
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
        />
      </line>
    );
  }

  const distanceMarkers = [];

  /*
   * Meter labels are limited to the active
   * terrain area: -300 through 300.
   *
   * This matches the 600 × 600 GridTerrain.
   */
  for (
    let value = -300;
    value <= 300;
    value += MAJOR_STEP
  ) {
    if (value === 0) {
      continue;
    }

    distanceMarkers.push(
      <DistanceLabel
        key={`x-label-${value}`}
        x={value}
        z={-18}
      >
        {Math.abs(value)}m
      </DistanceLabel>
    );

    distanceMarkers.push(
      <DistanceLabel
        key={`z-label-${value}`}
        x={-18}
        z={value}
        rotationZ={Math.PI / 2}
      >
        {Math.abs(value)}m
      </DistanceLabel>
    );
  }

  const coordinateLabels = [];

  /*
   * The terrain is 600 × 600, so its active
   * sector centers are:
   *
   * -250, -150, -50, 50, 150, 250
   *
   * This creates a 6 × 6 terrain-region grid:
   * A1 through F6.
   *
   * The old A1–H8 layout extended beyond the
   * terrain onto the larger flat floor.
   */
  const letters = "ABCDEF";

  let rowIndex = 0;

  for (
    let z = -250;
    z <= 250;
    z += CELL_STEP
  ) {
    let columnIndex = 1;

    for (
      let x = -250;
      x <= 250;
      x += CELL_STEP
    ) {
      coordinateLabels.push(
        <SectorLabel
          key={
            `cell-${letters[rowIndex]}` +
            `${columnIndex}`
          }
          x={x}
          z={z}
        >
          {letters[rowIndex]}
          {columnIndex}
        </SectorLabel>
      );

      columnIndex += 1;
    }

    rowIndex += 1;
  }

  return (
    <>
      <RigidBody
        type="fixed"
        colliders="cuboid"
      >
        <mesh
          receiveShadow
          position={[0, -0.03, 0]}
        >
          <boxGeometry
            args={[
              SIZE * 2,
              0.05,
              SIZE * 2,
            ]}
          />

          <meshStandardMaterial
            color={FLOOR_COLOR}
            roughness={0.95}
          />
        </mesh>
      </RigidBody>

      {/*
       * Keep the old flat grid hidden.
       *
       * GridTerrain now renders the visible
       * terrain-conforming grid.
       */}
      {/* <group>{lines}</group> */}

      <group>
        {distanceMarkers}
      </group>

      <group>
        {coordinateLabels}
      </group>
    </>
  );
}