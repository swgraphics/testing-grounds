# CloudField 2.0 — Living Vapor integration

Implementation date: 2026-11-18. Development worktree: `testing-grounds-dev-07-08`. Branch: `feat/terrain-export-ui-v2`. Starting HEAD: `8cd1b3ead4336065ea19c708f1fe181bdbb3c949`.

## Preservation and source

The owner authorized implementation after the required read-only inspection. Before source edits, a complete-history Git bundle was created and verified at `cloudfield-2.local/checkpoint-20261118-124621/before-cloudfield.bundle`. That checkpoint also contains the original status, HEAD, SHA-256 hashes and copies of the four excluded files. No branch switch, commit, push, merge, dependency change or deployment is part of this integration.

The source is the owner's `D:\Stephen\TRANSFER\CloudField\CLOUDFIELD-2.0-LIVING-VAPOR.zip`, specifically its `cloudfield-2.0` directory. Only engine modules, tests and the required notice are transferred. Selected reference source is under ignored `cloudfield-2.local/source`; no source `node_modules`, build output, legacy engine, application shell, landscape, UI theme or sun controls were imported.

CloudField's release report explicitly did not certify execution of its React/Three.js integration. The checks below exercise the transferred modules and TG separately from that historical report.

## Source-to-target mapping

| CloudField source | TG destination / adaptation |
| --- | --- |
| `src/engine/fluidVolume.js` | `src/systems/atmosphere/livingVapor/fluidVolume.js`; real density/heat/velocity solver, projection, buoyancy, vorticity and advection; explicit retention mode |
| `src/engine/volumeShader.js` | Same namespace; original 3D ray marcher and undulating cage shaders, TG rim color and bounded texture sampling |
| `src/engine/cloudObject.js` | Same namespace; Three.js 3D texture, local transforms, materials; guide visibility, optical precision and last-instance geometry disposal |
| `src/engine/cloudMath.js` | Same namespace; source quaternion/nonuniform-scale picking and emitter-plane math |
| `src/engine/cageGeometry.js` | Same namespace; original animated cage geometry |
| `src/engine/cloudStore.js`, `src/cloud/CloudWorld.jsx` | Adapted responsibilities in `cloudState.js` and `src/components/world/LivingVaporSystem.jsx`; TG world/history/input architecture replaces the standalone store and controls |
| `src/App.jsx` | Control semantics only; native shared `CloudControls.jsx`, `CloudInteractionPanel.jsx` and existing Dev Tools |
| `src/scenes/CloudFieldScene.jsx: Lake()` | `livingVapor/waterMaterial.js` and existing `Water.jsx`; multi-wave slopes, refraction convergence, caustic filaments and sun glints |
| `tests/fluid-core.mjs`, `tests/cloud-math.mjs` | `scripts/test-cloudfield-fluid-core.mjs`, `scripts/test-cloudfield-cloud-math.mjs`; imports adapted, source assertions retained |
| `THIRD_PARTY_LICENSES/CAUSTIC-VOLUME-MIT.txt` | Same target path; bundled MIT notice retained verbatim |

The existing integration files changed are `src/App.jsx`, `src/scenes/TestingGrounds.jsx`, `src/components/world/Water.jsx`, `src/components/ui/{InputHUD,MeshMenu,AdaptiveReticle,GamepadMenuNavigator}.jsx`, `src/systems/objects/objectRegistry.js`, `src/systems/world/worldPersistence.js`, `src/systems/input/inputOwnership.js`, and `src/systems/ui/{compassState,navigationActions}.js`. New native components are `LivingVaporSystem.jsx`, `CloudControls.jsx`, `CloudInteractionPanel.jsx` and `CloudInteraction.css`. New namespace support modules are `settings.js`, `cloudState.js`, `cloudPersistence.js` and `waterMaterial.js`, alongside the five transferred engine modules. The existing `scripts/browser-demo-stability.mjs` now explicitly opens Atmosphere for its legacy-cloud slider check; the Clouds shortcut intentionally opens the new CLOUDS section.

## Architecture and coexistence

