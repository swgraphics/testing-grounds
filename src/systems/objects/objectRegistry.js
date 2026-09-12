import { NATURE_PACK_OBJECTS } from "./naturePackRegistry";

export const BUILTIN_OBJECTS = Object.freeze([
  {
    id: "crimson-tree",
    name: "CRIMSON TREE",
    kind: "tree",
    source: "procedural",
    modelType: "crimson-tree",
  },
  ...NATURE_PACK_OBJECTS,
]);

export function createUploadedObject(file, id = `upload-${Date.now()}`) {
  return {
    id,
    name: file.name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 22),
    kind: "uploaded",
    source: "uploaded",
    file,
    status: "pending-import",
  };
}

export function createSavedObject(object, overrides = {}) {
  return {
    id: overrides.id ?? object.id,
    name: overrides.name ?? object.name,
    kind: overrides.kind ?? object.kind,
    source: overrides.source ?? "saved",
    modelType: object.modelType,
    treeDefinition: object.treeDefinition,
    editSettings: object.editSettings,
    modelPath: object.modelPath,
    metadata: {
      createdIn: "testing-grounds",
      engine: "Testing Grounds",
      ...(object.metadata ?? {}),
      ...(overrides.metadata ?? {}),
    },
  };
}
