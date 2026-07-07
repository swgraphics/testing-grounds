import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import { terrainSettings } from "../../systems/terrain/terrainSettings";

function smoothStep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export default function GridTerrain() {
  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange() {
      refresh((v) => v + 1);
    }

    window.addEventListener(
      "terrain-settings-changed",
      handleTerrainChange
    );

    return () => {
      window.removeEventListener(
        "terrain-settings-changed",
        handleTerrainChange
      );
    };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      600,
      600,
      120,
      120
    );

    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const distance = Math.sqrt(x * x + z * z);

      const flatRadius = 80;

      const terrainBlend = smoothStep(
        95,
        190,
        distance
      );

      //---------------------------------------------------
      // Rolling Hills
      //---------------------------------------------------

      let rolling = 0;

      rolling +=
        Math.sin(x * 0.018) *
        10 *
        terrainSettings.rollingHills;

      rolling +=
        Math.cos(z * 0.022) *
        8 *
        terrainSettings.rollingHills;

      rolling +=
        Math.sin((x + z) * 0.012) *
        6 *
        terrainSettings.rollingHills;

      //---------------------------------------------------
      // Mountain
      //---------------------------------------------------

      const mountainDistance = Math.sqrt(
        (x - 160) * (x - 160) +
          (z + 170) * (z + 170)
      );

      const mountain =
        Math.max(
          0,
          70 *
            terrainSettings.mountainHeight -
            mountainDistance * 0.35
        );

      //---------------------------------------------------
      // Ridge
      //---------------------------------------------------

      const ridge =
        Math.max(
          0,
          Math.sin(
            (x - 80) *
              0.025 *
              terrainSettings.cliffSharpness
          ) * 22
        ) *
        terrainSettings.ridgeStrength;

      //---------------------------------------------------

      let height =
        (rolling +
          mountain +
          ridge) *
        terrainBlend *
        terrainSettings.heightMultiplier;

      if (distance < flatRadius) {
        height = 0;
      }

      positions.setY(i, height);
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
    <RigidBody
      key={JSON.stringify(terrainSettings)}
      type="fixed"
      colliders="trimesh"
    >
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color="#2b333a"
          roughness={0.92}
        />
      </mesh>

      <lineSegments>
        <wireframeGeometry args={[geometry]} />
        <lineBasicMaterial
          color="#dfefff"
          transparent
          opacity={0.45}
        />
      </lineSegments>
    </RigidBody>
  );
}