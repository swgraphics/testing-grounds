import { create } from "zustand";
import { gridToWorldPosition, parseGridCoordinate } from "./worldGrid";

export const WORLD_SCHEMA_VERSION = 7;

export const WORLD_GRID = Object.freeze({
  chunkSize: 100,
  minColumn: 0,
  maxColumn: 5,
  minRow: 1,
  maxRow: 6,
  originX: -250,
  originZ: -250,
});

function createChunk(area) {
  return {
    id: area.id,
    grid: area.grid,
    coordinates: (() => {
      const parsed = parseGridCoordinate(area.grid);
      return parsed ? { column: parsed.column, row: parsed.row } : null;
    })(),
    name: area.name,
    position: [...area.position],
    terrain: {},
    water: {},
    objects: {},
    foliage: {},
    dirty: false,
    mapPosition: Array.isArray(area.mapPosition) ? [...area.mapPosition] : [0, 0],
    mapLabel: area.mapLabel ?? null,
    metadata: {
      description: area.description ?? "",
      source: "default",
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
    worldType: "default",
    grid: { ...WORLD_GRID },
    metadata: {
      id: "testing-grounds",
      name: "Testing Grounds",
      engine: "Testing Grounds",
      schemaVersion: WORLD_SCHEMA_VERSION,
    },
    seed: 1,
    currentChunkId: firstArea?.id ?? null,
    atmosphere: {},
    // Canonical terrain vertex overrides live at world scope so a vertex on
    // a future chunk boundary has one authoritative height value.
    terrainVertexEdits: {},
    chunks,
    characters: {},
    quests: {},
    scatterProfiles: {},
  };
}


export function createBlankWorld() {
  const blankChunk = {
    id: "blank-d4",
    grid: "D4",
    coordinates: { column: 3, row: 4 },
    localOrigin: [0, 0, 0],
    name: "BLANK CANVAS",
    position: [50, 0, 50],
    terrain: {},
    water: {},
    objects: {},
    foliage: {},
    dirty: false,
    mapPosition: [0, 0],
    mapLabel: "A",
    metadata: {
      description: "Empty creator canvas",
      source: "blank-canvas",
    },
  };

  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    worldType: "blank",
    grid: { ...WORLD_GRID },
    seed: 1,
    metadata: {
      id: "testing-grounds-blank",
      name: "Blank Canvas",
      engine: "Testing Grounds",
      schemaVersion: WORLD_SCHEMA_VERSION,
    },
    currentChunkId: blankChunk.id,
    atmosphere: {},
    terrainVertexEdits: {},
    chunks: { [blankChunk.id]: blankChunk },
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

  initializeBlankWorld() {
    set({ world: createBlankWorld() });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tg-world-replaced", { detail: { worldType: "blank" } }));
      window.dispatchEvent(new CustomEvent("tg-current-chunk-changed", { detail: { chunkId: "blank-d4" } }));
    }
  },

  replaceWorld(world) {
    if (!world || typeof world !== "object") return;
    set({ world });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tg-world-replaced", { detail: { worldType: world.worldType ?? "default" } }));
    }
  },

  createChunk(chunk = {}) {
    const grid = String(chunk.grid ?? "").trim().toUpperCase();
    const parsedGrid = parseGridCoordinate(grid);
    if (!parsedGrid) return null;
    const gridPosition = gridToWorldPosition(grid) ?? [0, 0, 0];

    let createdId = null;
    set((state) => {
      const duplicateGrid = Object.values(state.world.chunks ?? {}).some(
        (entry) => String(entry.grid ?? "").toUpperCase() === grid
      );
      if (duplicateGrid) return state;

      const id = String(chunk.id ?? `chunk-${grid.toLowerCase()}`);
      if (state.world.chunks[id]) return state;

      const occupiedMap = new Set(
        Object.values(state.world.chunks ?? {}).map((entry) =>
          Array.isArray(entry.mapPosition) ? entry.mapPosition.join(",") : ""
        )
      );
      let mapPosition = Array.isArray(chunk.mapPosition) ? [...chunk.mapPosition] : null;
      if (!mapPosition || occupiedMap.has(mapPosition.join(","))) {
        mapPosition = null;
        for (let radius = 0; radius <= 12 && !mapPosition; radius += 1) {
          for (let y = -radius; y <= radius && !mapPosition; y += 1) {
            for (let x = -radius; x <= radius; x += 1) {
              if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
              if (!occupiedMap.has(`${x},${y}`)) {
                mapPosition = [x, y];
                break;
              }
            }
          }
        }
      }
      const mapLabel = chunk.mapLabel ?? String.fromCharCode(65 + Object.keys(state.world.chunks ?? {}).length);
      const nextChunk = {
        id,
        grid,
        coordinates: { column: parsedGrid.column, row: parsedGrid.row },
        localOrigin: Array.isArray(chunk.localOrigin) ? [...chunk.localOrigin] : [0, 0, 0],
        mapPosition: mapPosition ?? [0, 0],
        mapLabel,
        name: chunk.name ?? `CHUNK ${grid}`,
        position: Array.isArray(chunk.position) ? [...chunk.position] : gridPosition,
        terrain: { ...(chunk.terrain ?? {}) },
        water: { ...(chunk.water ?? {}) },
        objects: { ...(chunk.objects ?? {}) },
        foliage: { ...(chunk.foliage ?? {}) },
        dirty: true,
        metadata: { ...(chunk.metadata ?? {}), source: chunk.metadata?.source ?? "creator" },
      };
      createdId = id;

      return {
        world: {
          ...state.world,
          chunks: { ...state.world.chunks, [id]: nextChunk },
        },
      };
    });

    const id = createdId ?? `chunk-${grid.toLowerCase()}`;
    if (!useWorldStore.getState().world.chunks[id]) return null;
    useWorldStore.getState().setCurrentChunk(id);
    return id;
  },

  renameChunk(chunkId, name) {
    const nextName = String(name ?? "").trim();
    if (!nextName) return;
    useWorldStore.getState().updateChunk(chunkId, { name: nextName });
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tg-current-chunk-changed", { detail: { chunkId } }));
    }
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
              dirty: patch.dirty ?? true,
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
              dirty: patch.dirty ?? true,
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
              dirty: true,
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
              dirty: true,
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

  removeScatterProfile(objectId) {
    set((state) => {
      const current = state.world.scatterProfiles ?? {};
      if (!Object.prototype.hasOwnProperty.call(current, objectId)) return state;
      const next = { ...current };
      delete next[objectId];
      return {
        world: {
          ...state.world,
          scatterProfiles: next,
        },
      };
    });
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
              dirty: true,
            },
          },
        },
      };
    });
  },
}));

export const getWorldSnapshot = () => useWorldStore.getState().world;
