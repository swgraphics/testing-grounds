import { create } from "zustand";

export const useWorldGuideStore = create((set) => ({
  visible: true,
  toggle() {
    set((state) => ({ visible: !state.visible }));
  },
  setVisible(visible) {
    set({ visible: Boolean(visible) });
  },
}));