Living Vapor is an explicit additional world-object capability. The existing camera-following atmospheric `clouds/CloudField.jsx` and its settings remain in place. Neither renderer replaces the other: legacy clouds are distant procedural atmosphere; the new objects have persistent world-space transforms and their own emitted simulation fields. Both read TG's existing sun/palette authority.

Serializable records live at `world.livingVapor = { version: 1, objects: { [id]: record } }`. They are world-scoped aerial objects rather than terrain-snapped meshes or chunk-local GLBs. Chunk selection and Add Chunk do not move, remove or reanchor them. The existing world schema remains compatible through this optional versioned extension. Older worlds need no cloud field. Unsupported or oversized cloud data is rejected during normalization.

Live `CloudObject` instances, typed solver working arrays and GPU resources live in a separate runtime Map. They never enter world JSON. One React/R3F system reconciles records, advances simulations, handles picking/gestures and releases resources. One Zustand UI state and the same action handlers serve both the East CLOUDS section and contextual Cloud Interaction.

## Families and creation

All source `CLOUD_FAMILIES` coefficients are retained. Cumulus uses strong buoyancy and convective vorticity; Stratus uses low lift, vertical damping and lateral spreading; Cirrus uses strong lateral wind/streaming and different drag/swirl. These are solver differences in addition to family cage dimensions.

The South Library contains three procedural Cloud entries: STRATUS, CIRRUS and CUMULUS. Highlighting does not create an object. Place closes the interface through the existing World-first transition and uses an aerial ray position 30 metres from the camera, with no terrain snap. Placement emits an initial developed field through the actual solver; Fill starts OFF. The new object stays at that world position. Escape/B returns to the Library using the existing origin contract. Switching between ordinary mesh placement and cloud placement cancels the previous placement owner.

Owner follow-up: East Dev Tools / CLOUDS now also exposes an always-visible **NEW CLOUD TYPE** selector and **ADD CLOUD** button, including when the world has no clouds. The button uses the same aerial placement event and simulation creation path as the Library, with Emit selected for subsequent editing. Escape/B from this entry returns to Dev Tools / CLOUDS; Library-origin cancellation still returns to the Library. The button is disabled for unsupported rendering or the six-cloud limit. No cloud is created merely by choosing a type or pressing ADD CLOUD; the world click / RT confirms placement.

Follow-up implementation files: `CloudControls.jsx`, `CloudInteraction.css`, `InputHUD.jsx`, `livingVapor/{cloudPlacement,cloudState}.js`, `LivingVaporSystem.jsx` and `navigationActions.js`. Native browser checks passed empty-world availability, Escape and simulated controller B cancellation, creation of all three families, activating the selected cloud's emitter and limit feedback, with no console errors or failed requests. Evidence: `cloudfield-2.local/dev-tools-add/results.json` and `empty-clouds-add-button.png`. Focused lint and `node scripts/test-world-first-tools.mjs` / `node scripts/test-final-checkpoint.mjs` passed. Physical controller review remains pending.

Follow-up production build: `node node_modules/vite/bin/vite.js build` passed (exit 0), bundle `index-Ce0EVZxn.js`; the existing large-bundle warning remains. `node scripts/browser-cloudfield.mjs` also passed the Library placement/editing/guide/save/palette regression with evidence in `cloudfield-2.local/dev-tools-add/library-regression-accepted/results.json`. An initial run missed the title button before font layout settled; the shared browser helper now waits for `document.fonts.ready` before clicking it. This fixture timeout is retained separately from the accepted rerun.

Current-cloud selection, family, deletion and the six-object count/limit are available in both control surfaces. A visible placement message explains a reached limit. Library template Edit is disabled for cloud entries with guidance to place first; it does not open an unrelated mesh editor.

## Editing, reticle and input

`AdaptiveReticle.jsx` receives cloud target events and displays a cloud symbol. Picking uses the source cage-space ray/ellipsoid intersection, including quaternion rotation, nonuniform scale and camera-inside cases. The nearest cloud wins; foreground opaque geometry can occlude selection. Looking only updates the reticle. Clicking / controller A selects; the explicit Edit button, E or controller X opens Cloud Interaction.

