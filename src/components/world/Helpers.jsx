import { Text } from "@react-three/drei";

function Marker({ title, position }) {
  return (
    <>
      <mesh position={[position[0], 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4, 5, 64]} />
        <meshBasicMaterial color="#66ccff" />
      </mesh>

      <Text
        position={[position[0], 3, position[2]]}
        fontSize={2}
        color="white"
        anchorX="center"
      >
        {title}
      </Text>
    </>
  );
}

export default function Helpers() {
  return (
    <>
      <Marker title="SPAWN" position={[0, 0, 0]} />
      <Marker title="COMBAT" position={[80, 0, 0]} />
      <Marker title="VILLAGE" position={[-80, 0, 60]} />
      <Marker title="TOWER" position={[120, 0, -100]} />
      <Marker title="FOREST" position={[-140, 0, -80]} />
      <Marker title="LAKE" position={[0, 0, 150]} />
    </>
  );
}