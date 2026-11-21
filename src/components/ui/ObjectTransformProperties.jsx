export default function ObjectTransformProperties({ object, onChange }) {
  return <fieldset className="tg-object-transforms"><legend>TRANSFORM</legend>
    {["X", "Y", "Z"].map((axis, index) => <label key={axis}>{axis}<input aria-label={`Position ${axis}`} type="number" step="0.1" value={object.position?.[index] ?? 0} onChange={event => { const value = Number(event.target.value); if (!Number.isFinite(value)) return; const position = [...(object.position ?? [0, 0, 0])]; position[index] = value; onChange({ position }); }} /></label>)}
    <label>ROTATION °<input aria-label="Object rotation" type="number" step="15" value={Number(((object.rotationY ?? 0) * 180 / Math.PI).toFixed(3))} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value)) onChange({ rotationY: value * Math.PI / 180 }); }} /></label>
    <label>SCALE<input aria-label="Object scale" type="number" min="0.25" max="4" step="0.1" value={object.scale ?? 1} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= .25 && value <= 4) onChange({ scale: value }); }} /></label>
  </fieldset>;
}
