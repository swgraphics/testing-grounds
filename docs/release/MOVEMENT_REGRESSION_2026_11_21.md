# Production movement regression — November 21, 2026

Status: focused fix validated locally; shared regressions and a corrected protected Preview are being prepared. Production was rolled back before source correction. This report supersedes the original publication's broad movement-acceptance claim.

## Reproduction and rollback

The owner reported that movement did not work in the new deployment. A clean unauthenticated test of source `09d9082d2284bd6ffc0d831a4cdf860744e8923c` reproduced **0 m** movement after Enter World with native keyboard input, both before and after a canvas click, and with a simulated standard gamepad. Blank Canvas FPV moved. Focus was BODY, Compass was orange, no modal/tool owned input, and the keyboard indicator responded. This rules out simply missing keyboard input.

The already-authorized critical-failure rollback restored `dpl_2Zka7QJhNkPNgy4dyMFJ6AarTyd5`, source `612d0756d3f89aecece0666922eaca18c6155a1b`, at <https://testing-grounds-ten.vercel.app/>. CLI domain inspection and HTTPS 200 with original `index-bv21GrcX.js` / `index-DkRrJwTc.css` verified rollback. The failed deployment, archived Preview and development Preview were retained. Vercel rollback set `autoAssignCustomDomains=false`; production branch remains `main` and Preview protection remains `all_except_custom_domains`. No other settings or subscription changes were made. GitHub main temporarily remains `09d9082` pending the correction.

A later clean keyboard check also failed its movement assertion on the restored historical build. Rollback therefore restores the prior deployment, but is not evidence of working fresh-entry gameplay. That baseline result is retained and is not reported as a pass.

## Confirmed cause and correction

`PlayerController` temporarily disables the Rapier player body on height-setting notifications, then resumes it on `terrain-physics-rebuilt`. An unchanged chunk-settings load still broadcasts those notifications. Cached GridTerrain geometry/colliders correctly remain unchanged, but its acknowledgement effect previously depended only on the collider key. With no changed key, the disabled player could wait indefinitely for a signal that never arrived.

A local probe demonstrated this directly: unchanged loading changed the body from enabled to disabled; input remained `forward=true` and a horizontal movement velocity was present, but translation stayed fixed. Sending the existing completion signal re-enabled the same body and restored movement.

Runtime fix commit: **`76cd6bc210589e0595dc8e4ad4505f72b9960a61`** (`fix: resume player physics after unchanged terrain updates`). `GridTerrain.jsx` now includes its already-existing height-notification update counter in the completion-effect dependencies. It acknowledges committed no-op loads as well as real collider replacements. The geometry/collider cache keys are unchanged, and no extra terrain rebuild is introduced. Player-controller, camera, speed settings, world schema, CloudField and water implementations are unchanged.

New regression scripts cover actual player motion and Rapier body state. The browser helper additionally excludes Chrome's internal `chrome://` targets when choosing the disposable test page. No dependencies were installed or changed.

## Observed validation

- `npm.cmd run build`: **PASS**, exit 0; `index-adN2gZP_.js`, existing `index-Bo9__rZi.css`. Existing bundle-size/plugin-timing warnings remain.
- All **21** existing `node scripts/test-*.mjs` suites: **PASS**, each recorded exit 0. Receipt: `movement-regression.local/node-results.json`.
- `TG_TEST_URL=http://127.0.0.1:5225/ node scripts/browser-terrain-physics-handshake.mjs`: **6 groups PASS**. For procedural and Blank worlds, repeated unchanged chunk loads/full broadcasts leave the player enabled and preserve exact mesh UUIDs and collider handles; real terrain changes also re-enable the player; native W movement survives both paths. Receipt: `movement-regression.local/handshake/results.json`.
- `TG_TEST_URL=http://127.0.0.1:5226/ node scripts/browser-world-entry-movement.mjs`: **8 groups PASS against the compiled production bundle**, not only Vite development modules. Procedural and Blank cases cover native keyboard immediately after entry, a simulated standard gamepad, real emulated touch on the visible mobile joystick, and keyboard after saved-world reload. Idle drift is measured separately. Procedural motion measured approximately **3.88–4.75 m**, compared with **0.001 m** idle drift; Blank FPV measured approximately **35.93–36.59 m**. The saved Blank reload case also moved. All console-error and failed-request arrays were empty.
- Focused ESLint for `GridTerrain.jsx`, the browser helper and both new scripts: **PASS**, exit 0. `git diff --check`: **PASS**. Existing repository-wide lint debt is not fixed by this patch.
- Shared terrain/input/cloud/canyon/UI regressions: in progress.

The first joystick driver attempted a desktop joystick that the project deliberately hides on fine mouse pointers. That attempt failed and is retained. The accepted driver emulates an actual touch device, asserts that the mobile joystick is visible, and uses native touch events. No runtime joystick behavior or motion thresholds were relaxed to pass the test. Physical Xbox and physical touch hardware remain untested.

The original hosted acceptance only tested movement late in a Blank editing session. It missed fresh procedural entry and could conflate collision settling with motion. The new regression starts each world without editor/tool fixtures and compares horizontal movement against an idle sample. Original acceptance receipts remain historical observations, not proof that the failed default-entry path worked.

## Publication gate and artifacts

The corrected Preview must be verified before another live change. Existing GitHub-to-Vercel builds are used; normal Preview protection is preserved. No new automation access credential has been created for this correction. Because rollback paused domain assignment, any later Git production build must not be mistaken for a live-domain update; promotion/domain state must be explicitly verified.

Current evidence: `interim-production-20261121.local/movement-investigation/` (public failure and rollback state), `player-physics-investigation/` (disabled-body diagnosis), and `movement-regression.local/` (fix build and regression receipts). All are ignored local artifacts and use disposable profiles/worlds. Owner browser storage was not cleared or overwritten.
