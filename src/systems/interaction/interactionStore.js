import { create } from "zustand";

export const INTERACTION_COLOR = "#2a8fff";

export const INTERACTION_MODES = Object.freeze({
  SELECT: "select",
  EDIT: "edit",
  PLACE: "place",
  SCULPT: "sculpt",
  GRAB: "grab",
});

const IDLE_STATE = {
  activeTarget: null,
  activeTool: null,
  activeMode: null,
  panelOpen: false,
};

export const useInteractionStore = create((set) => ({
  ...IDLE_STATE,

  activate({ target = null, tool = null, mode = null }) {
    set({
      activeTarget: target,
      activeTool: tool,
      activeMode: mode,
    });
  },

  openPanel() {
    set({ panelOpen: true });
  },

  closePanel() {
    set({ panelOpen: false });
  },

  clear() {
    set({ ...IDLE_STATE });
  },

  setTarget(target) {
    set({ activeTarget: target });
  },
}));

export const interactionState = {
  get activeTarget() {
    return useInteractionStore.getState().activeTarget;
  },
  get activeTool() {
    return useInteractionStore.getState().activeTool;
  },
  get activeMode() {
    return useInteractionStore.getState().activeMode;
  },
  get panelOpen() {
    return useInteractionStore.getState().panelOpen;
  },
};
