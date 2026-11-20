# CloudField — Task 06.1: performance and editor responsiveness

## Result and scope

Sun and terrain input latency improved substantially without changing the fluid solver, simulation resolution, volumetric shader, cloud families or water shader. The largest avoidable costs were synchronous terrain-map sampling and construction of hidden Library UI. Empty cloud volumes also consumed GPU time despite containing no vapor.

This is a measured editor-latency improvement, not a claim that the populated world now sustains 60 FPS. Its approximately 7,000 draw calls and existing vegetation/terrain rendering exceed this machine's frame budget even with CloudField completely disabled. Nonempty-cloud idle FPS did not improve consistently; several Blank and populated cases are slower in the final run. See the complete table and limitations below.

## Preservation and exact revision

The owner's explicit instruction to commit all recent changes takes precedence over the attachment's default no-commit instruction for the initial checkpoint only. All pre-existing integration, Move and natural-water work was committed as `245114944a285e141413f4e19f499ce26a7df221` (`Integrate CloudField living vapor and natural water surface`). The branch remains `feat/terrain-export-ui-v2`. At measurement time, Task 06.1 changes were uncommitted. The subsequent owner instruction authorizes including this preserved work in the completed Patch 07 checkpoint before beginning Patch 08. No branch switch, dependency change, push, deployment or destructive Git operation was performed.

Git reported a background geometric-repack warning after that checkpoint; the commit itself exited successfully and its full hash and clean post-commit worktree were verified. Existing Git packs were left alone.

The before application was served from that immutable commit using a Vite loader for the changed runtime files. The loader read `git show` output and did not replace or restore files in the worktree. Both applications used the same local assets and installed dependencies. This is a post-integration checkpoint comparison: a matching pre-CloudField performance capture was unavailable, so recovery to a numerical pre-integration baseline is not asserted.

Final optimized matrix: `cloudfield-06-1.local/optimized-final-v2/results.json`, HEAD `245114944a285e141413f4e19f499ce26a7df221` plus the uncommitted source whose SHA-256 manifest digest is **`e2c6c78ae4635b63c8a52bfbc92c779bf42eda6266708a9492bd7aa512913b41`**. Every file under `src` was hashed before that run and reverified when writing this report. See [source manifest](../../cloudfield-06-1.local/source-manifest.json) and [runtime patch](../../cloudfield-06-1.local/runtime.patch). The final production bundle is `dist/assets/index-Dqu_hpNj.js` (build exited 0).

## Measurement method

- Hardware: AMD Ryzen 7 6800H with Radeon Graphics; the browser reported `ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)`. CPU name came from the Windows hardware registry. The active backend was integrated Radeon, not an assumed discrete GPU.
- Browser: actual installed Chrome, CDP-controlled headless Chrome **157.0.0.0**, WebGL2, Windows, Vite development mode. Viewport **1440 × 1000**, DPR **1**, camera `[50,32,105]` looking at `[50,2,50]`. Separate Chrome profiles; one performance browser at a time.
- Blank: tree/coverage/foliage/rock density zero and default tree population explicitly disabled. Populated: tree density 16, coverage/foliage/rock 50. Both: sun height 75, rotation 50, water height 1, wave strength 35, wind strength 25/speed 35. Complete settings match exactly in the paired JSON receipts. Blank nonempty triangle counts match. Populated final counters have one fewer draw and 12 fewer triangles (0.00092% of roughly 1.3 million); its renderer tracks 20 more geometries. These small counter differences are retained, not normalized away. Separate fresh before/final scene inventories matched exactly: 7,029 draws, 1,307,479 triangles, 4,785 geometries, eight textures, and identical rendered geometry/material histograms. The original matrix's extra draw/cached geometry state was not isolated; see `inventory-comparison.json`. Empty-volume cases additionally remove the intended 72 triangles/six volume draws.
- Each configuration measures warmed idle evolution, five native Sun Height range-input changes, then a native Height-tool pointer gesture. The baseline contains the same three cloud families, saved seeded fields, transforms, density, persistence and layout. Disabled layers retain their world records. No diagnostic switches were added to the product UI.
- Frame times use animation-frame intervals; FPS is frames divided by their total interval. Median, p95, worst frame, long tasks, CDP ScriptDuration/TaskDuration, draw calls, triangles, geometry/texture counts and React root commits are retained for **every phase in all 42 configurations**.
- GPU measurements use asynchronous `EXT_disjoint_timer_query_webgl2` queries around rendering, read only after availability and rejected when disjoint. They measure the whole rendered scene. WebGL upload-call duration is CPU submission time, not isolated GPU transfer completion. The performance matrix uses no synchronous pixel readbacks.
- Published input latency is **settings notification to the render submission containing the changed light direction or terrain geometry**. Native input is delivered through CDP; this is a useful application latency proxy, not an input-to-photon/presentation measurement. The profiler also retains DOM-event latency. Fast event bursts can coalesce into one submitted frame, especially in the slow populated scene.
- Separate held-pointer acceptance observes the actual terrain mesh's `onAfterRender`: its height must change before pointer release. This avoids mistaking an eventual save or a release-only update for a live sculpt preview.

