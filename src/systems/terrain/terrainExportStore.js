import { create } from "zustand";
import { DEFAULT_EXPORT_OPTIONS } from "./terrainExport";

// Transient tool state, deliberately outside world/persistence/history.
export const useTerrainExportStore = create(set => ({
  open: false,
  options: { ...DEFAULT_EXPORT_OPTIONS },
  setOpen: open => set({ open }),
  updateOption: (key, value) => set(state => ({ options: { ...state.options, [key]: value } })),
}));
