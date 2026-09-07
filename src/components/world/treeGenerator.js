// treeGenerator.js

/*
 * Testing Grounds
 * Tree Generator — procedural object data model
 *
 * This file defines WHAT a generated tree is.
 * It does not generate geometry.
 *
 * The same definition is intended to drive:
 * - live preview
 * - presets
 * - saved objects
 * - placement
 * - scatter
 * - world persistence
 * - Command Architecture
 */

export const TREE_GENERATOR_VERSION = 1;

export const DEFAULT_TREE = {
  generator: "TreeGenerator",
  version: TREE_GENERATOR_VERSION,

  type: "tree",

  preset: "custom",

  seed: 1,

  trunk: {
    taper: 50,
    height: 50,
    radius: 50,
    bend: 50,
    segmentation: 50,
  },

  branches: {
    count: 50,
    angle: 50,
    length: 50,
    thickness: 50,
    frequency: 50,
    verticality: 50,
    randomness: 50,
    baseTrunk: 25,

    secondary: {
      enabled: true,
      count: 50,
      length: 50,
      thickness: 50,
      randomness: 50,
    },
  },

  leaves: {
    shape: "cluster",
    size: 50,
    density: 50,
    clustering: 50,
    color: "#c0e9a9",
    outlineColor: "#0f3806",
    gradientEnabled: false,
    gradientColor: "#181818",
    distribution: 50,

    floating: {
      enabled: true,
      density: 15,
    },
  },
};

export function createTreeDefinition(overrides = {}) {
  return {
    ...DEFAULT_TREE,
    ...overrides,

    trunk: {
      ...DEFAULT_TREE.trunk,
      ...(overrides.trunk || {}),
    },

    branches: {
      ...DEFAULT_TREE.branches,
      ...(overrides.branches || {}),

      secondary: {
        ...DEFAULT_TREE.branches.secondary,
        ...(overrides.branches?.secondary || {}),
      },
    },

    leaves: {
      ...DEFAULT_TREE.leaves,
      ...(overrides.leaves || {}),

      floating: {
        ...DEFAULT_TREE.leaves.floating,
        ...(overrides.leaves?.floating || {}),
      },
    },
  };
}

export function createCrimsonTreeDefinition(overrides = {}) {
  /*
   * Crimson values are the species baseline.
   *
   * IMPORTANT:
   * User/editor overrides are merged back into every nested
   * section so the same Tree Definition can later travel from
   * Object Editor -> Save -> Place -> Scatter.
   */
  return createTreeDefinition({
    preset: "crimson",

    seed: overrides.seed ?? 1,

    trunk: {
      taper: 100,
      height: 50,
      radius: 50,
      bend: 28,
      segmentation: 55,

      ...(overrides.trunk || {}),
    },

    branches: {
      count: 50,
      angle: 60,
      length: 44,
      thickness: 40,
      frequency: 42,
      verticality: 82,
      randomness: 58,
      baseTrunk: 25,

      ...(overrides.branches || {}),

      secondary: {
        enabled: true,
        count: 2,
        length: 50,
        thickness: 50,
        randomness: 50,

        ...(overrides.branches?.secondary || {}),
      },
    },

    leaves: {
      shape: "cluster",
      size: 32,
      density: 90,
      clustering: 75,
      color: "#fc0303",
      outlineColor: "#fc0303",
      gradientEnabled: false,
      gradientColor: "#fc0303",
      distribution: 90,

      ...(overrides.leaves || {}),

      floating: {
        enabled: true,
        density: 4,

        ...(overrides.leaves?.floating || {}),
      },
    },
  });
}
