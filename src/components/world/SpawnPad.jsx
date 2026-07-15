import { RigidBody } from "@react-three/rapier";

export default function SpawnPad() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[24, 0.15, 24]} />

        <meshStandardMaterial
          color="#121820"
          roughness={0.85}
        />
      </mesh>
    </RigidBody>
  );
}