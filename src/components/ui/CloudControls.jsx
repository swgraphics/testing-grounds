import * as THREE from 'three';
import { useWorldStore } from '../../systems/world/worldStore';
import { cloudRecords, useCloudUI, selectCloud, setCloudTool, changeCloud, deleteCloud } from '../../systems/atmosphere/livingVapor/cloudState.js';
import { MAX_CLOUDS } from '../../systems/atmosphere/livingVapor/settings.js';
import { beginCloudPlacement } from '../../systems/atmosphere/livingVapor/cloudPlacement.js';
import ObjectTransformProperties from './ObjectTransformProperties';
import ObjectEditHistory from './ObjectEditHistory';
import './CloudInteraction.css';

export default function CloudControls({ allowCreation = false }) {
  const objects = useWorldStore(state => cloudRecords(state.world));
  const ui = useCloudUI();
  const selected = objects[ui.selectedId];
  const entries = Object.values(objects);
  const euler = selected ? new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(selected.quaternion)) : null;
  const change = patch => changeCloud(selected.id, patch);
  const rotateAxis = (axis, value) => {
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(selected.quaternion));
    rotation[axis] = value;
    change({ quaternion: new THREE.Quaternion().setFromEuler(rotation).toArray() });
  };
  return <div className="tg-cloud-controls" data-cloud-controls>
    <div className="tg-dev-subsection-title">LIVING VAPOR // {entries.length} / {MAX_CLOUDS}</div>
    {allowCreation ? <div className="tg-cloud-create">
      <label>NEW CLOUD TYPE<select aria-label="New cloud type" value={ui.creationFamily} onChange={event => useCloudUI.setState({ creationFamily: event.target.value })}>
        {['cumulus', 'stratus', 'cirrus'].map(family => <option key={family} value={family}>{family.toUpperCase()}</option>)}
      </select></label>
      <button type="button" className="tg-side-panel-button" data-cloud-add disabled={!ui.supported || entries.length >= MAX_CLOUDS} onClick={() => beginCloudPlacement(ui.creationFamily)}>ADD CLOUD</button>
      <p className="tg-library-guidance">Choose a type, then aim in the world and click / RT to place. Clouds are also available in OBJECTS // LIBRARY.</p>
      {entries.length >= MAX_CLOUDS && <p role="status">Cloud limit reached ({MAX_CLOUDS}). Delete a cloud to add another.</p>}
    </div> : <p className="tg-library-guidance">Choose a cloud to edit its vapor.</p>}
    {ui.message && <p role="status">{ui.message}</p>}
    {ui.limited && <p role="status">Simulation budget reached. Clouds continue evolving at a reduced rate.</p>}
    <label>CURRENT CLOUD<select aria-label="Current cloud" value={selected?.id ?? ''} onChange={e => selectCloud(e.target.value)}>
      <option value="" disabled>SELECT CLOUD</option>
      {entries.map((cloud, i) => <option key={cloud.id} value={cloud.id}>{cloud.family.toUpperCase()} {i + 1}</option>)}
    </select></label>
    {selected && <fieldset disabled={!ui.supported}>
      <legend>{selected.family.toUpperCase()}</legend>
      <div className="tg-cloud-tool-row">{['emit', 'gesture', 'move', 'rotate', 'scale'].map(tool => <button key={tool} type="button" data-cloud-tool={tool} className={ui.tool === tool ? 'active' : ''} onClick={() => setCloudTool(tool)}>{tool.toUpperCase()}</button>)}</div>
      {ui.tool === 'gesture' && <div className="tg-cloud-tool-row">{['pull', 'push', 'pinch'].map(gesture => <button key={gesture} type="button" className={ui.gesture === gesture ? 'active' : ''} onClick={() => useCloudUI.setState({ gesture })}>{gesture.toUpperCase()}</button>)}</div>}
      <p className="tg-library-guidance">{ui.tool === 'move' ? 'Drag the cloud to move it. Controller: hold RT + left stick; right stick up/down changes distance.' : 'Hold and drag on the cloud. Controller: hold RT; left stick moves the emitter or gesture.'}</p>
      {[
        ['density', 'NEW VAPOR DENSITY', 0.05, 1, 0.01, `${Math.round(selected.density * 100)}%`],
        ['persistencePercent', 'VAPOR PERSISTENCE', 0, 100, 1, `${Math.round(selected.persistencePercent)}%${selected.persistencePercent === 100 ? ' · NO FADE' : ''}`],
        ['radius', 'EMITTER / GESTURE RADIUS', 0.12, 0.65, 0.01, selected.radius.toFixed(2)],
      ].map(([key, label, min, max, step, value]) => <label className="tg-cloud-slider" key={key}><span>{label}<strong>{value}</strong></span><input className="tg-dev-slider" type="range" aria-label={label} min={min} max={max} step={step} value={selected[key]} onChange={e => change({ [key]: Number(e.target.value) })} /></label>)}
      <div className="tg-cloud-tool-row">{[['fill', 'FILL'], ['cage', 'CAGE']].map(([key, label]) => <button key={key} type="button" aria-pressed={selected[key]} onClick={() => change({ [key]: !selected[key] })}>{label}: {selected[key] ? 'ON' : 'OFF'}</button>)}</div>
      <label>CLOUD FAMILY<select aria-label="Cloud family" value={selected.family} onChange={e => change({ family: e.target.value })}>{['cumulus', 'stratus', 'cirrus'].map(family => <option key={family} value={family}>{family.toUpperCase()}</option>)}</select></label>
      <ObjectTransformProperties object={{ position: selected.position, rotationY: euler.y, scale: selected.scale[0] }} onChange={patch => {
        if (patch.rotationY !== undefined) rotateAxis('y', patch.rotationY);
        else if (patch.scale !== undefined) change({ scale: [patch.scale, patch.scale, patch.scale] });
        else change(patch);
      }} />
      <details><summary>ROTATION / AXIS SCALE</summary>
        {['X', 'Y', 'Z'].map(axis => <label key={axis}>ROTATION {axis} °<input type="number" aria-label={`Cloud rotation ${axis}`} step="15" value={Number(THREE.MathUtils.radToDeg(euler[axis.toLowerCase()]).toFixed(2))} onChange={e => rotateAxis(axis.toLowerCase(), THREE.MathUtils.degToRad(Number(e.target.value)))} /></label>)}
        {['X', 'Y', 'Z'].map((axis, index) => <label key={axis}>SCALE {axis}<input type="number" aria-label={`Cloud scale ${axis}`} min="0.3" max="3.5" step="0.1" value={selected.scale[index]} onChange={e => { const scale = [...selected.scale]; scale[index] = Number(e.target.value); change({ scale }); }} /></label>)}
      </details>
      <ObjectEditHistory />
      <button type="button" className="tg-side-panel-button" onClick={() => deleteCloud(selected.id)}>DELETE CLOUD</button>
    </fieldset>}
  </div>;
}
