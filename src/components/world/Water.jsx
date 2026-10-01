import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { useWorldStore } from "../../systems/world/worldStore";

const WATER_SIZE = 900;
const WATER_DEPTH = 100;
const WATER_SURFACE_OFFSET = 0.04;
const WATER_WIREFRAME_OFFSET = 0.045;

function triangleWave(value) {
  return 1 - (2 / Math.PI) * Math.asin(Math.abs(Math.sin(value)));
}

function waveValue(x, z, time) {
  const flowTime = time * 0.9;
  const ridgeA = triangleWave(x * 0.033 + z * 0.012 + flowTime);
  const ridgeB = triangleWave(x * -0.017 + z * 0.038 - flowTime * 0.72);
  const crossing = Math.sin((x + z) * 0.021 + time * 0.48) * 0.5 + 0.5;
  const combined = ridgeA * 0.46 + ridgeB * 0.30 + crossing * 0.24;
  return THREE.MathUtils.clamp(Math.pow(combined, 2.2), 0, 1);
}

export default function Water() {
  const surfaceRef = useRef();
  const frameCounterRef = useRef(0);
  const guidesVisible = useWorldGuideStore((state) => state.visible);
  const waterSubdivisions = Math.round(Number(terrainSettings.waterSubdivisions) || 48);
  const waterHeight = terrainSettings.waterHeight ?? -4;
  const worldType = useWorldStore((state) => state.world.worldType);
  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange() {
      refresh((value) => value + 1);
    }
    window.addEventListener("terrain-settings-changed", handleTerrainChange);
    return () => window.removeEventListener("terrain-settings-changed", handleTerrainChange);
  }, []);

  const surfaceGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      WATER_SIZE,
      WATER_SIZE,
      waterSubdivisions,
      waterSubdivisions
    );
    geometry.rotateX(-Math.PI / 2);
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        new Array(geometry.attributes.position.count * 3).fill(1),
        3
      )
    );
    return geometry;
  }, [waterSubdivisions]);

  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry]);

  useFrame(({ clock }) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    frameCounterRef.current += 1;

    const positions = surface.geometry.attributes.position;
    const colors = surface.geometry.attributes.color;
    const windStrength = THREE.MathUtils.clamp((Number(terrainSettings.windStrength) || 0) / 100, 0, 1);
    const windSpeed = THREE.MathUtils.clamp((Number(terrainSettings.windSpeed) || 0) / 100, 0, 1);
    const response = THREE.MathUtils.clamp((Number(terrainSettings.waterWaveStrength) || 0) / 100, 0, 1);
    const waveHeight = response * THREE.MathUtils.lerp(0.18, 3.6, windStrength);
    const animationSpeed = THREE.MathUtils.lerp(0.12, 1.5, windSpeed);
    const time = clock.elapsedTime * animationSpeed;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const peak = waveValue(x, z, time);
      positions.setY(i, WATER_SURFACE_OFFSET + peak * waveHeight);
      const white = THREE.MathUtils.smoothstep(peak, 0.55, 0.94);
      colors.setXYZ(i, white, white, white);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    if (frameCounterRef.current % 2 === 0) surface.geometry.computeVertexNormals();
  });

  if (worldType === "blank" && waterHeight <= 0) return null;

  return (
    <group>
      <group position={[0, waterHeight, 0]}>
        <mesh position={[0, -WATER_DEPTH / 2, 0]} receiveShadow>
          <boxGeometry args={[WATER_SIZE, WATER_DEPTH, WATER_SIZE]} />
          <meshStandardMaterial
            color="#527c9d"
            emissive="#102a3d"
            emissiveIntensity={0.12}
            transparent
            opacity={0.5}
            roughness={0.42}
            metalness={0.02}
            side={THREE.DoubleSide}
            depthWrite
          />
        </mesh>

        <mesh ref={surfaceRef} geometry={surfaceGeometry} receiveShadow>
          <meshStandardMaterial
            color="#4e9ac2"
            emissive="#0d4c72"
            emissiveIntensity={0.18}
            transparent
            opacity={0.72}
            roughness={0.26}
            metalness={0.04}
            side={THREE.DoubleSide}
            flatShading
            depthWrite={false}
          />
        </mesh>

        <mesh geometry={surfaceGeometry} position-y={WATER_WIREFRAME_OFFSET}>
          <meshBasicMaterial
            color="#ffffff"
            vertexColors
            transparent
            opacity={0.34}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {guidesVisible && (
          <mesh geometry={surfaceGeometry} position-y={WATER_WIREFRAME_OFFSET + 0.008}>
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.24}
              wireframe
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}
