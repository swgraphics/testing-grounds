import { AREA_CONFIG } from "../../config/areaConfig";
import {
  createInitialWorld,
  getWorldSnapshot,
  useWorldStore,
  WORLD_SCHEMA_VERSION,
} from "./worldStore";
import { parseGridCoordinate } from "./worldGrid";
import { clearHistory } from "../history/historyStore";

export const WORLD_STORAGE_KEY = "testingGroundsWorld";
export const LEGACY_WORLD_STORAGE_KEY = "testingGroundsWorldState";
export const LEGACY_SETTINGS_STORAGE_KEY = "testingGroundsWorldSettings";
export const CHUNK_STORAGE_PREFIX = "testingGroundsChunk:";
export const CHUNK_MANIFEST_STORAGE_KEY = "testingGroundsChunkManifest";
export const SCATTER_BACKUP_STORAGE_KEY = "testingGroundsScatterProfiles";

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyChunk(area) {
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
    mapPosition: Array.isArray(area.mapPosition) ? [...area.mapPosition] : null,
    mapLabel: area.mapLabel ?? null,
    metadata: {
      description: area.description ?? "",
      source: "default",
    },
  };
}

function normalizeChunk(chunk, fallback) {
  return {
    ...fallback,
    ...chunk,
    grid: String(chunk?.grid ?? fallback.grid ?? "").toUpperCase(),
    coordinates: (() => {
      const parsed = parseGridCoordinate(chunk?.grid ?? fallback.grid);
      return parsed ? { column: parsed.column, row: parsed.row } : (fallback.coordinates ?? null);
    })(),
    localOrigin: Array.isArray(chunk?.localOrigin) ? chunk.localOrigin.slice(0, 3).map(Number) : [...(fallback.localOrigin ?? [0, 0, 0])],
    position: Array.isArray(chunk?.position)
      ? chunk.position.slice(0, 3).map(Number)
      : [...fallback.position],
    terrain: { ...(chunk?.terrain ?? {}) },
    water: { ...(chunk?.water ?? {}) },
    objects: { ...(chunk?.objects ?? {}) },
    foliage: { ...(chunk?.foliage ?? {}) },
    dirty: Boolean(chunk?.dirty),
    mapPosition: Array.isArray(chunk?.mapPosition) ? chunk.mapPosition.slice(0, 2).map(Number) : (Array.isArray(fallback.mapPosition) ? [...fallback.mapPosition] : null),
    mapLabel: chunk?.mapLabel ?? fallback.mapLabel ?? null,
    metadata: {
      ...(fallback.metadata ?? {}),
      ...(chunk?.metadata ?? {}),
    },
  };
}

