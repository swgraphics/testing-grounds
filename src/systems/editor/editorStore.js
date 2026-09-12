import { create } from "zustand";

export const useEditorStore = create((set) => ({
  isOpen: false,
  activePanel: "world",
  devToolsOpen: false,
  devToolsPanelOpen: false,
  quickToolsOpen: false,
  viewportMode: "world",

  open() {
    set({
      isOpen: true,
      activePanel: "world",
      devToolsOpen: false,
      devToolsPanelOpen: false,
      quickToolsOpen: false,
      viewportMode: "world",
    });
  },

  close() {
    set({
      isOpen: false,
      devToolsOpen: false,
      devToolsPanelOpen: false,
      quickToolsOpen: false,
      viewportMode: "world",
    });
  },

  toggle() {
    set((state) => ({
      isOpen: !state.isOpen,
      quickToolsOpen: false,
      devToolsOpen: state.isOpen ? false : state.devToolsOpen,
      devToolsPanelOpen: state.isOpen ? false : state.devToolsPanelOpen,
    }));
  },

  setActivePanel(activePanel) {
    set({ activePanel });
  },

  openDevToolsPanel() {
    set({ devToolsPanelOpen: true, devToolsOpen: false });
  },

  toggleDevToolsPanel() {
    set((state) => ({
      devToolsPanelOpen: !state.devToolsPanelOpen,
      devToolsOpen: false,
    }));
  },

  openDevToolsMenu() {
    set({ devToolsOpen: true, devToolsPanelOpen: false });
  },

  toggleDevTools() {
    set((state) => ({
      devToolsOpen: !state.devToolsOpen,
      devToolsPanelOpen: false,
    }));
  },

  closeDevTools() {
    set({ devToolsOpen: false, devToolsPanelOpen: false });
  },

  setDevToolsOpen(devToolsOpen) {
    set({ devToolsOpen: Boolean(devToolsOpen), devToolsPanelOpen: false });
  },

  toggleQuickTools() {
    set((state) => ({ quickToolsOpen: !state.quickToolsOpen }));
  },

  setViewportMode(viewportMode) {
    set({ viewportMode });
  },
}));
