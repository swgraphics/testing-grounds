import { getTerrainRegions, containsPoint } from "../world/terrainRegions";
import * as THREE from "three";
import { terrainSettings } from "./terrainSettings";
import { getTerrainVertexEditDelta } from "./terrainVertexEditing";
import { getGeologyTerrainPreviewDelta } from "./terrainEdits";
import { getTerrainEditDelta } from "./terrainEdits";
import { useWorldStore } from "../world/worldStore";

export function smoothStep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function getProceduralTerrainHeightAt(x, z, settings, isBlankWorld) {
  const distance = Math.sqrt(x * x + z * z);
  const flatSquareSize = 90;
  let height = 0;

  {
    const terrainBlend = isBlankWorld
      ? 1
      : smoothStep(95, 190, distance);
    let rolling = 0;
    rolling += Math.sin(x * 0.018) * 10 * settings.rollingHills;
    rolling += Math.cos(z * 0.022) * 8 * settings.rollingHills;
    rolling += Math.sin((x + z) * 0.012) * 6 * settings.rollingHills;

    const mountainDistance = Math.sqrt(
      (x - 160) * (x - 160) + (z + 170) * (z + 170)
    );

    const mountain = Math.max(
      0,
      70 * settings.mountainHeight - mountainDistance * 0.35
    );

    const ridge =
      Math.max(
        0,
        Math.sin((x - 80) * 0.025 * settings.cliffSharpness) * 22
      ) * settings.ridgeStrength;

    height =
      (rolling + mountain + ridge) *
      terrainBlend *
      settings.heightMultiplier;

    const plateauStrength = (settings.plateauAmount ?? 0) / 100;
    const plateauLevel = 42 * settings.heightMultiplier;

    if (height > plateauLevel) {
      const flattenedHeight = plateauLevel + (height - plateauLevel) * 0.16;
      height = THREE.MathUtils.lerp(height, flattenedHeight, plateauStrength);
    }

    const geometryStrength = THREE.MathUtils.clamp(
      (settings.geometryStrength ?? 0) / 100,
      0,
      1
    );

    if (geometryStrength > 0) {
      const minimumStep = 0.25;
      const maximumStep = 8;
      const geometryStep = THREE.MathUtils.lerp(minimumStep, maximumStep, geometryStrength);
      const quantizedHeight = Math.round(height / geometryStep) * geometryStep;
      height = THREE.MathUtils.lerp(height, quantizedHeight, geometryStrength);
    }

    const insideSpawnSquare = Math.abs(x) < flatSquareSize && Math.abs(z) < flatSquareSize;
    if (!isBlankWorld && insideSpawnSquare) height = 0;
  }

  return height;
}
export function getCommittedTerrainHeightAt(x,z) {
  const world=useWorldStore.getState().world,surface=world.terrainSurface;
  const settings=surface?.settings ?? terrainSettings,blank=world.worldType==='blank';
  let height=getProceduralTerrainHeightAt(x,z,settings,blank);
  if(surface) {
    const region=getTerrainRegions(world).slice(1).find(r=>containsPoint(r,x,z));
    const chunk=region?world.chunks[region.id]:null;
    if(chunk?.terrainRegion) {
      const edge=Math.min(x-region.minX,region.maxX-x,z-region.minZ,region.maxZ-z);
      const blend=smoothStep(0,Math.min(20,chunk.terrainRegion.size/4),edge);
      height=THREE.MathUtils.lerp(height,getProceduralTerrainHeightAt(x,z,{...settings,...chunk.terrain},blank),blend);
    }
  }
  height += getTerrainEditDelta(x, z);
  height += getTerrainVertexEditDelta(x, z);


  return height;
}

// Preserve preview behavior for rendering, collision and all existing callers.
export function getTerrainHeightAt(x, z) {
  return getCommittedTerrainHeightAt(x, z) + getGeologyTerrainPreviewDelta(x, z);
}
