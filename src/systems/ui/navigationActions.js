import { teleportToChunk } from "../world/terrainReadiness";
import { COMPASS_MENUS, DIRECTIONS, useNavigationStore } from "./navigationStore";
import { clearGameplayInput } from "../input/inputOwnership";
import { useEditorStore } from "../editor/editorStore";
import { useInteractionStore } from "../interaction/interactionStore";
import { useWorldStore } from "../world/worldStore";
import { useTerrainExportStore } from "../terrain/terrainExportStore";
import { endAdjustment } from "./controlAdjustment";
import { compassControlState, hasBlockingInterface } from "./compassState";

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
export function focusPanel(direction) {
  window.requestAnimationFrame(() => {
    const root = document.querySelector(".tg-terrain-export") || document.querySelector(direction ? "#tg-panel-" + direction + ":not([hidden])" : "[data-directional-panel]:not([hidden])");
    const controls = [...(root?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary') ?? [])];
    const control = controls.find(element => element.getClientRects().length > 0);
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
export function exitToDefaultWorld() {
  endAdjustment();
  emit('tg-shortcut-picker-close');
  // Existing pointer-up/history handlers finish applied edits; no click reaches the world.
  window.dispatchEvent(new Event('pointerup'));
  emit('tg-leaf-editor-close');
  emit('crimson-tree-edit-exit-request');
  emit('tg-mesh-cancel-placement');
  emit('tg-return-to-world');
  for(const details of document.querySelectorAll?.('.tg-panel-visibility[open],.tg-terrain-tools[open]')??[])details.open=false;
  useNavigationStore.getState().setPlacementOrigin(null);
  useInteractionStore.getState().deactivate();
  returnToWorldView();
  window.requestAnimationFrame(()=>document.querySelector('.tg-compass-activate')?.focus());
}
export function activateCompassControl() {
  const state=compassControlState(useNavigationStore.getState(),useEditorStore.getState(),useInteractionStore.getState(),hasBlockingInterface());
  clearGameplayInput();
  if(state==='world')useNavigationStore.getState().openCompass();
  else exitToDefaultWorld();
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
  else if (origin === 'east') openIndependentDevTools('clouds');
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
  if (action === "world-view") { exitToDefaultWorld(); return; }
  if (action === 'compass-tools') { returnToWorldView();useNavigationStore.getState().openCompass();useNavigationStore.getState().enterMenu('tools');return; }
  if (action === "devtools" || action === "clouds") { openIndependentDevTools(action === "clouds" ? "clouds" : undefined); return; }
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
    teleportToChunk(chunk.id);
    return;
  }
  if (["objects","upload","scatter","edit-objects"].includes(action)) {
    openObjectLibrary(action === "scatter" ? "scatter" : action === "edit-objects" ? "edit" : action === "upload" ? "upload" : "place");
    return;
  }
  if (action === "export") { useTerrainExportStore.getState().setOpen(true); focusPanel(); return; }
  if (action === "workspace" || action === "editor-view") { openWorkspace(); focusPanel("north"); }
  if (action === "map") { useEditorStore.getState().openPanel("west"); focusPanel("west"); }
}
export function backCompass() {
  const nav = useNavigationStore.getState();
  clearGameplayInput();
  nav.back();
  if (!nav.compassOpen || nav.trail.length <= 1) document.activeElement?.blur?.();
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
