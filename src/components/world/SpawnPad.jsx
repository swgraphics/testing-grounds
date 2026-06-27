import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

export default function SpawnPad() {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[24, 0.15, 24]} />
          <meshStandardMaterial color="#121820" roughness={0.85} />
        </mesh>
      </RigidBody>

      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 3.4, 64]} />
        <meshBasicMaterial color="#66ccff" />
      </mesh>

      <Text
        position={[0, 0.22, -7]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        SPAWN
      </Text>

      <Text position={[0, 5, -18]} fontSize={3} color="#ffffff" anchorX="center">
        TESTING GROUNDS
      </Text>

      <Text
        position={[0, 0.25, -30]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3}
        color="#dfefff"
      >
        N
      </Text>

      <Text
        position={[30, 0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3}
        color="#dfefff"
      >
        E
      </Text>

      <Text
        position={[0, 0.25, 30]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3}
        color="#dfefff"
      >
        S
      </Text>

      <Text
        position={[-30, 0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3}
        color="#dfefff"
      >
        W
      </Text>
    </>
  );
}