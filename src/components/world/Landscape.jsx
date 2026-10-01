import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  RigidBody,
  CylinderCollider,
  CuboidCollider,
} from "@react-three/rapier";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { useWorldStore } from "../../systems/world/worldStore";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";
import CrimsonTreeModel from "./CrimsonTreeModel";
import {
  createCrimsonTreeDefinition,
} from "./treeGenerator";
import { BUILTIN_OBJECTS } from "../../systems/objects/objectRegistry";
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
  x:
    bounds.minX +
    seededRandom(i + seedOffset) *
      (bounds.maxX - bounds.minX),

  z:
    bounds.minZ +
    seededRandom(i + seedOffset + 1000) *
      (bounds.maxZ - bounds.minZ),

  scale:
    bounds.minScale +
    seededRandom(i + seedOffset + 2000) *
      (bounds.maxScale - bounds.minScale),

  rotation:
    seededRandom(i + seedOffset + 3000) *
    Math.PI *
    2,

  variant:
    seededRandom(i + seedOffset + 4000),

  seed:
    Math.floor(
      seededRandom(i + seedOffset + 5000) *
        1000000
    ) + 1,
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
/*
 * Mature Tree Crown V1
 *
 * Creates one shared, faceted crown geometry.
 * The alternating narrow and wide rings produce
 * irregular branch layers instead of a simple cone.
 *
 * Because this geometry is created once and shared
 * by every tree, it is significantly lighter than
 * constructing many separate foliage meshes.
 */
function createMatureTreeCrownGeometry() {
  const sides = 7;

  const rings = [
    {
      y: 0,
      radius: 0.08,
    },
    {
      y: -0.65,
      radius: 0.82,
    },
    {
      y: -1.05,
      radius: 0.48,
    },
    {
      y: -1.55,
      radius: 1.22,
    },
    {
      y: -1.95,
      radius: 0.7,
    },
    {
      y: -2.55,
      radius: 1.55,
    },
    {
      y: -3,
      radius: 0.88,
    },
    {
      y: -3.55,
      radius: 1.42,
    },
    {
      y: -4.05,
      radius: 0.3,
    },
  ];

  const positions = [];
  const indices = [];

  rings.forEach((ring, ringIndex) => {
    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const angle =
        (sideIndex / sides) *
          Math.PI *
          2 +
        ringIndex * 0.19;

      /*
       * Deterministic irregularity prevents the
       * crown from appearing perfectly circular.
       */
      const irregularity =
        1 +
        Math.sin(
          sideIndex * 2.17 +
            ringIndex * 1.43
        ) *
          0.12;

      const radius =
        ring.radius * irregularity;

      positions.push(
        Math.cos(angle) * radius,
        ring.y,
        Math.sin(angle) * radius
      );
    }
  });

  for (
    let ringIndex = 0;
    ringIndex < rings.length - 1;
    ringIndex += 1
  ) {
    for (
      let sideIndex = 0;
      sideIndex < sides;
      sideIndex += 1
    ) {
      const nextSide =
        (sideIndex + 1) % sides;

      const current =
        ringIndex * sides + sideIndex;

      const currentNext =
        ringIndex * sides + nextSide;

      const below =
        (ringIndex + 1) * sides +
        sideIndex;

      const belowNext =
        (ringIndex + 1) * sides +
        nextSide;

      indices.push(
        current,
        below,
        currentNext
      );

      indices.push(
        currentNext,
        below,
        belowNext
      );
    }
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );

  geometry.setIndex(indices);

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

const MATURE_TREE_CROWN_GEOMETRY =
  createMatureTreeCrownGeometry();

const MATURE_TREE_CROWN_EDGES =
  new THREE.EdgesGeometry(
    MATURE_TREE_CROWN_GEOMETRY,
    18
  );
