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

const MAX_CLOUDS = 32;

const CLOUD_WORLD_SIZE = 760;
const CLOUD_WRAP_DISTANCE =
  CLOUD_WORLD_SIZE / 2;

const CLOUD_DARK_COLOR =
  new THREE.Color("#252a31");

const CLOUD_LIGHT_COLOR =
  new THREE.Color("#dce3e8");

/*
 * One shared low-poly geometry is reused by every
 * cloud section.
 */
const CLOUD_GEOMETRY =
  new THREE.DodecahedronGeometry(
    1,
    1
  );

function seededRandom(seed) {
  const value =
    Math.sin(seed * 9187.31) *
    10000;

  return value - Math.floor(value);
}

function mapRange(
  value,
  inputMinimum,
  inputMaximum,
  outputMinimum,
  outputMaximum
) {
  const normalized =
    (value - inputMinimum) /
    (inputMaximum - inputMinimum);

  return (
    outputMinimum +
    normalized *
      (outputMaximum - outputMinimum)
  );
}

/*
 * Produces stable cloud positions.
 *
 * Changing a slider does not randomly reshuffle
 * the whole sky.
 */
function createCloudData() {
  return Array.from(
    { length: MAX_CLOUDS },
    (_, index) => {
      const seed = index + 400;

      return {
        x:
          -CLOUD_WRAP_DISTANCE +
          seededRandom(seed) *
            CLOUD_WORLD_SIZE,

        z:
          -CLOUD_WRAP_DISTANCE +
          seededRandom(seed + 100) *
            CLOUD_WORLD_SIZE,

        heightOffset:
          seededRandom(seed + 200) *
          28,

        scale:
          0.7 +
          seededRandom(seed + 300) *
            0.75,

        rotation:
          seededRandom(seed + 400) *
          Math.PI *
          2,

        speedVariation:
          0.72 +
          seededRandom(seed + 500) *
            0.55,

        shapeVariation:
          seededRandom(seed + 600),
      };
    }
  );
}

const CLOUD_DATA =
  createCloudData();

/*
 * Each cloud consists of several angular masses
 * rather than round cartoon spheres.
 */
function GeometricCloud({
  cloud,
  cloudIndex,
  material,
  undersideMaterial,
  cloudRef,
}) {
  const variation =
    cloud.shapeVariation;

  /*
   * Wide, flattened cloud sections.
   *
   * The lower sections create a broad shelf,
   * while smaller upper sections add volume.
   */
  const mainSections = [
    {
      position: [-10, 0, 0],
      scale: [11, 1.7, 5.5],
    },
    {
      position: [-3, 0.8, 0.6],
      scale: [10, 2.2, 6],
    },
    {
      position: [5, 0.3, -0.4],
      scale: [12, 1.9, 6.4],
    },
    {
      position: [12, -0.2, 0.3],
      scale: [8, 1.4, 4.8],
    },
  ];

  const upperSections = [
    {
      position: [-4, 3, 0],
      scale: [6.5, 2.5, 4.2],
    },
    {
      position: [3, 3.6, -0.3],
      scale: [7.2, 2.8, 4.6],
    },
    {
      position: [8, 2.5, 0.4],
      scale: [5.4, 2.1, 3.8],
    },
  ];

  return (
    <group
      ref={cloudRef}
      position={[
        cloud.x,
        0,
        cloud.z,
      ]}
      rotation={[
        0,
        cloud.rotation,
        0,
      ]}
      scale={cloud.scale}
      userData={{
        cloudIndex,
        speedVariation:
          cloud.speedVariation,
      }}
    >
      {/*
       * Dark underside creates depth and makes
       * the formation feel suspended rather than
       * like a single flat object.
       */}
      <mesh
        geometry={CLOUD_GEOMETRY}
        material={undersideMaterial}
        position={[0, -1.45, 0]}
        scale={[20, 1.1, 7]}
      />

      {mainSections.map(
        (section, sectionIndex) => {
          const widthVariation =
            1 +
            Math.sin(
              variation * 8 +
                sectionIndex * 1.7
            ) *
              0.16;

          const heightVariation =
            1 +
            Math.cos(
              variation * 6 +
                sectionIndex * 1.3
            ) *
              0.12;

          return (
            <mesh
              key={`main-${sectionIndex}`}
              geometry={CLOUD_GEOMETRY}
              material={material}
              position={
                section.position
              }
              scale={[
                section.scale[0] *
                  widthVariation,

                section.scale[1] *
                  heightVariation,

                section.scale[2],
              ]}
            />
          );
        }
      )}

      {upperSections.map(
        (section, sectionIndex) => {
          const upperVariation =
            0.88 +
            Math.sin(
              variation * 10 +
                sectionIndex * 2.2
            ) *
              0.15;

          return (
            <mesh
              key={`upper-${sectionIndex}`}
              geometry={CLOUD_GEOMETRY}
              material={material}
              position={
                section.position
              }
              scale={[
                section.scale[0] *
                  upperVariation,

                section.scale[1],

                section.scale[2] *
                  upperVariation,
              ]}
            />
          );
        }
      )}

      {/*
       * Thin trailing wisps break up the heavy,
       * bulbous silhouette.
       */}
      <mesh
        geometry={CLOUD_GEOMETRY}
        material={material}
        position={[-18, -0.5, 1]}
        scale={[7, 0.75, 3.2]}
      />

      <mesh
        geometry={CLOUD_GEOMETRY}
        material={material}
        position={[20, -0.8, -0.5]}
        scale={[6, 0.65, 2.8]}
      />
    </group>
  );
}

