import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

export default function GridTerrain() {
  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange() {
      refresh((value) => value + 1);
    }

    window.addEventListener("terrain-settings-changed", handleTerrainChange);

    return () => {
      window.removeEventListener(
        "terrain-settings-changed",
        handleTerrainChange
      );
    };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(600, 600, 120, 120);

    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      positions.setY(i, getTerrainHeightAt(x, z));
    }

    geo.computeVertexNormals();

    return geo;
  }, [
    terrainSettings.heightMultiplier,
    terrainSettings.mountainHeight,
    terrainSettings.cliffSharpness,
    terrainSettings.rollingHills,
    terrainSettings.ridgeStrength,
  ]);

  return (
    <RigidBody key={JSON.stringify(terrainSettings)} type="fixed" colliders="trimesh">
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