import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

import {
  RigidBody,
  CylinderCollider,
  CuboidCollider,
} from "@react-three/rapier";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const MAX_TREES = 900;
const MAX_FOLIAGE = 1400;
const MAX_ROCKS = 650;

const MAX_TREE_COLLIDERS = 160;
const MAX_ROCK_COLLIDERS = 180;

function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function makeScatterPoints(count, seedOffset, bounds) {
  const points = [];

  for (let i = 0; i < count; i++) {
    points.push({
      x: bounds.minX + seededRandom(i + seedOffset) * (bounds.maxX - bounds.minX),
      z: bounds.minZ + seededRandom(i + seedOffset + 1000) * (bounds.maxZ - bounds.minZ),
      scale:
        bounds.minScale +
        seededRandom(i + seedOffset + 2000) *
          (bounds.maxScale - bounds.minScale),
      rotation: seededRandom(i + seedOffset + 3000) * Math.PI * 2,
      variant: seededRandom(i + seedOffset + 4000),
    });
  }

  return points;
}

function countFromSlider(value, maxCount) {
  const safeValue = Number(value) || 0;
  if (safeValue <= 0) return 0;
  if (safeValue >= 100) return maxCount;
  return Math.max(1, Math.floor(maxCount * (safeValue / 100)));
}

function makeTreePoints() {
  const coverage = terrainSettings.treeCoverage ?? 50;
  const spread = 80 + coverage * 2.2;

  return makeScatterPoints(MAX_TREES, 10 + terrainSettings.scatterSeed * 100, {
    minX: -spread,
    maxX: spread,
    minZ: -spread,
    maxZ: spread,
    minScale: 0.55,
    maxScale: 1.8,
  });
}

function makeGrassPoints() {
  const coverage = terrainSettings.grassCoverage ?? 50;
  const spread = 70 + coverage * 2.35;

  return makeScatterPoints(MAX_GRASS, 1400 + terrainSettings.scatterSeed * 100, {
    minX: -spread,
    maxX: spread,
    minZ: -spread,
    maxZ: spread,
    minScale: 0.55,
    maxScale: 1.35,
  });
}

function makeFoliagePoints() {
  return makeScatterPoints(
    MAX_FOLIAGE,
    500 + terrainSettings.scatterSeed * 100,
    {
      minX: -150,
      maxX: 150,
      minZ: -180,
      maxZ: 170,
      minScale: 0.45,
      maxScale: 1.55,
    }
  );
}

function makeRockPoints() {
  return makeScatterPoints(
    MAX_ROCKS,
    900 + terrainSettings.scatterSeed * 100,
    {
      minX: -160,
      maxX: 160,
      minZ: -190,
      maxZ: 180,
      minScale: 0.3,
      maxScale: 1.55,
    }
  );
}

function CrimsonTree({
  position,
  scale = 1,
  crownRef,
  windPhase = 0,
  collisionEnabled = false,
  physicsKey,
}) {
  const treeVisual = (
    <group scale={scale}>
      <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.22, 5.6, 5]} />

        <meshStandardMaterial
          color="#300812"
          roughness={0.9}
        />
      </mesh>

      <group
        ref={crownRef}
        position={[0, 5.25, 0]}
        userData={{ windPhase }}
      >
        <mesh
          position={[0, 0.95, 0]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[1.4, 3.2, 6]} />

          <meshStandardMaterial
            color="#12060a"
            emissive="#cd2626"
            emissiveIntensity={0.22}
            roughness={0.8}
          />
        </mesh>
      </group>
    </group>
  );

  if (!collisionEnabled) {
    return (
      <group position={position}>
        {treeVisual}
      </group>
    );
  }

  const trunkHalfHeight = 2.8 * scale;
  const trunkRadius = 0.22 * scale;

  return (
    <RigidBody
  key={physicsKey}
  type="fixed"
  colliders={false}
  position={position}
>
      <CylinderCollider
        args={[
          trunkHalfHeight,
          trunkRadius,
        ]}
        position={[
          0,
          trunkHalfHeight,
          0,
        ]}
        friction={0.8}
      />

      {treeVisual}
    </RigidBody>
  );
}

function CrimsonFern({
  position,
  scale = 1,
  rotation = 0,
  fernRef,
  windPhase = 0,
}) {
  return (
    <group
      ref={fernRef}
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
      userData={{ windPhase, baseRotation: rotation }}
    >
      {[0, 1, 2, 3, 4, 5].map((leaf) => (
        <mesh
          key={leaf}
          position={[0, 0.18, 0]}
          rotation={[
            -Math.PI / 2.7,
            0,
            (Math.PI * 2 * leaf) / 6,
          ]}
          castShadow
        >
          <planeGeometry args={[0.28, 2.2]} />

          <meshStandardMaterial
            color="#16070a"
            emissive="#cd2626"
            emissiveIntensity={0.18}
            roughness={0.9}
            side={2}
          />
        </mesh>
      ))}
    </group>
  );
}

