import { Sky, Stars } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

export default function Atmosphere() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2("#07090d", 0.012);

    return () => {
      scene.fog = null;
    };
  }, [scene]);

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