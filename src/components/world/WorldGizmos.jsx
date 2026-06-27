import { Text } from "@react-three/drei";

function AxisLine({ points, color }) {
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array(points)}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={3} />
    </line>
  );
}

export default function WorldGizmos() {
  return (
    <>
      {/* X axis */}
      <AxisLine points={[-80, 0.12, 0, 80, 0.12, 0]} color="#ff5555" />
      <Text position={[85, 1, 0]} fontSize={3} color="#ff5555">
        X
      </Text>

      {/* Z axis */}
      <AxisLine points={[0, 0.13, -80, 0, 0.13, 80]} color="#5599ff" />
      <Text position={[0, 1, 85]} fontSize={3} color="#5599ff">
        Z
      </Text>

      {/* Y axis */}
      <AxisLine points={[0, 0.15, 0, 0, 40, 0]} color="#66ff66" />
      <Text position={[0, 43, 0]} fontSize={3} color="#66ff66">
        Y
      </Text>
    </>
  );
}