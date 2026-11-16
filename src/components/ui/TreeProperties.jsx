import { TREE_PROPERTY_GROUPS, treePropertyValue, treePropertyPatch } from "../../systems/objects/treeProperties";

export default function TreeProperties({ definition, onChange, onVertexEdit, seedEditable = true }) {
  const input = (path, value) => onChange(treePropertyPatch(path, value));
  return <div className="tg-shared-tree-properties">
    {TREE_PROPERTY_GROUPS.map(([title, fields]) => <details key={title} open={title === "TRUNK"}>
      <summary>{title}</summary>
      {fields.map(([label, path, max = 100, disabled = false]) => <label className="tg-tree-interaction-slider tg-mesh-edit-slider" key={path}>
        <span>{label}<strong>{treePropertyValue(definition, path)}</strong></span>
        <input aria-label={label} data-tree-property={path} type="range" min="0" max={max} step="1" disabled={disabled} value={Math.min(max, Number(treePropertyValue(definition, path)))} onChange={event => input(path, Number(event.target.value))} />
      </label>)}
    </details>)}
    <label className="tg-tree-interaction-slider tg-mesh-edit-slider"><span>FLOATING LEAVES</span><input aria-label="FLOATING LEAVES" data-tree-property="leaves.floating.enabled" type="checkbox" checked={Boolean(treePropertyValue(definition, "leaves.floating.enabled"))} onChange={event => input("leaves.floating.enabled", event.target.checked)} /></label>
    <details open><summary>COLORS / GRADIENT</summary>
      {[["LEAF FILL COLOR", "leaves.color"], ["LEAF OUTLINE COLOR", "leaves.outlineColor"], ["GRADIENT COLOR", "leaves.gradientColor"]].map(([label, path]) => <label className="tg-tree-interaction-slider tg-mesh-edit-slider" key={path}>
        <span>{label}<strong>{treePropertyValue(definition, path)}</strong></span>
        <input aria-label={label} data-tree-property={path} type="color" value={treePropertyValue(definition, path)} onChange={event => input(path, event.target.value)} />
      </label>)}
      <label className="tg-tree-interaction-slider tg-mesh-edit-slider"><span>FOLIAGE GRADIENT</span><input aria-label="FOLIAGE GRADIENT" data-tree-property="leaves.gradientEnabled" type="checkbox" checked={Boolean(treePropertyValue(definition, "leaves.gradientEnabled"))} onChange={event => input("leaves.gradientEnabled", event.target.checked)} /></label>
    </details>
    <label className="tg-tree-interaction-slider tg-mesh-edit-slider"><span>VARIATION SEED</span><input aria-label="VARIATION SEED" data-tree-property="seed" type="number" min="0" step="1" disabled={!seedEditable} value={treePropertyValue(definition, "seed")} onChange={event => input("seed", Number(event.target.value))} /></label>
    {!seedEditable && <p className="tg-library-guidance">Population-wide variation seeds are generated per instance. Select Single Tree to edit its seed.</p>}
    <button type="button" className="tg-ui-button" onClick={onVertexEdit}>LEAF VERTEX EDIT</button>
  </div>;
}