export default function Clouds() {
  const cloudRefs = useRef([]);

  const [, refresh] =
    useState(0);

  useEffect(() => {
    function handleTerrainChange(
      event
    ) {
      const cloudKeys = [
        "cloudAmount",
        "cloudHeight",
        "cloudSpeed",
        "cloudColor",
      ];

      if (
        !cloudKeys.includes(
          event.detail?.key
        )
      ) {
        return;
      }

      refresh(
        (value) => value + 1
      );
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

  const cloudAmount =
    Number(
      terrainSettings.cloudAmount
    ) || 0;

  const cloudHeight =
    Number(
      terrainSettings.cloudHeight
    ) || 0;

  const cloudSpeed =
    Number(
      terrainSettings.cloudSpeed
    ) || 0;

  const cloudColor =
    Number(
      terrainSettings.cloudColor
    ) || 0;

  const visibleCloudCount =
    Math.round(
      THREE.MathUtils.clamp(
        cloudAmount,
        0,
        100
      ) /
        100 *
        MAX_CLOUDS
    );

  /*
   * Keeps clouds well above the current terrain,
   * while still allowing low dramatic cloud decks.
   */
  const baseCloudHeight =
    mapRange(
      cloudHeight,
      0,
      100,
      75,
      230
    );

  const cloudMaterial =
    useMemo(() => {
      const normalizedColor =
        THREE.MathUtils.clamp(
          cloudColor / 100,
          0,
          1
        );

      const color =
        new THREE.Color().lerpColors(
          CLOUD_DARK_COLOR,
          CLOUD_LIGHT_COLOR,
          normalizedColor
        );

      return new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        metalness: 0,
        flatShading: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      });
    }, [cloudColor]);
const undersideMaterial =
  useMemo(() => {
    const normalizedColor =
      THREE.MathUtils.clamp(
        cloudColor / 100,
        0,
        1
      );

    const undersideColor =
      new THREE.Color().lerpColors(
        new THREE.Color("#14181d"),
        new THREE.Color("#77818a"),
        normalizedColor
      );

    return new THREE.MeshStandardMaterial({
      color: undersideColor,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

  }, [cloudColor]);
  useEffect(() => {
    return () => {
      cloudMaterial.dispose();
    };
  }, [cloudMaterial]);
useEffect(() => {
  return () => {
    undersideMaterial.dispose();
  };
}, [undersideMaterial]);
  useFrame((state, delta) => {
    const normalizedSpeed =
      THREE.MathUtils.clamp(
        cloudSpeed / 100,
        0,
        1
      );

    /*
     * Clouds still move very slightly at zero so
     * the atmosphere never appears completely frozen.
     */
    const movementSpeed =
      THREE.MathUtils.lerp(
        0.15,
        7,
        normalizedSpeed
      );

    const time =
      state.clock.elapsedTime;

    cloudRefs.current.forEach(
      (cloudObject, index) => {
        if (!cloudObject) {
          return;
        }

        const cloud =
          CLOUD_DATA[index];

        const speedVariation =
          cloudObject.userData
            .speedVariation ?? 1;

        cloudObject.position.x +=
          movementSpeed *
          speedVariation *
          delta;

        /*
         * Subtle vertical movement prevents the
         * clouds from looking like rigid floating
         * rocks.
         */
        cloudObject.position.y =
          baseCloudHeight +
          cloud.heightOffset +
          Math.sin(
            time * 0.12 +
              index * 1.37
          ) *
            1.8;

        /*
         * Wrap clouds around the world instead of
         * destroying and recreating them.
         */
        if (
          cloudObject.position.x >
          CLOUD_WRAP_DISTANCE
        ) {
          cloudObject.position.x =
            -CLOUD_WRAP_DISTANCE;
        }
      }
    );
  });

  return (
    <group>
      {CLOUD_DATA
        .slice(
          0,
          visibleCloudCount
        )
        .map(
          (cloud, cloudIndex) => (
            <GeometricCloud
              key={cloudIndex}
              cloud={cloud}
              cloudIndex={cloudIndex}
              material={cloudMaterial}
              undersideMaterial={
                undersideMaterial
              }
              cloudRef={(object) => {
                cloudRefs.current[
                  cloudIndex
                ] = object;
              }}
            />
          )
        )}
    </group>
  );
}