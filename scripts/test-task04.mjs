import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-task04-tests',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
globalThis.window=new EventTarget();const records=new Map();
const storage={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,String(v)),removeItem:k=>records.delete(k)};
window.localStorage=storage;globalThis.localStorage=storage;window.requestAnimationFrame=fn=>fn();
globalThis.document={querySelector:()=>null,activeElement:{blur(){}}};
try {
 const prefs=await server.ssrLoadModule('/src/systems/ui/compassShortcutStore.js');
 const registry=await server.ssrLoadModule('/src/systems/ui/compassActionRegistry.js');
 const {COMPASS_MENUS}=await server.ssrLoadModule('/src/systems/ui/navigationStore.js');
 const {useWorldStore:world}=await server.ssrLoadModule('/src/systems/world/worldStore.js');
 const {useHistoryStore:history}=await server.ssrLoadModule('/src/systems/history/historyStore.js');
 const {editObjectTarget}=await server.ssrLoadModule('/src/systems/objects/objectEditing.js');
 world.getState().initializeBlankWorld();
 for(const entry of Object.values(COMPASS_MENUS).flat())if(entry.action)assert.ok(registry.getCompassAction(entry.action),'every registered navigation action exposed');
 assert.deepEqual(prefs.readShortcutPreferences(storage),[null,null,null,null]);
 prefs.useCompassShortcutStore.getState().assign(0,'brush-raise');prefs.useCompassShortcutStore.getState().assign(1,'object-place');prefs.useCompassShortcutStore.getState().assign(2,'missing-old-action');
 assert.deepEqual(JSON.parse(storage.getItem(prefs.SHORTCUT_STORAGE_KEY)),{version:1,panelLayout:2,slots:['brush-raise','object-place','missing-old-action',null]});
 prefs.useCompassShortcutStore.getState().reload();assert.equal(prefs.useCompassShortcutStore.getState().slots[2],'missing-old-action');
 assert.equal(registry.executeCompassAction('missing-old-action').ok,false);assert.equal(prefs.useCompassShortcutStore.getState().slots[2],'missing-old-action');
 prefs.useCompassShortcutStore.getState().assign(0,null);assert.deepEqual(prefs.useCompassShortcutStore.getState().slots,[null,'object-place','missing-old-action',null]);assert.equal(prefs.useCompassShortcutStore.getState().assign(7,'undo'),false);
 for(const value of ['{broken','{"version":99,"slots":["undo"]}','{"version":1,"slots":"undo"}']){storage.setItem(prefs.SHORTCUT_STORAGE_KEY,value);assert.deepEqual(prefs.readShortcutPreferences(storage),[null,null,null,null])}
 storage.setItem(prefs.SHORTCUT_STORAGE_KEY,JSON.stringify({version:1,slots:['undo',{},false,'redo','extra']}));assert.deepEqual(prefs.readShortcutPreferences(storage),['undo',null,null,'redo']);
 window.localStorage={getItem:()=>null,setItem:()=>{throw Error('quota')}};prefs.useCompassShortcutStore.getState().assign(0,'guides-toggle');assert.equal(prefs.useCompassShortcutStore.getState().slots[0],'guides-toggle');assert.ok(prefs.useCompassShortcutStore.getState().storageError);window.localStorage=storage;
 let invoked=0;const unregister=registry.registerCompassAction({id:'test-extension',label:'Test registered function',category:'Tests',execute:()=>invoked++});assert.equal(registry.executeCompassAction('test-extension').ok,true);assert.equal(invoked,1);unregister();assert.equal(registry.executeCompassAction('test-extension').ok,false);
 assert.equal(registry.executeCompassAction('undo').ok,false);
 world.getState().upsertObject({id:'shortcut-object',type:'procedural',modelType:'crimson-tree',position:[1,2,3],scale:1});editObjectTarget({id:'shortcut-object'},{position:[4,2,6]});
 assert.equal(registry.executeCompassAction('undo').ok,true);assert.deepEqual(world.getState().world.chunks[world.getState().world.currentChunkId].objects['shortcut-object'].position,[1,2,3]);assert.equal(registry.executeCompassAction('redo').ok,true);assert.deepEqual(world.getState().world.chunks[world.getState().world.currentChunkId].objects['shortcut-object'].position,[4,2,6]);assert.equal(history.getState().redoStack.length,0);
 const actions=registry.getCompassActions().map(({id,label,category})=>({id,label,category}));fs.writeFileSync('ui-revision-04.local/registered-actions.json',JSON.stringify(actions,null,2));console.log('PASS complete navigation registry, extensible commands, real object history, stable-ID preferences, reload, unknown IDs, version/corruption handling, independent clearing and quota feedback; actions:',actions.length);
} finally {await server.close()}