function SimpleRock({
  position,
  scale = 1,
  rotation = 0,
  boulderHeightMultiplier = 1,
  collisionEnabled = false,
  physicsKey,
}) {
  const halfWidth = scale * 1.2;
  const halfHeight =
    scale * 0.55 * boulderHeightMultiplier;
  const halfDepth = scale;
  const burialDepth = Math.min(
  halfHeight * 0.28,
  scale * 0.75
);

const rockCenterHeight =
  halfHeight - burialDepth;
  const rockVisual = (
    <mesh
      position={[0, rockCenterHeight, 0]}
      scale={[
        halfWidth,
        halfHeight,
        halfDepth,
      ]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />

      <meshStandardMaterial
        color="#20272d"
        roughness={0.95}
      />
    </mesh>
  );

  if (!collisionEnabled) {
    return (
      <group
        position={position}
        rotation={[0, rotation, 0]}
      >
        {rockVisual}
      </group>
    );
  }

  return (
    <RigidBody
      key={physicsKey}
      type="fixed"
      colliders={false}
      position={position}
      rotation={[0, rotation, 0]}
    >
      <CuboidCollider
        args={[
          halfWidth * 0.82,
          halfHeight * 0.9,
          halfDepth * 0.82,
        ]}
        position={[0, rockCenterHeight, 0]}
        friction={0.85}
      />

      {rockVisual}
    </RigidBody>
  );
}

function GrassClump({ position, scale = 1, rotation = 0, height = 1 }) {
  const blades = 7;

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {Array.from({ length: blades }).map((_, index) => (
        <mesh
          key={index}
          position={[0, height * 0.45, 0]}
          rotation={[0.18, (Math.PI * 2 * index) / blades, 0]}
          castShadow
        >
          <planeGeometry args={[0.035, height]} />
          <meshStandardMaterial
            color="#16070a"
            emissive="#cd2626"
            emissiveIntensity={0.1}
            roughness={0.9}
            side={2}
          />
        </mesh>
      ))}
    </group>
  );
}

function useTerrainSetting(settingKey, fallbackValue) {
  const [value, setValue] = useState(
    terrainSettings[settingKey] ?? fallbackValue
  );

  useEffect(() => {
    function handleTerrainChange() {
      setValue(terrainSettings[settingKey] ?? fallbackValue);
    }

    window.addEventListener("terrain-settings-changed", handleTerrainChange);

    return () => {
      window.removeEventListener(
        "terrain-settings-changed",
        handleTerrainChange
      );
    };
  }, [settingKey, fallbackValue]);

  return value;
}

function useTerrainShapeRefresh() {
  const heightMultiplier =
    useTerrainSetting(
      "heightMultiplier",
      1
    );

  const mountainHeight =
    useTerrainSetting(
      "mountainHeight",
      1
    );

  const cliffSharpness =
    useTerrainSetting(
      "cliffSharpness",
      1
    );

  const rollingHills =
    useTerrainSetting(
      "rollingHills",
      1
    );

  const ridgeStrength =
    useTerrainSetting(
      "ridgeStrength",
      1
    );

  const plateauAmount =
    useTerrainSetting(
      "plateauAmount",
      0
    );

  const geometryStrength =
    useTerrainSetting(
      "geometryStrength",
      0
    );

  return [
    heightMultiplier,
    mountainHeight,
    cliffSharpness,
    rollingHills,
    ridgeStrength,
    plateauAmount,
    geometryStrength,
  ];
}

function TreeScatter() {
  const crownRefs = useRef([]);
  const frameCounterRef = useRef(0);

  const treeDensity = useTerrainSetting("treeDensity", 25);
  const treeCoverage = useTerrainSetting("treeCoverage", 50);
  const scatterSeed = useTerrainSetting("scatterSeed", 1);

  const windStrength = useTerrainSetting("windStrength", 25);
  const windSpeed = useTerrainSetting("windSpeed", 35);

  const terrainShape = useTerrainShapeRefresh();

  const trees = useMemo(() => {
    crownRefs.current = [];

    const count = countFromSlider(
      treeDensity,
      MAX_TREES
    );

    return makeTreePoints()
      .slice(0, count)
      .map((point, index) => {
        const y = getTerrainHeightAt(
          point.x,
          point.z
        );

        return (
          <CrimsonTree
  key={`tree-${index}`}
  position={[point.x, y, point.z]}
  scale={point.scale}
  windPhase={point.variant * Math.PI * 2}
  collisionEnabled={index < MAX_TREE_COLLIDERS}
  physicsKey={`tree-body-${index}-${scatterSeed}-${y.toFixed(3)}`}
  crownRef={(object) => {
    crownRefs.current[index] = object;
  }}
/>
        );
      });
  }, [
    treeDensity,
    treeCoverage,
    scatterSeed,
    ...terrainShape,
  ]);

  useFrame((state) => {
    /*
     * Update every second frame to reduce the amount
     * of vegetation transform work.
     */
    frameCounterRef.current += 1;

    if (frameCounterRef.current % 2 !== 0) {
      return;
    }

    const strength =
      (Number(windStrength) || 0) / 100;

    if (strength <= 0) {
      crownRefs.current.forEach((crown) => {
        if (!crown) return;

        crown.rotation.x = 0;
        crown.rotation.z = 0;
      });

      return;
    }

    const speed =
      0.25 +
      ((Number(windSpeed) || 0) / 100) * 2.75;

    const time =
      state.clock.elapsedTime * speed;

    crownRefs.current.forEach((crown) => {
      if (!crown) return;

      const phase =
        crown.userData.windPhase ?? 0;

      const mainSway =
        Math.sin(time + phase) *
        strength *
        0.12;

      const secondarySway =
        Math.cos(time * 0.65 + phase) *
        strength *
        0.055;

      crown.rotation.z = mainSway;
      crown.rotation.x = secondarySway;
    });
  });

  return <>{trees}</>;
}

