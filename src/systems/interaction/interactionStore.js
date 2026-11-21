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
  gestureOwner: null,
  waterDiameter: 24,
};

export const useInteractionStore = create((set) => ({
  ...IDLE_STATE,

  activate({ target = null, tool = null, mode = null }) {
    set({ activeTarget: target, activeTool: tool, activeMode: typeof mode === "string" ? mode.toLowerCase() : mode });
  },

  setGestureOwner(gestureOwner) { set({gestureOwner}); },

  deactivate() {
    set({
      activeTarget: null,
      activeTool: null,
      activeMode: null,
      gestureOwner: null,
    });
  },

  clear() {
    set(state=>({ ...IDLE_STATE, waterDiameter:state.waterDiameter }));
  },

  setWaterDiameter(value) { set({ waterDiameter: Math.max(8, Math.min(120, Number(value) || 24)) }); },

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
};
