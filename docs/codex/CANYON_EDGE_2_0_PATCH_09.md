# Canyon Edge 2.0 and procedural geology editing — Patch 09

## Delivery and recent work

Branch: `feat/terrain-export-ui-v2`. Starting commit: `b0d7660d674168169e6641c290dd963e8581b9bb`. The owner's latest instruction explicitly requests review, completion, a recent-changes report and a commit. This delivery includes the preserved, previously uncommitted Patch 08 restoration and the completed Patch 09 changes. No branch switch, dependency change, push, merge, deployment, backup modification or destructive Git operation is included.

Recent task review:

| Work | Confirmed progress |
| --- | --- |
| CloudField integration, Add Cloud/Activate Emitter, Cloud Move and natural water | Previously implemented and committed in `2451149`. See `CLOUDFIELD_2_0_TG_INTEGRATION.md` and `WATER_SURFACE_CORRECTION.md`. Runtime source remains unchanged in this delivery. |
| Task 06.1 performance | Completed and included in `b0d7660`; measured editor latency improvements and remaining populated-world FPS limitations are documented in `CLOUDFIELD_TG_PERFORMANCE_06_1.md`. |
| Patch 07 editable geology | Completed and committed in `b0d7660` before Patch 08. Feature ownership, bounded contributions, real dimensions and two-bank canyon construction supply Patch 09's foundations. |
| Patch 08 terrain tools | Completed and validated before beginning Patch 09; retained in this commit. EAST/NORTH share the existing 11 tools, Pond Diameter, canonical state and safe input/history. See `TERRAIN_TOOLS_PATCH_08.md`. |
| Patch 09 | Extends the established generator, feature records and single Canyon Edge controller with local deformation, stronger detection, contextual settings, placement measurements and controller corrections. Validation details follow. |

An entry SHA-256 manifest captured the entire pending Patch 08 tree before Patch 09. Changes to shared Patch 08 files are limited to the contextual Canyon controls, Escape cancellation, test fixtures and an acceptance selector that now distinguishes tool buttons from operation buttons. The four historically protected files, PlayerController/FollowCamera/intro implementation, CloudField solver/shaders, water runtime and world persistence implementation remain unchanged. Local evidence: `geology-patch09.local/entry-manifest.json` and `preservation-final.json`.

## Inspection and checkpoint reuse: 09A–09C

Read `AGENTS.md`, the four durable project-context documents, the latest UI checkpoint, Patch 07/08 reports and the attached Patch 09 request. Current source, rather than the attachment's description of the old stamp system, determined the implementation.

Patch 07 already replaced direct geology-to-sculpt writes with owned feature contributions, authored dimensions, deterministic distinct forms, real Edit Object previews and two opposing canyon banks. Rebuilding those foundations would create competing ownership and preview systems. Existing Patch 07 spatial tests and native editor/canyon acceptance were run before extending them. Patch 08's TOOLS interface was reused.

Remaining confirmed gaps were: no local Deform Edge operation; an ordinary-wall detector that accepted too many steep surfaces; Canyon settings outside EAST; defaults that did not clearly represent selected-bank drafts; no corridor/dimension placement annotation; and incomplete controller selection/adjustment ownership. A complete canonical definition also needed to remove optional properties on replacement, rather than retaining obsolete overrides from an earlier edit.

## Generator, schema and real dimensions

Committed height remains:

`procedural terrain + independent sculpt + vertex edits + sum of geology feature fields`.

`world.geology` version 1 owns each record once. Records retain ID, name, type, owner chunk, position, definition and a frozen procedural foundation. Definitions contain version, height, width, length/depth, floor width, stable seed, deformation, real scale, rotation in degrees, and independent bank offsets/extensions. Generated fields and meshes are disposable caches.

Patch 09 adds compatible optional bank properties: `height`, `width`, `edgeDeformation`, `seed`, and bounded `deformations`. Each deformation stores a local longitudinal center, length, signed amount and seed. Maximum 64 windows per bank; malformed/nonfinite records and excessive field footprints are rejected before canonical mutation. Absence of these optional fields retains earlier generation behavior. World schema 8 and geology version 1 remain sufficient; no second migration or inferred legacy records were introduced.

