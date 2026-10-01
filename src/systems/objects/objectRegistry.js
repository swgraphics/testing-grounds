import { NATURE_PACK_OBJECTS } from "./naturePackRegistry";

export const BUILTIN_OBJECTS = Object.freeze([
  {
    id: "crimson-tree",
    name: "CRIMSON TREE",
    kind: "tree",
    source: "procedural",
    modelType: "crimson-tree",
  },
  { id: "building-block", name: "BLOCK", kind: "structure", source: "procedural", modelType: "building-block", blockType: "block" },
  { id: "building-wall", name: "WALL", kind: "structure", source: "procedural", modelType: "building-block", blockType: "wall" },
  { id: "building-platform", name: "PLATFORM", kind: "structure", source: "procedural", modelType: "building-block", blockType: "platform" },
  { id: "building-floor", name: "FLOOR", kind: "structure", source: "procedural", modelType: "building-block", blockType: "floor" },
  { id: "building-ramp", name: "RAMP", kind: "structure", source: "procedural", modelType: "building-block", blockType: "ramp" },
  { id: "fireflies", name: "FIREFLIES", kind: "environment", source: "procedural", modelType: "fireflies", editSettings: { density: 40, speed: 30, flicker: 65, color: "#d9ff8a" } },
  { id: "canyon-wall", name: "CANYON WALL", kind: "rock", source: "procedural", modelType: "geology", geologyType: "canyon-wall" },
  { id: "giant-rock", name: "GIANT ROCK", kind: "rock", source: "procedural", modelType: "geology", geologyType: "giant-rock" },
  { id: "cliff-face", name: "CLIFF FACE", kind: "rock", source: "procedural", modelType: "geology", geologyType: "cliff-face" },
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
    blockType: object.blockType,
    geologyType: object.geologyType,
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
