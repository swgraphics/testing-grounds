import { COMPASS_MENUS, DIRECTIONS, useNavigationStore } from "./navigationStore";
import { clearGameplayInput } from "../input/inputOwnership";
import { useEditorStore } from "../editor/editorStore";
import { useInteractionStore } from "../interaction/interactionStore";
import { useWorldStore } from "../world/worldStore";
import { useTerrainExportStore } from "../terrain/terrainExportStore";

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
export function focusPanel() {
  window.requestAnimationFrame(() => {
    const root = ['.tg-terrain-export','.tg-mesh-menu','.tg-dev-full-menu.open','.tg-dev-panel','.tg-workspace-v2'].map(selector => document.querySelector(selector)).find(Boolean);
    root?.querySelector('button:not([disabled]),input:not([disabled]),select:not([disabled])')?.focus();
  });
}
export function returnToWorldView() {
  useNavigationStore.getState().closeCompass();
  useNavigationStore.getState().setHelp(false);
  useEditorStore.getState().close();
  useTerrainExportStore.getState().setOpen(false);
  useInteractionStore.getState().closePanel();
  // Hide interfaces only: never cancel placement, clear tools, or reset settings.
  emit("tg-mesh-menu-close");
  clearGameplayInput();
  document.querySelector(".tg-panel-switcher")?.removeAttribute("open");
  document.activeElement?.blur?.();
}
export function openWorkspace(workspace = "terrain") {
  useNavigationStore.getState().setWorkspace(workspace);
  useEditorStore.getState().open();
  useEditorStore.getState().setViewportMode(workspace === "map" ? "map" : "world");
}
export function activateWorldTool(tool, mode = "sculpt") {
  useInteractionStore.getState().activate({ target: tool === "SUN" ? "sun" : ["RIVER","POND"].includes(tool) ? "water" : "terrain", tool, mode });
  document.activeElement?.blur?.();
}
export function openObjectLibrary(mode = "place") {
  useNavigationStore.getState().setWorkspace(mode === "scatter" ? "scatter" : "objects");
  useEditorStore.getState().setPanel(mode === "scatter" ? "scatter" : "library", true);
  emit("tg-mesh-menu-open", { mode });
  focusPanel();
}
export function openIndependentDevTools(section) {
  returnToWorldView();
  useEditorStore.getState().openDevToolsMenu();
  if (section) emit("tg-open-dev-section", { section });
  focusPanel();
}
export function runNavigationAction(action) {
  useNavigationStore.getState().closeCompass();
  clearGameplayInput();
  if (action === "world-view") { returnToWorldView(); return; }
  if (action === "devtools" || action === "clouds") { openIndependentDevTools(action === "clouds" ? "atmosphere" : undefined); return; }
  if (action.startsWith("brush-") || ["terrain","river","sun","lake"].includes(action)) {
    const tool = action.startsWith("brush-") ? action.slice(6).toUpperCase() : { terrain: "HEIGHT", river: "RIVER", sun: "SUN", lake: "POND" }[action];
    returnToWorldView();
    activateWorldTool(tool, ["RIVER","SUN","POND"].includes(tool) ? "grab" : "sculpt");
    return;
  }
  if (action.startsWith("panel-")) {
    useEditorStore.getState().togglePanel(action.slice(6));
    focusPanel();
    return;
  }
  if (["next-area","previous-area","current-area"].includes(action)) {
    const world = useWorldStore.getState().world, chunks = Object.values(world.chunks);
    if (!chunks.length) return;
    const current = Math.max(0, chunks.findIndex(chunk => chunk.id === world.currentChunkId));
    const offset = action === "next-area" ? 1 : action === "previous-area" ? -1 : 0;
    const chunk = chunks[(current + offset + chunks.length) % chunks.length];
    useWorldStore.getState().setCurrentChunk(chunk.id);
    emit("tg-teleport-to-area", { areaId: chunk.id, chunkId: chunk.id });
    return;
  }
  if (["objects","upload","scatter","edit-objects"].includes(action)) {
    openObjectLibrary(action === "scatter" ? "scatter" : action === "edit-objects" ? "edit" : action === "upload" ? "upload" : "place");
    return;
  }
  if (action === "export") { useTerrainExportStore.getState().setOpen(true); focusPanel(); return; }
  if (action === "workspace" || action === "map") { openWorkspace(action === "map" ? "map" : "terrain"); focusPanel(); }
}
export function confirmCompass() {
  const state = useNavigationStore.getState();
  if (state.selected === "parent") { state.back(); return; }
  if (["world-view","devtools"].includes(state.selected)) { runNavigationAction(state.selected); return; }
  const destination = COMPASS_MENUS[state.menu][DIRECTIONS.indexOf(state.selected)];
  if (!destination) return;
  if (destination.menu) state.enterMenu(destination.menu);
  else runNavigationAction(destination.action);
}