Giant Rock uses an irregular broad mass; Cliff Face uses a broad steep face with shallow depth and varied rim; Canyon Wall uses longitudinal opposing shoulders with inward cliffs and a lower corridor. Seeded multiscale spatial noise creates stable asymmetric variation. There is no render-time random regeneration.

All six existing Edit Object controls author the actual feature definition: Height, Width, Edge Randomizer, Edge Deformation, Scale and Rotation. Length/depth and Canyon Floor Width remain real additional dimensions. Scale multiplies horizontal dimensions and vertical contribution; rotation transforms the field in world space. Preview Zoom changes only camera framing. Library previews, placement ghosts, committed terrain, collision and export use the same definitions/field generator. The native acceptance authors Scale 2 for Giant Rock and compares preview and committed definitions; spatial tests also measure doubled height and footprint.

## Canyon construction and persistent editing

Canyon placement produces two raised banks, comparatively flat shoulders, steep irregular inner faces and blended outer transitions. The original lower corridor stays near its original elevation. Each bank has independent offsets and endpoint extensions. This is a single bounded feature operation, without repeated brush passes or a duplicate decorative mesh.

New formations retain a small frozen procedural foundation excluding manual sculpt, vertex edits and other features. Editing replaces the owned record and recomputes that contribution. It never estimates and subtracts an old stamp from the manual map. Independent edits, including later edits inside the footprint, remain additive.

For ordinary Raise/Flatten walls, a bounded reference of the original composed surface supports an owned replacement delta. The original sculpt map remains byte-for-byte unchanged. These references are feature-owned source data, not a saved generated mesh. Removing/undoing the refinement removes only its contribution.

Complete versioned definitions replace all definition fields, removing obsolete bank overrides/windows when restoring an earlier definition. Partial property patches retain other fields. Shared object scale/rotation changes map to the same definition. Old baked worlds retain their existing sculpt data; legacy geology objects without owned feature identity display an explanation rather than offering misleading terrain sliders.

A compatibility regression retains a fixed sample from the accepted Patch 07 generator for a heavily inward-narrowed canyon. Opposite-bank guarding applies only to newly edited properties or the active portion of a local deformation. Old records and samples outside a local window retain their earlier profiles.

## Detection, selection and blue guides: 09D

Authored Canyon Wall/Edge records supply bank side, center/endpoint, orientation, scaled dimensions and actual deformed bank location. Selection also requires a real cross-wall height contrast, and deterministic nearest-bank selection avoids unstable ties.

Ordinary terrain detection measures a concentrated cross-slope transition and requires flatter terrain on at least one side. It follows oriented neighboring sections in 4 m steps, with limits on normal, tangent and floor-height changes. Continuity determines center versus endpoint. Tests cover curved walls and nearby parallel walls, and reject uniform steep planes and isolated spikes. Feature-backed and ordinary selection both work across the terrain seam.

Guides use interaction blue `#2A8FFF`, a dark contrasting outline and a white inner stroke. Screen-space line widths remain visible without bloom. Dashed hover guides and wire sphere handles differ from solid selected guides and diamond handles. The bank rim and cross-section/extension projection show the selected side and direction. Temporary terrain represents actual candidate heights/footprints. Placement additionally outlines the central corridor and labels authored H/W/L dimensions.

Ghosts reuse their BufferGeometry while moving. Preview fields remain separate from committed terrain, terrain mesh invalidation, colliders, history, persistence and export. Render depth settings and small height lifts keep guides visible against the terrain. Screenshots include hover, center, endpoint, widening, local deformation and extension states.

## Gestures and contextual settings: 09E

EAST → DEV TOOLS → TOOLS embeds the existing Canyon controls when Draw Canyon Edge is active. A world contextual copy appears when EAST is closed; only one copy is mounted. The tool-selection registry was not rebuilt.

There are three separate values: global defaults for new work, a selected wall's draft values, and committed feature properties. Selecting an authored bank loads its actual scaled dimensions and bank seed/deformation. Changing defaults does not alter existing features. Selected sliders preview Height, Width, Deformation or Seed on that bank; Apply confirms one operation and Cancel discards it. No canonical terrain changes occur while a draft is pending.

