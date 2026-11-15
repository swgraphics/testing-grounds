import { useWorldStore } from "../world/worldStore";
import { beginHistoryTransaction, commitHistoryTransaction, getHistoryPathSnapshot } from "../history/historyStore";
import { createCrimsonTreeDefinition } from "../../components/world/treeGenerator";
import { mergeTreeProperties } from "./treeProperties";

export function resolveObjectTarget(target, world = useWorldStore.getState().world) {
  if (!target?.id) return null;
  const object = world.chunks?.[target.chunkId ?? world.currentChunkId]?.objects?.[target.id];
  if (object) return object;
  const profileId = Object.keys(world.scatterProfiles ?? {}).sort((a, b) => b.length - a.length).find(id => target.id.startsWith(`scatter-tree-${id}-${target.chunkId ?? world.currentChunkId}-`)) ?? (target.id.startsWith(`scatter-tree-crimson-tree-${target.chunkId ?? world.currentChunkId}-`) ? "crimson-tree" : null);
  if (!profileId) return null;
  const profile = world.scatterProfiles?.[profileId] ?? {};
  const base = createCrimsonTreeDefinition(profile.treeDefinition ?? target.definition ?? {});
  if (target.scope !== "global" && target.definition?.seed != null) base.seed = target.definition.seed;
  return { id: target.id, name: profile.name ?? "DEFAULT TREE", modelType: "crimson-tree", profileId, treeDefinition: mergeTreeProperties(base, target.scope === "global" ? {} : profile.treeOverrides?.[target.id] ?? {}) };
}

export function editObjectTarget(target, patch) {
  const store = useWorldStore.getState(), world = store.world;
  const object = resolveObjectTarget(target, world);
  if (!object) return false;
  const chunkId = target.chunkId ?? world.currentChunkId;
  const paths = object.profileId ? [["scatterProfiles", object.profileId]] : [["chunks", chunkId, "objects", target.id]];
  const started = beginHistoryTransaction("EDIT OBJECT", getHistoryPathSnapshot(paths), { paths });
  if (object.profileId) {
    // The existing scatter listener owns single/global override and render updates.
    window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId: target.id, scope: target.scope ?? "single", patch: patch.treeDefinition ?? {} } }));
  } else {
    const next = { ...patch };
    if (patch.treeDefinition) next.treeDefinition = mergeTreeProperties(mergeTreeProperties(createCrimsonTreeDefinition(object.treeDefinition ?? {}), object.treeDefinition ?? {}), patch.treeDefinition);
    store.updateObject(target.id, next, chunkId);
    if (patch.treeDefinition) window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId: target.id, scope: "single", patch: patch.treeDefinition, applied: true } }));
  }
  if (started) commitHistoryTransaction(getHistoryPathSnapshot(paths), { paths });
  return true;
}