function CrimsonTree({
  position,
  scale = 1,
  rotation = 0,
  variant = 0,
  treeDefinition,
  treeSeed,
  crownRef,
  treeRef,
  windPhase = 0,
  collisionEnabled = false,
  physicsKey,
  treeId = null,
  editable = false,
  proceduralAlways = false,
  legacyCrown = false,
}) {
  const crownWidth =
    0.88 + variant * 0.26;

  const crownHeight =
    0.92 +
    (1 - variant) * 0.18;

  /*
   * Adds a small permanent irregularity to the
   * trunk without separating it from the crown.
   */
  const trunkLean =
    (variant - 0.5) * 0.045;

const treeVisual = (
  <CrimsonTreeModel
    scale={scale}
    rotation={rotation}
    variant={variant}
    windPhase={windPhase}
    crownRef={crownRef}
    treeDefinition={treeDefinition}
    treeId={treeId}
    legacyCrown={legacyCrown}
    legacyCrownOnly={!editable && !proceduralAlways}
    proceduralAlways={proceduralAlways}
  />
);

  if (!collisionEnabled) {
    return (
      <group ref={treeRef} position={position}>
        {treeVisual}
      </group>
    );
  }

  const trunkHalfHeight =
    3.15 * scale;

  const trunkRadius =
    0.27 * scale;

  return (
    <RigidBody
      ref={treeRef}
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
  rockRef,
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
        ref={rockRef}
        position={position}
        rotation={[0, rotation, 0]}
      >
        {rockVisual}
      </group>
    );
  }

  return (
    <RigidBody
      ref={rockRef}
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
    function handleTerrainChange(event) {
      if (event.detail?.key !== settingKey) return;
      setValue(terrainSettings[settingKey] ?? fallbackValue);
    }

    window.addEventListener("terrain-settings-changed", handleTerrainChange);
    return () => window.removeEventListener("terrain-settings-changed", handleTerrainChange);
  }, [settingKey, fallbackValue]);

  return value;
}



function mergeScatterTreeDefinition(baseDefinition, patch) {
  const base = createCrimsonTreeDefinition(baseDefinition ?? {});
  return createCrimsonTreeDefinition({
    ...base,
    ...patch,
    trunk: { ...base.trunk, ...(patch?.trunk ?? {}) },
    branches: {
      ...base.branches,
      ...(patch?.branches ?? {}),
      overrides: {
        ...(base.branches?.overrides ?? {}),
        ...(patch?.branches?.overrides ?? {}),
      },
      secondary: {
        ...base.branches.secondary,
        ...(patch?.branches?.secondary ?? {}),
      },
    },
    leaves: { ...base.leaves, ...(patch?.leaves ?? {}) },
  });
}

function makeProfileTreePoints(count, coverage, seedOffset, centerX = 0, centerZ = 0) {
  const spread = 80 + Number(coverage ?? 50) * 2.2;
  return makeScatterPoints(count, seedOffset, {
    minX: centerX - spread,
    maxX: centerX + spread,
    minZ: centerZ - spread,
    maxZ: centerZ + spread,
    minScale: 0.55,
    maxScale: 1.8,
  });
}

