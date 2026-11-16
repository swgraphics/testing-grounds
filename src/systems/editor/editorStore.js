import { create } from "zustand";

export const PANEL_DIRECTIONS = Object.freeze(["north", "south", "west", "east"]);
const closedPanels = () => Object.fromEntries(PANEL_DIRECTIONS.map(direction => [direction, false]));
export const panelIsVisible = (state, direction) => Boolean(state.visiblePanels[direction]);
export const hasVisiblePanels = state => Object.values(state.visiblePanels).some(Boolean);
export function panelLayoutStyle(visiblePanels, worldMapSize = {}) {
  const anyVisible = Object.values(visiblePanels).some(Boolean);
  const style=Object.fromEntries(PANEL_DIRECTIONS.map(direction => [
    `--tg-${direction}-space`,
    visiblePanels[direction] ? `var(--tg-${direction}-${["north", "south"].includes(direction) ? "height" : "width"})` : anyVisible ? "var(--tg-tab-size)" : "0px",
  ]));
  if(worldMapSize.width)style['--tg-west-width']=`min(${worldMapSize.width}px, max(100px, calc(100vw - var(--tg-east-space) - 28vw - 32px)))`;
  if(worldMapSize.height)style['--tg-map-height']=`${worldMapSize.height}px`;
  return style;
}

// Layout only. Tools, settings, history and world data keep their existing owners.
export const useEditorStore = create((set, get) => ({
  viewMode: "world",
  visiblePanels: closedPanels(),
  worldMapSize: {},
  resizeWorldMap(width,height,limits) {
    const clamp=(value,min,max)=>Math.max(Math.min(min,max),Math.min(value,max));
    set({worldMapSize:{width:clamp(width,220,limits.width),height:clamp(height,240,limits.height)}});
  },
  resetWorldMapSize() {set({worldMapSize:{}});},
  openAllPanels() { set({ viewMode: "editor", visiblePanels: Object.fromEntries(PANEL_DIRECTIONS.map(direction => [direction, true])) }); },
  closeAllPanels() { set({ viewMode: "world", visiblePanels: closedPanels() }); },
  open() { get().openAllPanels(); },
  close() { get().closeAllPanels(); },
  openPanel(direction) {
    if (!PANEL_DIRECTIONS.includes(direction)) return;
    set(state => ({ visiblePanels: { ...state.visiblePanels, [direction]: true } }));
  },
  closePanel(direction) {
    if (!PANEL_DIRECTIONS.includes(direction)) return;
    set(state => {
      const visiblePanels = { ...state.visiblePanels, [direction]: false };
      return { visiblePanels, viewMode: Object.values(visiblePanels).some(Boolean) ? state.viewMode : "world" };
    });
  },
  togglePanel(direction) { if (get().visiblePanels[direction]) get().closePanel(direction); else get().openPanel(direction); },
  // Existing callers now lead to the single canonical EAST panel.
  openDevToolsMenu() { get().openPanel("east"); },
  openDevToolsPanel() { get().openPanel("east"); },
  closeDevTools() { get().closePanel("east"); },
}));
