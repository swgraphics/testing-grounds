import { create } from "zustand";
import { useWorldStore } from "../world/worldStore";

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

function readPath(root, path) {
  return path.reduce((value, key) => value?.[key], root);
}

function writePath(root, path, value) {
  if (!path.length) return value;
  const [key, ...rest] = path;
  const next = Array.isArray(root) ? root.slice() : { ...(root ?? {}) };
  if (rest.length) {
    next[key] = writePath(next[key], rest, value);
  } else if (value === undefined) {
    delete next[key];
  } else {
    next[key] = clone(value);
  }
  return next;
}

function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const useHistoryStore = create((set, get) => ({
  undoStack: [],
  redoStack: [],
  transaction: null,
  revision: 0,

  beginTransaction(label, metadata = {}) {
    if (get().transaction) return false;
    set({
      transaction: {
        label: String(label || "EDIT"),
        metadata: { ...metadata },
        before: null,
      },
    });
    return true;
  },

  captureTransactionBefore(snapshot) {
    const transaction = get().transaction;
    if (!transaction || transaction.before) return;
    set({ transaction: { ...transaction, before: clone(snapshot) } });
  },

  commitTransaction(snapshot, options = {}) {
    const transaction = get().transaction;
    if (!transaction) return false;
    set({ transaction: null });
    if (transaction.before == null || valuesEqual(transaction.before, snapshot)) return false;
    get().record({
      label: transaction.label,
      before: transaction.before,
      after: clone(snapshot),
      metadata: transaction.metadata,
      ...options,
    });
    return true;
  },

  cancelTransaction() {
    set({ transaction: null });
  },

  record(command) {
    if (!command?.before || !command?.after || valuesEqual(command.before, command.after)) return false;
    const entry = {
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: String(command.label || "EDIT"),
      before: clone(command.before),
      after: clone(command.after),
      metadata: { ...(command.metadata ?? {}) },
    };
    set((state) => ({
      undoStack: [...state.undoStack, entry],
      redoStack: [],
      revision: state.revision + 1,
    }));
    return true;
  },

  undo() {
    const state = get();
    const command = state.undoStack[state.undoStack.length - 1];
    if (!command) return false;
    applyHistorySnapshot(command.before, command.metadata);
    set((current) => ({
      undoStack: current.undoStack.slice(0, -1),
      redoStack: [...current.redoStack, command],
      revision: current.revision + 1,
    }));
    return true;
  },

  redo() {
    const state = get();
    const command = state.redoStack[state.redoStack.length - 1];
    if (!command) return false;
    applyHistorySnapshot(command.after, command.metadata);
    set((current) => ({
      redoStack: current.redoStack.slice(0, -1),
      undoStack: [...current.undoStack, command],
      revision: current.revision + 1,
    }));
    return true;
  },

  clearHistory() {
    set((state) => ({
      undoStack: [],
      redoStack: [],
      transaction: null,
      revision: state.revision + 1,
    }));
  },
}));

function applyHistorySnapshot(snapshot, metadata = {}) {
  const world = useWorldStore.getState().world;
  let nextWorld = world;
  const paths = metadata.paths ?? [];

  paths.forEach((path) => {
    nextWorld = writePath(nextWorld, path, readPath(snapshot, path));
  });

  useWorldStore.getState().replaceWorld(nextWorld);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tg-world-history-applied", {
      detail: { chunkId: nextWorld.currentChunkId, paths },
    }));
  }
}

export function beginHistoryTransaction(label, snapshot, metadata = {}) {
  const started = useHistoryStore.getState().beginTransaction(label, { ...metadata, paths: metadata.paths ?? [] });
  if (started) useHistoryStore.getState().captureTransactionBefore(snapshot);
  return started;
}

export function commitHistoryTransaction(snapshot, metadata = {}) {
  return useHistoryStore.getState().commitTransaction(snapshot, metadata);
}

export function cancelHistoryTransaction() {
  useHistoryStore.getState().cancelTransaction();
}

export function getHistoryPathSnapshot(paths = []) {
  const world = useWorldStore.getState().world;
  const snapshot = {};
  paths.forEach((path) => {
    const value = readPath(world, path);
    let cursor = snapshot;
    path.forEach((key, index) => {
      if (index === path.length - 1) cursor[key] = clone(value);
      else {
        cursor[key] ??= {};
        cursor = cursor[key];
      }
    });
  });
  return snapshot;
}

export function undoHistory() {
  return useHistoryStore.getState().undo();
}

export function redoHistory() {
  return useHistoryStore.getState().redo();
}

export function clearHistory() {
  return useHistoryStore.getState().clearHistory();
}
