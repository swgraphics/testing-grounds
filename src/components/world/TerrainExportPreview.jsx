import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTerrainExportStore } from "../../systems/terrain/terrainExportStore";
import { validateTerrainExport } from "../../systems/terrain/terrainExport";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";

export default function TerrainExportPreview() {
  const outline = useRef(null);
  const open = useTerrainExportStore(state => state.open);
  const options = useTerrainExportStore(state => state.options);
  const geometry = useMemo(() => {
    if (!open) return null;
    try { validateTerrainExport(options); } catch { return null; }
    const { minX, maxX, minZ, maxZ } = options;
    const corners = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
    const positions = [];
    for (let edge = 0; edge < 4; edge++) {
      const a = corners[edge], b = corners[(edge + 1) % 4];
      for (let step = 0; step < 128; step++) {
        const t = step / 128;
        const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        positions.push(x, getTerrainHeightAt(x, z) + 0.2, z);
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return result;
  }, [open, options]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useFrame(() => {
    const geometry = outline.current?.geometry;
    if (!geometry) return;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setY(i, getTerrainHeightAt(positions.getX(i), positions.getZ(i)) + 0.2);
    positions.needsUpdate = true;
  });
  if (!geometry) return null;
  return <lineLoop name="Terrain export boundary" ref={outline} geometry={geometry} renderOrder={50} frustumCulled={false} raycast={() => null}>
    <lineBasicMaterial color="#ffe0a0" transparent opacity={0.7} depthWrite={false} depthTest={false} />
  </lineLoop>;
}