The shared controls provide Emit; Gesture/Pull/Push/Pinch; Move; Rotate; Scale; New Vapor Density; Vapor Persistence; radius; Fill; Cage; family; deletion; and existing history buttons. Native `ObjectTransformProperties` supplies world position, Y rotation and uniform scale; advanced fields expose three rotation axes and nonuniform scale. Transform gestures modify the cloud frame, leaving solver density in local space.

Owner MOVE follow-up: both Dev Tools / CLOUDS and Cloud Interaction expose **MOVE**. Dragging the cloud moves its complete frame and cage in the camera's view plane, retaining the initial grab offset without terrain snapping. Controller RT + left stick moves horizontally/vertically in that plane; right-stick up/down while holding RT adjusts depth. The emitter point and live solver/texture remain intact. Release, pointer cancellation, blur and contextual dismissal finish one transform-history action. B while RT is held closes the tool without restarting a gesture. Save/Load retains the moved world position.

MOVE implementation files: `src/components/ui/CloudControls.jsx` and `src/components/world/LivingVaporSystem.jsx`; browser coverage is in `scripts/browser-cloudfield-move.mjs`, with the confirmed behavior documented here. `node scripts/browser-cloudfield-move.mjs` passed seven native-browser check groups covering both buttons, off-centre dragging without a jump, player/camera translation ownership, evolving retained vapor, native Undo/Redo, cancellation, simulated controller plane/depth movement, B dismissal with RT held, and position/vapor Save/Load. Evidence: `cloudfield-2.local/move/results.json`; console-error and failed-request arrays are empty. The test locks camera orientation only, leaving player/camera translation observable. Its initial setup timeout after returning to World View is retained in `initial-fixture-failure.json`; the corrected test intentionally reselects the cloud. Physical controller review remains pending. Focused ESLint (both components and the browser script), `node scripts/test-cloudfield-integration.mjs`, `node scripts/test-cloudfield-cloud-math.mjs` and `git diff --check` passed. Production build (`node node_modules/vite/bin/vite.js build`) passed, exit 0, bundle `index-RnKpJE5R.js`; existing plugin-timing and large-bundle warnings remain. Branch, HEAD and all four excluded-file hashes still match the preservation checkpoint.

Cloud editing uses TG's existing interaction store. Idle cloud selection/editing permits world movement when the viewport owns input. Focused controls own UI input; a live gesture owns `cloud-gesture`, clearing gameplay input so the player, camera and terrain do not consume it. Pointer-up, cancellation, blur, tool replacement and direct return-to-world finish the gesture and release capture/ownership. Viewport clicks release focused controls. Controller RT operates the selected tool; left stick moves its point or transforms it. D-pad can return focus to Cloud Interaction after using the viewport. B/Escape dismiss contextually, with slider/list adjustment finishing first.

Native browser emission tests record actual player and camera translations with an orientation-only aiming fixture; the fixture does not pin their positions. No player-controller, movement, collision or intro-camera algorithm was changed.

## Cage and Guides

The visible cage is `global Guides && record.cage`. Hiding Guides or a cloud's Cage hides the line object, removing its draw call. The simulation's containment forces continue. Restoring Guides restores eligible undulating cages. There is no additional global guide toggle.

## Persistence: 100%

For `p < 100`, the time constant is `tau = 2 * 120^(p/99)` seconds, ranging from 2 to 240 seconds. Ordinary density fade is `exp(-dt/tau)`, plus the source's finite-lifetime cleanup. Changing persistence only changes subsequent stepping; changing New Vapor Density only changes subsequent emissions.

At exactly 100%, `persistenceSeconds` returns Infinity as an explicit solver mode. Natural density fade and low-density deletion are disabled. The active interior grid remains included, and faint retained cells still receive stirring forces. The cage is closed for retained vapor: escaped numerical transport is redistributed into the interior rather than evaporated. A fixed total-mass target is established on entry and updated by actual emissions. Every subsequent step conserves that target, rather than allowing per-step floating-point errors to accumulate into an unintended lifetime. Density is clamped to [0,1] before correction; a small Float32 residual is absorbed by existing vapor cells after proportional correction. An exceptional unstable transport result rolls back density while velocity/heat continue. There is no `emit` call or Fill activation in this retention path.

