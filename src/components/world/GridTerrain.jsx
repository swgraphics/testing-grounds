import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { markTerrainReady } from "../../systems/world/terrainReadiness";
import { BASE_TERRAIN_SIZE, TERRAIN_SAMPLE_STEP } from "../../systems/world/terrainRegions";
import { useWorldStore } from "../../systems/world/worldStore";

const TERRAIN_SIZE = BASE_TERRAIN_SIZE;
const TERRAIN_SEGMENTS = 120;

const MINOR_GRID_STEP = 10;
const MAJOR_GRID_STEP = 50;
const SECTOR_GRID_STEP = 100;

/*
 * Each visible grid line is divided into smaller
 * segments so it can follow the terrain surface.
 */
const GRID_SAMPLE_STEP = 5;

/*
 * Prevents grid lines from flickering against
 * the solid terrain.
 */
const GRID_OFFSET = 0.08;

const BASE_TERRAIN_HALF_SIZE = TERRAIN_SIZE / 2;
const CREATOR_CHUNK_SIZE = 100;


function TerrainExtensionChunk({ chunk, terrainKey }) {
  const size = Number(chunk?.terrainRegion?.size ?? CREATOR_CHUNK_SIZE);
  const segments = size / TERRAIN_SAMPLE_STEP;
  const centerX = Number(chunk?.position?.[0]);
  const centerZ = Number(chunk?.position?.[2]);
  const guidesVisible=useWorldGuideStore(state=>state.visible);

  const geometry = useMemo(() => {
    if (![centerX, centerZ].every(Number.isFinite)) return null;

    const geo = new THREE.PlaneGeometry(
      size,
      size,
      segments,
      segments
    );
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position;
    const colors = [];
    const vertexColor = new THREE.Color();

    for (let i = 0; i < positions.count; i += 1) {
      const localX = positions.getX(i);
      const localZ = positions.getZ(i);
      const worldX = centerX + localX;
      const worldZ = centerZ + localZ;
      const height = getTerrainHeightAt(worldX, worldZ);
      positions.setY(i, height);

      const normalizedHeight = THREE.MathUtils.clamp(height / TERRAIN_MAX_GRADIENT_HEIGHT, 0, 1);
      const smoothedHeight = THREE.MathUtils.smoothstep(normalizedHeight, 0, 1);
      vertexColor.lerpColors(TERRAIN_BASE_COLOR, TERRAIN_HIGH_COLOR, smoothedHeight);
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }, [centerX, centerZ, size, segments, terrainKey]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(()=>{if(!geometry)return;let clear;const frame=requestAnimationFrame(()=>{clear=markTerrainReady(chunk.id,geometry.uuid)});return()=>{cancelAnimationFrame(frame);clear?.()}},[chunk.id,geometry]);

  // The terrain sampler reads mutable settings; terrainKey invalidates the guide cache.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const guideGeometry=useMemo(()=>createTerrainGridGeometry({lineStep:10,verticalOffset:GRID_OFFSET,bounds:{minX:centerX-size/2,maxX:centerX+size/2,minZ:centerZ-size/2,maxZ:centerZ+size/2}}),[centerX,centerZ,size,terrainKey]);
  useEffect(()=>()=>guideGeometry.dispose(),[guideGeometry]);
  if (!geometry) return null;

  return (
    <>
    <RigidBody key={`${chunk.id}-${terrainKey}`} type="fixed" colliders="trimesh">
      <mesh
        userData={{tgTerrainRegion:chunk.id}}
        geometry={geometry}
        position={[centerX, 0, centerZ]}
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.94}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    </RigidBody>
    {guidesVisible&&<lineSegments geometry={guideGeometry} userData={{tgTerrainGuide:chunk.id}}><lineBasicMaterial color={MAJOR_GRID_COLOR} transparent opacity={0.38} depthWrite={false}/></lineSegments>}
    </>
  );
}


const TERRAIN_BASE_COLOR = new THREE.Color(
  "#080b10"
);

const TERRAIN_HIGH_COLOR = new THREE.Color(
  "#4a535c"
);

const TERRAIN_MAX_GRADIENT_HEIGHT = 85;

const MINOR_GRID_COLOR = "#71808d";
const MAJOR_GRID_COLOR = "#b8c5cf";
const SECTOR_GRID_COLOR = "#f2f7fa";

/*
 * Returns true when a number lands exactly on
 * the requested grid interval.
 */
function isGridMultiple(value, interval) {
  return (
    Math.abs(value % interval) <
    0.001
  );
}

/*
 * Creates one set of terrain-conforming grid
 * lines.
 *
 * Lines can be excluded when they belong to a
 * stronger hierarchy level.
 */
function createTerrainGridGeometry({
  lineStep,
  excludeStep = null,
  verticalOffset,
  bounds = {minX:-TERRAIN_SIZE/2,maxX:TERRAIN_SIZE/2,minZ:-TERRAIN_SIZE/2,maxZ:TERRAIN_SIZE/2},
}) {

  const linePositions = [];

  /*
   * East/west lines.
   */
  for (
    let z = bounds.minZ;
    z <= bounds.maxZ;
    z += lineStep
  ) {
    if (
      excludeStep &&
      isGridMultiple(z, excludeStep)
    ) {
      continue;
    }

    for (
      let x = bounds.minX;
      x < bounds.maxX;
      x += GRID_SAMPLE_STEP
    ) {
      const nextX = Math.min(
        x + GRID_SAMPLE_STEP,
        bounds.maxX
      );

      const startHeight =
        getTerrainHeightAt(x, z) +
        verticalOffset;

      const endHeight =
        getTerrainHeightAt(nextX, z) +
        verticalOffset;

      linePositions.push(
        x,
        startHeight,
        z,

        nextX,
        endHeight,
        z
      );
    }
  }

  /*
   * North/south lines.
   */
  for (
    let x = bounds.minX;
    x <= bounds.maxX;
    x += lineStep
  ) {
    if (
      excludeStep &&
      isGridMultiple(x, excludeStep)
    ) {
      continue;
    }

    for (
      let z = bounds.minZ;
      z < bounds.maxZ;
      z += GRID_SAMPLE_STEP
    ) {
      const nextZ = Math.min(
        z + GRID_SAMPLE_STEP,
        bounds.maxZ
      );

      const startHeight =
        getTerrainHeightAt(x, z) +
        verticalOffset;

      const endHeight =
        getTerrainHeightAt(x, nextZ) +
        verticalOffset;

      linePositions.push(
        x,
        startHeight,
        z,

        x,
        endHeight,
        nextZ
      );
    }
  }

  const gridGeometry =
    new THREE.BufferGeometry();

  gridGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      linePositions,
      3
    )
  );

  gridGeometry.computeBoundingBox();
  gridGeometry.computeBoundingSphere();

  return gridGeometry;
}

