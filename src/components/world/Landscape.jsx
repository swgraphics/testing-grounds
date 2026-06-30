function CrimsonTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 5.6, 5]} />
        <meshStandardMaterial color="#300812" roughness={0.9} />
      </mesh>

      <mesh position={[0, 6.2, 0]} castShadow>
        <coneGeometry args={[1.4, 3.2, 6]} />
        <meshStandardMaterial
          color="#12060a"
          emissive="#8b1026"
          emissiveIntensity={0.22}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

function ForestCluster() {
  const trees = [];

  for (let i = 0; i < 90; i++) {
    const x = -160 + Math.random() * 130;
    const z = -180 + Math.random() * 160;
    const scale = 0.65 + Math.random() * 1.25;

    trees.push(
      <CrimsonTree
        key={i}
        position={[x, 0, z]}
        scale={scale}
      />
    );
  }

  return <>{trees}</>;
}

function PaleWaterPatch({ position, scale }) {
  return (
    <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 48]} />
      <meshStandardMaterial
        color="#dfefff"
        roughness={0.35}
        transparent
        opacity={0.62}
      />
    </mesh>
  );
}

export default function Landscape() {
  return (
    <>
      <ForestCluster />

      <CrimsonTree position={[-90, 0, -75]} scale={1.4} />
      <CrimsonTree position={[-115, 0, -95]} scale={1.1} />
      <CrimsonTree position={[95, 0, 105]} scale={1.2} />
      <CrimsonTree position={[130, 0, 125]} scale={0.9} />

      <PaleWaterPatch position={[0, 0.08, 170]} scale={[42, 24, 1]} />
      <PaleWaterPatch position={[145, 0.08, 155]} scale={[35, 18, 1]} />
    </>
  );
}