import { createCrimsonTreeDefinition } from "../../components/world/treeGenerator";

const defaults = createCrimsonTreeDefinition();
export const TREE_PROPERTY_GROUPS = [
  ["TRUNK", [["TRUNK HEIGHT", "trunk.height"], ["TRUNK TAPER", "trunk.taper"], ["TRUNK BEND", "trunk.bend"], ["TRUNK WIDTH", "trunk.radius"], ["TRUNK SEGMENTATION", "trunk.segmentation"]]],
  ["BRANCHES", [["BRANCH COUNT", "branches.count"], ["BRANCH ANGLE", "branches.angle"], ["BRANCH LENGTH", "branches.length"], ["BRANCH THICKNESS", "branches.thickness"], ["BRANCH FREQUENCY", "branches.frequency"], ["BRANCH VERTICALITY", "branches.verticality"], ["BRANCH RANDOMNESS", "branches.randomness"], ["BRANCH TAPER", "branches.taper"]]],
  ["SECONDARY BRANCHES", [["SECONDARY BRANCHES", "branches.secondary.count", 8], ["SECONDARY LENGTH", "branches.secondary.length", 100, true], ["SECONDARY THICKNESS", "branches.secondary.thickness", 100, true], ["SECONDARY RANDOMNESS", "branches.secondary.randomness", 100, true]]],
  ["LEAVES", [["LEAF SIZE", "leaves.size"], ["LEAF DENSITY", "leaves.density"], ["CROWN HEIGHT", "leaves.clustering"], ["LEAF DISTRIBUTION", "leaves.distribution"], ["FLOATING LEAF DENSITY", "leaves.floating.density"]]],
];

export function treePropertyValue(definition, path) {
  const read = object => path.split(".").reduce((value, key) => value?.[key], object);
  return read(definition) ?? read(defaults) ?? 50;
}

export function treePropertyPatch(path, value) {
  return path.split(".").reverse().reduce((patch, key) => ({ [key]: patch }), value);
}

// Keep untouched sections/unknown legacy keys and explicit zero/false values.
export function mergeTreeProperties(definition, patch) {
  const result = { ...definition, ...patch };
  for (const key of ["trunk", "branches", "leaves"]) {
    if (!patch?.[key]) continue;
    result[key] = { ...definition?.[key], ...patch[key] };
  }
  for (const [section, key] of [["branches", "secondary"], ["branches", "overrides"], ["leaves", "floating"]]) {
    if (patch?.[section]?.[key]) result[section][key] = { ...definition?.[section]?.[key], ...patch[section][key] };
  }
  return result;
}