function ProceduralTreeScatterProfile({ profileId, profile, currentChunkId, currentChunk, terrainValues, editableTreeId }) {
  const crownRefs = useRef([]);
  const frameCounterRef = useRef(0);

  const density = Math.max(0, Math.min(100, Number(profile?.density ?? 0)));
  const coverage = Math.max(0, Math.min(100, Number(profile?.coverage ?? 50)));
  const isDefaultCrimson = profileId === "crimson-tree";
  const maxCount = isDefaultCrimson ? MAX_TREES : 260;
  const count = countFromSlider(density, maxCount);
  const chunkX = isDefaultCrimson ? 0 : Number(currentChunk?.position?.[0] ?? 0);
  const chunkZ = isDefaultCrimson ? 0 : Number(currentChunk?.position?.[2] ?? 0);
  const seedBase = Number(terrainValues.scatterSeed) || 1;
  const profileSeed = Number(profile?.seed ?? 1);
  const baseDefinition = useMemo(
    () => profile?.treeDefinition
      ? createCrimsonTreeDefinition(profile.treeDefinition)
      : createCrimsonTreeDefinition(),
    [profile?.treeDefinition],
  );
  const treeOverrides = profile?.treeOverrides ?? {};

  const trees = useMemo(() => {
    crownRefs.current = [];
    const points = makeProfileTreePoints(
      count,
      coverage,
      10 + seedBase * 100 + profileSeed * 7919 + profileId.length * 31,
      chunkX,
      chunkZ,
    );

    return points.map((point, index) => {
      const treeId = `scatter-tree-${profileId}-${currentChunkId}-${index}`;
      const override = treeOverrides[treeId];
      const treeDefinition = mergeScatterTreeDefinition(
        { ...baseDefinition, seed: point.seed },
        override,
      );
      const y = getTerrainHeightAt(point.x, point.z);

      return (
        <CrimsonTree
          key={treeId}
          position={[point.x, y, point.z]}
          scale={point.scale}
          rotation={point.rotation}
          variant={point.variant}
          treeDefinition={treeDefinition}
          treeId={treeId}
          editable={editableTreeId === treeId}
          treeSeed={point.seed}
          windPhase={point.variant * Math.PI * 2}
          legacyCrown={isDefaultCrimson}
          proceduralAlways={Boolean(profile?.treeDefinition)}
          collisionEnabled={isDefaultCrimson && index < MAX_TREE_COLLIDERS}
          physicsKey={`tree-body-${profileId}-${index}-${seedBase}-${y.toFixed(3)}`}
          crownRef={(object) => {
            crownRefs.current[index] = object;
          }}
        />
      );
    });
  }, [count, coverage, seedBase, profileSeed, profileId, currentChunkId, chunkX, chunkZ, baseDefinition, treeOverrides, editableTreeId, terrainValues.heightMultiplier, terrainValues.mountainHeight, terrainValues.cliffSharpness, terrainValues.rollingHills, terrainValues.ridgeStrength, terrainValues.plateauAmount, terrainValues.geometryStrength]);

  const windStrength = Number(terrainValues.windStrength) || 0;
  const windSpeed = Number(terrainValues.windSpeed) || 0;

  useFrame((state) => {
    frameCounterRef.current += 1;
    if (frameCounterRef.current % 2 !== 0) return;

    const strength = windStrength / 100;
    if (strength <= 0) {
      crownRefs.current.forEach((crown) => {
        if (!crown) return;
        crown.rotation.x = 0;
        crown.rotation.z = 0;
      });
      return;
    }

    const speed = 0.25 + (windSpeed / 100) * 2.75;
    const time = state.clock.elapsedTime * speed;
    crownRefs.current.forEach((crown) => {
      if (!crown) return;
      const phase = crown.userData.windPhase ?? 0;
      crown.rotation.z = Math.sin(time + phase) * strength * 0.055;
      crown.rotation.x = Math.cos(time * 0.65 + phase) * strength * 0.025;
    });
  });

  return <>{trees}</>;
}

