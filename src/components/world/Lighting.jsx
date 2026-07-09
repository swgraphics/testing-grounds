import { useEffect, useState } from "react";
import { terrainSettings } from "../../systems/terrain/terrainSettings";

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export default function Lighting() {
  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange(event) {
      const lightingKeys = ["sunHeight", "sunRotation"];

      if (!lightingKeys.includes(event.detail.key)) return;

      refresh((value) => value + 1);
    }

    window.addEventListener("terrain-settings-changed", handleTerrainChange);

    return () => {
      window.removeEventListener("terrain-settings-changed", handleTerrainChange);
    };
  }, []);

  const sunY = mapRange(terrainSettings.sunHeight, 0, 100, -20, 90);
  const sunAngle = mapRange(
    terrainSettings.sunRotation,
    0,
    100,
    0,
    Math.PI * 2
  );

  const sunX = Math.cos(sunAngle) * 80;
  const sunZ = Math.sin(sunAngle) * 80;

  return (
    <>
      <ambientLight intensity={0.35} />

      <directionalLight
        castShadow
        position={[sunX, sunY, sunZ]}
        intensity={2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <hemisphereLight intensity={0.5} groundColor="#111111" />
    </>
  );
}