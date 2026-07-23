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

/*
 * More subdivisions create many more triangular faces.
 *
 * Previous value: 70
 * New value: 180
 */
const WATER_SEGMENTS = 180;

const WATER_SURFACE_OFFSET = 0.04;
const WATER_WIREFRAME_OFFSET = 0.045;

/*
 * Higher values create more height levels.
 * Lower values create chunkier, more dramatic facets.
 */
const WATER_FACET_LEVELS = 22;

/*
 * Converts a smooth repeating wave into a triangular wave.
 *
 * The result stays between 0 and 1.
 */
function triangleWave(value) {
  return (
    1 -
    (2 / Math.PI) *
      Math.asin(
        Math.abs(Math.sin(value))
      )
  );
}

export default function Water() {
  const surfaceRef = useRef();
  const frameCounterRef = useRef(0);

  const [, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange(event) {
      if (
        event.detail?.key === "waterHeight" ||
        event.detail?.key ===
          "waterWaveStrength" ||
        event.detail?.key ===
          "windStrength" ||
        event.detail?.key ===
          "windSpeed"
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

    frameCounterRef.current += 1;

    const positions =
      surface.geometry.attributes.position;

    /*
     * Wind Strength is the world force.
     *
     * Wave Strength controls how strongly the water
     * responds to that force.
     */
    const windStrength =
      THREE.MathUtils.clamp(
        (Number(
          terrainSettings.windStrength
        ) || 0) / 100,
        0,
        1
      );

    const windSpeed =
      THREE.MathUtils.clamp(
        (Number(
          terrainSettings.windSpeed
        ) || 0) / 100,
        0,
        1
      );

    const waterResponse =
      THREE.MathUtils.clamp(
        (Number(
          terrainSettings.waterWaveStrength
        ) || 0) / 100,
        0,
        1
      );

    /*
     * Wind increases wave height.
     *
     * Wave Strength can still reduce or completely
     * disable the water's response.
     */
    const waveHeight =
      waterResponse *
      THREE.MathUtils.lerp(
        0.16,
        2.4,
        windStrength
      );

    const animationSpeed =
      THREE.MathUtils.lerp(
        0.1,
        1.4,
        windSpeed
      );

    const time =
      clock.elapsedTime * animationSpeed;

    for (
      let index = 0;
      index < positions.count;
      index += 1
    ) {
      const x = positions.getX(index);
      const z = positions.getZ(index);

      /*
       * Long diagonal triangular ridges.
       *
       * These form the primary ocean swell.
       */
      const ridgeA = triangleWave(
        x * 0.033 +
          z * 0.012 +
          time
      );

      /*
       * A second ridge travels at another angle.
       *
       * This breaks up the regular blanket pattern.
       */
      const ridgeB = triangleWave(
        x * -0.017 +
          z * 0.038 -
          time * 0.72
      );

      /*
       * Smaller crossing waves add variation between
       * the larger geometric peaks.
       */
      const crossingWave =
        Math.sin(
          (x + z) * 0.021 +
            time * 0.48
        ) *
          0.5 +
        0.5;

      /*
       * Blend the three wave directions.
       */
      const combinedWave =
        ridgeA * 0.52 +
        ridgeB * 0.32 +
        crossingWave * 0.16;

      /*
       * Raising the value to a power narrows the
       * crests and produces sharper peaks.
       */
      const sharpenedWave =
        Math.pow(combinedWave, 3);

      /*
       * Quantize the vertical displacement into
       * discrete geometric levels.
       *
       * This prevents the water from reading as one
       * smoothly breathing sheet.
       */
      const facetedWave =
        Math.round(
          sharpenedWave *
            WATER_FACET_LEVELS
        ) / WATER_FACET_LEVELS;

      /*
       * Blend a little of the original wave back in.
       *
       * This keeps the geometry angular without
       * turning it into perfectly flat stair steps.
       */
      const geometricWave =
        THREE.MathUtils.lerp(
          sharpenedWave,
          facetedWave,
          0.72
        );

      /*
       * All displacement remains above the solid
       * water block.
       *
       * No downward trough can expose dry terrain.
       */
      positions.setY(
        index,
        WATER_SURFACE_OFFSET +
          geometricWave * waveHeight
      );
    }

    positions.needsUpdate = true;

    /*
     * Recalculate normals every second frame.
     *
     * The new surface contains many more vertices,
     * so this reduces some unnecessary processing
     * while preserving the faceted lighting.
     */
    if (
      frameCounterRef.current % 2 === 0
    ) {
      surface.geometry.computeVertexNormals();
    }
  });

  const waterHeight =
    terrainSettings.waterHeight ?? -4;

  return (
    <group
      position={[0, waterHeight, 0]}
    >
      {/*
       * Solid water volume.
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
          color="#527c9d"
          emissive="#102a3d"
          emissiveIntensity={0.12}
          transparent
          opacity={0.54}
          roughness={0.42}
          metalness={0.02}
          side={THREE.DoubleSide}
          depthWrite
        />
      </mesh>

      {/*
       * Main animated geometric surface.
       */}
      <mesh
        ref={surfaceRef}
        geometry={surfaceGeometry}
        receiveShadow
      >
        <meshStandardMaterial
          color="#79a9c7"
          emissive="#173f59"
          emissiveIntensity={0.16}
          transparent
          opacity={0.68}
          roughness={0.3}
          metalness={0.04}
          side={THREE.DoubleSide}
          flatShading
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/*
       * White technical wireframe.
       *
       * This shares the animated surface geometry,
       * so its triangles follow every wave peak.
       */}
      <mesh
        geometry={surfaceGeometry}
        position={[
          0,
          WATER_WIREFRAME_OFFSET,
          0,
        ]}
      >
        <meshBasicMaterial
          color="#edf8ff"
          transparent
          opacity={0.3}
          wireframe
          depthWrite={false}
          depthTest
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}