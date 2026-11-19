import { useEffect } from 'react';
import { useCloudUI, cloudRecords } from '../../systems/atmosphere/livingVapor/cloudState.js';
import { useWorldStore } from '../../systems/world/worldStore';
import { useInteractionStore } from '../../systems/interaction/interactionStore';
import CloudControls from './CloudControls';

export default function CloudInteractionPanel() {
  const ui = useCloudUI();
  const exists = useWorldStore(state => Boolean(cloudRecords(state.world)[ui.selectedId]));
  const target = useInteractionStore(state => state.activeTarget);
  const tool = useInteractionStore(state => state.activeTool);
  useEffect(() => {
    if (ui.panelOpen) window.requestAnimationFrame(() => document.querySelector('.tg-cloud-interaction-close')?.focus());
  }, [ui.panelOpen]);
  const request = () => window.dispatchEvent(new CustomEvent('tg-cloud-edit-selected'));
  if (ui.placement) return <div className="tg-cloud-placement-hint" role="status">{ui.message || 'CLOUD PLACEMENT · CLICK / RT · ESC / B TO CANCEL'}</div>;
  if (!exists) return null;
  if (!ui.panelOpen) return !tool && target === `cloud:${ui.selectedId}` ? <div className="tg-cloud-selection"><button className="tg-ui-button" data-cloud-edit-selected onClick={request}>CLOUD SELECTED / EDIT CLOUD (E / X)</button></div> : null;
  return <aside className="tg-cloud-interaction-panel" data-input-context="panel" aria-label="Cloud Interaction">
    <div className="tg-tree-interaction-title-row"><div className="tg-side-panel-title">CLOUD INTERACTION</div><button type="button" className="tg-cloud-interaction-close" aria-label="Close Cloud Interaction" onClick={() => window.dispatchEvent(new CustomEvent('tg-cloud-close'))}>×</button></div>
    <CloudControls />
  </aside>;
}