Reproducible driver: `node scripts/browser-cloudfield-profile.mjs`, with `TG_TEST_URL` selecting the application and `TG_PROFILE_STAGE` selecting its evidence directory. `TG_PROFILE_QUICK=1` runs zero-disabled, zero-full, one-full and six-full in both worlds. Test-only instrumentation is in `scripts/cloudfield-profile-browser.js`.

## Complete A/B results

Numbers are **before / after**. FPS, p95 and GPU are from idle evolution. Sun/sculpt columns are median settings-to-submitted-frame latency in milliseconds. All ordinary full cases use 100% persistence; `6-persistence-90` is the explicit alternative. Renderer-only pauses stepping; simulation-only hides the cloud root. Ordinary cases retain the existing legacy atmosphere layer and water; the two explicit “off” cases isolate those layers. Legacy cloud coverage itself follows each world's recorded settings.

| World | Case | FPS | Frame p95 ms | GPU ms | Sun median ms | Sculpt median ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| blank | zero-disabled | 165.0 / 157.9 | 6.2 / 6.4 | 3.6 / 3.7 | 152.6 / 50.3 | 511.2 / 108.2 |
| blank | zero-full | 164.3 / 150.6 | 6.2 / 12.1 | 3.6 / 3.8 | 146.3 / 48.4 | 491.6 / 119.3 |
| blank | 1-disabled | 161.4 / 154.9 | 6.3 / 12.0 | 3.7 / 3.8 | 135.9 / 50.3 | 488.6 / 123.5 |
| blank | 1-renderer-only | 160.0 / 144.7 | 6.2 / 12.2 | 5.1 / 4.9 | 119.8 / 48.8 | 447.3 / 124.3 |
| blank | 1-simulation-only | 144.0 / 139.5 | 12.1 / 12.2 | 4.0 / 3.9 | 161.6 / 55.4 | 481.6 / 129.2 |
| blank | 1-full | 133.9 / 130.3 | 12.2 / 12.2 | 6.3 / 4.8 | 137.5 / 54.8 | 447.0 / 120.0 |
| blank | 3-disabled | 165.0 / 165.0 | 6.2 / 6.3 | 3.6 / 3.6 | 135.6 / 43.3 | 517.5 / 104.4 |
| blank | 3-renderer-only | 117.7 / 114.8 | 12.2 / 12.3 | 7.6 / 7.4 | 129.4 / 47.8 | 474.0 / 114.3 |
| blank | 3-simulation-only | 107.1 / 95.4 | 12.2 / 18.2 | 4.5 / 4.6 | 157.4 / 64.0 | 479.3 / 117.7 |
| blank | 3-full | 97.7 / 80.7 | 18.2 / 18.2 | 6.9 / 7.4 | 159.4 / 68.8 | 472.2 / 111.7 |
| blank | 6-disabled | 165.0 / 165.0 | 6.2 / 6.2 | 3.6 / 3.6 | 119.5 / 44.0 | 477.5 / 115.9 |
| blank | 6-renderer-only | 87.6 / 86.1 | 12.3 / 18.1 | 10.5 / 10.1 | 152.8 / 46.1 | 489.7 / 105.5 |
| blank | 6-simulation-only | 86.5 / 78.5 | 18.2 / 18.3 | 4.8 / 4.9 | 133.5 / 62.0 | 447.4 / 112.4 |
| blank | 6-full | 84.3 / 78.9 | 18.2 / 18.2 | 9.3 / 9.1 | 156.6 / 64.7 | 507.0 / 114.5 |
| blank | 1-emitting | 139.8 / 152.8 | 12.1 / 12.1 | 4.7 / 4.6 | 146.6 / 59.3 | 490.3 / 113.7 |
| blank | 6-fill | 81.1 / 72.5 | 18.2 / 18.3 | 9.2 / 9.2 | 144.5 / 69.7 | 497.2 / 118.7 |
| blank | 6-cage-off | 85.4 / 69.3 | 18.2 / 24.4 | 9.3 / 9.7 | 164.7 / 69.8 | 450.5 / 118.9 |
| blank | 6-persistence-90 | 89.7 / 84.7 | 18.2 / 18.2 | 9.5 / 9.7 | 158.5 / 64.0 | 473.6 / 109.0 |
| blank | 3-legacy-off | 101.6 / 95.4 | 12.2 / 18.2 | 6.5 / 6.7 | 134.3 / 59.5 | 436.3 / 105.9 |
| blank | 3-water-off | 106.9 / 108.3 | 12.2 / 18.1 | 5.4 / 5.6 | 153.4 / 56.9 | 492.9 / 106.5 |
| blank | 6-empty | 83.9 / 162.1 | 12.3 / 6.2 | 11.0 / 3.7 | 144.2 / 37.9 | 452.7 / 102.9 |
| populated | zero-disabled | 20.8 / 21.3 | 54.7 / 54.6 | 27.9 / 31.4 | 316.9 / 182.4 | 719.5 / 187.8 |
| populated | zero-full | 21.8 / 20.9 | 54.6 / 54.6 | 30.8 / 32.3 | 310.4 / 178.0 | 677.9 / 177.1 |
| populated | 1-disabled | 21.4 / 21.2 | 60.6 / 54.5 | 31.7 / 31.8 | 313.6 / 170.3 | 691.3 / 178.6 |
| populated | 1-renderer-only | 22.1 / 21.4 | 48.6 / 54.4 | 31.9 / 33.0 | 334.5 / 170.9 | 680.8 / 194.5 |
| populated | 1-simulation-only | 19.0 / 18.3 | 60.6 / 60.7 | 30.7 / 32.4 | 339.7 / 193.4 | 709.5 / 371.6 |
| populated | 1-full | 19.2 / 17.5 | 60.6 / 66.8 | 32.1 / 35.2 | 342.2 / 190.8 | 686.9 / 192.0 |
| populated | 3-disabled | 22.5 / 21.5 | 48.6 / 54.6 | 30.2 / 31.8 | 307.3 / 169.2 | 689.0 / 181.6 |
| populated | 3-renderer-only | 21.1 / 21.5 | 54.6 / 48.6 | 35.7 / 35.3 | 310.4 / 170.6 | 730.7 / 177.0 |
| populated | 3-simulation-only | 19.5 / 18.8 | 54.6 / 60.7 | 30.2 / 31.1 | 364.7 / 188.0 | 704.4 / 187.2 |
| populated | 3-full | 19.5 / 18.5 | 60.7 / 60.6 | 33.7 / 35.5 | 342.8 / 190.1 | 695.1 / 195.4 |
| populated | 6-disabled | 20.5 / 21.6 | 54.6 / 54.5 | 32.8 / 32.1 | 323.7 / 171.1 | 663.4 / 175.4 |
| populated | 6-renderer-only | 21.3 / 21.5 | 54.6 / 54.5 | 37.3 / 37.4 | 317.9 / 171.8 | 671.4 / 181.3 |
| populated | 6-simulation-only | 19.4 / 18.7 | 54.6 / 60.6 | 30.2 / 31.8 | 327.2 / 188.7 | 721.8 / 328.2 |
| populated | 6-full | 19.3 / 17.4 | 54.6 / 66.7 | 35.6 / 39.7 | 347.4 / 189.8 | 738.4 / 186.7 |
| populated | 1-emitting | 18.3 / 19.1 | 60.6 / 60.5 | 33.4 / 33.6 | 346.6 / 189.8 | 742.2 / 201.5 |
| populated | 6-fill | 18.7 / 18.8 | 60.6 / 60.6 | 36.7 / 36.7 | 342.3 / 205.2 | 752.2 / 209.1 |
| populated | 6-cage-off | 18.1 / 18.7 | 60.6 / 60.6 | 37.1 / 37.0 | 600.6 / 190.9 | 682.7 / 334.4 |
| populated | 6-persistence-90 | 19.6 / 18.5 | 54.6 / 60.6 | 35.9 / 38.3 | 343.6 / 190.2 | 680.4 / 347.1 |
| populated | 3-legacy-off | 19.2 / 18.7 | 60.6 / 60.7 | 33.9 / 35.3 | 334.2 / 186.9 | 707.1 / 338.0 |
| populated | 3-water-off | 19.0 / 19.2 | 60.7 / 60.5 | 33.4 / 33.6 | 325.1 / 187.8 | 735.6 / 184.7 |
| populated | 6-empty | 20.4 / 21.8 | 54.6 / 54.5 | 39.1 / 31.4 | 588.8 / 171.8 | 687.2 / 172.7 |

