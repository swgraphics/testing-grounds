import { create } from "zustand";

export const WORLD_SCHEMA_VERSION = 2;

function createChunk(area) {
  return {
    id: area.id,
    grid: area.grid,
    name: area.name,
    position: [...area.position],
    terrain: {},
    water: {},
    objects: {},
    foliage: {},
    metadata: {
      description: area.description ?? "",
    },
  };
}

export function createInitialWorld(areaConfig = []) {
  const chunks = {};

  areaConfig.forEach((area) => {
    chunks[area.id] = createChunk(area);
  });

  const firstArea = areaConfig[0];

  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    metadata: {
      id: "testing-grounds",
      name: "Testing Grounds",
      engine: "Testing Grounds",
    },
    currentChunkId: firstArea?.id ?? null,
    atmosphere: {},
    chunks,
    characters: {},
    quests: {},
    scatterProfiles: {},
  };
}

export const useWorldStore = create((set) => ({
  world: createInitialWorld(),

  initializeWorld(areaConfig) {
    set({ world: createInitialWorld(areaConfig) });
  },

  replaceWorld(world) {
    if (!world || typeof world !== "object") return;
    set({ world });
  },

  setCurrentChunk(chunkId) {
    set((state) => {
      if (!state.world.chunks[chunkId]) return state;

      return {
        world: {
          ...state.world,
          currentChunkId: chunkId,
        },
      };
    });
  },

  updateWorldMetadata(patch) {
    set((state) => ({
      world: {
        ...state.world,
        metadata: {
          ...state.world.metadata,
          ...patch,
        },
      },
    }));
  },

  updateAtmosphere(patch) {
    set((state) => ({
      world: {
        ...state.world,
        atmosphere: {
          ...state.world.atmosphere,
          ...patch,
        },
      },
    }));
  },

  updateChunk(chunkId, patch) {
    set((state) => {
      const chunk = state.world.chunks[chunkId];
      if (!chunk) return state;

      return {
        world: {
          ...state.world,
          chunks: {
            ...state.world.chunks,
            [chunkId]: {
              ...chunk,
              ...patch,
            },
          },
        },
      };
    });
  },

  updateCurrentChunk(patch) {
    set((state) => {
      const chunkId = state.world.currentChunkId;
      if (!chunkId) return state;

      const chunk = state.world.chunks[chunkId];
      if (!chunk) return state;

      return {
        world: {
          ...state.world,
          chunks: {
            ...state.world.chunks,
            [chunkId]: {
              ...chunk,
              ...patch,
            },
          },
        },
      };
    });
  },

  upsertObject(object) {
    set((state) => {
      const chunkId = object?.chunkId ?? state.world.currentChunkId;
      if (!chunkId || !state.world.chunks[chunkId] || !object?.id) {
        return state;
      }

      const chunk = state.world.chunks[chunkId];

      return {
        world: {
          ...state.world,
          chunks: {
            ...state.world.chunks,
            [chunkId]: {
              ...chunk,
              objects: {
                ...chunk.objects,
                [object.id]: {
                  ...object,
                  chunkId,
                },
              },
            },
          },
        },
      };
    });
  },

  updateObject(objectId, patch, chunkId = null) {
    set((state) => {
      const targetChunkId = chunkId ?? state.world.currentChunkId;
      const chunk = state.world.chunks[targetChunkId];
      const object = chunk?.objects?.[objectId];
      if (!chunk || !object) return state;
      return {
        world: {
          ...state.world,
          chunks: {
            ...state.world.chunks,
            [targetChunkId]: {
              ...chunk,
              objects: {
                ...chunk.objects,
                [objectId]: { ...object, ...patch },
              },
            },
          },
        },
      };
    });
  },

  upsertScatterProfile(objectId, profile) {
    set((state) => ({
      world: {
        ...state.world,
        scatterProfiles: {
          ...(state.world.scatterProfiles ?? {}),
          [objectId]: {
            ...(state.world.scatterProfiles?.[objectId] ?? {}),
            ...profile,
          },
        },
      },
    }));
  },

  removeObject(objectId, chunkId = null) {
    set((state) => {
      const targetChunkId = chunkId ?? state.world.currentChunkId;
      const chunk = state.world.chunks[targetChunkId];
      if (!chunk || !chunk.objects[objectId]) return state;

      const nextObjects = { ...chunk.objects };
      delete nextObjects[objectId];

      return {
        world: {
          ...state.world,
          chunks: {
            ...state.world.chunks,
            [targetChunkId]: {
              ...chunk,
              objects: nextObjects,
            },
          },
        },
      };
    });
  },
}));

export const getWorldSnapshot = () => useWorldStore.getState().world;