Mouse: aim to hover, press to select/drag, release in the world viewport to confirm a real change. A stationary click selects without committing. The retained two-click path previews aim movement and confirms deliberately. Escape first cancels a preview before closing EAST. Pointer cancellation, blur, Compass/world return, tool changes or changes to source terrain discard pending work and release ownership. Lighting/cloud changes do not invalidate an otherwise valid terrain draft.

Controller: A selects/confirms; RT plus the left stick adjusts; release confirms; B cancels. RT/A must be released after cancellation before another gesture begins. Canyon input claims ownership before default-priority player/camera frame subscribers. World A selection of geology also consumes A through release, preventing Jump. X opens the established selected-feature editor. Focused range controls support repeated D-pad changes, with B ending one adjustment/history transaction through the shared control-adjustment workflow.

Operations:

| Operation | Terrain behavior |
| --- | --- |
| Widen | Moves/reshapes the selected bank's existing contribution, preserving the opposite bank. |
| Extend | Moves the selected endpoint along its longitudinal direction, retaining the same seeded profile and shoulder. |
| Deform Edge | Adds a deterministic local window of lateral rim displacement and height variation, fading at section boundaries. |
| New Edge | Explicitly creates one coherent one-sided feature; a failed selection never silently creates one. |

Local deformation is a compact, smoothly weighted seeded multiscale field, not a periodic wave. Its signed displacement/height variation affects one bank. The bound expands conservatively for all stored windows. New local operations use approximately 48 m sections in world space; ordinary-wall refinements follow a local tangent frame. Detection follows curved walls, but this is not a general arbitrary-curve extrusion model.

## History, Save/Load, chunks and export: 09F

Each completed placement, bank draft or direct gesture writes one logical history operation owning the feature record and geology revision. Continuous live editor adjustments retain one transaction until release, blur or adjustment completion. Undo/Redo reconstruct definitions and derived fields; cancellation writes no terrain/history operation. Representative tests compare actual height samples, independent manual maps, records and stack counts.

World Save/Load serializes complete source feature records and refinements, not cached grids. It preserves identities, scale/rotation, independent sculpt/vertex edits and local edge windows. Loading does not bake/reapply the feature into manual terrain. Existing world/chunk persistence paths are unchanged.

Feature bounds invalidate affected terrain regions. Both sides of the expanded X=300 seam share committed sampling; native Rapier ray probes cover nonzero shoulders as well as the zero corridor. An unaffected neighboring H4 chunk retains its geometry UUID. The original 600 m terrain remains one mesh/collider, so an edit intersecting it rebuilds that region; this is not per-triangle patching.

Terrain export constructs a standalone mesh from the committed sampler. Native acceptance exports a real GLB while a deformation preview is active, parses its JSON/binary POSITION accessor, checks all exported positions against committed export geometry, and asserts there is only one terrain node/mesh. Guides and ghosts are excluded and the source world remains unchanged.

## Verification

All 21 Node suites passed. Exact per-command stdout/exit codes are retained in `geology-patch09.local/regressions.json`. These are the 20 suites enumerated in the Patch 08 report, each executed as `node scripts/NAME.mjs`, plus `node scripts/test-geology-patch09.mjs` (nine spatial/integrity groups in its final receipt). After the final compatibility/input corrections, the geology Patch 07/09, Canyon Patch 07, terrain-tools Patch 08 and UI-navigation suites were rerun and passed. Fixed legacy-profile samples and real terrain-edge refinements on both Cliff Face and Giant Rock are included in the final Patch 09 suite; exact group assertions are in `unit-results.json`.

Native Chrome acceptance passed **70 groups/cases** collectively:

