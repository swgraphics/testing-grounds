import { create } from 'zustand';
export const SHORTCUT_STORAGE_KEY = 'testing-grounds-compass-shortcuts';
const empty = () => [null,null,null,null];
const storage = () => typeof window === 'undefined' ? null : window.localStorage;
export function readShortcutPreferences(source) {
  try {
    const saved = JSON.parse(source?.getItem(SHORTCUT_STORAGE_KEY) ?? 'null');
    if (saved?.version !== 1 || !Array.isArray(saved.slots)) return empty();
    return empty().map((_,i)=>{
      const id=saved.slots[i];
      if(typeof id!=='string'||!id.length||id.length>=200)return null;
      if(saved.panelLayout!==2&&['panel-north','panel-west'].includes(id))return id==='panel-north'?'panel-west':'panel-north';
      return id;
    });
  } catch { return empty(); }
}
function initialSlots() { try { return readShortcutPreferences(storage()); } catch { return empty(); } }
export const useCompassShortcutStore = create(set=>({
  slots:initialSlots(), storageError:null,
  assign(slot,id) {
    if (!Number.isInteger(slot) || slot<0 || slot>3 || (id!==null && (typeof id!=='string'||!id.length||id.length>=200))) return false;
    set(state=>{
      const slots=state.slots.map((current,i)=>i===slot?id:current);let storageError=null;
      try { storage()?.setItem(SHORTCUT_STORAGE_KEY,JSON.stringify({version:1,panelLayout:2,slots})); }
      catch { storageError='Shortcuts are available for this session; browser storage could not save them.'; }
      return {slots,storageError};
    });return true;
  },
  reload() { set({slots:initialSlots(),storageError:null}); },
}));