The first substantial editor-latency problem is already present in **zero-disabled**, before any living cloud exists. Additional cloud rendering/simulation reduces Blank idle throughput, but does not explain the original several-hundred-millisecond editor stalls. Six empty clouds were a separate verified GPU waste: skipping their volume draws recovers roughly the zero-cloud GPU cost while preserving their records, cages and selection.

### Frame spikes, CPU and resources

| World / case | Idle median ms | Idle worst ms | Sun p95 / worst ms (before → after) | Sculpt p95 / worst ms (before → after) |
| --- | ---: | ---: | ---: | ---: |
| blank / zero-disabled | 6.1 / 6.1 | 6.3 / 12.3 | 36.4 / 115.1 → 18.1 / 24.2 | 139.4 / 242.4 → 97.0 / 109.2 |
| blank / 6-full | 12.1 / 12.1 | 18.3 / 24.3 | 109.1 / 115.2 → 30.3 / 30.4 | 242.3 / 248.6 → 97.0 / 115.2 |
| populated / zero-disabled | 48.4 / 42.5 | 60.6 / 54.7 | 236.4 / 236.4 → 72.7 / 72.7 | 339.4 / 339.4 → 133.5 / 133.5 |
| populated / 6-full | 54.4 / 60.5 | 54.7 / 66.7 | 242.5 / 242.5 → 72.7 / 72.7 | 345.4 / 345.4 → 133.3 / 133.3 |