| Exact script command | Accepted groups/cases | Receipt under `geology-patch09.local/` |
| --- | --- | --- |
| `node scripts/browser-geology-patch09.mjs` | 11, complete Blank landscape | `browser/results.json` |
| `TG_GEOLOGY09_WORLD=procedural node scripts/browser-geology-patch09.mjs` | 7, populated procedural landscape | `procedural/results.json` |
| `node scripts/browser-geology-input-patch09.mjs` | 6 | `input/results.json` |
| `node scripts/browser-geology-performance-patch09.mjs` | 2 cloud-load cases | `performance/results.json` |
| `node scripts/browser-terrain-tools-patch08.mjs` | 23 | `final-regression/terrain-tools/browser/results.json` |
| `node scripts/browser-cloudfield-move.mjs` | 7 | `final-regression/cloud-move/move/results.json` |
| `node scripts/browser-canyon-patch07.mjs` | 9 | `final-regression/canyon/canyon-browser/results.json` |
| `node scripts/browser-final-checkpoint.mjs --ui-only` | 5 | `final-regression/ui/stage-ui.json` |

For PowerShell, the displayed environment prefix means setting `$env:TG_GEOLOGY09_WORLD='procedural'` before running Node. Native runs use `TG_TEST_URL` for the local Vite URL: full Blank on port 5217, input/performance on 5218, and final serial procedural/shared regressions on 5220. The original Patch 07 native editor and canyon suites also passed at the initial checkpoint before these final runs. Earlier failed attempts are retained as failure artifacts; only accepted result receipts contribute to the counts above.

The complete workflow verifies actual raised shoulders/lower corridor, real controller movement into it, live Rapier ray hits on canyon/cliff surfaces, independent bank changes, ordinary Raise/Flatten refinement, all six Giant Rock properties, scale/rotation preview agreement, repeated live edits, selected-wall Apply/Cancel, one-entry Undo/Redo, exact saved records/heights and real parsed binary export. Native Patch 08 regression verifies the other brushes, vertex movement, water/pond diameter, sun, active CloudField, NORTH/EAST synchronization and persistence. Cloud Move and UI regressions cover shared ownership and navigation paths.

Unpinned FPV and third-person cases run at X=295 and X=305 across the seam. Held W/right stick do not move or rotate the camera/player through a canyon gesture; RT+B does not restart while RT remains held; gameplay recovers after exit. World A selects without Jump, X opens the same feature and two D-pad changes finish one history transaction. Observed small third-person pose differences remain within the tested settling tolerance (maximum 0.03 m body movement and quaternion-vector difference below 0.0005 in the accepted RT cases). No camera pin is used for these ownership assertions. Simulated standard gamepads are explicitly separate from physical Xbox hardware, which remains untested.

All accepted native receipts contain no console errors/exceptions or failed requests. Existing Three.js deprecation warnings are not treated as new errors. Test-fixture corrections reacquire live physics bodies after mode/remount transitions, wait for camera follow to settle, and capture the asynchronous placement label and ghost in the same observation. Runtime fixes address the separate early-frame A/RT handoff and repeated D-pad adjustment issue.

`npm.cmd run build` passed on final runtime source: assets `index-BsYOkZSs.js` and `index-Bo9__rZi.css`. The existing large-bundle warning remains. Focused ESLint passed for the changed geology/raycast/editor/preview modules and shared adjustment boundary. Exact command: `node node_modules/eslint/bin/eslint.js src/systems/geology/terrainEdgeDetection.js src/systems/geology/canyonEdgeOperations.js src/systems/geology/canyonEdgeStore.js src/systems/geology/geologyDefinition.js src/systems/geology/geologyFeatures.js src/systems/geology/geologyField.js src/systems/terrain/raycastTerrain.js src/components/world/CanyonEdgeSystem.jsx src/components/world/GeologyPlacementGhost.jsx src/components/ui/CanyonEdgeControls.jsx src/components/ui/GeologyEditor.jsx src/systems/ui/controlAdjustment.js`.

`node node_modules/eslint/bin/eslint.js src --format json --output-file geology-patch09.local/lint-src-final.json` reports the pre-existing **56 errors / 20 warnings**, exit 1. File/rule/severity counts match the Patch 08 baseline exactly; full-source/repository lint is not claimed clean. `git diff --check` passed, and SHA-256/source-diff preservation checks passed. No dependency install or upgrade was needed.

## Performance measurements

