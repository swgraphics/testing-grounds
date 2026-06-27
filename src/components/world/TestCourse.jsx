import { RigidBody } from "@react-three/rapier";

function StaticBox({ position, scale, color = "#27313d" }) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={position} scale={scale} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

export default function TestCourse() {
  return (
    <>
      {/* Jump test blocks */}
      <StaticBox position={[20, 1, 90]} scale={[10, 2, 10]} />
      <StaticBox position={[40, 2, 90]} scale={[10, 4, 10]} />
      <StaticBox position={[65, 3.5, 90]} scale={[14, 7, 14]} />

      {/* Long traversal platform */}
      <StaticBox position={[-40, 2, 120]} scale={[60, 4, 10]} color="#202832" />

      {/* Combat arena boundary blocks */}
      <StaticBox position={[80, 1, 20]} scale={[40, 2, 2]} color="#3b3030" />
      <StaticBox position={[80, 1, -20]} scale={[40, 2, 2]} color="#3b3030" />
      <StaticBox position={[60, 1, 0]} scale={[2, 2, 40]} color="#3b3030" />
      <StaticBox position={[100, 1, 0]} scale={[2, 2, 40]} color="#3b3030" />
    </>
  );
}