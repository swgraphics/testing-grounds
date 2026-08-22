// treeGenerator.js

/*
 * Testing Grounds
 * Tree Generator — procedural object data model
 *
 * This file defines WHAT a generated tree is.
 * It does not generate geometry.
 *
 * Geometry generation will be handled separately.
 *
 * Long-term structure:
 *
 * TREE
 * ├── trunk
 * ├── branches
 * │   ├── primary
 * │   └── secondary
 * └── leaves
 *
 * The same data model should eventually drive:
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
    color: "#080808",
    distribution: 50,
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
    },
  };
}

export function createCrimsonTreeDefinition() {
  return createTreeDefinition({
    preset: "crimson",

    /*
     * These values intentionally approximate the
     * current Crimson Tree rather than replacing it.
     *
     * The generator architecture now exists separately
     * from the current renderer.
     */

    trunk: {
      taper: 50,
      height: 50,
      radius: 50,
      bend: 50,
      segmentation: 50,
    },

    branches: {
      count: 6,
      angle: 50,
      length: 50,
      thickness: 50,
      frequency: 50,
      verticality: 50,
      randomness: 50,

      secondary: {
        enabled: false,
        count: 0,
        length: 50,
        thickness: 50,
        randomness: 50,
      },
    },

    leaves: {
      shape: "cluster",
      size: 100,
      density: 85,
      clustering: 85,
      color: "#080808",
      distribution: 50,
    },
  });
}