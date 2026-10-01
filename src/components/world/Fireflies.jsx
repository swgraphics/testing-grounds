import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { terrainSettings } from "../../systems/terrain/terrainSettings";

export default function Fireflies() {
  const [, refresh] = useState(0);

  useEffect(() => {
    const onChange = () => refresh((value) => value + 1);
    window.addEventListener("terrain-settings-changed", onChange);
    return () => window.removeEventListener("terrain-settings-changed", onChange);
  }, []);

  const count = Math.max(0, Math.min(180, Math.round(Number(terrainSettings.fireflyDensity) || 0)));

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      position: [
        ((index * 47.17) % 360) - 180,
        1.2 + ((index * 13.31) % 9),
        ((index * 83.91) % 360) - 180,
      ],
      phase: index * 1.73,
      radius: 0.45 + ((index * 0.37) % 1.4),
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const speed = Number(terrainSettings.fireflySpeed) || 1;
    const flicker = THREE.MathUtils.clamp(Number(terrainSettings.fireflyFlicker) || 0, 0, 1);

    particles.forEach((entry, index) => {
      const mesh = meshes[index];
      if (!mesh) return;
      const time = clock.elapsedTime * speed + entry.phase;
      mesh.position.x = entry.position[0] + Math.sin(time * 0.47) * entry.radius;
      mesh.position.y = entry.position[1] + Math.sin(time * 0.83) * 0.55;
      mesh.position.z = entry.position[2] + Math.cos(time * 0.39) * entry.radius;
      const pulse = 0.35 + 0.65 * ((Math.sin(time * 2.4) + 1) * 0.5);
      mesh.material.opacity = THREE.MathUtils.lerp(0.72, pulse, flicker);
      mesh.scale.setScalar(0.65 + pulse * 0.55);
    });
  });

  const meshes = [];
  const color = terrainSettings.fireflyColor || "#d9ff72";

  return (
    <group>
      {particles.map((entry, index) => (
        <mesh
          key={index}
          ref={(node) => {
            meshes[index] = node;
          }}
          position={entry.position}
        >
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
