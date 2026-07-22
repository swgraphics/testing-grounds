import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  terrainSettings,
} from "../../systems/terrain/terrainSettings";

const WATER_SIZE = 900;
const WATER_DEPTH = 100;
const WATER_SEGMENTS = 70;

const WATER_SURFACE_OFFSET = 0.04;

export default function Water() {
  const surfaceRef = useRef();
  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange(event) {
      if (
        event.detail?.key === "waterHeight" ||
        event.detail?.key ===
          "waterWaveStrength"
      ) {
        refresh((value) => value + 1);
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

  const surfaceGeometry = useMemo(() => {
    const geometry =
      new THREE.PlaneGeometry(
        WATER_SIZE,
        WATER_SIZE,
        WATER_SEGMENTS,
        WATER_SEGMENTS
      );

    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }, []);

  useFrame(({ clock }) => {
    const surface = surfaceRef.current;

    if (!surface) return;

    const positions =
      surface.geometry.attributes.position;

    const waveStrength =
      ((terrainSettings.waterWaveStrength ??
        20) /
        100) *
      1.2;

    const time =
      clock.elapsedTime * 0.35;

    for (
      let index = 0;
      index < positions.count;
      index += 1
    ) {
      const x = positions.getX(index);
      const z = positions.getZ(index);

      const waveA =
        Math.sin(
          x * 0.025 +
            time
        );

      const waveB =
        Math.cos(
          z * 0.022 -
            time * 0.8
        );

      const waveC =
        Math.sin(
          (x + z) * 0.013 +
            time * 0.55
        );

      /*
       * Convert the combined waves into a range
       * from 0 to 1.
       *
       * This means waves rise above the main water
       * block instead of cutting holes beneath the
       * base water level.
       */
      const combinedWave =
        waveA * 0.45 +
        waveB * 0.35 +
        waveC * 0.2;

      const raisedWave =
        (combinedWave + 1) * 0.5;

      positions.setY(
        index,
        WATER_SURFACE_OFFSET +
          raisedWave * waveStrength
      );
    }

    positions.needsUpdate = true;

    surface.geometry.computeVertexNormals();
  });

  const waterHeight =
    terrainSettings.waterHeight ?? -4;

  return (
    <group
      position={[0, waterHeight, 0]}
    >
      {/*
       * Main water volume.
       *
       * The top of this box sits at local Y = 0,
       * which is the selected waterHeight.
       */}
      <mesh
        position={[
          0,
          -WATER_DEPTH / 2,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            WATER_SIZE,
            WATER_DEPTH,
            WATER_SIZE,
          ]}
        />

        <meshStandardMaterial
          color="#9babb8"
          emissive="#202b35"
          emissiveIntensity={0.08}
          transparent
          opacity={0.58}
          roughness={0.46}
          metalness={0.02}
          side={THREE.DoubleSide}
          depthWrite
        />
      </mesh>

      {/*
       * Animated upper surface.
       *
       * This surface only rises above the water
       * block, so low wave points still contain
       * water underneath them.
       */}
      <mesh
        ref={surfaceRef}
        geometry={surfaceGeometry}
        receiveShadow
      >
        <meshStandardMaterial
          color="#c4d2dd"
          emissive="#34424e"
          emissiveIntensity={0.14}
          transparent
          opacity={0.76}
          roughness={0.34}
          metalness={0.04}
          side={THREE.DoubleSide}
          flatShading
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}