import { Sky, Stars } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";

import { terrainSettings } from "../../systems/terrain/terrainSettings";

export default function Atmosphere({ titleMode = false }) {
  const { scene } = useThree();

  const [fogDensity, setFogDensity] = useState(
    terrainSettings.fogDensity ?? 0.012
  );

  useEffect(() => {
    function handleTerrainChange(event) {
      if (event.detail.key === "fogDensity") {
        setFogDensity(terrainSettings.fogDensity);
      }
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

  useEffect(() => {
    scene.fog = new THREE.FogExp2(
      "#07090d",
      titleMode ? 0.0025 : fogDensity
    );

    return () => {
      scene.fog = null;
    };
  }, [scene, titleMode, fogDensity]);

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[40, 12, -80]}
        inclination={0.53}
        azimuth={0.25}
        turbidity={12}
        rayleigh={1.5}
        mieCoefficient={0.035}
        mieDirectionalG={0.85}
      />

      <Stars
        radius={250}
        depth={80}
        count={1200}
        factor={4}
        saturation={0}
        fade
        speed={0.25}
      />
    </>
  );
}