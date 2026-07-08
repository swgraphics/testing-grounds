import { Sky, Stars } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";

import { terrainSettings } from "../../systems/terrain/terrainSettings";

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export default function Atmosphere({ titleMode = false }) {
  const { scene } = useThree();

  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange(event) {
      const atmosphereKeys = [
        "fogDensity",
        "sunHeight",
        "sunRotation",
        "skyHaze",
        "stars",
      ];

      if (!atmosphereKeys.includes(event.detail.key)) return;

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

  const fogDensity = titleMode
    ? 0.0025
    : mapRange(terrainSettings.fogDensity, 0, 100, 0, 0.025);

  const sunY = mapRange(terrainSettings.sunHeight, 0, 100, -40, 90);
  const sunAngle = mapRange(
    terrainSettings.sunRotation,
    0,
    100,
    0,
    Math.PI * 2
  );

  const sunX = Math.cos(sunAngle) * 80;
  const sunZ = Math.sin(sunAngle) * 80;

  const skyHaze = mapRange(terrainSettings.skyHaze, 0, 100, 2, 20);
  const starCount = Math.floor(
    mapRange(terrainSettings.stars, 0, 100, 0, 2200)
  );

  useEffect(() => {
    scene.fog = new THREE.FogExp2("#07090d", fogDensity);

    return () => {
      scene.fog = null;
    };
  }, [scene, fogDensity]);

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[sunX, sunY, sunZ]}
        inclination={0.53}
        azimuth={0.25}
        turbidity={skyHaze}
        rayleigh={1.5}
        mieCoefficient={0.035}
        mieDirectionalG={0.85}
      />

      <Stars
        radius={250}
        depth={80}
        count={starCount}
        factor={4}
        saturation={0}
        fade
        speed={0.25}
      />
    </>
  );
}