export default function GridTerrain() {
  const [, refresh] = useState(0);
  const guidesVisible = useWorldGuideStore((state) => state.visible);
  const chunks = useWorldStore((state) => state.world.chunks);
  const surface=useWorldStore(state=>state.world.terrainSurface);
  const shapeSettings=surface?.settings ?? terrainSettings;
  const terrainKey = [
    shapeSettings.heightMultiplier,
    shapeSettings.mountainHeight,
    shapeSettings.cliffSharpness,
    shapeSettings.rollingHills,
    shapeSettings.ridgeStrength,
    shapeSettings.plateauAmount,
    shapeSettings.geometryStrength,
    terrainSettings.terrainEditVersion,
    terrainSettings.terrainPreviewVersion,
    terrainSettings.terrainVertexEditVersion,
  ].join("-") + (surface?.revision ? ":"+surface.revision : "");

  const extensionChunks = useMemo(() => Object.values(chunks ?? {}).filter((chunk) => {
    const x = Number(chunk?.position?.[0]);
    const z = Number(chunk?.position?.[2]);
    if (![x, z].every(Number.isFinite)) return false;
    const size=Number(chunk.terrainRegion?.size ?? CREATOR_CHUNK_SIZE);
    return (x - size / 2 >= BASE_TERRAIN_HALF_SIZE) ||
      (x + size / 2 <= -BASE_TERRAIN_HALF_SIZE) ||
      (z - size / 2 >= BASE_TERRAIN_HALF_SIZE) ||
      (z + size / 2 <= -BASE_TERRAIN_HALF_SIZE);
  }), [chunks]);

  useEffect(() => {
    function handleTerrainChange() {
      refresh((value) => value + 1);
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

  /*
   * Solid terrain geometry.
   */
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS
    );

    geo.rotateX(-Math.PI / 2);

    const positions =
      geo.attributes.position;

    const colors = [];

    const vertexColor = new THREE.Color();

    for (
      let i = 0;
      i < positions.count;
      i += 1
    ) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const height =
        getTerrainHeightAt(x, z);

      positions.setY(i, height);

      const normalizedHeight =
        THREE.MathUtils.clamp(
          height /
            TERRAIN_MAX_GRADIENT_HEIGHT,
          0,
          1
        );

      const smoothedHeight =
        THREE.MathUtils.smoothstep(
          normalizedHeight,
          0,
          1
        );

      vertexColor.lerpColors(
        TERRAIN_BASE_COLOR,
        TERRAIN_HIGH_COLOR,
        smoothedHeight
      );

      colors.push(
        vertexColor.r,
        vertexColor.g,
        vertexColor.b
      );
    }

    geo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        colors,
        3
      )
    );

    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }, [terrainKey]);

  /*
   * Minor grid:
   *
   * Every 10 meters, excluding lines that belong
   * to the 50-meter major grid.
   */
  useEffect(()=>{let clear;const frame=requestAnimationFrame(()=>{clear=markTerrainReady("base-terrain",terrainGeometry.uuid)});return()=>{cancelAnimationFrame(frame);clear?.()}},[terrainGeometry]);

  const minorGridGeometry = useMemo(() => {
    return createTerrainGridGeometry({
      lineStep: MINOR_GRID_STEP,
      excludeStep: MAJOR_GRID_STEP,
      verticalOffset: GRID_OFFSET,
    });
  }, [terrainKey]);

  /*
   * Major grid:
   *
   * Every 50 meters, excluding lines that belong
   * to the 100-meter sector grid.
   */
  const majorGridGeometry = useMemo(() => {
    return createTerrainGridGeometry({
      lineStep: MAJOR_GRID_STEP,
      excludeStep: SECTOR_GRID_STEP,
      verticalOffset: GRID_OFFSET + 0.01,
    });
  }, [terrainKey]);

  /*
   * Sector grid:
   *
   * Every 100 meters. These are the strongest
   * lines and correspond to future A1, B1, C1
   * world regions.
   */
  const sectorGridGeometry = useMemo(() => {
    return createTerrainGridGeometry({
      lineStep: SECTOR_GRID_STEP,
      verticalOffset: GRID_OFFSET + 0.02,
    });
  }, [terrainKey]);

  /*
   * Dispose old geometry after terrain settings
   * rebuild it.
   */
  useEffect(() => {
    return () => {
      terrainGeometry.dispose();
    };
  }, [terrainGeometry]);

  useEffect(() => {
    return () => {
      minorGridGeometry.dispose();
    };
  }, [minorGridGeometry]);

  useEffect(() => {
    return () => {
      majorGridGeometry.dispose();
    };
  }, [majorGridGeometry]);

  useEffect(() => {
    return () => {
      sectorGridGeometry.dispose();
    };
  }, [sectorGridGeometry]);

  /*
   * Only terrain-shape settings rebuild the
   * Rapier terrain body.
   */
  const terrainPhysicsKey = terrainKey;

  /*
   * The terrain collider is replaced whenever terrainPhysicsKey changes.
   * Tell the player controller after the replacement has committed so it can
   * release the temporary physics lock without racing the collider rebuild.
   */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent("terrain-physics-rebuilt", {
          detail: { key: terrainPhysicsKey },
        })
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [terrainPhysicsKey]);

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider
          key={terrainPhysicsKey}
          args={[
            terrainGeometry.attributes.position.array,
            terrainGeometry.index.array,
          ]}
        />
        <mesh
          userData={{tgTerrainRegion:"base-terrain"}}
          geometry={terrainGeometry}
          receiveShadow
        >
          <meshStandardMaterial
            vertexColors
            flatShading
            roughness={0.94}
            metalness={0}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
      </RigidBody>

      {extensionChunks.map((chunk) => (
        <TerrainExtensionChunk key={chunk.id} chunk={chunk} terrainKey={terrainKey} />
      ))}

      {guidesVisible && (
        <>
          {/* Minor 10-meter grid. */}
          <lineSegments geometry={minorGridGeometry} frustumCulled={false}>
            <lineBasicMaterial color={MINOR_GRID_COLOR} transparent opacity={0.14} depthWrite={false} />
          </lineSegments>

          {/* Major 50-meter grid. */}
          <lineSegments geometry={majorGridGeometry} frustumCulled={false}>
            <lineBasicMaterial color={MAJOR_GRID_COLOR} transparent opacity={0.38} depthWrite={false} />
          </lineSegments>

          {/* Sector 100-meter grid. */}
          <lineSegments geometry={sectorGridGeometry} frustumCulled={false}>
            <lineBasicMaterial color={SECTOR_GRID_COLOR} transparent opacity={0.68} depthWrite={false} />
          </lineSegments>
        </>
      )}
    </>
  );
}