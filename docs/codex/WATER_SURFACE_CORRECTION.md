# Natural water surface correction

Completed locally on 2026-11-19 on `feat/terrain-export-ui-v2`, HEAD `8cd1b3ead4336065ea19c708f1fe181bdbb3c949`. This supersedes the initial Task 06 water shader, while preserving the CloudField cloud integration. No commit, push, deployment or dependency change is included.

## Confirmed cause

The integrated material painted a conceptual underwater caustic onto the visible water itself. In `waterMaterial.js`, `tgLace` multiplied `sin(projected.x * 2.1 + ...)` by `cos(projected.y * 2.4 + ...)`. Its fixed, nearly orthogonal frequencies created the small checkerboard/crosshatch. Refracted-ray convergence modulated its intensity but did not remove the lattice. The effect had no actual underwater receiving surface or depth information.

Browser isolation was performed before changing the runtime source:

1. Toggle Guides ON/OFF: the explicit large wireframe disappeared; the small checkerboard remained.
2. Hide the always-visible white vertex-color overlay: broad pale patches disappeared, but the checkerboard remained.
3. Disable only the caustic contribution, with the overlay still hidden: the checkerboard disappeared while animated surface normals remained.
4. Restore the original TG standard material: the checkerboard was absent. Its old white overlay still produced large triangular/polygonal patches on the coarse wave mesh.

This isolates the primary defect to the surface caustic mask. It was not caused by Guides, UV seams, duplicate base-water surfaces or geometry-grid aliasing. The overlay was a separate contributor to faceted surface color. Existing broad CPU waves were not the source of the fine lattice. The original CloudField Lake source contains the same periodic caustic construction; the local integration, not the remote branch, was inspected.

Evidence: `cloudfield-2.local/water-correction/diagnosis/{01-guides-on,01-guides-off,02-no-white-overlay,03-no-caustic-no-overlay,04-original-tg,05-original-tg-no-overlay}.png`, with the actual water-layer inventory in `diagnosis/results.json`. Only the text brief was present in the supplied attachment directory; the defect was reproduced directly in TG.

## Runtime changes

| File | Change |
| --- | --- |
| `src/systems/atmosphere/livingVapor/waterMaterial.js` | Remove the surface caustic/refraction mask, extra emissive glint and periodic color modulation. Keep TG's standard material and add five restrained world-space wave components with broad domain bends and distance filtering. |
| `src/components/world/Water.jsx` | Remove the always-visible white overlay and its unused vertex-color allocation/update. Keep the separate Guides wireframe and all existing water geometry, displacement and editing behavior. |
| `scripts/browser-water-surface.mjs` | Add browser comparisons, GPU timing and functional checks for the original TG, pre-correction integration and corrected material. |
| `docs/codex/WATER_SURFACE_CORRECTION.md` | Record cause, behavior, evidence, measurements and limitations. |
| `docs/codex/CLOUDFIELD_2_0_TG_INTEGRATION.md` | Mark the initial water description/measurements as superseded and link this correction. |

The foundation retains the original blue-green `#4e9ac2` color, emissive base, roughness, metalness, transparency and opacity values. The existing global CPU displacement and its wind-speed/wind-strength/wave-strength controls are unchanged. Subdivision continues to control mesh resolution. The 900-metre global surface, water height, pond discs/rims and terrain-derived waterfall/outlet geometry are unchanged.

The additional normal field combines broad, medium and small ripples with different wavelengths, directions and speeds. Two slow low-frequency bends vary spacing across the world. Analytic gradients include those bends. Sampling uses world X/Z, shared by global and pond surfaces, so it does not restart at chunk or object UV boundaries. Five fixed components replace the old 8/12-wave loop and caustic curvature calculations; no noise texture, multi-octave noise, additional render target or depth pass is introduced.

Screen-space derivatives suppress ripples below a resolvable pixel footprint, including at grazing angles. Normal perturbations respect the rendered face direction. Sun highlights and sky/ambient response now come from TG's existing standard-material lighting, which is already driven by the Atmosphere Palette and sun controls. There is no independent emissive highlight authority. Caustics are omitted because this rendering path cannot place them on actual underwater receivers convincingly.

The MIT notice and source copyright remain in the material and `THIRD_PARTY_LICENSES/CAUSTIC-VOLUME-MIT.txt`.

## Visual comparison

Open the [interactive screenshot comparison](../../cloudfield-2.local/water-correction/comparison.html). It provides a view selector, original-TG/integrated reference selector, a comparison wipe and three versions side by side. These are actual Chrome renders, not generated images.

