import { create } from "zustand";

const CLOSED_PANELS = Object.freeze({ left: false, right: false, library: false, scatter: false });
export const useEditorStore = create(set => ({
  isOpen: false, panels: { ...CLOSED_PANELS }, activePanel: "editor",
  devToolsOpen: false, devToolsPanelOpen: false, viewportMode: "world",
  // Panel layout is transient UI state; these APIs never touch interaction tools.
  open() { set({ isOpen: true, panels: { left: true, right: true, library: true, scatter: true } }); },
  close() { set({ isOpen: false, panels: { ...CLOSED_PANELS }, devToolsOpen: false, devToolsPanelOpen: false, viewportMode: "world" }); },
  toggle() { set(state => state.isOpen
    ? { isOpen: false, panels: { ...CLOSED_PANELS }, viewportMode: "world" }
    : { isOpen: true, panels: { left: true, right: true, library: true, scatter: true } }); },
  setPanel(panel, open) {
    if (!(panel in CLOSED_PANELS)) return;
    set(state => { const panels = { ...state.panels, [panel]: Boolean(open) }; return { panels, isOpen: Object.values(panels).some(Boolean), viewportMode: Object.values(panels).some(Boolean) ? state.viewportMode : "world" }; });
  },
  togglePanel(panel) {
    if (!(panel in CLOSED_PANELS)) return;
    set(state => { const panels = { ...state.panels, [panel]: !state.panels[panel] }; return { panels, isOpen: Object.values(panels).some(Boolean), viewportMode: Object.values(panels).some(Boolean) ? state.viewportMode : "world" }; });
  },
  setActivePanel: activePanel => set({ activePanel }),
  openDevToolsPanel: () => set({ devToolsPanelOpen: true, devToolsOpen: false }),
  toggleDevToolsPanel: () => set(state => ({ devToolsPanelOpen: !state.devToolsPanelOpen, devToolsOpen: false })),
  openDevToolsMenu: () => set({ devToolsOpen: true, devToolsPanelOpen: false }),
  toggleDevTools: () => set(state => ({ devToolsOpen: !state.devToolsOpen, devToolsPanelOpen: false })),
  closeDevTools: () => set({ devToolsOpen: false, devToolsPanelOpen: false }),
  setDevToolsOpen: devToolsOpen => set({ devToolsOpen: Boolean(devToolsOpen), devToolsPanelOpen: false }),
  setViewportMode: viewportMode => set({ viewportMode }),
}));