| World / case | Sun JS ms | Sculpt JS ms | Sun long tasks | Sculpt long tasks | React root commits sun / sculpt (before → after) |
| --- | ---: | ---: | ---: | ---: | ---: |
| blank / zero-disabled | 1157.3 / 629.2 | 1234.5 / 811.1 | 5 / 0 | 7 / 4 | 24 / 14 → 23 / 21 |
| blank / 6-full | 1317.6 / 943.8 | 1217.6 / 865.5 | 5 / 0 | 7 / 4 | 22 / 13 → 22 / 21 |
| populated / zero-disabled | 1736.2 / 1216.3 | 1687.2 / 1088.3 | 13 / 5 | 7 / 8 | 18 / 14 → 18 / 14 |
| populated / 6-full | 1869.8 / 1237.6 | 1744.6 / 1254.8 | 19 / 10 | 12 / 16 | 18 / 14 → 19 / 17 |

| World / case | Draw calls | Triangles | Geometries | Textures |
| --- | ---: | ---: | ---: | ---: |
| blank / zero-disabled | 64 / 64 | 50384 / 50384 | 57 / 57 | 4 / 4 |
| blank / 6-full | 76 / 76 | 50456 / 50456 | 59 / 59 | 10 / 10 |
| populated / zero-disabled | 7030 / 7029 | 1307491 / 1307479 | 4785 / 4805 | 8 / 8 |
| populated / 6-full | 7042 / 7041 | 1307563 / 1307551 | 4787 / 4807 | 14 / 14 |

CDP CPU values are cumulative JavaScript milliseconds over each complete interaction phase, whose elapsed duration differs as input handling gets faster. They are not CPU percentages or isolated solver time. React root commit counts remain broadly similar; the improvement comes from less work per notification. The initial component flag walker is only diagnostic evidence, not a reliable per-component rerender counter. Sampling profiles show the hidden Library JSX cost and the map's terrain/vertex sampling; after correction these no longer dominate sun changes.

## Verified causes and changes

