import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({ configFile:false, cacheDir:"node_modules/.vite-tg-tests", optimizeDeps:{noDiscovery:true,include:[]}, server:{middlewareMode:true,watch:null}, appType:"custom" });
const oldWindow=globalThis.window, oldDocument=globalThis.document;
globalThis.window=new EventTarget();
window.requestAnimationFrame=callback=>callback();
globalThis.document={querySelector:()=>null,activeElement:{blur(){}}};
try {
 const {useEditorStore:editor}=await server.ssrLoadModule("/src/systems/editor/editorStore.js");
 const {useInteractionStore:tool}=await server.ssrLoadModule("/src/systems/interaction/interactionStore.js");
 const {useNavigationStore:nav}=await server.ssrLoadModule("/src/systems/ui/navigationStore.js");
 const actions=await server.ssrLoadModule("/src/systems/ui/navigationActions.js");
 const {useTerrainExportStore:exporter}=await server.ssrLoadModule("/src/systems/terrain/terrainExportStore.js");
 let cancels=0, placements=0;window.addEventListener("tg-mesh-cancel-placement",()=>cancels++);window.addEventListener("tg-mesh-place-request",()=>placements++);
 nav.getState().openCompass();nav.getState().select("east");actions.confirmCompass();
 assert.equal(nav.getState().menu,"tools");
 actions.confirmCompass();assert.equal(nav.getState().menu,"terrain");
 actions.confirmCompass();
 assert.equal(nav.getState().compassOpen,false);assert.equal(tool.getState().activeTool,"RAISE");assert.equal(editor.getState().isOpen,false);
 assert.ok(Object.values(editor.getState().panels).every(x=>!x));
 tool.getState().setWaterDiameter(64);
 const snapshot=()=>({tool:tool.getState().activeTool,mode:tool.getState().activeMode,diameter:tool.getState().waterDiameter});
 const original=snapshot();
 for(const panel of ["left","right","library","scatter"]) {
  editor.getState().setPanel(panel,true);assert.equal(editor.getState().panels[panel],true);assert.deepEqual(snapshot(),original);
  editor.getState().setPanel(panel,false);assert.deepEqual(snapshot(),original);
  editor.getState().togglePanel(panel);assert.equal(editor.getState().panels[panel],true);
  editor.getState().togglePanel(panel);assert.equal(editor.getState().panels[panel],false);
 }
 editor.getState().open();assert.ok(Object.values(editor.getState().panels).every(Boolean));assert.deepEqual(snapshot(),original);
 editor.getState().close();assert.deepEqual(snapshot(),original);
 actions.openObjectLibrary("scatter");assert.deepEqual(snapshot(),original);assert.equal(editor.getState().panels.scatter,true);
 actions.returnToWorldView();assert.deepEqual(snapshot(),original);assert.equal(editor.getState().isOpen,false);
 actions.openIndependentDevTools();assert.equal(editor.getState().devToolsOpen,true);assert.equal(editor.getState().isOpen,false);assert.deepEqual(snapshot(),original);
 editor.getState().closeDevTools();assert.deepEqual(snapshot(),original);
 actions.runNavigationAction("export");assert.equal(exporter.getState().open,true);assert.equal(editor.getState().isOpen,false);assert.deepEqual(snapshot(),original);
 actions.returnToWorldView();assert.equal(exporter.getState().open,false);assert.deepEqual(snapshot(),original);
 for(const action of ["brush-lower","brush-smooth","brush-flatten","brush-slope","brush-vertex","river","lake","sun"]) {
  actions.runNavigationAction(action);assert.equal(editor.getState().isOpen,false);assert.equal(nav.getState().compassOpen,false);assert.ok(tool.getState().activeTool);
 }
 tool.getState().activate({tool:"OBJECT",mode:"PLACE",target:"object:test"});
 assert.equal(tool.getState().activeMode,"place");
 editor.getState().open();actions.returnToWorldView();assert.equal(tool.getState().activeTool,"OBJECT");assert.equal(tool.getState().activeMode,"place");
 assert.equal(cancels,0);assert.equal(placements,0);
 nav.getState().openCompass();nav.getState().enterMenu("tools");nav.getState().enterMenu("terrain");
 nav.getState().back();assert.equal(nav.getState().menu,"tools");
 nav.getState().navigate("north");assert.equal(nav.getState().selected,"north");nav.getState().navigate("north");assert.equal(nav.getState().selected,"world-view");
 nav.getState().navigate("east");assert.equal(nav.getState().selected,"devtools");
 actions.confirmCompass();assert.equal(editor.getState().devToolsOpen,true);assert.equal(editor.getState().isOpen,false);assert.equal(tool.getState().activeTool,"OBJECT");
 console.log("PASS exact World > Tools > Terrain > Raise route without panels");
 console.log("PASS independent panel open/close/reopen, full composition and persistent tool/settings");
 console.log("PASS World View, independent Dev Tools, export, tool routes and visible parent navigation");
 console.log("PASS uppercase legacy placement modes normalized; UI actions neither cancel placement nor execute edits");
} finally {globalThis.window=oldWindow;globalThis.document=oldDocument;await server.close()}
