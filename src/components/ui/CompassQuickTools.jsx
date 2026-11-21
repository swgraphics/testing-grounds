import { useDevSetting } from '../../systems/dev/useDevSetting';
import { useHistoryStore } from '../../systems/history/historyStore';
import { useWorldGuideStore } from '../../systems/ui/worldGuideStore';
const quickPaths={fpv:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',guides:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',undo:'M3 10h11a7 7 0 0 1 0 14 M3 10l5-5 M3 10l5 5',redo:'M21 10H10a7 7 0 0 0 0 14 M21 10l-5-5 M21 10l-5 5'};
function QuickIcon({name}){return <svg className="tg-quick-icon" viewBox="0 0 24 26" aria-hidden="true"><path d={quickPaths[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
export default function CompassQuickTools() {
  const fpv = useDevSetting('fpvMode');
  const guides = useWorldGuideStore(state => state.visible);
  const undo = useHistoryStore(state => state.undoStack.length > 0);
  const redo = useHistoryStore(state => state.redoStack.length > 0);
  function changeHistory(action) {
    const current = document.querySelector('[data-quick-action="'+action+'"]');
    const wasFocused = document.activeElement === current;
    useHistoryStore.getState()[action]();
    window.requestAnimationFrame(() => {
      // Disabling a focused native button can blur it before this frame runs.
      if (wasFocused && current?.isConnected && current.disabled) document.querySelector('[data-quick-action="'+(action === 'undo' ? 'redo' : 'undo')+'"]')?.focus();
    });
  }
  return <aside className="tg-compass-quick" data-compass-group="quick" aria-label="Quick Tools" title="LB/RB changes Compass groups; arrows or left stick navigate; A/Enter activates">
    <h2>QUICK TOOLS //</h2>
    <button className="tg-ui-button" data-quick-action="fpv" aria-pressed={fpv} onClick={() => window.dispatchEvent(new CustomEvent('tg-toggle-fpv-request'))}><QuickIcon name="fpv" />FPV {fpv ? 'ON' : 'OFF'}</button>
    <button className="tg-ui-button" data-quick-action="guides" aria-pressed={guides} onClick={() => useWorldGuideStore.getState().toggle()}><QuickIcon name="guides" />GUIDES {guides ? 'ON' : 'OFF'}</button>
    <button className="tg-ui-button" data-quick-action="undo" disabled={!undo} onClick={() => changeHistory("undo")}><QuickIcon name="undo" />UNDO</button>
    <button className="tg-ui-button" data-quick-action="redo" disabled={!redo} onClick={() => changeHistory("redo")}><QuickIcon name="redo" />REDO</button>
  </aside>;
}
