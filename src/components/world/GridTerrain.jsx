import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

function smoothStep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export default function GridTerrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(600, 600, 120, 120);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const distanceFromSpawn = Math.sqrt(x * x + z * z);

      let height = 0;

      // Spawn-safe flat area
      const flatRadius = 80;

      // Landscape gradually starts after this radius
      const landscapeStart = 95;
      const landscapeFull = 190;

      const terrainBlend = smoothStep(landscapeStart, landscapeFull, distanceFromSpawn);

      // Broad rolling terrain
      let rollingHills = 0;
      rollingHills += Math.sin(x * 0.018) * 10;
      rollingHills += Math.cos(z * 0.022) * 8;
      rollingHills += Math.sin((x + z) * 0.012) * 6;

      // Distant mountain mass
      const mountainX = 160;
      const mountainZ = -170;
      const mountainDistance = Math.sqrt(
        (x - mountainX) * (x - mountainX) +
          (z - mountainZ) * (z - mountainZ)
      );

      const mountainHeight = Math.max(0, 70 - mountainDistance * 0.35);

      // Cliff/ridge area away from spawn
      const ridge = Math.max(0, Math.sin((x - 80) * 0.025) * 22);

      height = (rollingHills + mountainHeight + ridge) * terrainBlend;

      // Force spawn area perfectly flat
      if (distanceFromSpawn < flatRadius) {
        height = 0;
      }

      positions.setY(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#2b333a" roughness={0.92} />
      </mesh>

      <lineSegments>
        <wireframeGeometry args={[geometry]} />
        <lineBasicMaterial color="#dfefff" transparent opacity={0.45} />
      </lineSegments>
    </RigidBody>
  );
}