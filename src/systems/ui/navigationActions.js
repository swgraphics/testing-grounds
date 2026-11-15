import { COMPASS_MENUS, DIRECTIONS, useNavigationStore } from "./navigationStore";
import { clearGameplayInput } from "../input/inputOwnership";
import { useEditorStore } from "../editor/editorStore";
import { useInteractionStore } from "../interaction/interactionStore";
import { useWorldStore } from "../world/worldStore";
import { useTerrainExportStore } from "../terrain/terrainExportStore";

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
export function focusPanel(direction) {
  window.requestAnimationFrame(() => {
    const root = document.querySelector(".tg-terrain-export") || document.querySelector(direction ? "#tg-panel-" + direction + ":not([hidden])" : "[data-directional-panel]:not([hidden])");
    const controls = [...(root?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary') ?? [])];
    const preferred = direction === "north" ? root?.querySelector('[data-action="world-view"]') : null;
    const control = preferred?.getClientRects().length ? preferred : controls.find(element => element.getClientRects().length > 0);
    control?.focus();
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
  document.activeElement?.blur?.();
}
export function openWorkspace(workspace = "terrain") {
  useNavigationStore.getState().setWorkspace(workspace);
  useEditorStore.getState().open();
}
export function activateWorldTool(tool, mode = "sculpt") {
  useNavigationStore.getState().setPlacementOrigin(null);
  useInteractionStore.getState().activate({ target: tool === "SUN" ? "sun" : ["RIVER","POND"].includes(tool) ? "water" : "terrain", tool, mode });
  document.activeElement?.blur?.();
}
export function openObjectLibrary(mode = "place") {
  useNavigationStore.getState().setWorkspace(mode === "scatter" ? "scatter" : "objects");
  useEditorStore.getState().openPanel("south");
  emit("tg-mesh-menu-open", { mode, restore: mode === "return" });
  if (mode !== "return") focusPanel("south");
}
export function backFromObjectPlacement() {
  const interaction = useInteractionStore.getState();
  if (interaction.activeTool !== "OBJECT" || interaction.activeMode !== "place") return false;
  const origin = useNavigationStore.getState().placementOrigin;
  useNavigationStore.getState().setPlacementOrigin(null);
  clearGameplayInput();
  emit("tg-mesh-cancel-placement");
  useInteractionStore.getState().deactivate();
  if (origin === "south") openObjectLibrary("return");
  else document.activeElement?.blur?.();
  return true;
}
export function openIndependentDevTools(section) {
  useEditorStore.getState().openDevToolsMenu();
  if (section) emit("tg-open-dev-section", { section });
  focusPanel("east");
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
    const direction = action.slice(6);
    useEditorStore.getState().togglePanel(direction);
    useTerrainExportStore.getState().setOpen(false);
    useInteractionStore.getState().closePanel();
    if (useEditorStore.getState().visiblePanels[direction]) focusPanel(direction);
    else document.activeElement?.blur?.();
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
  if (action === "workspace" || action === "editor-view") { openWorkspace(); focusPanel("north"); }
  if (action === "map") { useEditorStore.getState().openPanel("north"); focusPanel("north"); }
}
export function confirmCompass() {
  const state = useNavigationStore.getState();
  if (state.selected === "parent") { state.back(); return; }
  if (state.selected === "tools") { state.enterMenu("tools"); return; }
  if (["world-view","editor-view"].includes(state.selected)) { runNavigationAction(state.selected); return; }
  const destination = COMPASS_MENUS[state.menu][DIRECTIONS.indexOf(state.selected)];
  if (!destination) return;
  if (destination.menu) state.enterMenu(destination.menu);
  else runNavigationAction(destination.action);
}
