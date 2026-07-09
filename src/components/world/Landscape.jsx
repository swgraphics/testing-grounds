import { useEffect, useMemo, useState } from "react";
import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const MAX_TREES = 900;
const MAX_FOLIAGE = 1400;
const MAX_ROCKS = 650;

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
    });
  }

  return points;
}

function countFromSlider(value, maxCount) {
  const safeValue = Number(value) || 0;

  if (safeValue <= 0) return 0;
  if (safeValue >= 100) return maxCount;

  const normalized = safeValue / 100;

  return Math.max(1, Math.floor(maxCount * normalized));
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

const FOLIAGE_POINTS = makeScatterPoints(MAX_FOLIAGE, 500, {
  minX: -150,
  maxX: 150,
  minZ: -180,
  maxZ: 170,
  minScale: 0.45,
  maxScale: 1.55,
});

const ROCK_POINTS = makeScatterPoints(MAX_ROCKS, 900, {
  minX: -160,
  maxX: 160,
  minZ: -190,
  maxZ: 180,
  minScale: 0.3,
  maxScale: 1.55,
});

function CrimsonTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 5.6, 5]} />
        <meshStandardMaterial color="#300812" roughness={0.9} />
      </mesh>

      <mesh position={[0, 6.2, 0]} castShadow>
        <coneGeometry args={[1.4, 3.2, 6]} />
        <meshStandardMaterial
          color="#12060a"
          emissive="#cd2626"
          emissiveIntensity={0.22}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

function CrimsonFern({ position, scale = 1, rotation = 0 }) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {[0, 1, 2, 3, 4, 5].map((leaf) => (
        <mesh
          key={leaf}
          position={[0, 0.18, 0]}
          rotation={[-Math.PI / 2.7, 0, (Math.PI * 2 * leaf) / 6]}
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

function SimpleRock({ position, scale = 1, rotation = 0 }) {
  return (
    <mesh
      position={position}
      scale={[scale * 1.2, scale * 0.55, scale]}
      rotation={[0, rotation, 0]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#20272d" roughness={0.95} />
    </mesh>
  );
}

function useTerrainSetting(settingKey, fallbackValue) {
  const [value, setValue] = useState(
    terrainSettings[settingKey] ?? fallbackValue
  );

  useEffect(() => {
    function handleTerrainChange(event) {
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

function TreeScatter() {
  const treeDensity = useTerrainSetting("treeDensity", 25);
  const heightMultiplier = useTerrainSetting("heightMultiplier", 1);
  const mountainHeight = useTerrainSetting("mountainHeight", 1);
  const cliffSharpness = useTerrainSetting("cliffSharpness", 1);
  const rollingHills = useTerrainSetting("rollingHills", 1);
  const ridgeStrength = useTerrainSetting("ridgeStrength", 1);
  const treeCoverage = useTerrainSetting("treeCoverage", 50);
  const scatterSeed = useTerrainSetting("scatterSeed", 1);
  const trees = useMemo(() => {
    const count = countFromSlider(treeDensity, MAX_TREES);

    return makeTreePoints().slice(0, count).map((point, index) => {
      const y = getTerrainHeightAt(point.x, point.z);

      return (
        <CrimsonTree
          key={`tree-${index}`}
          position={[point.x, y, point.z]}
          scale={point.scale}
        />
      );
    });
  }, [
    treeDensity,
    treeCoverage,
    scatterSeed,
    heightMultiplier,
    mountainHeight,
    cliffSharpness,
    rollingHills,
    ridgeStrength,
  ]);

  return <>{trees}</>;
}

function FoliageScatter() {
  const foliageDensity = useTerrainSetting("foliageDensity", 25);
  const heightMultiplier = useTerrainSetting("heightMultiplier", 1);
  const mountainHeight = useTerrainSetting("mountainHeight", 1);
  const cliffSharpness = useTerrainSetting("cliffSharpness", 1);
  const rollingHills = useTerrainSetting("rollingHills", 1);
  const ridgeStrength = useTerrainSetting("ridgeStrength", 1);

  const foliage = useMemo(() => {
    const count = countFromSlider(foliageDensity, MAX_FOLIAGE);

    return FOLIAGE_POINTS.slice(0, count).map((point, index) => {
      const y = getTerrainHeightAt(point.x, point.z) + 0.06;

      return (
        <CrimsonFern
          key={`fern-${index}`}
          position={[point.x, y, point.z]}
          scale={point.scale}
          rotation={point.rotation}
        />
      );
    });
  }, [
    foliageDensity,
    heightMultiplier,
    mountainHeight,
    cliffSharpness,
    rollingHills,
    ridgeStrength,
  ]);

  return <>{foliage}</>;
}

function RockScatter() {
  const rockDensity = useTerrainSetting("rockDensity", 20);
  const heightMultiplier = useTerrainSetting("heightMultiplier", 1);
  const mountainHeight = useTerrainSetting("mountainHeight", 1);
  const cliffSharpness = useTerrainSetting("cliffSharpness", 1);
  const rollingHills = useTerrainSetting("rollingHills", 1);
  const ridgeStrength = useTerrainSetting("ridgeStrength", 1);

  const rocks = useMemo(() => {
    const count = countFromSlider(rockDensity, MAX_ROCKS);

    return ROCK_POINTS.slice(0, count).map((point, index) => {
      const y = getTerrainHeightAt(point.x, point.z) + 0.24;

      return (
        <SimpleRock
          key={`rock-${index}`}
          position={[point.x, y, point.z]}
          scale={point.scale}
          rotation={point.rotation}
        />
      );
    });
  }, [
    rockDensity,
    heightMultiplier,
    mountainHeight,
    cliffSharpness,
    rollingHills,
    ridgeStrength,
  ]);

  return <>{rocks}</>;
}

function PaleWaterPatch({ position, scale }) {
  return (
    <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 48]} />
      <meshStandardMaterial
        color="#dfefff"
        roughness={0.35}
        transparent
        opacity={0.62}
      />
    </mesh>
  );
}

export default function Landscape() {
  return (
    <>
      <TreeScatter />
      <FoliageScatter />
      <RockScatter />

      <PaleWaterPatch position={[0, 0.08, 170]} scale={[42, 24, 1]} />
      <PaleWaterPatch position={[145, 0.08, 155]} scale={[35, 18, 1]} />
    </>
  );
}