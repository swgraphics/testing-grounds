import { RigidBody } from "@react-three/rapier";

function Block({ position, scale, color = "#3d352e" }) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={position} scale={scale} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </RigidBody>
  );
}

function RuinedHouse({ position = [0, 0, 0] }) {
  const [x, y, z] = position;

  return (
    <>
      <Block position={[x, y + 2, z - 4]} scale={[10, 4, 0.8]} />
      <Block position={[x - 5, y + 2, z]} scale={[0.8, 4, 8]} />
      <Block position={[x + 5, y + 1.5, z]} scale={[0.8, 3, 8]} />
      <Block position={[x - 2, y + 5, z]} scale={[3, 1, 8]} color="#1f1b18" />
    </>
  );
}

function Watchtower({ position = [0, 0, 0] }) {
  const [x, y, z] = position;

  return (
    <>
      <Block position={[x, y + 7, z]} scale={[7, 14, 7]} color="#2f2b26" />
      <Block position={[x, y + 15, z]} scale={[10, 2, 10]} color="#1f1b18" />
    </>
  );
}

function BrokenWall({ position = [0, 0, 0], rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Block position={[0, 2, 0]} scale={[14, 4, 1]} color="#302c27" />
      <Block position={[9, 1.2, 0]} scale={[4, 2.4, 1]} color="#302c27" />
    </group>
  );
}

export default function TestBuildings() {
  return (
    <>
      <RuinedHouse position={[45, 0, 45]} />
      <RuinedHouse position={[-65, 0, 35]} />

      <Watchtower position={[105, 0, -70]} />

      <BrokenWall position={[20, 0, -80]} rotationY={0.4} />
      <BrokenWall position={[-90, 0, -30]} rotationY={-0.7} />
    </>
  );
}
