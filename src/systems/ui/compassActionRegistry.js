import { COMPASS_MENUS, useNavigationStore } from './navigationStore';
import { runNavigationAction, openObjectLibrary } from './navigationActions';
import { useWorldStore } from '../world/worldStore';
import { useHistoryStore } from '../history/historyStore';
import { useWorldGuideStore } from './worldGuideStore';
import { saveWorldSettings, loadWorldSettings, resetWorldSettings, reshuffleScatter } from '../terrain/terrainSettings';
import { devSettings } from '../dev/devSettings';
import { hasSavedWorld } from '../world/worldPersistence';
const actions = new Map();
let revision = 0;
const notify = () => { revision += 1; if (typeof window !== 'undefined') window.dispatchEvent(new Event('tg-compass-actions-changed')); };
export const subscribeCompassActions = callback => { window.addEventListener('tg-compass-actions-changed',callback); return () => window.removeEventListener('tg-compass-actions-changed',callback); };
export const compassActionRevision = () => revision;
export function registerCompassAction(action) {
  if (typeof action?.id !== 'string' || !action.id.length || action.id.length>=200 || !action.label || typeof action.execute !== 'function' || actions.has(action.id)) throw new Error('Compass actions require a unique ID, label and operation');
  actions.set(action.id,Object.freeze({category:'Other',...action}));notify();
  return () => { actions.delete(action.id);notify(); };
}
const names = { objects:'Objects Library', upload:'Upload Mesh (Library)', scatter:'Scatter / Populations', 'edit-objects':'Edit Object', 'panel-north':'World Editor', 'panel-south':'Objects / Library', 'panel-west':'World / Map', 'panel-east':'Dev Tools' };
for (const [menu,entries] of Object.entries(COMPASS_MENUS)) for (const entry of entries) {
  if (!entry.action || actions.has(entry.action)) continue;
  actions.set(entry.action,Object.freeze({id:entry.action,label:names[entry.action] ?? entry.label,category:menu.startsWith('terrain')?'Terrain':menu==='world'?'Panels':menu==='objects'?'Objects':'World',execute:()=>runNavigationAction(entry.action)}));
}
const extras = [
  {id:'editor-view',label:'Editor View',category:'Views',execute:()=>runNavigationAction('editor-view')},
  {id:'world-view',label:'World View',category:'Views',execute:()=>runNavigationAction('world-view')},
  {id:'export',label:'Terrain Export',category:'World',execute:()=>runNavigationAction('export')},
  {id:'fpv-toggle',label:'Toggle FPV',category:'Camera',pressed:()=>devSettings.fpvMode,execute:()=>window.dispatchEvent(new CustomEvent('tg-toggle-fpv-request'))},
  {id:'guides-toggle',label:'Toggle Guides / Markers',category:'World',pressed:()=>useWorldGuideStore.getState().visible,execute:()=>useWorldGuideStore.getState().toggle()},
  {id:'undo',label:'Undo',category:'History',unavailable:()=>useHistoryStore.getState().undoStack.length?null:'Nothing to undo.',execute:()=>useHistoryStore.getState().undo()},
  {id:'redo',label:'Redo',category:'History',unavailable:()=>useHistoryStore.getState().redoStack.length?null:'Nothing to redo.',execute:()=>useHistoryStore.getState().redo()},
  {id:'save-world',label:'Save World',category:'World',execute:saveWorldSettings},
  {id:'load-world',label:'Load World',category:'World',unavailable:()=>hasSavedWorld()?null:'No saved world is available.',execute:loadWorldSettings},
  {id:'reset-world',label:'Reset World',category:'World',execute:resetWorldSettings},
  {id:'reshuffle-scatter',label:'Reshuffle Scatter',category:'World',execute:reshuffleScatter},
  {id:'help',label:'Help / Controls',category:'Views',execute:()=>{useNavigationStore.getState().closeCompass();useNavigationStore.getState().setHelp(true)}},
  {id:'animation-actions',label:'Animation Actions',category:'Objects',execute:()=>{useNavigationStore.getState().closeCompass();openObjectLibrary('animation')}},
  {id:'object-place',label:'Object // Place',category:'Objects',execute:()=>{
    // Delegate to the mounted canonical Library action: its selection, origin and Back behavior stay owned by MeshMenu.
    const place = document.querySelector('.tg-mesh-place-button');
    if (place && !place.disabled) place.click(); else runNavigationAction('objects');
  }},
];
for (const action of extras) actions.set(action.id,Object.freeze(action));
export const getCompassActions = () => [...actions.values()];
export const getCompassAction = id => actions.get(id);
export function compassActionUnavailable(id) {
  const action = getCompassAction(id);
  if (!action) return 'This action is no longer registered. Replace or clear this shortcut.';
  if (!useWorldStore.getState().world.currentChunkId) return 'Enter a world before using this action.';
  return action.unavailable?.() ?? null;
}
export function executeCompassAction(id) {
  const message = compassActionUnavailable(id);
  if (message) return {ok:false,message};
  const action = getCompassAction(id);action.execute();return {ok:true,message:action.label+' activated.'};
}