All accepted versions use identical camera positions, terrain/water settings and a fixed simulation time. A small TG procedural lake fixture provides visible shorelines without unrelated foliage draw costs. Scatter is explicitly disabled in all three versions. The integrated reference replays the preserved pre-correction module; the original TG reference reconstructs the HEAD standard material and old overlay on the unchanged broad-wave geometry. Replay code is confined to browser instrumentation. `comparison.json` verifies that all recorded views and settings match.

| View | Original TG | Integrated before correction | Corrected |
| --- | --- | --- | --- |
| Wide shore / midday | [Original](../../cloudfield-2.local/water-correction/legacy/shore-midday.png) | [Before](../../cloudfield-2.local/water-correction/before/shore-midday.png) | [After](../../cloudfield-2.local/water-correction/corrected/shore-midday.png) |
| Near water level | [Original](../../cloudfield-2.local/water-correction/legacy/low-midday.png) | [Before](../../cloudfield-2.local/water-correction/before/low-midday.png) | [After](../../cloudfield-2.local/water-correction/corrected/low-midday.png) |
| High camera | [Original](../../cloudfield-2.local/water-correction/legacy/high-midday.png) | [Before](../../cloudfield-2.local/water-correction/before/high-midday.png) | [After](../../cloudfield-2.local/water-correction/corrected/high-midday.png) |
| Sunset | [Original](../../cloudfield-2.local/water-correction/legacy/shore-sunset.png) | [Before](../../cloudfield-2.local/water-correction/before/shore-sunset.png) | [After](../../cloudfield-2.local/water-correction/corrected/shore-sunset.png) |
| Low wind | [Original](../../cloudfield-2.local/water-correction/legacy/wind-low.png) | [Before](../../cloudfield-2.local/water-correction/before/wind-low.png) | [After](../../cloudfield-2.local/water-correction/corrected/wind-low.png) |
| High wind | [Original](../../cloudfield-2.local/water-correction/legacy/wind-high.png) | [Before](../../cloudfield-2.local/water-correction/before/wind-high.png) | [After](../../cloudfield-2.local/water-correction/corrected/wind-high.png) |
| Guides ON | [Original](../../cloudfield-2.local/water-correction/legacy/guides-on.png) | [Before](../../cloudfield-2.local/water-correction/before/guides-on.png) | [After](../../cloudfield-2.local/water-correction/corrected/guides-on.png) |
| Guides OFF | [Original](../../cloudfield-2.local/water-correction/legacy/guides-off.png) | [Before](../../cloudfield-2.local/water-correction/before/guides-off.png) | [After](../../cloudfield-2.local/water-correction/corrected/guides-off.png) |
| Added G4 chunk | [Original](../../cloudfield-2.local/water-correction/legacy/expanded-chunk.png) | [Before](../../cloudfield-2.local/water-correction/before/expanded-chunk.png) | [After](../../cloudfield-2.local/water-correction/corrected/expanded-chunk.png) |
| Pond / waterfall / outlet | [Original](../../cloudfield-2.local/water-correction/legacy/pond-and-waterfalls.png) | [Before](../../cloudfield-2.local/water-correction/before/pond-and-waterfalls.png) | [After](../../cloudfield-2.local/water-correction/corrected/pond-and-waterfalls.png) |

The corrected images were inspected at shore, low and high angles, including high wind, sunset, the pond and G4. The surface-wide checkerboard and pale polygonal overlay patches are absent. Ripple highlights vary in spacing and direction. Guides ON still intentionally displays the mesh wireframe; Guides OFF removes it. No new transparency seams or severe shimmer were observed in these views. The existing stylized waterfall sheets retain their appearance.

A decoded-pixel comparison of the water crop `[300,350]` to `[1100,800]` found identical pixels for repeated renders at frozen time. Advancing by 0.08 seconds changed mean RGB values by 0.938/255, with a maximum channel difference of 10/255; advancing by one second changed the mean by 8.927/255. This verifies live, deterministic motion rather than frame-random noise. It is a short controlled check, not an extended-play flicker certification.

## Performance

Three-second samples use Chrome WebGL2 / ANGLE, AMD Radeon Graphics, Direct3D11, at 1440 × 1000. GPU values are elapsed GPU query times for the full scene render, including normal scene lighting/shadows, not an isolated water draw. Samples ran sequentially with the same scene and cameras. FPS was near the display cap in every accepted run.

