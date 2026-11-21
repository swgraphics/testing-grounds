import { useEffect, useRef, useState } from "react";
import { useTerrainExportStore } from "../../systems/terrain/terrainExportStore";
import { downloadTerrainGLB, exportTerrainGLB, MAX_SEGMENTS, validateTerrainExport } from "../../systems/terrain/terrainExport";
import "./TerrainExportPanel.css";

export default function TerrainExportPanel() {
  const options = useTerrainExportStore(state => state.options);
  const updateOption = useTerrainExportStore(state => state.updateOption);
  const setOpen = useTerrainExportStore(state => state.setOpen);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const heading = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const previousFocus = document.activeElement;
    heading.current?.focus();
    return () => {
      mounted.current = false;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  let dimensions, validationError;
  try { dimensions = validateTerrainExport(options); }
  catch (error) { validationError = error.message; }

  async function handleExport(event) {
    event.preventDefault();
    if (busy || validationError) return;
    setBusy(true);
    setFeedback("Preparing committed terrain…");
    try {
      // Allow loading feedback to paint before synchronous mesh sampling begins.
      await new Promise(resolve => setTimeout(resolve, 30));
      const buffer = await exportTerrainGLB(options);
      downloadTerrainGLB(buffer, options.filename);
      if (mounted.current) setFeedback("GLB download started. Source world unchanged.");
    } catch (error) {
      if (mounted.current) setFeedback(`Export failed: ${error.message || "Please try a smaller region or resolution."}`);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="tg-terrain-export" aria-labelledby="tg-terrain-export-title" aria-busy={busy}
      onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape" && !busy) setOpen(false); }}>
      <div className="tg-terrain-export-heading">
        <h2 id="tg-terrain-export-title" tabIndex={-1} ref={heading}>TERRAIN EXPORT</h2>
        <button type="button" className="tg-editor-header-button" disabled={busy} onClick={() => setOpen(false)} aria-label="Close terrain export">CLOSE</button>
      </div>
      <form onSubmit={handleExport}>
        <fieldset disabled={busy}>
          <legend>WORLD-SPACE X/Z REGION</legend>
          <div className="tg-terrain-export-grid">
            {[["minX", "Min X"], ["maxX", "Max X"], ["minZ", "Min Z"], ["maxZ", "Max Z"], ["segmentsX", "X segments"], ["segmentsZ", "Z segments"]].map(([key, label]) => (
              <label key={key}>{label}<input type="number" required step={key.startsWith("segments") ? 1 : "any"}
                min={key.startsWith("segments") ? 1 : -100000} max={key.startsWith("segments") ? MAX_SEGMENTS : 100000}
                value={Number.isNaN(options[key]) ? "" : options[key]}
                onChange={event => { updateOption(key, event.target.value === "" ? NaN : Number(event.target.value)); setFeedback(""); }} /></label>
            ))}
          </div>
          <p>Segments = cells per axis (1–{MAX_SEGMENTS}); vertices = (X + 1) × (Z + 1). Higher values sample more detail.</p>
          <label>Origin<select value={options.origin} onChange={event => { updateOption("origin", event.target.value); setFeedback(""); }}>
            <option value="world">World Position</option><option value="centered">Centered Origin</option>
          </select></label>
          <label>Filename<input value={options.filename} maxLength={120} onChange={event => { updateOption("filename", event.target.value); setFeedback(""); }} /></label>
          {dimensions && <p>{dimensions.width.toFixed(2)} × {dimensions.depth.toFixed(2)} world units · {dimensions.vertices.toLocaleString()} vertices · {dimensions.triangles.toLocaleString()} triangles<br />Cell spacing: {(dimensions.width / options.segmentsX).toFixed(3)} × {(dimensions.depth / options.segmentsZ).toFixed(3)} units.</p>}
          <p>Surface only, Y-up; elevation preserved. Includes sculpt and vertex edits, excludes temporary geology previews. Portable neutral gray PBR material. The boundary follows the visible terrain.</p>
          <p role="status" aria-live="polite">{validationError || feedback}</p>
          <button type="submit" className="tg-editor-header-button" disabled={Boolean(validationError) || busy}>{busy ? "EXPORTING…" : "Export GLB"}</button>
        </fieldset>
      </form>
    </section>
  );
}
