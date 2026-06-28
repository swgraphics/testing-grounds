import { RigidBody } from "@react-three/rapier";

const BUILDING_SCALE = 1.25;

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

function RuinedHouse({ position = [0, 0, 0], scale = BUILDING_SCALE }) {
  return (
    <group position={position} scale={scale}>
      <Block position={[0, 2, -4]} scale={[10, 4, 0.8]} />
      <Block position={[-5, 2, 0]} scale={[0.8, 4, 8]} />
      <Block position={[5, 1.5, 0]} scale={[0.8, 3, 8]} />
      <Block position={[-2, 5, 0]} scale={[3, 1, 8]} color="#1f1b18" />
    </group>
  );
}

function Watchtower({ position = [0, 0, 0], scale = BUILDING_SCALE }) {
  return (
    <group position={position} scale={scale}>
      <Block position={[0, 7, 0]} scale={[7, 14, 7]} color="#2f2b26" />
      <Block position={[0, 15, 0]} scale={[10, 2, 10]} color="#1f1b18" />
    </group>
  );
}

function BrokenWall({
  position = [0, 0, 0],
  rotationY = 0,
  scale = BUILDING_SCALE,
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Block position={[0, 2, 0]} scale={[14, 4, 1]} color="#302c27" />
      <Block position={[9, 1.2, 0]} scale={[4, 2.4, 1]} color="#302c27" />
    </group>
  );
}

export default function TestBuildings() {
  return (
    <>
      <RuinedHouse position={[45, 0, 45]} scale={1.4} />
      <RuinedHouse position={[-65, 0, 35]} scale={1.4} />

      <Watchtower position={[105, 0, -70]} scale={1.6} />

      <BrokenWall position={[20, 0, -80]} rotationY={0.4} />
      <BrokenWall position={[-90, 0, -30]} rotationY={-0.7} />
    </>
  );
}