Optical texture normalization protects retained vapor against byte quantization and a fixed optical cutoff if long-running transport reduces its peaks. This operates on the uploaded texture, not the stored density field or emission ceiling. No material mass is added.

The automated 120-second, no-emission/no-Fill run checks each family against a maximum relative mass error of `1e-8` (0.000001%), bounded finite density, continuing field changes, snapshot reconstruction and normal fading after reducing persistence. The test replaces `emit` with a throwing function during retention, proving that no new source is used. Measured maximum relative errors were Cumulus `9.995e-10`, Stratus `9.975e-10`, and Cirrus `9.992e-10`. All retained visible density and continued evolving. The fields were also reconstructed and rendered in TG after those 120 simulated seconds, including a camera-inside view and a full-page saved-world reload. An infinite-duration empirical guarantee is impossible; the implementation explicitly removes the natural-loss paths instead of assigning a long finite timer.

## Saved vapor and history

Snapshots store density, heat and three velocity components, simulation time/step count and reconstruction metadata. Numeric fields use 16-bit quantization and zero-run encoding in base64. An optional density scale preserves relative precision for very faint retained fields; older snapshots imply a scale of one. Snapshots have an explicit version/grid, fixed field count and strict decoded-size/run-length validation. Decoding is atomic, and empty volumes retain the idle optimization. No renderer objects, shader objects or textures are serialized. Records also preserve ID, family, seed, position, quaternion, scale, density setting, percentage persistence, radius, Fill, fill point, optical sampling scale and Cage preference.

Save obtains the current evolved fields from a registered runtime snapshot provider, so saving does not use stale creation-only vapor. Load validates first and reconstructs the source solver and GPU texture. Replacing/deleting cloud IDs disposes their resources. A three-cloud developed snapshot in browser acceptance occupied approximately 0.81 MB; the solver round-trip test requires mass within 0.1%. LocalStorage remains the existing storage backend and shares its quota with other TG world data.

Creation/deletion Undo stores bounded full cloud records, including meaningful vapor. Transform and parameter history uses property paths so undoing a transform does not rewind the evolving density field. Continuous fluid gestures checkpoint once at release and are not fluid-frame Undo operations. Cloud history is capped at 24 commands and 12 MiB; other tools' history remains intact. No per-frame Undo snapshots are created.

## Atmosphere and custom colors

Every frame the renderer reads `getAtmospherePalette()` for `sunDirection`, `sunColor`, `cloudTopColor`, `cloudBottomColor` and `cloudEdgeColor`. Direction is transformed to the cloud's local frame for attenuation/shadow rays. TG's existing AUTO/CUSTOM setting and Upper/Lower/Rim colors feed the same volumetric lighting terms. Internal attenuation, shading and depth remain active with custom colors. There is no CloudField sun state or standalone `sunLook()` authority.

## Water and license

**Superseded water implementation, 2026-11-19:** the original shader and water-only measurements below are retained as the initial Task 06 record. The [natural water correction](WATER_SURFACE_CORRECTION.md) removes the confirmed repeating caustic lattice and white overlay, retains TG's material/broad waves, and adds five filtered, warped world-space ripple components. It includes matched original/integrated/corrected browser evidence, new GPU measurements and regressions. Cloud runtime and UI hashes are unchanged by that correction.

`Water.jsx` retains its global water geometry, CPU displacement, subdivisions, wind response, height/placement, world water-body records, pond/rim meshes, terrain-derived flow geometry, waterfalls and guide wireframe. Only the base and pond surface materials receive the adapted shader. Waterfalls retain their existing material and geometry lifecycle.

