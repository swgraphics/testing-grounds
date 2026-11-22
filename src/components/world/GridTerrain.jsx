import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as THREE from "three";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";

import { terrainSettings } from "../../systems/terrain/terrainSettings";
import { getTerrainHeightAt, getTerrainHeightWithoutGeologyAt } from "../../systems/terrain/terrainHeight";
import { getGeologyTerrainDelta } from '../../systems/geology/geologySampling';
import { useGeologyTerrainVersion } from './useGeologyTerrainVersion';
import { useWorldGuideStore } from "../../systems/ui/worldGuideStore";
import { markTerrainReady } from "../../systems/world/terrainReadiness";
import { BASE_TERRAIN_SIZE, TERRAIN_SAMPLE_STEP } from "../../systems/world/terrainRegions";
import { useWorldStore } from "../../systems/world/worldStore";
import { terrainHeightChanged, terrainGridSampler } from '../../systems/terrain/terrainRenderState';

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

function createTerrainFoundation(size, segments, originX = 0, originZ = 0) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position, heights = new Float64Array(positions.count);
  for (let i = 0; i < positions.count; i++) heights[i] = getTerrainHeightWithoutGeologyAt(originX + positions.getX(i), originZ + positions.getZ(i));
  return {geometry, heights};
}


function TerrainExtensionChunk({ chunk, terrainKey }) {
  const size = Number(chunk?.terrainRegion?.size ?? CREATOR_CHUNK_SIZE);
  const segments = size / TERRAIN_SAMPLE_STEP;
  const centerX = Number(chunk?.position?.[0]);
  const centerZ = Number(chunk?.position?.[2]);
  const guidesVisible=useWorldGuideStore(state=>state.visible);
  const geologyVersion = useGeologyTerrainVersion({minX:centerX-size/2,maxX:centerX+size/2,minZ:centerZ-size/2,maxZ:centerZ+size/2});
  // terrainKey invalidates module-owned shape/sculpt/vertex samples.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const foundation = useMemo(() => createTerrainFoundation(size, segments, centerX, centerZ), [size, segments, centerX, centerZ, terrainKey]);
  useEffect(() => () => foundation.geometry.dispose(), [foundation]);

  const geometry = useMemo(() => {
    if (![centerX, centerZ].every(Number.isFinite)) return null;

    const geo = foundation.geometry.clone();
    const positions = geo.attributes.position;
    const colors = [];
    const vertexColor = new THREE.Color();

    for (let i = 0; i < positions.count; i += 1) {
      const localX = positions.getX(i);
      const localZ = positions.getZ(i);
      const worldX = centerX + localX;
      const worldZ = centerZ + localZ;
      const height = foundation.heights[i] + getGeologyTerrainDelta(worldX, worldZ);
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
  // The geology field is world-owned; its bounded version invalidates this region.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerX, centerZ, foundation, geologyVersion]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(()=>{if(!geometry)return;let clear;const frame=requestAnimationFrame(()=>{clear=markTerrainReady(chunk.id,geometry.uuid)});return()=>{cancelAnimationFrame(frame);clear?.()}},[chunk.id,geometry]);

  // Guides reuse the mesh samples and follow the mesh geometry lifecycle.
  const guideGeometry=useMemo(()=>geometry ? createTerrainGridGeometry({lineStep:10,verticalOffset:GRID_OFFSET,bounds:{minX:centerX-size/2,maxX:centerX+size/2,minZ:centerZ-size/2,maxZ:centerZ+size/2},heightAt:terrainGridSampler(geometry,segments,centerX,centerZ)}) : null,[centerX,centerZ,size,geometry,segments]);
  useEffect(()=>()=>guideGeometry?.dispose(),[guideGeometry]);
  if (!geometry) return null;

  return (
    <>
    <RigidBody key={`${chunk.id}-${terrainKey}-${geologyVersion}`} type="fixed" colliders="trimesh">
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
  heightAt = getTerrainHeightAt,
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
        heightAt(x, z) +
        verticalOffset;

      const endHeight =
        heightAt(nextX, z) +
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
        heightAt(x, z) +
        verticalOffset;

      const endHeight =
        heightAt(x, nextZ) +
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
  const [terrainUpdateVersion, refresh] = useState(0);
  const guidesVisible = useWorldGuideStore((state) => state.visible);
  const chunks = useWorldStore((state) => state.world.chunks);
  const surface=useWorldStore(state=>state.world.terrainSurface);
  const geologyVersion = useGeologyTerrainVersion({minX:-300,maxX:300,minZ:-300,maxZ:300});
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
    function handleTerrainChange(event) {
      if (!terrainHeightChanged(event)) return;
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
  // terrainKey invalidates module-owned shape/sculpt/vertex samples.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const foundation = useMemo(() => createTerrainFoundation(TERRAIN_SIZE, TERRAIN_SEGMENTS), [terrainKey]);
  useEffect(() => () => foundation.geometry.dispose(), [foundation]);
  const terrainGeometry = useMemo(() => {
    const geo = foundation.geometry.clone();

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
        foundation.heights[i] + getGeologyTerrainDelta(x, z);

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
  // The geology field is world-owned; its bounded version invalidates this region.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundation, geologyVersion]);

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
      heightAt: terrainGridSampler(terrainGeometry, TERRAIN_SEGMENTS),
    });
  }, [terrainGeometry]);

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
      heightAt: terrainGridSampler(terrainGeometry, TERRAIN_SEGMENTS),
    });
  }, [terrainGeometry]);

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
      heightAt: terrainGridSampler(terrainGeometry, TERRAIN_SEGMENTS),
    });
  }, [terrainGeometry]);

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
  const terrainPhysicsKey = terrainKey + ':geology:' + geologyVersion;

  /*
   * Height notifications also lock the player when settings are unchanged.
   * Acknowledge those committed updates even when the cached collider is reused,
   * so the player can release its lock after either a rebuild or a no-op load.
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
  }, [terrainPhysicsKey, terrainUpdateVersion]);

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
