import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({ configFile: false, cacheDir: "node_modules/.vite-tg-tests", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, appType: "custom" });
const oldWindow = globalThis.window, oldDocument = globalThis.document;
globalThis.window = new EventTarget();
window.requestAnimationFrame = callback => callback();
globalThis.document = { querySelector: () => null, activeElement: { blur() {} } };
try {
  const { useEditorStore: editor, PANEL_DIRECTIONS, panelIsVisible } = await server.ssrLoadModule("/src/systems/editor/editorStore.js");
  const { useInteractionStore: tool } = await server.ssrLoadModule("/src/systems/interaction/interactionStore.js");
  const { useNavigationStore: nav } = await server.ssrLoadModule("/src/systems/ui/navigationStore.js");
  const actions = await server.ssrLoadModule("/src/systems/ui/navigationActions.js");
  const { useTerrainExportStore: exporter } = await server.ssrLoadModule("/src/systems/terrain/terrainExportStore.js");
  let cancels = 0, placements = 0;
  const opens = [];
  window.addEventListener("tg-mesh-cancel-placement", () => cancels++);
  window.addEventListener("tg-mesh-place-request", () => placements++);
  window.addEventListener("tg-mesh-menu-open", event => opens.push(event.detail));
  const visible = () => PANEL_DIRECTIONS.filter(direction => panelIsVisible(editor.getState(), direction));
  const clean = () => assert.deepEqual(visible(), []);
  nav.getState().openCompass(); nav.getState().select("tools"); actions.confirmCompass();
  assert.equal(nav.getState().menu, "tools");
  actions.confirmCompass(); assert.equal(nav.getState().menu, "terrain"); actions.confirmCompass();
  clean(); assert.equal(nav.getState().compassOpen, false); assert.equal(tool.getState().activeTool, "RAISE");
  tool.getState().setWaterDiameter(64);
  const snapshot = () => ({ tool: tool.getState().activeTool, mode: tool.getState().activeMode, diameter: tool.getState().waterDiameter });
  const original = snapshot();
  for (const preset of ["world", "editor"]) {
    for (let mask = 0; mask < 16; mask++) {
      if (preset === "editor") editor.getState().openAllPanels(); else editor.getState().closeAllPanels();
      PANEL_DIRECTIONS.forEach((direction, index) => mask & (1 << index) ? editor.getState().openPanel(direction) : editor.getState().closePanel(direction));
      assert.deepEqual(visible(), PANEL_DIRECTIONS.filter((_, index) => mask & (1 << index)));
      assert.deepEqual(snapshot(), original, "all 16 combinations preserve active tool and settings");
      if (!mask) assert.equal(editor.getState().viewMode, "world");
    }
  }
  editor.getState().closeAllPanels();
  for (const direction of PANEL_DIRECTIONS) actions.runNavigationAction("panel-" + direction);
  assert.equal(visible().length, 4, "Compass accumulates independently visible panels");
  actions.runNavigationAction("panel-east"); assert.equal(visible().length, 3);
  assert.deepEqual(snapshot(), original);
  nav.getState().openCompass(); nav.getState().select("editor-view"); actions.confirmCompass();
  assert.equal(editor.getState().viewMode, "editor"); assert.equal(visible().length, 4);
  editor.getState().closePanel("east"); assert.equal(visible().length, 3);
  editor.getState().openPanel("east"); assert.equal(visible().length, 4);
  actions.returnToWorldView(); clean(); assert.deepEqual(snapshot(), original);
  actions.openObjectLibrary("scatter"); assert.deepEqual(visible(), ["south"]);
  actions.openIndependentDevTools(); assert.deepEqual(visible(), ["south", "east"]);
  editor.getState().closeDevTools(); assert.deepEqual(visible(), ["south"]);
  actions.returnToWorldView();
  actions.runNavigationAction("export"); assert.equal(exporter.getState().open, true);
  actions.returnToWorldView(); assert.equal(exporter.getState().open, false); clean();
  for (const action of ["brush-lower", "brush-smooth", "brush-flatten", "brush-slope", "brush-vertex", "river", "lake", "sun"]) {
    editor.getState().openAllPanels(); actions.runNavigationAction(action);
    clean(); assert.equal(nav.getState().compassOpen, false); assert.ok(tool.getState().activeTool);
  }
  tool.getState().activate({ tool: "OBJECT", mode: "PLACE", target: "object:test" });
  nav.getState().setPlacementOrigin("south");
  editor.getState().openAllPanels();
  for (const direction of PANEL_DIRECTIONS) editor.getState().closePanel(direction);
  clean(); assert.equal(tool.getState().activeMode, "place"); assert.equal(nav.getState().placementOrigin, "south");
  assert.equal(cancels, 0); assert.equal(placements, 0, "visibility performs no world edits");
  assert.equal(actions.backFromObjectPlacement(), true); assert.deepEqual(visible(), ["south"]);
  assert.equal(tool.getState().activeMode, null); assert.equal(cancels, 1); assert.equal(placements, 0);
  assert.equal(opens.at(-1).restore, true, "contextual Back asks the existing Library controller to restore browsing state");
  assert.equal(nav.getState().placementOrigin, null);
  editor.getState().closePanel("south"); clean();
  tool.getState().activate({ tool: "OBJECT", mode: "place", target: "object:external" });
  nav.getState().setPlacementOrigin(null);
  const openCount = opens.length;
  assert.equal(actions.backFromObjectPlacement(), true); clean();
  assert.equal(opens.length, openCount, "external placement does not assume Library origin");
  assert.equal(cancels, 2); assert.equal(placements, 0);
  assert.equal(actions.backFromObjectPlacement(), false);
  nav.getState().openCompass(); nav.getState().enterMenu("tools"); nav.getState().enterMenu("terrain"); nav.getState().back();
  assert.equal(nav.getState().menu, "tools");
  nav.getState().navigate("north"); nav.getState().navigate("north"); assert.equal(nav.getState().selected, "editor-view");
  nav.getState().navigate("east"); assert.equal(nav.getState().selected, "tools");
  console.log("PASS all 16 panel combinations from both presets; independent Compass toggles; no tool/settings resets");
  console.log("PASS direct world tools, Library/Scatter, canonical settings, export and controller hierarchy");
  console.log("PASS contextual placement Back restores Library only for Library origin, without placing or cancelling on visibility changes");
} finally {
  globalThis.window = oldWindow; globalThis.document = oldDocument; await server.close();
}