| Files | Verified behavior and correction |
| --- | --- |
| `src/components/ui/WorldMap.jsx` | The mounted hidden overview resampled 300 × 300 heights and rebuilt contours on every world-object change, including sun changes. Cache invalidation now follows terrain shape/edit/preview/vertex versions, surface revision and numeric bounds. Hidden maps do no raster work. A visible overview coalesces terrain updates for 200 ms; the actual terrain preview remains immediate. Both visible-map Sun Height and Sun Rotation acceptance runs record zero map rasters. |
| `src/components/ui/MeshMenu.jsx` | Hidden Library construction created all object-card JSX on unrelated world updates. Keep the portal container, canonical toolbar actions and component state mounted; suspend the heavy gallery, animation and population contents while South is hidden. Restore browsing position on remount. Collapse/reopen, selection, placement Back, controller focus and the legacy hidden Place-button shortcut remain intact. |
| `src/components/world/GridTerrain.jsx`, new `src/systems/terrain/terrainRenderState.js` | Grid guides redundantly called the expensive terrain sampler for coordinates already sampled by the mesh. Reuse the exact regular-grid mesh Y samples. Base mesh/collider resolution and live rebuild timing remain unchanged. Filter settings notifications to height-affecting keys. |
| `src/components/world/GridFloor.jsx` | Removed never-rendered flat-line JSX generation. Memoized labels with a terrain-height invalidation key and stable string children, so unrelated changes do not resample all label heights. |
| `src/components/world/Landscape.jsx` | A fresh fallback `{}` invalidated a memo on unrelated notifications. Reuse a frozen empty overrides object. Actual terrain changes still update grounding/scatter. |
| `src/components/world/Water.jsx` | Height-independent settings no longer trigger terrain/water React reconstruction. Wave, wind, palette and lighting continue through the existing frame uniforms. Height/body/subdivision changes retain their update paths. Water material and wave equations are untouched. |
| `src/components/world/CrimsonTreeInteractionSystem.jsx`, `src/components/world/LivingVaporSystem.jsx` | Skip reticle candidate raycasts while UI owns input. A populated world no longer performs irrelevant scene picking while adjusting a panel slider. World interaction and gestures retain their existing ownership paths. |
| `LivingVaporSystem.jsx`, `src/systems/atmosphere/livingVapor/cloudObject.js` | Record-only changes no longer mark unchanged density dirty. Use existing density versioning. Skip volume rendering for a truly empty simulator and enable conservative frustum culling on the exact containing box. Cage/picking and simulation state remain available; emission resumes volume rendering. |
| `scripts/cloudfield-browser-helpers.mjs` | Optional evidence-directory override isolates these receipts. Explicitly wait for the cloud system to mount/update before tests read runtime statistics. |
| New profiling scripts and `scripts/test-cloudfield-editor-performance.mjs` | Repeatable A/B measurements and meaningful checks for invalidation, every base/extension mesh sample and empty-volume/upload/resource behavior. |

### Sun update path

Native control → `updateTerrainSetting` → store/event notifications → existing Atmosphere Palette → existing directional light and per-frame cloud uniforms → render. The palette is sampled each frame; small palette allocations exist but profiles did not identify them as the principal stall. Sun changes do not reset cloud IDs, step counts, texture UUIDs, geometry UUIDs or material UUIDs in the before/after identity checks. No shader or simulation recreation fix was needed.

### Terrain update path

Native Height pointer motion → existing edit/preview state → terrain key → mesh heights/normals → existing trimesh collider and grounding/scatter → frame. Map contours are a secondary overview and can wait; collider correctness, seam updates, world history/save and visible geometry retain their existing paths. Sampling profiles also show remaining Rapier collider work. This task does not defer collision until release or replace the terrain geometry architecture.

Final native held-pointer acceptance, with West map and East controls visible, observed three submitted terrain changes before release in each world: blank **148.1, 154.8, 151.1 ms**; populated **231.5, 183.8, 176.3 ms**. Every cloud advanced its step counter during the interaction and retained its texture/material/geometry identities. The sun tests made six native Sun Height/Rotation changes per world and triggered zero map rasters.

## CPU fluid findings

The integration already uses **32³ cells, fixed 24 Hz time steps, fair round-robin scheduling and a 5 ms frame budget**, rather than the original package's 11 ms budget. A single indivisible step can exceed that budget; the scheduler cannot interrupt a solver kernel. It avoids unbounded catch-up work. At six clouds on this hardware the per-cloud achieved rate is below 24 steps per wall-clock second, especially in the populated scene. Continuous evolution is retained, not falsely certified as real-time 24 Hz under overload.

