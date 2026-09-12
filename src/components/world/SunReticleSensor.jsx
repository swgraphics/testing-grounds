import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getAtmospherePalette } from "../../systems/atmosphere/atmospherePalette";

/*
 * Canvas-side bridge for the DOM Adaptive Reticle.
 *
 * The reticle itself is HTML and must not subscribe to the R3F render loop.
 * This component is mounted inside <Canvas>, samples the camera, and only
 * broadcasts when the sun-target state actually changes.
 */
export default function SunReticleSensor() {
  const { camera } = useThree();
  const lastTargetRef = useRef(null);
  const directionRef = useRef(new THREE.Vector3());

  useFrame(() => {
    camera.getWorldDirection(directionRef.current);

    const palette = getAtmospherePalette();
    const targetDirection = palette.sunDirection.clone().normalize();
    const aligned = directionRef.current.dot(targetDirection) > 0.992;

    if (lastTargetRef.current === aligned) return;

    lastTargetRef.current = aligned;
    window.dispatchEvent(
      new CustomEvent("sun-reticle-target-changed", {
        detail: { active: aligned },
      })
    );
  });

  return null;
}