The material extends TG's existing Three.js standard material. It uses world X/Z coordinates for continuous procedural sampling, multi-wave slopes for normals, analytical slope gradients for refracted-ray convergence/filaments, and view-dependent sun glints. TG supplies the time/wind/wave-strength and atmosphere uniforms. Analytical gradients avoid three full wave evaluations per pixel. Existing subdivisions select 8 waves below 64 and 12 waves at/above 64. The original 900-metre base-water extent remains unchanged; this integration does not expand the legacy water geometry.

The adapted techniques originate in CloudField's Lake shader and CAUSTIC//VOLUME Lite. Copyright (c) 2026 Scottie; the complete MIT notice is in `THIRD_PARTY_LICENSES/CAUSTIC-VOLUME-MIT.txt`.

Before/after images cover day, sunset, night, low/high wind, a pond with existing flow/waterfall geometry and G4 expanded-boundary water. The accepted comparison reconstructs the original standard surface material in the browser, keeping TG geometry and controls identical. Images were inspected: the adapted material adds animated small-scale normal/refraction detail while preserving the existing coarse waves and water layout. This is evidence for review, not a claim that compilation alone proves a visual improvement.

## Performance and cleanup

The initial limit is six 32³ volumes. Fixed solver steps remain 1/24 second. The TG scheduler uses a configurable 5 ms frame budget, a rotating start index and a bounded accumulator. One indivisible solver step can overrun that budget; pending clouds continue on following frames. When CPU work exceeds the budget, the UI reports reduced simulation rate rather than hiding the slowdown or replacing volumes with sprites.

Browser stress measurements use an AMD Radeon ANGLE / Direct3D11 renderer. The deliberately dense scene contains about 10,600 draw calls and 5.26 million triangles. Results are headless development-session observations, not a target-device performance certification. Final figures and resource counts are in `cloudfield-2.local/performance/results.json`.

| Dense scene case | Observed FPS | Solver ms / rendered frame |
| --- | ---: | ---: |
| No emitted clouds | 10.75 | 0.01 |
| One idle cloud | 11.08 | 7.05 |
| One cloud, active Emit | 10.95 | 7.20 |
| Three idle clouds | 11.16 | 6.36 |
| Six idle clouds | 10.59 | 6.74 |
| Six clouds, continuous Fill | 11.07 | 6.69 |
| Six clouds with water | 10.07 | 6.80 |

This is a poor absolute frame rate even before clouds and is explicitly not certified as smooth play. The budget keeps aggregate simulation work roughly constant as cloud count rises; each cloud's wall-clock simulation rate falls under this stress. The rotating scheduler test confirms every cloud still advances. The UI accurately reports that reduction. Lower foliage settings or further rendering optimization are needed for smooth dense-scene play on this setup.

The resource check creates/deletes clouds repeatedly and compares actual renderer texture/geometry counts after cleanup. Texture/material disposal is idempotent; shared box/cage geometry is disposed when the final instance leaves. Removed instances leave the runtime Map and scene. Hidden cages are not submitted as draw calls. Performance at dense settings and physical controller feel remain owner review items.

Four repeated creation/deletion cycles returned to exactly the same observed counts: 8 textures, 6,878 geometries and 42 shader programs. No cloud remained in the runtime Map. Earlier runs varied with scene warm-up (roughly 12–14 FPS); the table reports the final run, without selecting the fastest sample.

Water-only 2.5-second samples on the same AMD backend measured 164.88 FPS at low wind, 162.43 at high wind and 163.79 with a pond/base-water scene. The reconstructed legacy material measured 157.46, 154.64 and 164.86 FPS respectively. These short, display-rate-limited samples do not establish a throughput improvement; they show no large water-only regression in this fixture. The dense full-world stress above remains the practical limit.

## Validation and evidence

Status: implemented and locally validated for owner review. Evidence paths are ignored local artifacts, consistent with the Task 05.1 checkpoint convention. Physical Xbox and extended manual play remain pending.

