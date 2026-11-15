import { create } from "zustand";
export const DIRECTIONS = ["north", "east", "south", "west"];
export const COMPASS_MENUS = Object.freeze({
  world: [
    { label: "WORLD // MAP", icon: "map-pin", action: "panel-north" },
    { label: "DEV TOOLS", icon: "mountain", action: "panel-east" },
    { label: "OBJECTS // LIBRARY", icon: "box", action: "panel-south" },
    { label: "WORLD EDITOR", icon: "mountain", action: "panel-west" },
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
  teleport: [
    { label: "AREA MAP", icon: "map-pin", action: "map" },
    { label: "NEXT AREA", icon: "map-pin", action: "next-area" },
    { label: "CURRENT AREA", icon: "map-pin", action: "current-area" },
    { label: "PREVIOUS AREA", icon: "map-pin", action: "previous-area" },
  ],
});
const HEADER_ACTIONS = ["editor-view", "tools", "world-view"];
const AUXILIARY = [...HEADER_ACTIONS, "parent"];
export const useNavigationStore = create(set => ({
  compassOpen: false, menu: "world", trail: ["world"], selected: "north", lastDirection: null, workspace: "terrain", helpOpen: false,
  placementOrigin: null,
  setPlacementOrigin: placementOrigin => set({ placementOrigin }),
  openCompass: () => set({ compassOpen: true, menu: "world", trail: ["world"], selected: "north", lastDirection: null }),
  closeCompass: () => set({ compassOpen: false }),
  select: selected => { if ([...DIRECTIONS, ...AUXILIARY].includes(selected)) set(state => ({ selected, lastDirection: state.selected === selected ? state.lastDirection : null })); },
  navigate: direction => set(state => {
    if (state.selected === "north" && direction === "north" && state.lastDirection === "north") return { selected: "editor-view", lastDirection: null };
    if (AUXILIARY.includes(state.selected)) {
      const index = HEADER_ACTIONS.indexOf(state.selected);
      const selected = direction === "south" ? "north" : direction === "east" ? HEADER_ACTIONS[Math.min(HEADER_ACTIONS.length - 1, index + 1)] : direction === "west" ? (index <= 0 && state.trail.length > 1 ? "parent" : HEADER_ACTIONS[Math.max(0, index - 1)]) : state.selected;
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