function migrateWorld(input) {
  if (!input || typeof input !== "object") return null;

  const sourceVersion = Number(input.schemaVersion ?? 1);
  const base = createInitialWorld(AREA_CONFIG);

  const migrated = {
    ...base,
    ...input,
    schemaVersion: WORLD_SCHEMA_VERSION,
    worldType: input.worldType === "blank" ? "blank" : "default",
    seed: Number(input.seed ?? 1),
    grid: {
      ...base.grid,
      ...(input.grid ?? {}),
    },
    metadata: {
      ...base.metadata,
      ...(input.metadata ?? {}),
      schemaVersion: WORLD_SCHEMA_VERSION,
    },
    chunks: {},
    characters: { ...(input.characters ?? {}) },
    quests: { ...(input.quests ?? {}) },
    scatterProfiles: { ...(input.scatterProfiles ?? {}) },
    atmosphere: { ...(input.atmosphere ?? {}) },
    terrainVertexEdits: { ...(input.terrainVertexEdits ?? {}) },
  };

  const inputChunks = input.chunks ?? {};
  const baseIds = migrated.worldType === "blank" ? [] : Object.keys(base.chunks);
  const allChunkIds = new Set([...baseIds, ...Object.keys(inputChunks)]);

  if (migrated.worldType === "blank" && !allChunkIds.size) {
    allChunkIds.add("blank-d4");
    inputChunks["blank-d4"] = {
      id: "blank-d4",
      grid: "D4",
      name: "BLANK CANVAS",
      position: [50, 0, 50],
      terrain: {},
      water: {},
      objects: {},
      foliage: {},
      dirty: false,
      metadata: { description: "Empty creator canvas", source: "blank-canvas" },
    };
  }

  allChunkIds.forEach((chunkId) => {
    const fallback = base.chunks[chunkId] ?? createEmptyChunk({
      id: chunkId,
      grid: inputChunks[chunkId]?.grid ?? chunkId,
      name: inputChunks[chunkId]?.name ?? chunkId,
      position: inputChunks[chunkId]?.position ?? [0, 0, 0],
      description: "",
      mapPosition: [0, 0],
      mapLabel: null,
    });
    migrated.chunks[chunkId] = normalizeChunk(inputChunks[chunkId] ?? {}, fallback);
  });

  Object.values(migrated.chunks).forEach((chunk) => {
    Object.entries(chunk.terrain?.terrainVertexEdits ?? {}).forEach(([key, value]) => {
      if (!(key in migrated.terrainVertexEdits)) migrated.terrainVertexEdits[key] = Number(value) || 0;
    });
  });

  // Older saved worlds did not have mapPosition/mapLabel. Assign stable
  // presentation slots without changing their real world coordinates.
  const occupiedMapPositions = new Set(
    Object.values(migrated.chunks).flatMap((chunk) =>
      Array.isArray(chunk.mapPosition) ? [chunk.mapPosition.join(",")] : []
    )
  );
  let generatedMapLabelIndex = 0;
  Object.values(migrated.chunks).forEach((chunk) => {
    if (!chunk.mapPosition) {
      let assigned = null;
      for (let radius = 0; radius <= 12 && !assigned; radius += 1) {
        for (let y = -radius; y <= radius && !assigned; y += 1) {
          for (let x = -radius; x <= radius; x += 1) {
            if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
            if (!occupiedMapPositions.has(`${x},${y}`)) {
              assigned = [x, y];
              occupiedMapPositions.add(`${x},${y}`);
            }
          }
        }
      }
      chunk.mapPosition = assigned ?? [0, 0];
    }
    if (!chunk.mapLabel) {
      chunk.mapLabel = String.fromCharCode(70 + generatedMapLabelIndex);
      generatedMapLabelIndex += 1;
    }
  });

  if (!migrated.chunks[migrated.currentChunkId]) {
    migrated.currentChunkId = Object.keys(migrated.chunks)[0] ?? null;
  }

  if (sourceVersion < WORLD_SCHEMA_VERSION) {
    migrated.metadata.migratedFromSchema = sourceVersion;
  }

  return migrated;
}

export function serializeChunk(chunk, world = getWorldSnapshot()) {
  if (!chunk) return null;
  const snapshot = cloneSerializable(chunk);
  delete snapshot.file;
  snapshot.dirty = false;
  snapshot.terrain = { ...(snapshot.terrain ?? {}) };
  delete snapshot.terrain.terrainPreviewStamp;
  delete snapshot.terrain.terrainPreviewVersion;
  snapshot.terrain.terrainVertexEdits = { ...(world.terrainVertexEdits ?? {}) };

  snapshot.objects = Object.fromEntries(
    Object.entries(snapshot.objects ?? {}).map(([id, object]) => {
      const persistentObject = { ...object };
      delete persistentObject.file;
      if (Array.isArray(persistentObject.position)) {
        persistentObject.position = persistentObject.position.slice(0, 3).map(Number);
      }
      persistentObject.rotationY = Number(persistentObject.rotationY ?? 0);
      persistentObject.scale = Number(persistentObject.scale ?? 1);
      return [id, persistentObject];
    })
  );

  return snapshot;
}