| Operation | Mean ms before / after | Max ms before / after |
| --- | ---: | ---: |
| step | 6.7 / 7.3 | 8.5 / 9.4 |
| _forces | 1.7 / 1.8 | 2.2 / 2.2 |
| _vorticity | 0.6 / 0.6 | 1.0 / 0.8 |
| _project | 1.7 / 1.9 | 2.0 / 2.2 |
| _advect | 2.6 / 2.8 | 3.5 / 3.4 |
| _advectField | 0.3 / 0.4 | 0.5 / 0.5 |
| _maccormackFinish | 0.8 / 0.9 | 1.1 / 1.2 |
| _finish | 0.2 / 0.2 | 0.4 / 0.3 |
| _retainMass | 0.4 / 0.5 | 1.3 / 1.4 |
| mass | 0.0 / 0.0 | 0.1 / 0.2 |

Timings are inclusive: vorticity is inside forces; field advection and MacCormack finish are inside advection. Do not sum nested rows twice. The solver is meaningful background CPU work, but zero-cloud stalls, traces and targeted editor improvements identify a larger avoidable input-path cause. No worker, solver-budget reduction, reduced pressure iterations, lower resolution or simulation freeze was introduced.

Emission is local to its affected cells. Gesture/Emit correctness and mass retention are covered by the native input suites. Density serialization was separately sampled in the running application: encoding three developed clouds took **21.9–27.1 ms**, approximately **23.3 ms median**, producing **820,417 JSON bytes**. It happens on cloud checkpoints/save, not on every sun/terrain notification. This is a remaining save-time cost, not evidence for serializing density during editor input.

## GPU, visibility and uploads

The shader remains byte-for-byte unchanged: at most **76 primary steps**, with bounds/opacity early exit, density threshold branches, **five sun + three sky density samples** for a lit contributing sample, transparent alpha blending and no depth writes. Overlapping volumes repeat ray marching on their covered pixels; there is no new global resolution reduction, billboard replacement, lower-cost lighting or cloud-specific render target.

Frozen one-cloud diagnostic shader instrumentation, outside timed performance runs, measured primary loop iterations in the same viewport, with camera `[50,18,80]` looking at the cloud at `[50,18,50]`. It writes a quantized step-count mask to a screenshot; reported coverage is volume-ray coverage, including rays that end with insignificant opacity, not just visible vapor pixels. This establishes typical cost for this view, not a universal worst case.

| Family | Covered pixels | Viewport coverage | Mean primary steps | Maximum observed steps |
| --- | ---: | ---: | ---: | ---: |
| Cumulus | 283,973 | 19.72% | 22.08 | 36.06 |
| Stratus | 225,163 | 15.64% | 20.18 | 36.06 |
| Cirrus | 223,176 | 15.50% | 23.08 | 36.06 |

The conservative containing box supplies frustum bounds under rotation/nonuniform scale and while the camera is inside. Offscreen volumes can now skip draw submission. Ordinary opaque depth testing still applies; there is no new occlusion-query/depth-texture integration or claim that every obscured ray is skipped before the fragment shader. Hidden cages are excluded by their existing visibility flag. No approximate empty-cell acceleration was added; only a simulator known to be completely empty skips its volume.

Native draw-submission acceptance: onscreen 26 volume submissions, fully offscreen **0**, prior uncullable policy 32, camera-inside 14. Counts cover separate 300 ms windows and validate culling behavior, not comparative FPS. Local receipt: `visibility-acceptance/results.json`. Browser kernel micro-samples (200 calls each, radius 0.3, fixed 1/24-second step) averaged emit 0.146 ms, pull 0.134 ms, push 0.392 ms, pinch 0.033 ms. These isolate kernels; native gesture acceptance is recorded separately. The production scheduler's one-cloud sample, with the camera inside after the kernel exercise, spent 3.99 ms of simulation/orchestration per rendered frame (49 steps / 91 frames).

Each changed 32³ R8 density texture uploads **32,768 bytes**. The final six-full Blank idle phase recorded **110 uploads, 3,604,480 bytes, at most 1 changed texture per render**. Density packing averaged 0.036 ms and peak scanning 0.025 ms per changed field; the WebGL upload API averaged 0.020 ms. `syncTexture` averaged 0.011 ms across changed and unchanged calls. These small CPU calls do not isolate asynchronous GPU transfer completion; the full GPU timers include that work.

Zero clouds perform **zero solver steps and zero density uploads**. Paused renderer-only cases stop uploading after warm-up. Empty clouds perform cheap empty checks without forces/projection/advection or density uploads. A paused cloud's transform change submitted **zero uploads**. Texture/material resources are reused. Upload throttling or extra texture copies were not justified by the evidence.