function TreeScatter() {
  const profiles = useWorldStore((state) => state.world.scatterProfiles ?? {});
  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const currentChunk = useWorldStore((state) => state.world.chunks?.[state.world.currentChunkId]);
  const [editableTreeId, setEditableTreeId] = useState(null);

  const terrainValues = {
    scatterSeed: useTerrainSetting("scatterSeed", 1),
    heightMultiplier: useTerrainSetting("heightMultiplier", 1.5),
    mountainHeight: useTerrainSetting("mountainHeight", 1.5),
    cliffSharpness: useTerrainSetting("cliffSharpness", 1.5),
    rollingHills: useTerrainSetting("rollingHills", 1.5),
    ridgeStrength: useTerrainSetting("ridgeStrength", 1.5),
    plateauAmount: useTerrainSetting("plateauAmount", 0),
    geometryStrength: useTerrainSetting("geometryStrength", 55),
    windStrength: useTerrainSetting("windStrength", 25),
    windSpeed: useTerrainSetting("windSpeed", 35),
  };
  const treeDensityFallback = useTerrainSetting("treeDensity", 25);
  const treeCoverageFallback = useTerrainSetting("treeCoverage", 50);

  useEffect(() => {
    function handleTreeEditChange(event) {
      const treeId = event.detail?.treeId;
      const patch = event.detail?.patch;
      const scope = event.detail?.scope ?? "global";
      if (!treeId || !treeId.startsWith("scatter-tree-")) return;

      let matchingProfileId = Object.keys(useWorldStore.getState().world.scatterProfiles ?? {})
        .find((profileId) => treeId.startsWith(`scatter-tree-${profileId}-${currentChunkId}-`));
      if (!matchingProfileId && treeId.startsWith(`scatter-tree-crimson-tree-${currentChunkId}-`)) {
        matchingProfileId = "crimson-tree";
      }
      if (!matchingProfileId) return;

      setEditableTreeId(treeId);
      const world = useWorldStore.getState().world;
      const profile = world.scatterProfiles?.[matchingProfileId] ?? {
        enabled: true,
        objectId: "crimson-tree",
        name: "CRIMSON TREE",
        source: "procedural",
        modelType: "crimson-tree",
        density: treeDensityFallback,
        coverage: treeCoverageFallback,
        treeDefinition: createCrimsonTreeDefinition(),
        treeOverrides: {},
      };
      const baseDefinition = mergeScatterTreeDefinition(profile.treeDefinition ?? createCrimsonTreeDefinition(), {});

      if (scope === "single") {
        const existing = mergeScatterTreeDefinition(baseDefinition, profile.treeOverrides?.[treeId] ?? {});
        const nextDefinition = mergeScatterTreeDefinition(existing, patch);
        useWorldStore.getState().upsertScatterProfile(matchingProfileId, {
          treeDefinition: profile.treeDefinition ?? createCrimsonTreeDefinition(),
          treeOverrides: {
            ...(profile.treeOverrides ?? {}),
            [treeId]: nextDefinition,
          },
        });
        return;
      }

      const nextOverrides = Object.fromEntries(
        Object.entries(profile.treeOverrides ?? {}).map(([instanceId, override]) => [
          instanceId,
          mergeScatterTreeDefinition(mergeScatterTreeDefinition(baseDefinition, override), patch),
        ])
      );
      useWorldStore.getState().upsertScatterProfile(matchingProfileId, {
        treeDefinition: mergeScatterTreeDefinition(baseDefinition, patch),
        treeOverrides: nextOverrides,
      });
    }

    function handleTreeEditExit() {
      setEditableTreeId(null);
    }

    window.addEventListener("crimson-tree-edit-change", handleTreeEditChange);
    window.addEventListener("crimson-tree-edit-exit", handleTreeEditExit);
    return () => {
      window.removeEventListener("crimson-tree-edit-change", handleTreeEditChange);
      window.removeEventListener("crimson-tree-edit-exit", handleTreeEditExit);
    };
  }, [currentChunkId, treeDensityFallback, treeCoverageFallback]);

  const treeProfiles = useMemo(() => {
    const entries = [];
    const defaultProfile = profiles["crimson-tree"];
    if (defaultProfile?.enabled !== false) {
      entries.push([
        "crimson-tree",
        defaultProfile ?? {
          enabled: true,
          density: treeDensityFallback,
          coverage: treeCoverageFallback,
          modelType: "crimson-tree",
        },
      ]);
    }

    Object.entries(profiles).forEach(([profileId, profile]) => {
      if (profileId === "crimson-tree") return;
      if (!profile?.enabled) return;
      if (profile?.modelType !== "crimson-tree" && profile?.treeDefinition?.generator !== "TreeGenerator") return;
      entries.push([profileId, profile]);
    });

    return entries;
  }, [profiles, treeDensityFallback, treeCoverageFallback]);

  return (
    <>
      {treeProfiles.map(([profileId, profile]) => (
        <ProceduralTreeScatterProfile
          key={`tree-scatter-${profileId}`}
          profileId={profileId}
          profile={profile}
          currentChunkId={currentChunkId}
          currentChunk={currentChunk}
          terrainValues={terrainValues}
          editableTreeId={editableTreeId}
        />
      ))}
    </>
  );
}