export function serializeWorld(world = getWorldSnapshot()) {
  const snapshot = cloneSerializable(world);
  snapshot.schemaVersion = WORLD_SCHEMA_VERSION;
  snapshot.worldType = snapshot.worldType === "blank" ? "blank" : "default";
  snapshot.metadata = {
    ...(snapshot.metadata ?? {}),
    schemaVersion: WORLD_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  };
  snapshot.terrainVertexEdits = { ...(snapshot.terrainVertexEdits ?? {}) };

  Object.values(snapshot.chunks ?? {}).forEach((chunk) => {
    const serialized = serializeChunk(chunk, snapshot);
    Object.assign(chunk, serialized);
  });

  return snapshot;
}

function writeChunkManifest(world) {
  const manifest = Object.values(world.chunks ?? {}).map((chunk) => ({
    id: chunk.id,
    grid: chunk.grid,
    name: chunk.name,
    position: chunk.position,
    updatedAt: chunk.metadata?.savedAt ?? null,
  }));
  localStorage.setItem(CHUNK_MANIFEST_STORAGE_KEY, JSON.stringify({
    schemaVersion: WORLD_SCHEMA_VERSION,
    worldId: world.metadata?.id ?? "testing-grounds",
    chunks: manifest,
  }));
}

export function saveWorldSnapshot(world = getWorldSnapshot()) {
  const snapshot = serializeWorld(world);
  localStorage.setItem(SCATTER_BACKUP_STORAGE_KEY, JSON.stringify({
    schemaVersion: WORLD_SCHEMA_VERSION,
    savedAt: snapshot.metadata?.savedAt ?? new Date().toISOString(),
    scatterProfiles: snapshot.scatterProfiles ?? {},
  }));
  localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(snapshot));
  Object.values(snapshot.chunks ?? {}).forEach((chunk) => {
    localStorage.setItem(`${CHUNK_STORAGE_PREFIX}${chunk.id}`, JSON.stringify(serializeChunk(chunk, snapshot)));
  });
  writeChunkManifest(snapshot);

  useWorldStore.getState().replaceWorld(snapshot);
  return snapshot;
}