`node scripts/browser-geology-performance-patch09.mjs` passed both cases on the installed native headless Chrome, 1440 × 1000, DPR 1, Blank terrain with the original region plus G4/H4 and one canyon crossing the X=300 seam. One browser ran at a time. Five actual focused-slider key changes, five native placement moves and five native edge-drag updates were measured per cloud count; each case also measured one release/commit. No solver, simulation resolution, shader fidelity, terrain resolution or vegetation setting was reduced for this profile.

| Browser elapsed time, ms | 1 active cloud | 6 active clouds |
| --- | --- | --- |
| Slider → changed geometry, median / maximum | 184 / 209 | 166 / 190 |
| Slider → collision matching committed height, median / maximum | 184 / 209 | 166 / 190 |
| Placement move → two frames, median / maximum | 59 / 86 | 81 / 106 |
| Canyon deformation drag → two frames, median / maximum | 80 / 149 | 93 / 105 |
| Release → changed geometry and matching collision, one sample | 179 | 171 |

Slider and commit probes observe on animation frames, so geometry/collision times can fall in the same observation interval; these are not isolated CPU mesh-generation or Rapier-build timings. Move-to-two-frame measurements include CDP scheduling and browser rendering. Six-cloud results are an additional load observation, not a matched speedup claim. Renderer receipts confirm 1/6 active fluid volumes and continued simulation steps.

Placement and drag assertions retain the same temporary BufferGeometry UUID and unchanged committed terrain-region UUIDs. Each measured committed edit replaces only the affected original region and G4; H4 retains its UUID. These measurements confirm bounded invalidation and preview isolation, while showing that rebuilding the original large mesh/collider still produces visible latency. No global FPS improvement or 60 FPS guarantee is claimed. Exact samples and UUIDs: `geology-patch09.local/performance/results.json`.

## Screenshots and local evidence

Artifacts are intentionally ignored local files under `geology-patch09.local/`, not production assets:

- `browser/three-distinct-silhouettes.png`: the complete canyon, Giant Rock and Cliff Face landscape.
- `browser/giant-rock-scale-one.png`, `giant-rock-scale-two.png`, `giant-rock-world-preview.png`, `giant-rock-live-editor.png`.
- `browser/cliff-editor.png`, `cliff-ground-view.png`.
- `browser/canyon-object-editor.png`, `canyon-placement-preview.png`, `two-sided-canyon.png`.
- `browser/blue-hover.png`, `center-selected.png`, `endpoint-selected.png`.
- `browser/one-side-widen-preview.png`, `one-side-widened.png`, `local-deform-preview.png`.
- `browser/extension-preview.png`, `extension-committed.png`, `ordinary-wall-deform-preview.png`.
- `browser/after-save-load.png`, `committed-geology.glb`.
- `input/fpv-295.png`, `fpv-305.png`, `third-person-295.png`, `third-person-305.png`: unpinned camera input cases on both sides of the seam.
- `procedural/` repeats the native canyon author/refine/persist/export path on an existing procedural landscape.
- JSON receipts retain exact assertions, measured samples, browser errors/requests and timings.

## Changed files and limits

Patch 09 modifies `geologyDefinition`, `geologyField`, `geologyFeatures`, `canyonEdgeOperations` and `canyonEdgeStore`; adds `terrainEdgeDetection` and shared `raycastTerrain`; extends `CanyonEdgeSystem`, `GeologyPlacementGhost`, `MeshPlacementSystem`, `CanyonEdgeControls`, `GeologyEditor`, `MeshMenu`, `WorldToolControls`, App cancellation and the shared control-adjustment boundary. Targeted unit, native landscape/input and performance scripts provide repeatable evidence. The Patch 08 report enumerates the retained restoration files separately.

The existing 4 m geology field and 5 m visible terrain/collision sampling limit small details. Terrain is a heightfield: overhangs and caves are outside this implementation. Ordinary wall refinements use bounded local tangent sections; very short or ambiguous terrain may intentionally fail detection. There are explicit finite feature/window/sample limits. The existing populated-world rendering/FPS limitations remain; this delivery does not change CloudField fidelity or claim 60 FPS. Physical Xbox hardware and subjective owner visual review remain pending. No remote publication is included.