## Visual acceptance and local evidence

Nine frozen-field pairs compare the prior visibility/culling policy with the corrected policy using the same shader and field. All nine had **zero mean RGB difference** in the central comparison crop. These are visibility-policy comparisons, not independent before/after fluid evolutions; the full live-world performance screenshots are separate. Visual inspection confirmed volumetric lobes, irregular edges, internal shading, rotation/nonuniform scale and camera-inside rendering.

| Case | Before | After |
| --- | --- | --- |
| Cumulus | [before](../../cloudfield-06-1.local/visuals/cumulus-day-before.png) | [after](../../cloudfield-06-1.local/visuals/cumulus-day-after.png) |
| Stratus | [before](../../cloudfield-06-1.local/visuals/stratus-day-before.png) | [after](../../cloudfield-06-1.local/visuals/stratus-day-after.png) |
| Cirrus | [before](../../cloudfield-06-1.local/visuals/cirrus-day-before.png) | [after](../../cloudfield-06-1.local/visuals/cirrus-day-after.png) |
| Rotation 90° / nonuniform scale | [before](../../cloudfield-06-1.local/visuals/rotated-90-nonuniform-before.png) | [after](../../cloudfield-06-1.local/visuals/rotated-90-nonuniform-after.png) |
| Sunrise | [before](../../cloudfield-06-1.local/visuals/sunrise-before.png) | [after](../../cloudfield-06-1.local/visuals/sunrise-after.png) |
| Sunset | [before](../../cloudfield-06-1.local/visuals/sunset-before.png) | [after](../../cloudfield-06-1.local/visuals/sunset-after.png) |
| Night | [before](../../cloudfield-06-1.local/visuals/night-before.png) | [after](../../cloudfield-06-1.local/visuals/night-after.png) |
| Camera inside | [before](../../cloudfield-06-1.local/visuals/camera-inside-before.png) | [after](../../cloudfield-06-1.local/visuals/camera-inside-after.png) |
| Custom colors | [before](../../cloudfield-06-1.local/visuals/custom-colors-before.png) | [after](../../cloudfield-06-1.local/visuals/custom-colors-after.png) |

Raw data, sampling profiles, screenshots, commands and test logs are local ignored artifacts under `cloudfield-06-1.local/`; they are not bundled into the application. Main sources: `baseline-final/results.json`, the final optimized receipt listed above, `comparison-final.json`, `visuals/results.json`, `editor-acceptance/results.json` and `regression/`. Earlier diagnostic runs are retained separately.

## Checks and limitations

| Check | Observed result / receipt |
| --- | --- |
| Production build | `npm.cmd run build` — exit 0; final run 1m 23s. Existing large-chunk warning; no build error. `regression-build-final.log`. |
| 17 Node suites | All exited 0: `node scripts/test-cloudfield-fluid-core.mjs`, `node scripts/test-cloudfield-cloud-math.mjs`, `node scripts/test-cloudfield-codec.mjs`, `node scripts/test-cloudfield-integration.mjs`, `node scripts/test-cloudfield-editor-performance.mjs`, `node scripts/test-cloudfield-retention.mjs`, `node scripts/test-ui-navigation.mjs`, `node scripts/test-world-first-tools.mjs`, `node scripts/test-object-workflows.mjs`, `node scripts/test-forest-renderer.mjs`, `node scripts/test-crash-tester.mjs`, `node scripts/test-terrain-export.mjs`, `node scripts/test-demo-stability.mjs`, `node scripts/test-task03.mjs`, `node scripts/test-task04.mjs`, `node scripts/test-task05.mjs`, `node scripts/test-final-checkpoint.mjs`. `regression/node-results.json` and individual logs. |
| Cloud/browser suites | Creation/families/palette/Save-Load, native Emit/Pull/Push/Pinch/Rotate/Scale, Move, 120-second retention reconstruction, resource cleanup/performance, and corrected water surface all passed. The performance suite's initial mount race was rerun successfully at `regression/retry-cloud/performance/results.json`. |
| Existing native browser regressions | World-first tools (accepted retry), objects, forest, Task 03, Task 04, Task 05 Blank and populated, final checkpoint Blank, demo stability, Crash Tester all exited 0. Exact commands are below. Logs and original/retry receipts are under `regression/`. |
| Final panel/visibility/live preview | Gallery close/open restores scroll 600 → 600; stable panel shell; onscreen/offscreen/inside checks and native held sculpt in both worlds passed. `gallery-acceptance/`, `visibility-acceptance/`, `editor-acceptance/`. |
| Paired matrices | Before and final after each completed 42 cases, empty browser console-error and failed-request arrays. Settings match exactly. Blank nonempty triangle counts match; the populated counter difference is documented in the measurement method. |
| Visual comparisons | All nine pairs passed with zero central-crop RGB difference. `visuals/results.json`. |
| Lint | New JS files passed focused ESLint; new MJS files passed `node --check`. Full source lint exited 1 with **56 existing errors / 22 warnings**, versus 56 / 25 in the prior source receipt. No new source error category. Broad `eslint .` also traverses ignored local generated bundles; `lint-final.json` retains that noisy failure separately. |
| Preservation | `git diff --check` passed. Solver, cloud shader, water material, character/player/camera code and dependency/lock files are unchanged from the checkpoint. Task 06.1 remains uncommitted; no push/deploy. |