export function saveChunkSnapshot(chunkId = getWorldSnapshot().currentChunkId) {
  const world = getWorldSnapshot();
  const chunk = world.chunks?.[chunkId];
  if (!chunk) return null;

  const snapshot = serializeChunk(chunk, world);
  snapshot.metadata = {
    ...(snapshot.metadata ?? {}),
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(`${CHUNK_STORAGE_PREFIX}${chunkId}`, JSON.stringify(snapshot));

  useWorldStore.getState().updateChunk(chunkId, {
    dirty: false,
    metadata: snapshot.metadata,
  });
  writeChunkManifest(useWorldStore.getState().world);

  return snapshot;
}

export function loadChunkSnapshot(chunkId = getWorldSnapshot().currentChunkId) {
  const key = `${CHUNK_STORAGE_PREFIX}${chunkId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const world = getWorldSnapshot();
    if (!world.chunks?.[chunkId]) return null;

    const current = world.chunks[chunkId];
    const loadedChunk = normalizeChunk(parsed, current);
    const mergedVertexEdits = {
      ...(world.terrainVertexEdits ?? {}),
      ...(loadedChunk.terrain?.terrainVertexEdits ?? {}),
    };
    delete loadedChunk.terrain.terrainVertexEdits;

    useWorldStore.getState().updateChunk(chunkId, {
      ...loadedChunk,
      dirty: false,
    });
    useWorldStore.getState().replaceWorld({
      ...useWorldStore.getState().world,
      terrainVertexEdits: mergedVertexEdits,
    });
    useWorldStore.getState().setCurrentChunk(chunkId);
    return loadedChunk;
  } catch (error) {
    console.warn("Testing Grounds: saved chunk is invalid.", error);
    return null;
  }
}

export function hasSavedChunk(chunkId = getWorldSnapshot().currentChunkId) {
  return Boolean(chunkId && localStorage.getItem(`${CHUNK_STORAGE_PREFIX}${chunkId}`));
}

export function resetChunkSnapshot(chunkId = getWorldSnapshot().currentChunkId) {
  const world = getWorldSnapshot();
  if (!world.chunks?.[chunkId]) return null;

  const templateWorld = world.worldType === "blank"
    ? createInitialWorld([])
    : createInitialWorld(AREA_CONFIG);
  const existing = world.chunks[chunkId];
  const template = templateWorld.chunks?.[chunkId] ?? createEmptyChunk({
    id: existing.id,
    grid: existing.grid,
    name: `CHUNK ${existing.grid}`,
    position: existing.position,
    description: existing.metadata?.description ?? "",
  });

  const resetChunk = normalizeChunk({
    ...template,
    id: existing.id,
    grid: existing.grid,
    name: existing.name,
    position: existing.position,
    metadata: {
      ...template.metadata,
      ...existing.metadata,
    },
    dirty: false,
  }, template);

  useWorldStore.getState().updateChunk(chunkId, resetChunk);
  localStorage.removeItem(`${CHUNK_STORAGE_PREFIX}${chunkId}`);
  writeChunkManifest(useWorldStore.getState().world);
  return resetChunk;
}

export function resetWorldToDefault() {
  const world = createInitialWorld(AREA_CONFIG);
  localStorage.removeItem(WORLD_STORAGE_KEY);
  localStorage.removeItem(CHUNK_MANIFEST_STORAGE_KEY);
  localStorage.removeItem(SCATTER_BACKUP_STORAGE_KEY);
  Object.keys(world.chunks).forEach((chunkId) => localStorage.removeItem(`${CHUNK_STORAGE_PREFIX}${chunkId}`));
  useWorldStore.getState().replaceWorld(world);
  clearHistory();
  return world;
}

function readStoredWorld() {
  const current = localStorage.getItem(WORLD_STORAGE_KEY);
  if (current) {
    try {
      return migrateWorld(JSON.parse(current));
    } catch (error) {
      console.warn("Testing Grounds: current saved world is invalid.", error);
    }
  }

  const legacyWorld = localStorage.getItem(LEGACY_WORLD_STORAGE_KEY);
  if (legacyWorld) {
    try {
      const parsed = JSON.parse(legacyWorld);
      const legacySettings = localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (legacySettings) {
        const settings = JSON.parse(legacySettings);
        const chunkId = parsed.currentChunkId;
        if (chunkId && parsed.chunks?.[chunkId]) {
          parsed.chunks[chunkId].terrain = {
            ...(parsed.chunks[chunkId].terrain ?? {}),
            ...settings,
          };
        }
      }
      return migrateWorld(parsed);
    } catch (error) {
      console.warn("Testing Grounds: legacy saved world is invalid.", error);
    }
  }

  return null;
}

export function loadWorldSnapshot() {
  const world = readStoredWorld();
  if (!world) return null;
  if (!Object.keys(world.scatterProfiles ?? {}).length) {
    const scatterBackup = localStorage.getItem(SCATTER_BACKUP_STORAGE_KEY);
    if (scatterBackup) {
      try {
        const parsed = JSON.parse(scatterBackup);
        if (parsed?.scatterProfiles && typeof parsed.scatterProfiles === "object") {
          world.scatterProfiles = parsed.scatterProfiles;
        }
      } catch (error) {
        console.warn("Testing Grounds: scatter backup is invalid.", error);
      }
    }
  }
  useWorldStore.getState().replaceWorld(world);
  clearHistory();
  return world;
}

export function hasSavedWorld() {
  return Boolean(
    localStorage.getItem(WORLD_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_WORLD_STORAGE_KEY)
  );
}

export function resetSavedWorld() {
  localStorage.removeItem(WORLD_STORAGE_KEY);
  localStorage.removeItem(LEGACY_WORLD_STORAGE_KEY);
  localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
  localStorage.removeItem(CHUNK_MANIFEST_STORAGE_KEY);
  localStorage.removeItem(SCATTER_BACKUP_STORAGE_KEY);
  Object.keys(getWorldSnapshot().chunks ?? {}).forEach((chunkId) => {
    localStorage.removeItem(`${CHUNK_STORAGE_PREFIX}${chunkId}`);
  });
}