function FoliageScatter() {
  const fernRefs = useRef([]);
  const frameCounterRef = useRef(0);

  const foliageDensity =
    useTerrainSetting("foliageDensity", 25);
  const scatterSeed =
    useTerrainSetting("scatterSeed", 1);

  const windStrength =
    useTerrainSetting("windStrength", 25);

  const windSpeed =
    useTerrainSetting("windSpeed", 35);

  const terrainShape =
    useTerrainShapeRefresh();

  const foliage = useMemo(() => {
    fernRefs.current = [];

    const count = countFromSlider(
      foliageDensity,
      MAX_FOLIAGE
    );

    return makeFoliagePoints()
      .slice(0, count)
      .map((point, index) => {
        const y =
          getTerrainHeightAt(
            point.x,
            point.z
          ) + 0.06;

        return (
          <CrimsonFern
            key={`fern-${index}`}
            position={[point.x, y, point.z]}
            scale={point.scale}
            rotation={point.rotation}
            windPhase={point.variant * Math.PI * 2}
            fernRef={(object) => {
              fernRefs.current[index] = object;
            }}
          />
        );
      });
  }, [
    foliageDensity,
    scatterSeed,
    ...terrainShape,
  ]);

  useFrame((state) => {
    frameCounterRef.current += 1;

    if (frameCounterRef.current % 2 !== 0) {
      return;
    }

    const strength =
      (Number(windStrength) || 0) / 100;

    if (strength <= 0) {
      fernRefs.current.forEach((fern) => {
        if (!fern) return;

        fern.rotation.x = 0;
        fern.rotation.z = 0;
      });

      return;
    }

    const speed =
      0.35 +
      ((Number(windSpeed) || 0) / 100) * 3.25;

    const time =
      state.clock.elapsedTime * speed;

    fernRefs.current.forEach((fern) => {
      if (!fern) return;

      const phase =
        fern.userData.windPhase ?? 0;

      const sway =
        Math.sin(time * 1.25 + phase) *
        strength *
        0.13;

      const flutter =
        Math.sin(time * 3.4 + phase * 1.7) *
        strength *
        0.035;

      fern.rotation.z = sway;
      fern.rotation.x = flutter;
    });
  });

  return <>{foliage}</>;
}

function RockScatter() {
  const rockDensity = useTerrainSetting("rockDensity", 20);
  const boulderAmount = useTerrainSetting("boulderAmount", 0);
  const boulderHeight = useTerrainSetting("boulderHeight", 50);
  const scatterSeed = useTerrainSetting("scatterSeed", 1);
  const terrainShape = useTerrainShapeRefresh();

  const rocks = useMemo(() => {
    const count = countFromSlider(rockDensity, MAX_ROCKS);
    const boulderChance = (Number(boulderAmount) || 0) / 100;

    const boulderHeightMultiplier =
      1 + ((Number(boulderHeight) || 0) / 100) * 5;

    return makeRockPoints().slice(0, count).map((point, index) => {
      const y = getTerrainHeightAt(point.x, point.z);
      const isBoulder = point.variant < boulderChance;

      return (
        <SimpleRock
          key={`rock-${index}`}
          position={[point.x, y, point.z]}
          scale={point.scale}
          rotation={point.rotation}
          collisionEnabled={index < MAX_ROCK_COLLIDERS}
          physicsKey={`rock-body-${index}-${scatterSeed}-${y.toFixed(3)}-${boulderHeightMultiplier.toFixed(3)}`}
          boulderHeightMultiplier={
            isBoulder ? boulderHeightMultiplier : 1
          }
        />
      );
    });
  }, [
    rockDensity,
    boulderAmount,
    boulderHeight,
    scatterSeed,
    ...terrainShape,
  ]);

  return <>{rocks}</>;
}

export default function Landscape() {
  return (
    <>
      <TreeScatter />
      <FoliageScatter />
      <RockScatter />

    </>
  );
}