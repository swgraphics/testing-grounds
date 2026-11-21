import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-tools08-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
globalThis.window=new EventTarget();window.requestAnimationFrame=fn=>fn();let blurs=0;
globalThis.document={activeElement:{blur(){blurs++}},querySelector:()=>null,querySelectorAll:()=>[]};
const storage=new Map();globalThis.localStorage=window.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const passes=[],pass=s=>{passes.push(s);console.log('PASS '+s)};
try{
 const {WORLD_TOOLS:tools}=await server.ssrLoadModule('/src/systems/interaction/worldTools.js');
 const {useInteractionStore:interaction}=await server.ssrLoadModule('/src/systems/interaction/interactionStore.js');
 const {useEditorStore:editor}=await server.ssrLoadModule('/src/systems/editor/editorStore.js');
 const {useWorldStore:world}=await server.ssrLoadModule('/src/systems/world/worldStore.js');
 const {useHistoryStore:history}=await server.ssrLoadModule('/src/systems/history/historyStore.js');
 const actions=await server.ssrLoadModule('/src/systems/ui/navigationActions.js');
 const {getInputContext,createGamepadOwnershipGate}=await server.ssrLoadModule('/src/systems/input/inputOwnership.js');
 assert.deepEqual(tools.map(t=>t.id),['RAISE','LOWER','HEIGHT','SMOOTH','FLATTEN','SLOPE','VERTEX','CANYON_EDGE','RIVER','POND','SUN']);assert.equal(new Set(tools.map(t=>t.action)).size,11);
 const before=JSON.stringify(world.getState().world),count=history.getState().undoStack.length;
 interaction.getState().setWaterDiameter(64);
 for(const view of ['world','editor'])for(let mask=1;mask<16;mask++){
  if(view==='editor')editor.getState().openAllPanels();else editor.getState().closeAllPanels();
  ['north','south','west','east'].forEach((d,i)=>mask&(1<<i)?editor.getState().openPanel(d):editor.getState().closePanel(d));
  const panels=structuredClone(editor.getState().visiblePanels),mode=editor.getState().viewMode;
  for(const tool of tools){const blurBefore=blurs;actions.activateWorldTool(tool.id,undefined,{retainFocus:true});assert.equal(blurs,blurBefore);assert.equal(interaction.getState().activeTool,tool.id);assert.equal(interaction.getState().activeMode,tool.mode);assert.equal(interaction.getState().activeTarget,tool.target);assert.deepEqual(editor.getState().visiblePanels,panels);assert.equal(editor.getState().viewMode,mode);assert.equal(interaction.getState().waterDiameter,64)}
 }
 assert.equal(JSON.stringify(world.getState().world),before);assert.equal(history.getState().undoStack.length,count);
 pass('Eleven canonical tools activate correct target/mode across 30 panel/view combinations without changing focus, panels, world or history');
 for(const tool of tools){editor.getState().openAllPanels();actions.runNavigationAction(tool.action);assert.equal(interaction.getState().activeTool,tool.id);assert.equal(interaction.getState().activeMode,tool.mode);assert.ok(Object.values(editor.getState().visiblePanels).every(v=>!v));assert.equal(interaction.getState().waterDiameter,64)}
 pass('Existing Compass/shortcut action IDs route through the same registry, including CANYON_EDGE, and retain direct world-entry behavior');
 for(const [value,expected] of [[200,120],[-10,8],[48,48]]){interaction.getState().setWaterDiameter(value);assert.equal(interaction.getState().waterDiameter,expected)}interaction.getState().clear();assert.equal(interaction.getState().waterDiameter,48);actions.activateWorldTool('RAISE');actions.activateWorldTool('POND');assert.equal(interaction.getState().waterDiameter,48);
 assert.equal('panelOpen' in interaction.getState(),false);assert.equal('openPanel' in interaction.getState(),false);
 actions.openObjectLibrary('select');assert.equal(editor.getState().visiblePanels.south,true);assert.equal(JSON.stringify(world.getState().world),before);
 pass('Real Pond Diameter clamps/retains its value through tool switches and exit; Library route opens SOUTH; orphan interaction-panel state is retired');
 const focused={querySelector:()=>null,activeElement:{closest:s=>s.includes('input,')?null:{}}};assert.equal(getInputContext(focused),'panel');
 const pad={axes:[0,0,0,0],buttons:[{pressed:true}]},gate=createGamepadOwnershipGate();assert.equal(gate(pad,'panel'),false);assert.equal(gate(pad,'world'),false);pad.buttons[0].pressed=false;assert.equal(gate(pad,'world'),true);
 pass('Focused controls retain canonical panel context and require neutral controller input before world ownership resumes');
 await fs.mkdir('terrain-tools08.local',{recursive:true});await fs.writeFile('terrain-tools08.local/unit-results.json',JSON.stringify({pass:true,passes},null,2));
}finally{await server.close()}
