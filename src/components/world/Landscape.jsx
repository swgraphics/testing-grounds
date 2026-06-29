import { RigidBody } from "@react-three/rapier";

function Hill({ position, scale, color = "#9ca8b3" }) {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh position={position} scale={scale} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color={color}
          roughness={0.92}
          wireframe={false}
        />
      </mesh>
    </RigidBody>
  );
}

function CrimsonTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 5, 5]} />
        <meshStandardMaterial color="#300812" roughness={0.9} />
      </mesh>

      <mesh position={[0, 5.2, 0]} castShadow>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial
          color="#15060a"
          emissive="#8b1026"
          emissiveIntensity={0.18}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

function IceWaterPatch({ position, scale }) {
  return (
    <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 32]} />
      <meshStandardMaterial
        color="#dfefff"
        roughness={0.35}
        metalness={0.05}
        transparent
        opacity={0.72}
      />
    </mesh>
  );
}

export default function Landscape() {
  return (
    <>
      {/* Low-poly cliff / mountain shapes */}
      <Hill position={[-140, 18, -130]} scale={[70, 28, 45]} />
      <Hill position={[150, 24, -150]} scale={[85, 38, 55]} />
      <Hill position={[180, 16, 120]} scale={[60, 24, 45]} />
      <Hill position={[-170, 12, 120]} scale={[50, 18, 40]} />

      {/* Smaller traversal rocks */}
      <Hill position={[-40, 4, -90]} scale={[18, 7, 14]} color="#6f7982" />
      <Hill position={[35, 3, -120]} scale={[14, 5, 10]} color="#6f7982" />
      <Hill position={[120, 5, 65]} scale={[20, 8, 16]} color="#6f7982" />

      {/* Ice / water testing zones */}
      <IceWaterPatch position={[0, 0.08, 170]} scale={[42, 24, 1]} />
      <IceWaterPatch position={[145, 0.08, 155]} scale={[35, 18, 1]} />

      {/* Crimson vegetation clusters */}
      <CrimsonTree position={[-90, 0, -75]} scale={1.4} />
      <CrimsonTree position={[-115, 0, -95]} scale={1.1} />
      <CrimsonTree position={[95, 0, 105]} scale={1.2} />
      <CrimsonTree position={[130, 0, 125]} scale={0.9} />
      <CrimsonTree position={[-150, 0, 80]} scale={1.0} />
    </>
  );
}