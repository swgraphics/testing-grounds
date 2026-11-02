import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

const WATER_SIZE = 900;
const WATER_DEPTH = 100;
const WATER_SURFACE_OFFSET = 0.04;
const WATER_WIREFRAME_OFFSET = 0.045;
const EMPTY_WATER_BODIES = [];

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


const WATERFALL_COLOR = "#69b6d6";

function buildPondFlowGeometry(body, waterHeight) {
  const positions = [];
  const indices = [];
  const radius = Math.max(4, Number(body.diameter) / 2);
  const surfaceY = Number(body.y) || 0;
  const sampleCount = 64;
  let vertex = 0;

  // A rim segment becomes a waterfall only where the terrain falls away
  // materially below the pond's surface. Each segment is a sloped sheet,
  // not a horizontal disc, and it terminates at the local terrain/base-water level.
  for (let i = 0; i < sampleCount; i += 1) {
    const a0 = (i / sampleCount) * Math.PI * 2;
    const a1 = ((i + 1) / sampleCount) * Math.PI * 2;
    const mid = (a0 + a1) * 0.5;
    const x = Number(body.x) + Math.cos(mid) * radius;
    const z = Number(body.z) + Math.sin(mid) * radius;
    const edgeTerrain = getTerrainHeightAt(x, z);
    const outerTerrain = getTerrainHeightAt(Number(body.x) + Math.cos(mid) * (radius + 5), Number(body.z) + Math.sin(mid) * (radius + 5));
    const lowTerrain = Math.min(edgeTerrain, outerTerrain);
    if (surfaceY - lowTerrain < 4) continue;

    const topY = surfaceY + 0.025;
    const bottomY = Math.max(waterHeight + 0.08, lowTerrain + 0.18);
    if (bottomY >= topY - 1.2) continue;
    const x0 = Number(body.x) + Math.cos(a0) * radius * 0.995;
    const z0 = Number(body.z) + Math.sin(a0) * radius * 0.995;
    const x1 = Number(body.x) + Math.cos(a1) * radius * 0.995;
    const z1 = Number(body.z) + Math.sin(a1) * radius * 0.995;
    const spread = 1.035;
    positions.push(
      x0, topY, z0,
      x1, topY, z1,
      Number(body.x) + Math.cos(a1) * radius * spread, bottomY, Number(body.z) + Math.sin(a1) * radius * spread,
      Number(body.x) + Math.cos(a0) * radius * spread, bottomY, Number(body.z) + Math.sin(a0) * radius * spread,
    );
    indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
    vertex += 4;
  }

  // If a lowered channel reaches the global water level, create a narrow,
  // downhill ribbon along that sampled route. Reject routes that climb back up.
  let outletFound = false;
  for (let i = 0; i < sampleCount && !outletFound; i += 1) {
    const angle = (i / sampleCount) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let previousHeight = surfaceY;
    const route = [];
    for (let distance = radius * 0.82; distance <= 260; distance += 6) {
      const x = Number(body.x) + dx * distance;
      const z = Number(body.z) + dz * distance;
      const terrainY = getTerrainHeightAt(x, z);
      if (terrainY > previousHeight + 4) break;
      if (terrainY > surfaceY - 1.5) {
        if (distance > radius + 8) break;
        previousHeight = Math.min(previousHeight, terrainY);
        continue;
      }
      route.push({ x, z, terrainY, distance });
      previousHeight = Math.min(previousHeight, terrainY);
      if (terrainY <= waterHeight + 1.5) {
        if (route.length >= 3) {
          const startDistance = route[0].distance;
          const endDistance = route[route.length - 1].distance;
          const halfWidth = 2.2;
          const outletStartVertex = vertex;
          route.forEach((point) => {
            const t = (point.distance - startDistance) / Math.max(1, endDistance - startDistance);
            const y = Math.max(waterHeight + 0.12, Math.min(surfaceY - 0.05, point.terrainY + 0.28, surfaceY - t * (surfaceY - waterHeight)));
            const leftX = point.x - dz * halfWidth;
            const leftZ = point.z + dx * halfWidth;
            const rightX = point.x + dz * halfWidth;
            const rightZ = point.z - dx * halfWidth;
            positions.push(leftX, y, leftZ, rightX, y, rightZ);
            if (vertex > outletStartVertex) {
              const a = vertex - 2;
              const b = vertex - 1;
              indices.push(a, b, vertex + 1, a, vertex + 1, vertex);
            }
            vertex += 2;
          });
          outletFound = true;
        }
        break;
      }
    }
  }

  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function PondWaterfall({ body, waterHeight, terrainRevision }) {
  const geometry = useMemo(
    () => buildPondFlowGeometry(body, waterHeight),
    [body, waterHeight, terrainRevision],
  );
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} renderOrder={3}>
      <meshStandardMaterial color={WATERFALL_COLOR} emissive="#174c68" emissiveIntensity={0.2} transparent opacity={0.78} roughness={0.2} metalness={0.03} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export default function Water() {
  const surfaceRef = useRef();
  const frameCounterRef = useRef(0);
  const guidesVisible = useWorldGuideStore((state) => state.visible);
  const waterSubdivisions = Math.round(Number(terrainSettings.waterSubdivisions) || 48);
  const waterHeight = terrainSettings.waterHeight ?? -4;
  const worldType = useWorldStore((state) => state.world.worldType);
  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const waterBodies = useWorldStore((state) => state.world.chunks?.[currentChunkId]?.water?.bodies ?? EMPTY_WATER_BODIES);
  const [terrainRevision, refresh] = useState(0);

  useEffect(() => {
    function handleTerrainChange() {
      refresh((value) => value + 1);
    }
    window.addEventListener("terrain-settings-changed", handleTerrainChange);
    window.addEventListener("tg-water-bodies-changed", handleTerrainChange);
    return () => { window.removeEventListener("terrain-settings-changed", handleTerrainChange); window.removeEventListener("tg-water-bodies-changed", handleTerrainChange); };
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
      {waterBodies.map((body) => (
        <group key={body.id}>
          <group position={[body.x, body.y, body.z]}>
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
              <circleGeometry args={[Math.max(4, Number(body.diameter) / 2), Math.max(32, waterSubdivisions)]} />
              <meshStandardMaterial color="#4e9ac2" emissive="#0d4c72" emissiveIntensity={0.18} transparent opacity={0.82} roughness={0.26} metalness={0.04} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
              <ringGeometry args={[Math.max(4, Number(body.diameter) / 2) * 0.96, Math.max(4, Number(body.diameter) / 2), 48]} />
              <meshBasicMaterial color="#b8d8e8" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
          <PondWaterfall body={body} waterHeight={waterHeight} terrainRevision={terrainRevision} />
        </group>
      ))}
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