| Check | Observed result / receipt |
| --- | --- |
| Production build | `node node_modules/vite/bin/vite.js build` — exit 0; final bundle `index-BpoTfprV.js`; existing large-bundle/plugin timing warnings remain |
| Five new Node suites | Fluid core, picking math, retention, codec and integration all passed; retention results in `cloudfield-2.local/retention/results.json` |
| Eleven existing Node suites | `node scripts/test-<name>.mjs` passed for `ui-navigation`, `world-first-tools`, `object-workflows`, `forest-renderer`, `crash-tester`, `terrain-export`, `demo-stability`, `task03`, `task04`, `task05`, `final-checkpoint` |
| Focused source lint | `node node_modules/eslint/bin/eslint.js src/systems/atmosphere/livingVapor src/components/world/LivingVaporSystem.jsx src/components/ui/CloudControls.jsx src/components/ui/CloudInteractionPanel.jsx` — exit 0 |
| Global source lint | `node node_modules/eslint/bin/eslint.js . --ignore-pattern '**/*.local/**' --format json --output-file cloudfield-2.local/lint-final.json` — exit 1, existing 56 errors / 25 warnings; global lint is not clean |
| Native cloud placement / controls / palette | `node scripts/browser-cloudfield.mjs` — exit 0; `cloudfield-2.local/accepted/results.json` |
| Retention rendering and full-page saved load | `node scripts/browser-cloudfield-retention.mjs` — exit 0; `cloudfield-2.local/retention/browser/results.json`; all three families render after 120 simulated seconds without emission |
| Native pointer/controller ownership, Fill/live save | `node scripts/browser-cloudfield-input.mjs` — exit 0; `cloudfield-2.local/input/results.json`; actual player/camera translation stable during gesture, cancellation released ownership |
| One/three/six clouds, Emit, Fill, water/foliage, cleanup | `node scripts/browser-cloudfield-performance.mjs` — exit 0; `cloudfield-2.local/performance/results.json` |
| Water before/after and lighting/wind/bodies/boundary | `node scripts/browser-cloudfield-water.mjs --legacy` and the same command without `--legacy` — both exit 0; `cloudfield-2.local/water/{legacy-measurements,measurements}.json` |
| Existing native browser regressions | All ten runs passed: final checkpoint (Blank), object workflows, Task 03, Task 04, Task 05 (Blank and populated), World-first tools, forest, Crash Tester, demo stability; `cloudfield-2.local/regression/results.json` retains initial receipts and `cloudfield-2.local/regression/demo-stability-final/browser/results.json` records the corrected legacy-control check |
| Final conservation integration rerun | All four runs exit 0 in `cloudfield-2.local/conservation-final/results.json`; placement, 120-second reconstruction, input/Fill/live save and resource/performance checks were repeated after the mass-invariant correction |
| Preservation | Same branch/HEAD, all four excluded hashes unchanged; no dependency/lockfile edits; `git diff --check` passed |

The final browser receipts report empty console-error and failed-request arrays. Existing browser commands were `node scripts/browser-final-checkpoint.mjs --blank`, `node scripts/browser-object-workflows.mjs`, `node scripts/browser-task03.mjs`, `node scripts/browser-task04.mjs`, `node scripts/browser-task05.mjs --blank`, `node scripts/browser-task05.mjs`, `node scripts/browser-world-first-tools.mjs`, `node scripts/browser-forest.mjs`, `node scripts/browser-crash-tester.mjs`, and `node scripts/browser-demo-stability.mjs`, with isolated `TG_*_ARTIFACT` directories under `cloudfield-2.local/regression`.

Commands introduced for this integration:

```text
node scripts/test-cloudfield-fluid-core.mjs
node scripts/test-cloudfield-cloud-math.mjs
node scripts/test-cloudfield-retention.mjs
node scripts/test-cloudfield-integration.mjs
node scripts/test-cloudfield-codec.mjs
node scripts/browser-cloudfield.mjs
node scripts/browser-cloudfield-input.mjs
node scripts/browser-cloudfield-move.mjs
node scripts/browser-cloudfield-retention.mjs
node scripts/browser-cloudfield-performance.mjs
node scripts/browser-cloudfield-water.mjs --legacy
node scripts/browser-cloudfield-water.mjs
```

Browser runs set `TG_TEST_URL` to the isolated local Vite server. Physical Xbox hardware is not simulated-controller acceptance. Source tests, production build, focused/global lint and the existing TG suites are listed in the final receipt.

