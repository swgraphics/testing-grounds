import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

export default function GridTerrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(500, 500, 100, 100);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      let height = 0;

      // broad hills
      height += Math.sin(x * 0.025) * 8;
      height += Math.cos(z * 0.025) * 8;

      // central plateau
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 80) {
        height += 12;
      }

      // distant mountain
      const dx = x - 120;
      const dz = z + 140;
      const mountainDistance = Math.sqrt(dx * dx + dz * dz);
      height += Math.max(0, 55 - mountainDistance * 0.35);

      positions.setY(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#2b333a" roughness={0.9} />
      </mesh>

      <lineSegments>
        <wireframeGeometry args={[geometry]} />
        <lineBasicMaterial color="#dfefff" transparent opacity={0.45} />
      </lineSegments>
    </RigidBody>
  );
}