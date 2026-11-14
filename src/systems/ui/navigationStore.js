import { create } from "zustand";
export const DIRECTIONS = ["north", "east", "south", "west"];
export const COMPASS_MENUS = Object.freeze({
  world: [
    { label: "TELEPORT", icon: "map-pin", menu: "teleport" },
    { label: "TOOLS", icon: "tree-pine", menu: "tools" },
    { label: "OBJECTS", icon: "box", menu: "objects" },
    { label: "EDITOR", icon: "mountain", menu: "editor" },
  ],
  objects: [
    { label: "PLACE", icon: "box", action: "objects" },
    { label: "UPLOAD", icon: "upload", action: "upload" },
    { label: "SCATTER", icon: "tree-pine", action: "scatter" },
    { label: "EDIT", icon: "move", action: "edit-objects" },
  ],
  tools: [
    { label: "TERRAIN", icon: "mountain", menu: "terrain" },
    { label: "DRAW RIVER", icon: "droplets", action: "river" },
    { label: "MOVE SUN", icon: "sun", action: "sun" },
    { label: "EDIT CLOUDS", icon: "cloud", action: "clouds" },
  ],
  terrain: [
    { label: "RAISE TERRAIN HEIGHT", icon: "mountain", action: "brush-raise" },
    { label: "LOWER TERRAIN HEIGHT", icon: "mountain", action: "brush-lower" },
    { label: "SMOOTH TERRAIN", icon: "mountain", action: "brush-smooth" },
    { label: "MORE TERRAIN TOOLS", icon: "mountain", menu: "terrain-more" },
  ],
  "terrain-more": [
    { label: "FLATTEN", icon: "mountain", action: "brush-flatten" },
    { label: "PATH / SLOPE", icon: "mountain", action: "brush-slope" },
    { label: "VERTEX EDIT", icon: "move", action: "brush-vertex" },
    { label: "LAKE", icon: "droplets", action: "lake" },
  ],
  editor: [
    { label: "FULL EDITOR", icon: "mountain", action: "workspace" },
    { label: "PANELS", icon: "box", menu: "panels" },
    { label: "TERRAIN EXPORT", icon: "upload", action: "export" },
    { label: "AREA MAP", icon: "map-pin", action: "map" },
  ],
  panels: [
    { label: "LEFT TOOLS", icon: "mountain", action: "panel-left" },
    { label: "RIGHT QUICK TOOLS", icon: "sun", action: "panel-right" },
    { label: "LIBRARY", icon: "box", action: "panel-library" },
    { label: "SCATTER", icon: "tree-pine", action: "panel-scatter" },
  ],
  teleport: [
    { label: "AREA MAP", icon: "map-pin", action: "map" },
    { label: "NEXT AREA", icon: "map-pin", action: "next-area" },
    { label: "CURRENT AREA", icon: "map-pin", action: "current-area" },
    { label: "PREVIOUS AREA", icon: "map-pin", action: "previous-area" },
  ],
});
const AUXILIARY = ["world-view", "devtools", "parent"];
export const useNavigationStore = create(set => ({
  compassOpen: false, menu: "world", trail: ["world"], selected: "north", lastDirection: null, workspace: "terrain", helpOpen: false,
  openCompass: () => set({ compassOpen: true, menu: "world", trail: ["world"], selected: "north", lastDirection: null }),
  closeCompass: () => set({ compassOpen: false }),
  select: selected => { if ([...DIRECTIONS, ...AUXILIARY].includes(selected)) set(state => ({ selected, lastDirection: state.selected === selected ? state.lastDirection : null })); },
  navigate: direction => set(state => {
    if (state.selected === "north" && direction === "north" && state.lastDirection === "north") return { selected: "world-view", lastDirection: null };
    if (["world-view","devtools","parent"].includes(state.selected)) {
      const selected = direction === "south" ? "north" : direction === "east" ? (state.selected === "parent" ? "world-view" : "devtools") : direction === "west" ? (state.selected === "world-view" && state.trail.length > 1 ? "parent" : "world-view") : state.selected;
      return { selected, lastDirection: null };
    }
    return { selected: direction, lastDirection: direction };
  }),
  enterMenu: menu => { if (COMPASS_MENUS[menu]) set(state => ({ menu, trail: [...state.trail, menu], selected: "north", lastDirection: null })); },
  // Parent navigation is a visible action, separate from B/Escape dismissal.
  back: () => set(state => {
    if (state.trail.length <= 1) return { compassOpen: false };
    const trail = state.trail.slice(0, -1);
    return { trail, menu: trail.at(-1), selected: "north", lastDirection: null };
  }),
  setWorkspace: workspace => set({ workspace }),
  setHelp: helpOpen => set({ helpOpen }),
}));
export function analogDirection(x, y, previous = "north") {
  if (Math.hypot(x, y) < 0.4) return null;
  const horizontal = x >= 0 ? "east" : "west", vertical = y >= 0 ? "south" : "north";
  if ((previous === horizontal && Math.abs(x) * 1.35 >= Math.abs(y)) ||
      (previous === vertical && Math.abs(y) * 1.35 >= Math.abs(x))) return previous;
  return Math.abs(x) > Math.abs(y) ? horizontal : vertical;
}