Diagnostic failures remain distinct from passes: sandboxed Chrome stalled before Page.enable; stale Vite module instances caused invalid initial placement/settings observations; a legacy-material comparison fixture lacked a guard for Troika materials; a performance fixture incorrectly waited on an effect-updated Map inside a synchronous loop. The original demo-stability check assumed Clouds opened legacy Atmosphere sliders and was updated to open Atmosphere explicitly. Stricter conservation tests caught a saturated-cell Float32 residual and a missing unconditional density clamp; both were corrected without weakening the test. These failed runs are retained separately from the accepted reruns.

### Screenshots

| Evidence | Image |
| --- | --- |
| Cumulus | [Cumulus](../../cloudfield-2.local/accepted/cumulus.png) |
| Stratus | [Stratus](../../cloudfield-2.local/accepted/stratus.png) |
| Cirrus | [Cirrus](../../cloudfield-2.local/accepted/cirrus.png) |
| 90-degree rotation and nonuniform scale | [Rotated volume](../../cloudfield-2.local/accepted/rotated-90-nonuniform-scale.png) |
| Contextual panel | [Cloud Interaction](../../cloudfield-2.local/accepted/cloud-interaction.png) |
| East Dev Tools | [CLOUDS](../../cloudfield-2.local/accepted/clouds-dev-tools.png) |
| Dev Tools creation follow-up | [ADD CLOUD in an empty world](../../cloudfield-2.local/dev-tools-add/empty-clouds-add-button.png) |
| MOVE controls follow-up | [Dev Tools](../../cloudfield-2.local/move/dev-tools-move.png), [Cloud Interaction](../../cloudfield-2.local/move/context-move.png) |
| Cage eligible / hidden | [ON](../../cloudfield-2.local/accepted/cage-on.png), [OFF](../../cloudfield-2.local/accepted/cage-off.png) |
| Palette changes | [Day](../../cloudfield-2.local/accepted/cloud-day.png), [Sunset](../../cloudfield-2.local/accepted/cloud-sunset.png), [Night](../../cloudfield-2.local/accepted/cloud-night.png) |
| Custom Upper/Lower/Rim | [Custom colors](../../cloudfield-2.local/accepted/custom-colors.png) |
| Water comparison | [Before day](../../cloudfield-2.local/water/water-before-day.png), [After day](../../cloudfield-2.local/water/water-after-day.png) |
| Water sunset / night | [Sunset](../../cloudfield-2.local/water/water-after-sunset.png), [Night](../../cloudfield-2.local/water/water-after-night.png) |
| Wind and pond | [Low wind](../../cloudfield-2.local/water/wind-0.png), [High wind](../../cloudfield-2.local/water/wind-100.png), [Pond/flow](../../cloudfield-2.local/water/pond-and-waterfall.png) |
| Expanded boundary | [G4 water](../../cloudfield-2.local/water/expanded-boundary-water.png) |
| Stress scene | [Six clouds / foliage / water](../../cloudfield-2.local/performance/six-clouds-water-foliage.png) |
| Retained vapor after 120 simulated seconds | [Cumulus](../../cloudfield-2.local/retention/browser/cumulus-after-120-seconds-no-emission.png), [Stratus](../../cloudfield-2.local/retention/browser/stratus-after-120-seconds-no-emission.png), [Cirrus](../../cloudfield-2.local/retention/browser/cirrus-after-120-seconds-no-emission.png) |
| Camera inside / full-page saved load | [Inside](../../cloudfield-2.local/retention/browser/camera-inside-cloud.png), [Reloaded](../../cloudfield-2.local/retention/browser/retained-vapor-after-full-page-load.png) |

## Remaining owner checks

Physical Xbox ergonomics, controller dead zones and long sessions; manual free-look/FPV cloud/tree editing; visual preference for the adapted water; broader device performance and storage-quota behavior with large pre-existing worlds. Continuous fluid evolution is intentionally outside frame-by-frame Undo. Water's existing finite extent is preserved. No production deployment is included.
