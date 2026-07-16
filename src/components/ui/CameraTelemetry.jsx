import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const BROADCAST_INTERVAL = 0.05;

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

export default function CameraTelemetry() {
  const { camera } = useThree();

  const lastBroadcastRef = useRef(0);
  const directionRef = useRef(new THREE.Vector3());

  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;

    if (
      currentTime - lastBroadcastRef.current <
      BROADCAST_INTERVAL
    ) {
      return;
    }

    lastBroadcastRef.current = currentTime;

    camera.getWorldDirection(directionRef.current);

    /*
     * Three.js camera forward is normally -Z.
     *
     * This conversion makes:
     *   0 degrees   = North / -Z
     *   90 degrees  = East / +X
     *   180 degrees = South / +Z
     *   270 degrees = West / -X
     */
    const headingRadians = Math.atan2(
      directionRef.current.x,
      -directionRef.current.z
    );

    const headingDegrees = normalizeDegrees(
      THREE.MathUtils.radToDeg(headingRadians)
    );

    window.dispatchEvent(
      new CustomEvent("camera-heading-changed", {
        detail: {
          degrees: headingDegrees,
        },
      })
    );
  });

  return null;
}