import { useWorldStore } from "../world/worldStore";
import { terrainSettings } from "../terrain/terrainSettings";
import { createCrimsonTreeDefinition } from "../../components/world/treeGenerator";
import { beginHistoryTransaction, commitHistoryTransaction, getHistoryPathSnapshot } from "../history/historyStore";

export function scatterEligibility(mesh) {
  if (!mesh) return { eligible: false, message: "Select a library object to add a population." };
  if (mesh.modelType === "crimson-tree" || mesh.treeDefinition?.generator === "TreeGenerator" || mesh.modelPath) return { eligible: true, message: "" };
  if (mesh.source === "uploaded" || mesh.file) return { eligible: false, message: "Local GLB uploads are session-only and support individual placement. Scatter requires a registered model path or a procedural tree." };
  return { eligible: false, message: "This object has no population renderer. Use individual placement; terrain stamps and procedural blocks/effects cannot be scattered." };
}

export function addObjectToScatter(mesh) {
  const eligibility = scatterEligibility(mesh);
  if (!eligibility.eligible) return { ok: false, message: eligibility.message };
  const store = useWorldStore.getState();
  const current = store.world.scatterProfiles?.[mesh.id] ?? {};
  const paths = [["scatterProfiles", mesh.id]];
  const started = beginHistoryTransaction("ADD TO SCATTER", getHistoryPathSnapshot(paths), { paths });
  const profile = {
    enabled: true, objectId: mesh.id, name: mesh.name, kind: mesh.kind, source: mesh.source,
    modelType: mesh.modelType, modelPath: mesh.modelPath, geologyType: mesh.geologyType,
    treeDefinition: current.treeDefinition ?? mesh.treeDefinition ?? (mesh.modelType === "crimson-tree" ? createCrimsonTreeDefinition() : undefined),
    density: Number(current.density ?? (mesh.id === "crimson-tree" ? terrainSettings.treeDensity ?? 25 : 50)),
    coverage: Number(current.coverage ?? (mesh.id === "crimson-tree" ? terrainSettings.treeCoverage ?? 50 : 50)),
    scaleVariation: Number(current.scaleVariation ?? 25), rotationVariation: Number(current.rotationVariation ?? 100), clustering: Number(current.clustering ?? 35),
  };
  store.upsertScatterProfile(mesh.id, Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== undefined)));
  if (started) commitHistoryTransaction(getHistoryPathSnapshot(paths), { paths });
  return { ok: true, profile: useWorldStore.getState().world.scatterProfiles[mesh.id] };
}