| Scene | Original TG GPU ms | Integrated GPU ms | Corrected GPU ms | Integrated → corrected |
| --- | ---: | ---: | ---: | ---: |
| Low wind | 3.157 | 3.523 | 3.236 | 8.1% lower |
| High wind | 3.134 | 3.613 | 2.998 | 17.0% lower |
| Pond and base | 3.239 | 3.250 | 3.207 | 1.3% lower; small enough to treat as noise |

Lake draw calls fell from 19 to 17; pond/base from 29 to 27. Removing the double-sided overlay removes 9,216 submitted triangles at the tested subdivision. Corrected FPS was 165.0, 164.0 and 164.9 respectively. Original TG and integrated runs were also approximately 165 FPS, so these samples do not establish an FPS improvement. CPU render submission stayed approximately 0.4–0.6 ms. The correction shows no substantial added render cost against the original TG material in this fixture. Broader target-hardware performance and dense full-world rendering are outside this short comparison.

Raw accepted receipts: `cloudfield-2.local/water-correction/{before,legacy,corrected}/results.json`. Summary and temporal pixel analysis: `comparison.json`. Preserved material/component snapshots and hashes: `reference/`.

## Validation

| Command / check | Observed result |
| --- | --- |
| `node scripts/browser-water-surface.mjs --before` | Passed all four browser groups; replayed pre-correction integration. |
| `node scripts/browser-water-surface.mjs --legacy` | Passed all four browser groups; reconstructed original TG material/overlay. |
| `node scripts/browser-water-surface.mjs` | Passed all four browser groups; corrected water. All three receipts have empty console-error and failed-request arrays. |
| Browser scenarios | Shore/low/high camera; midday/sunset/night; low/high wind; Guides ON/OFF; zero wave strength; 80 subdivisions; terrain lowering; real pond overflow geometry; G4 expansion; full world Save/Load. |
| `node cloudfield-2.local/water-correction/native-input.mjs` | Passed native Draw Water dragging, native Pond placement and full Save/Load of the river bed, pond basin/body and water height; empty console-error/failed-request arrays. Receipt: `native-input/results.json`. |
| `node cloudfield-2.local/water-correction/report.mjs` | Passed matching view/settings comparisons; generated screenshot comparison and pixel/measurement summary. |
| `node scripts/test-task05.mjs` | Passed populated and Blank terrain expansion, brush/seam/vertex edits, world/chunk persistence, export and legacy compatibility checks. |
| `node scripts/test-world-first-tools.mjs` | Passed shared navigation, direct tools, settings and contextual placement checks. |
| `node scripts/test-cloudfield-integration.mjs` | Passed cloud creation/selection, limits, full Save/Load, Undo/Redo, Guides, atmosphere, disposal and old-world compatibility. |
| `node node_modules/eslint/bin/eslint.js src/components/world/Water.jsx src/systems/atmosphere/livingVapor/waterMaterial.js scripts/browser-water-surface.mjs` | Exit 0; zero errors, one pre-existing `terrainRevision` dependency warning in `Water.jsx`. The dependency is retained because waterfall sampling reads global terrain state. |
| `node node_modules/vite/bin/vite.js build` | Exit 0; bundle `index-Dxrzapss.js`. Existing plugin-timing and large-bundle warnings remain. |
| Preservation | Cloud engine/UI SHA-256 hashes, branch/HEAD and all four excluded-file hashes match their checkpoints; `git diff --check` passes. |

Browser commands set `TG_TEST_URL=http://127.0.0.1:5205/`. Default corrected and legacy checks use runtime source; `--before` additionally requires the preserved local replay module. The comparison artifacts are ignored local evidence, consistent with the integration's existing convention.

Diagnostic failures remain distinct from accepted results: an initial pond fixture was inside the mountain; an early test used the raw snapshot loader instead of the full terrain Load World action; the first corrected comparison retained unrelated trees. The native input fixture initially compared loaded terrain with a snapshot taken before Pond's intentional basin edits; it now captures the expected terrain after both operations. Fixtures were corrected, all three accepted comparison runs explicitly match their scenes, and the original failure/mismatch receipts are retained. The credit-limit interruption happened before runtime shader edits. No failed fixture is counted as a pass.

The cloud emitter, fluid solver, volume shaders, Cloud Interaction and MOVE controls were not edited. Their hashes were verified against the start of this correction. The original finite global-water extent and stylized waterfall rendering remain. The comparison supplies the owner's visual review; no new Dev Tools controls or external publishing step is required.