The 16 browser regression commands were run against `TG_TEST_URL=http://127.0.0.1:5207/`, with isolated artifact directories:

```text
node scripts/browser-cloudfield.mjs
node scripts/browser-cloudfield-input.mjs
node scripts/browser-cloudfield-move.mjs
node scripts/browser-cloudfield-retention.mjs
node scripts/browser-cloudfield-performance.mjs
node scripts/browser-water-surface.mjs
node scripts/browser-world-first-tools.mjs
node scripts/browser-object-workflows.mjs
node scripts/browser-forest.mjs
node scripts/browser-task03.mjs
node scripts/browser-task04.mjs
node scripts/browser-task05.mjs --blank
node scripts/browser-task05.mjs
node scripts/browser-final-checkpoint.mjs --blank
node scripts/browser-demo-stability.mjs
node scripts/browser-crash-tester.mjs
```

Each accepted browser report has empty error and failed-request arrays; physical-controller acceptance remains pending. Original main-run failures remain in `regression/results.json`, with accepted corrections in `regression/followup-results.json` and `regression/final-ui-results.json`. The latter records the successful Task 04 rerun at `regression/task04-retry/stage-final.json`, after preserving its hidden Library Place-button contract. The 17 Node exits are retained separately because the independent runners initially shared an aggregate output path; individual logs and observed exit codes were preserved.

The dense cleanup fixture returned to exactly **eight textures, 6,644 geometries and 38 programs** after deleting six clouds and four more create/delete cycles; no growth remained in those resource counters. Its higher tree/foliage settings differ from the representative performance matrix and its FPS is not substituted into that table.

Diagnostic failures are not counted as passes: an initial profiler hook lacked the renderer Map required by Fast Refresh; an initial selector found a slider row rather than its input; Git ownership metadata retrieval failed after an otherwise completed matrix; an early graphics fixture included trees in Blank and was rejected using triangle counts. A regression fixture also read cloud statistics before mount; the helper now waits explicitly. The native panel suite caught removal of the Library portal container, and the Task 04 shortcut suite caught its dependency on the hidden Place button. Both contracts were preserved by retaining the container and toolbar while suspending heavy contents. Accepted reruns are recorded separately. Original failed receipts remain available.

There is no all-scene 60 FPS certification. The populated no-cloud baseline already requires about 28–33 ms GPU time plus substantial scene submission work. Six full volumes add GPU cost; later idle cases sometimes have worse FPS/p95. These runs were not thermally controlled, and clock/load effects were not isolated. This change does not claim statistically significant idle FPS improvement for nonempty clouds, removal of all sculpt long tasks, a sub-16.7-ms editor budget, or exact restoration of unavailable pre-integration metrics. Input-to-submitted-frame latency remains materially above one frame in dense scenes.

If broader devices need a tradeoff, a future **explicit opt-in Cloud Quality** control could offer Original/High (the unchanged current default), Balanced (reduced secondary lighting or cloud-only render resolution) and Performance (a documented lower cloud-only resolution/step budget). Each would require separate fluid/visual/interaction and GPU measurements, especially cloud edges, sunrise/night and camera-inside views. No such fidelity reduction is silently applied here. The populated scene also needs a separate measured draw-call/vegetation submission investigation; lowering cloud quality alone cannot repair its no-cloud baseline.

Physical Xbox hardware, long interactive desktop sessions, other GPUs and large-world storage limits remain owner acceptance checks. Simulated controller tests and headless browser checks do not certify those environments.