function FoliageScatter() {
  const fernRefs = useRef([]);
  const foliagePointsRef = useRef([]);
  const frameCounterRef = useRef(0);

  const foliageDensity =
    useTerrainSetting("foliageDensity", 25);
  const scatterSeed =
    useTerrainSetting("scatterSeed", 1);
  const terrainHeightMultiplier = useTerrainSetting("heightMultiplier", 1.5);
  const terrainMountainHeight = useTerrainSetting("mountainHeight", 1.5);
  const terrainCliffSharpness = useTerrainSetting("cliffSharpness", 1.5);
  const terrainRollingHills = useTerrainSetting("rollingHills", 1.5);
  const terrainRidgeStrength = useTerrainSetting("ridgeStrength", 1.5);
  const terrainPlateauAmount = useTerrainSetting("plateauAmount", 0);
  const terrainGeometryStrength = useTerrainSetting("geometryStrength", 55);

  const windStrength =
    useTerrainSetting("windStrength", 25);

  const windSpeed =
    useTerrainSetting("windSpeed", 35);

  const foliage = useMemo(() => {
    fernRefs.current = [];
    foliagePointsRef.current = [];

    const count = countFromSlider(
      foliageDensity,
      MAX_FOLIAGE
    );

    return makeFoliagePoints()
      .slice(0, count)
      .map((point, index) => {
        foliagePointsRef.current[index] = point;
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
    terrainHeightMultiplier,
    terrainMountainHeight,
    terrainCliffSharpness,
    terrainRollingHills,
    terrainRidgeStrength,
    terrainPlateauAmount,
    terrainGeometryStrength,
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
  const rockRefs = useRef([]);
  const rockPointsRef = useRef([]);
  const rockDensity = useTerrainSetting("rockDensity", 20);
  const boulderAmount = useTerrainSetting("boulderAmount", 0);
  const boulderHeight = useTerrainSetting("boulderHeight", 50);
  const scatterSeed = useTerrainSetting("scatterSeed", 1);
  const terrainHeightMultiplier = useTerrainSetting("heightMultiplier", 1.5);
  const terrainMountainHeight = useTerrainSetting("mountainHeight", 1.5);
  const terrainCliffSharpness = useTerrainSetting("cliffSharpness", 1.5);
  const terrainRollingHills = useTerrainSetting("rollingHills", 1.5);
  const terrainRidgeStrength = useTerrainSetting("ridgeStrength", 1.5);
  const terrainPlateauAmount = useTerrainSetting("plateauAmount", 0);
  const terrainGeometryStrength = useTerrainSetting("geometryStrength", 55);
  const rocks = useMemo(() => {
    rockRefs.current = [];
    rockPointsRef.current = [];
    const count = countFromSlider(rockDensity, MAX_ROCKS);
    const boulderChance = (Number(boulderAmount) || 0) / 100;

    const boulderHeightMultiplier =
      1 + ((Number(boulderHeight) || 0) / 100) * 5;

    return makeRockPoints().slice(0, count).map((point, index) => {
      rockPointsRef.current[index] = point;
      const y = getTerrainHeightAt(point.x, point.z);
      const isBoulder = point.variant < boulderChance;

      return (
        <SimpleRock
          key={`rock-${index}`}
          rockRef={(object) => { rockRefs.current[index] = object; }}
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
    terrainHeightMultiplier,
    terrainMountainHeight,
    terrainCliffSharpness,
    terrainRollingHills,
    terrainRidgeStrength,
    terrainPlateauAmount,
    terrainGeometryStrength,
  ]);

  return <>{rocks}</>;
}

function seededScatterRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function resolveScatterAsset(objectId, profile) {
  const registered = BUILTIN_OBJECTS.find((entry) => entry.id === objectId);
  return {
    modelPath: profile?.modelPath ?? registered?.modelPath ?? null,
    kind: profile?.kind ?? registered?.kind ?? null,
    name: profile?.name ?? registered?.name ?? objectId,
  };
}

function ScatterGLTFAsset({ modelPath, position, rotation, scale }) {
  const gltf = useGLTF(modelPath);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [gltf.scene]);

  return (
    <primitive
      object={scene}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
    />
  );
}

function GenericObjectScatter({ objectId, profile }) {
  const currentChunk = useWorldStore((state) => state.world.chunks?.[state.world.currentChunkId]);
  const asset = resolveScatterAsset(objectId, profile);
  const scatterSeed = useTerrainSetting("scatterSeed", 1);
  const terrainHeightMultiplier = useTerrainSetting("heightMultiplier", 1.5);
  const terrainMountainHeight = useTerrainSetting("mountainHeight", 1.5);
  const terrainCliffSharpness = useTerrainSetting("cliffSharpness", 1.5);
  const terrainRollingHills = useTerrainSetting("rollingHills", 1.5);
  const terrainRidgeStrength = useTerrainSetting("ridgeStrength", 1.5);
  const terrainPlateauAmount = useTerrainSetting("plateauAmount", 0);
  const terrainGeometryStrength = useTerrainSetting("geometryStrength", 55);

  const density = Math.max(0, Math.min(100, Number(profile?.density ?? 0)));
  const coverage = Math.max(0, Math.min(100, Number(profile?.coverage ?? 50)));
  const count = Math.min(260, Math.floor(260 * density / 100));
  const spread = 22 + coverage * 1.05;
  const chunkX = Number(currentChunk?.position?.[0] ?? 0);
  const chunkZ = Number(currentChunk?.position?.[2] ?? 0);

  const points = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const base = index + 1 + objectId.length * 31 + Number(scatterSeed) * 101;
      const x = chunkX + (seededScatterRandom(base) - 0.5) * spread * 2;
      const z = chunkZ + (seededScatterRandom(base + 17) - 0.5) * spread * 2;
      const scaleVariation = Math.max(0, Math.min(100, Number(profile?.scaleVariation ?? 25))) / 100;
      const scale = 0.7 + seededScatterRandom(base + 33) * (0.45 * scaleVariation);
      const rotation = seededScatterRandom(base + 61) * Math.PI * 2;
      const y = getTerrainHeightAt(x, z) + 0.02;
      return { position: [x, y, z], rotation, scale };
    });
  }, [count, objectId, scatterSeed, spread, chunkX, chunkZ, terrainHeightMultiplier, terrainMountainHeight, terrainCliffSharpness, terrainRollingHills, terrainRidgeStrength, terrainPlateauAmount, terrainGeometryStrength, profile?.scaleVariation]);

  if (!asset.modelPath || count <= 0) return null;

  return (
    <group>
      {points.map((point, index) => (
        <ScatterGLTFAsset
          key={`${objectId}-scatter-${index}`}
          modelPath={asset.modelPath}
          position={point.position}
          rotation={point.rotation}
          scale={point.scale}
        />
      ))}
    </group>
  );
}

function GenericScatterCollection() {
  const profiles = useWorldStore((state) => state.world.scatterProfiles ?? {});
  return (
    <>
      {Object.entries(profiles)
        .filter(([objectId, profile]) => profile?.enabled && (profile?.modelPath || BUILTIN_OBJECTS.some((entry) => entry.id === objectId)))
        .filter(([objectId]) => objectId !== "crimson-tree")
        .map(([objectId, profile]) => (
          <GenericObjectScatter
            key={`generic-scatter-${objectId}`}
            objectId={objectId}
            profile={{ ...profile, objectId }}
          />
        ))}
    </>
  );
}

export default function Landscape() {
  return (
    <>
      <TreeScatter />
      <FoliageScatter />
      <RockScatter />
      <Suspense fallback={null}>
        <GenericScatterCollection />
      </Suspense>
    </>
  );
}