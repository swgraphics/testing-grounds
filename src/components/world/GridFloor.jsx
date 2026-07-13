import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";

const SIZE = 400;
const MINOR_STEP = 10;
const MAJOR_STEP = 50;
const CELL_STEP = 100;

const FLOOR_COLOR = "#080b10";
const MINOR_GRID_COLOR = "#3b4654";
const MAJOR_GRID_COLOR = "#9ca8b3";
const AXIS_GRID_COLOR = "#dfefff";

function GridLabel({ children, position, fontSize = 5 }) {
  return (
    <Text
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={fontSize}
      color="#dfefff"
      anchorX="center"
      anchorY="middle"
    >
      {children}
    </Text>
  );
}

export default function GridFloor() {
  const lines = [];

  for (let i = -SIZE; i <= SIZE; i += MINOR_STEP) {
    const isMajor = i % MAJOR_STEP === 0;
    const isAxis = i === 0;

    const color = isAxis
      ? AXIS_GRID_COLOR
      : isMajor
        ? MAJOR_GRID_COLOR
        : MINOR_GRID_COLOR;

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

  for (
    let value = -SIZE;
    value <= SIZE;
    value += MAJOR_STEP
  ) {
    distanceMarkers.push(
      <GridLabel
        key={`x-label-${value}`}
        position={[value, 0.08, -18]}
      >
        {Math.abs(value)}m
      </GridLabel>
    );

    distanceMarkers.push(
      <GridLabel
        key={`z-label-${value}`}
        position={[-18, 0.08, value]}
      >
        {Math.abs(value)}m
      </GridLabel>
    );
  }

  const coordinateLabels = [];
  const letters = "ABCDEFGH";

  let rowIndex = 0;

  for (
    let z = -350;
    z <= 350;
    z += CELL_STEP
  ) {
    let columnIndex = 1;

    for (
      let x = -350;
      x <= 350;
      x += CELL_STEP
    ) {
      coordinateLabels.push(
        <GridLabel
          key={`cell-${letters[rowIndex]}${columnIndex}`}
          position={[x, 0.09, z]}
          fontSize={8}
        >
          {letters[rowIndex]}
          {columnIndex}
        </GridLabel>
      );

      columnIndex += 1;
    }

    rowIndex += 1;
  }

  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh
          receiveShadow
          position={[0, -0.03, 0]}
        >
          <boxGeometry
            args={[SIZE * 2, 0.05, SIZE * 2]}
          />

          <meshStandardMaterial
            color={FLOOR_COLOR}
            roughness={0.95}
          />
        </mesh>
      </RigidBody>

      <group>{lines}</group>
      <group>{distanceMarkers}</group>
      <group>{coordinateLabels}</group>
    </>
  );
}