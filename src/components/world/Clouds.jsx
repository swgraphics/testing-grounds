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


function GeometricCloud({
  cloud,
  cloudIndex,
  material,
  undersideMaterial,
  cloudRef,
}) {

  const variation =
    cloud.shapeVariation;
  const sectionsRef = useRef([]);
const cloudPieces = useMemo(() => {
  const pieces = [];

  const seed = variation * 1000;

  // Dense center
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;

    pieces.push({
      type: "core",

      position: [
        Math.cos(angle) * (6 + Math.sin(seed + i) * 2),
        Math.sin(seed * 0.2 + i) * 4,
        Math.sin(angle) * (4 + Math.cos(seed + i) * 2),
      ],

      scale: [
        4 + seededRandom(seed + i) * 4,
        2 + seededRandom(seed + i + 40) * 1.8,
        3 + seededRandom(seed + i + 80) * 3,
      ],
    });
  }

  // Outer breakup
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;

    pieces.push({
      type: "edge",

      position: [
        Math.cos(angle) * 10,
        seededRandom(seed + i + 900) * 8,
        Math.sin(angle) * 10,
      ],

      scale: [
        2 + seededRandom(seed + i + 400) * 3,
        1.5,
        2 + seededRandom(seed + i + 600) * 3,
      ],
    });
  }

  return pieces;
}, [variation]);

useFrame(({ clock }) => {
  const time = clock.elapsedTime;

  sectionsRef.current.forEach((section, index) => {
    if (!section) return;

    const baseY =
      section.userData.baseY ??
      section.position.y;

    section.userData.baseY = baseY;

    section.position.y =
      baseY +
      Math.sin(
        time * 0.35 +
        index * 1.8 +
        variation * 20
      ) *
        0.18;

    section.rotation.z =
      Math.sin(
        time * 0.22 +
        index
      ) *
      0.03;

    section.scale.y =
      1 +
      Math.sin(
        time * 0.27 +
        index * 2.4
      ) *
      0.04;
  });
});
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
{cloudPieces.map((piece, index) => (
  <mesh
    key={index}
    ref={(object) => {
      sectionsRef.current[index] = object;
    }}
    geometry={CLOUD_GEOMETRY}
    material={material}
    position={piece.position}
    scale={piece.scale}
  />
))}

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
        const drift =
          Math.sin(
            time * 0.08 +
            index * 2.73
          ) * 1.2;

        const puff =
          Math.sin(
            time * 0.23 +
            index * 5.91
          ) * 0.8;

        cloudObject.position.y =
          baseCloudHeight +
          cloud.heightOffset +
          drift +
          puff;

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