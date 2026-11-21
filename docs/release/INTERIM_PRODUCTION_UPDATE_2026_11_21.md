# Interim production update — November 21, 2026

Status: **complete — published and verified on the public production domain**. This is an informal sharing/testing checkpoint, not Demo 1.0. No official release tag, press kit or launch announcement is part of this work.

## Verified sources and archive

- Workspace: `D:\Stephen\TRANSFER\Testing Grounds\testing-grounds-dev-07-08`; active branch remains `feat/terrain-export-ui-v2`.
- Original production source: `612d0756d3f89aecece0666922eaca18c6155a1b`, branch `main`.
- Original production deployment: `dpl_2Zka7QJhNkPNgy4dyMFJ6AarTyd5`, created 2026-10-04T23:35:13.373Z, Ready/current at preflight. [Unique URL](https://testing-grounds-74xefxlsk-swgraphics99.vercel.app/); [public domain](https://testing-grounds-ten.vercel.app/).
- Existing project: `testing-grounds`, team `swgraphics99`, ID `prj_Dr17jMJh0CV4r6jK3puNl0a3iI8h`, Hobby. Authenticated CLI/API confirmed repository `swgraphics/testing-grounds`, production branch `main` and automatic production-domain assignment enabled.
- Archive branch: `archive/production-2026-11-21`; annotated tag: `archive/pre-cloudfield-production-2026-11`. Both remote references point to the exact original source. Tag object: `e449c7fdb93e6221b8e8cd025f7703cfc5308265`.
- [Archive Preview](https://testing-grounds-8dpgsse4t-swgraphics99.vercel.app/): `dpl_AnWHcaxpckKpbC4GzFheWME3tiwi`, Ready, Preview target, exact archived SHA verified. It opens/renders in an authenticated disposable browser with no console errors or failed assets. It has only its archive branch alias, not the production domain.
- Archive branch creation did not trigger a Vercel build. The authorized fallback used Vercel's deployment API through the already-cached authenticated CLI, with the existing GitHub repository, archive branch and exact SHA. No files were uploaded from the active development worktree and no project setting was overridden.

## Development checkpoint and publication review

Latest local runtime source and pushed development SHA: `fc5b3edbb5abcd148a33c752de36a1f948ebc06c`. The original worktree was clean, three commits ahead of GitHub. Those existing commits were pushed normally:

1. `245114944a285e141413f4e19f499ce26a7df221` — CloudField living vapor and natural water.
2. `b0d7660d674168169e6641c290dd963e8581b9bb` — performance improvements and editable geology Patch 07.
3. `fc5b3edbb5abcd148a33c752de36a1f948ebc06c` — Canyon Edge 2.0 and restored terrain tools, Patches 08/09.

GitHub development HEAD was verified equal to the intended local SHA after pushing. No new application changes were committed for this deployment, no history rewritten, and no development branch deleted. The approved PR later created the merge commit recorded below. The complete production-to-candidate change covers 305 files, 16,975 insertions and 7,949 deletions. The three main-only commits were historical merges; `git merge-tree --write-tree origin/main HEAD` reported no conflicts and produced tree `d1dcad060883d1e04ad2d26947e969110ff5c984`, exactly equal to the candidate's tree.

Annotated interim tag `checkpoint/cloudfield-geology-2026-11-21` was created and pushed at `fc5b3ed` after validation. Its tag object is `d5ee67f4f63f439ad4a1b1d7487fbaa9da43d228`. This is not an official release identifier.

The owner clarified that the four previously protected files may be published if ordinary project content. Inspection found project task instructions (`TG_CODEX_TASK_07.md`), a simple inline polygon SVG (`public/images/TG_ICON (1).svg`), a title-media React component and configuration with `src: null`. No credentials, external embedded payload, configured private media or obvious unauthorized third-party material was found. They remain unmodified. A repository secret-pattern scan found no private-key blocks or high-specificity GitHub/AWS/OpenAI credential patterns. Newly added asset/license files in the three unpublished commits were only that SVG and the complete `THIRD_PARTY_LICENSES/CAUSTIC-VOLUME-MIT.txt` notice. This is a focused publication review, not the separate formal licensing audit.

No dependencies, repository visibility, root license, player/controller implementation, CloudField/water/terrain behavior, backup contents or existing deployments were changed by this task. Generated evidence, browser profiles, helper scripts and build output remain ignored local artifacts.

## Validation

- `npm.cmd run build`: **PASS**, exit 0, at exact runtime SHA `fc5b3ed`. Output assets: `index-BsYOkZSs.js`, `index-Bo9__rZi.css`. Existing plugin-timing and large-bundle warnings remain. Node 24 matches the project's configured Vercel major version.
- All 21 existing `scripts/test-*.mjs` Node suites: **PASS**, each invoked as `node scripts/NAME.mjs`; every recorded exit code is 0. Coverage includes world persistence/legacy saves, terrain tools/export, geology/Canyon Edge, CloudField codec/solver/retention/integration/performance ownership, object editing, navigation, forest and Crash Tester. Exact commands/stdout: `interim-production-20261121.local/node-results.json`.
- Fresh native Chrome browser acceptance: **68 groups PASS**: geology Blank 11; procedural geology 7; unpinned input/FPV/third-person 6; terrain tools 23; Cloud Move 7; canyon 9; UI navigation/object editing 5. All accepted receipts contain empty console-error and failed-request arrays. Physical Xbox hardware was not tested.
- The Blank geology run retained its original movement assertion and passed all 11 groups in a diagnostic copy that adds recording only. An earlier run failed its fixed four-second movement-distance check; the accepted rerun measured 14.53 m. That first failure is retained and is not counted as a pass. No runtime controller change was made. An initial sandbox attempt also timed out enabling CDP before opening the app. Subsequent native runs used a local preloader to exclude Chrome's internal omnibox target from debugger discovery.
- Source lint: `node node_modules/eslint/bin/eslint.js src --format json --output-file interim-production-20261121.local/lint-src.json`: exit 1, **56 errors / 20 warnings**, with zero diagnostic differences from the Patch 09 baseline. Existing lint debt was not changed; repository lint is not claimed clean.
- `git diff --check`, `git diff --check origin/main...HEAD`, and the prospective merge check passed.
- No unrelated performance profiling was repeated. The earlier Patch 09 performance evidence remains historical; the fresh build reproduces its recorded application asset names.

Fresh local acceptance commands used `TG_TEST_URL=http://127.0.0.1:5225/` and isolated artifact roots:

```text
node interim-production-20261121.local/browser-geology-diagnostic.mjs
node --import ./interim-production-20261121.local/chrome-target.mjs scripts/browser-geology-patch09.mjs
  (TG_GEOLOGY09_WORLD=procedural)
node --import ./interim-production-20261121.local/chrome-target.mjs scripts/browser-geology-input-patch09.mjs
node --import ./interim-production-20261121.local/chrome-target.mjs scripts/browser-terrain-tools-patch08.mjs
node --import ./interim-production-20261121.local/chrome-target.mjs scripts/browser-cloudfield-move.mjs
node --import ./interim-production-20261121.local/chrome-target.mjs scripts/browser-canyon-patch07.mjs
node --import ./interim-production-20261121.local/chrome-target.mjs scripts/browser-final-checkpoint.mjs --ui-only
```

## Hosted Preview and production

- [Development Preview](https://testing-grounds-q09zev7jh-swgraphics99.vercel.app/): `dpl_GGEMZAbvDJ96DhXVUsW2EypWVpMp`, Ready; Git source branch `feat/terrain-export-ui-v2`, SHA `fc5b3ed`. Created automatically by the normal GitHub push. All **11 authenticated hosted acceptance groups passed**: procedural/Blank worlds, Compass/all four panels, all terrain tools, CloudField controls, native rock/cliff edits, actual saved Canyon placement, Save/Load, character movement, schema-7-to-8 migration and error/asset checks. Native movement measured 2.55 m. The hosted script asset was `index-BsYOkZSs.js`.
- [PR #4](https://github.com/swgraphics/testing-grounds/pull/4) was merged using `merge`, with expected head `fc5b3ed`. New merge/production SHA: **`09d9082d2284bd6ffc0d831a4cdf860744e8923c`**. GitHub reported a clean, mergeable PR with base `612d075`. A post-merge fetch and tree diff verified main's file tree is exactly the validated candidate. The development branch remains at `fc5b3ed`.
- New production deployment: **`dpl_FZcZzqG6hujXwyv25o3BDLfro643`**, [unique URL](https://testing-grounds-fnmnb3wd3-swgraphics99.vercel.app/), created **2026-11-21T21:49:59.502Z**, Ready, production target, exact `main` source SHA `09d9082`. It was triggered automatically by the GitHub merge, with no redundant CLI production deployment.
- Authenticated Vercel inspection confirms the existing `testing-grounds-ten.vercel.app` domain is assigned to the new production deployment. A fresh unauthenticated HTTPS request returns **200**, final URL unchanged, and assets `index-BsYOkZSs.js` / `index-Bo9__rZi.css`, replacing the original `index-bv21GrcX.js` / `index-DkRrJwTc.css`.
- **Public production acceptance: PASS**, all **11 hosted groups**, in a new Chrome profile with no Vercel authentication or bypass header. It repeated procedural and Blank world entry, all four panels, all terrain controls, native cloud/emitter/Move controls, rock/cliff properties, Canyon placement, Save/Load, movement and legacy migration. The saved world contained **one Canyon feature and one CloudField object**. Reload retained the geology records and cloud identities/positions. Native movement measured **2.59 m** over the observed test interval. A representative schema-7 fixture without geology/live vapor migrated to schema 8 with original chunks and vertex edits retained. Console-error and failed-request arrays were empty.

Hosted command: `node --import ./interim-production-20261121.local/chrome-target.mjs interim-production-20261121.local/smoke-hosted.mjs`, using `TG_HOSTED_URL=https://testing-grounds-ten.vercel.app/`, `TG_HOSTED_MODE=production` and no `TG_VERCEL_BYPASS`. Exact receipt: `interim-production-20261121.local/hosted-production/results.json`. The accepted Preview used the same harness with its protected Preview URL and a temporary exact-host authentication header; the archive used archive mode. Local and hosted screenshots/JSON remain ignored evidence.

The existing Vercel CLI was found in the machine's npm cache and authenticated successfully as `swgraphics`. No CLI/dependency installation or new integration was required. The CLI's supported authenticated `curl` command automatically created one automation access credential. Normal deployment protection (`all_except_custom_domains`) remained enabled. The credential was used only for exact-host authenticated test requests and **revoked before the main merge**. Authenticated verification confirms zero remaining automation bypass credentials, original protection type, production branch `main` and automatic domain assignment enabled. No secret values are included in reports or source files.

All browser tests use newly created disposable profiles/worlds. No owner's browser storage was cleared or overwritten. Hosted harness failures are retained separately: cloud placement closes EAST; applying a template changes the Library view; right-click cancels placement; and successful object placement remains active for repeated objects. The accepted harness follows those actual UI paths, aims its pointer at terrain, leaves placement explicitly and verifies the saved feature rather than assuming mode exit. No application changes or relaxed assertions were required. The Preview's initial cloud-count observation incorrectly inspected chunk objects; current code stores clouds under `world.livingVapor.objects`. Production acceptance uses the correct path and additionally checks saved cloud identities/positions.

## Rollback, retention and remaining limits

Final authenticated checks confirmed the original production, archive Preview, development Preview and new production deployments all remain **Ready**. GitHub `main` matches the deployed production SHA. The original Ready production deployment remains available as rollback target: `dpl_2Zka7QJhNkPNgy4dyMFJ6AarTyd5`. If a critical production failure occurs, use Vercel's supported rollback to that deployment, record the resulting public source/domain state, and check whether automatic production-domain assignment became disabled. **No rollback was needed or performed**, and automatic assignment remains enabled.

No deployment history was deleted. Git archives are permanent source references; Vercel Hobby hosted history remains subject to storage/retention and active-alias/branch exceptions. See [deployment history](DEPLOYMENT_HISTORY.md) and [Vercel's current Hobby retention announcement](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage).

Known limits remain: existing source lint debt and populated-world/FPS limits, 4 m geology fields and 5 m visible/collision sampling, heightfield-only formations, and pending physical Xbox/subjective visual review. Formal licensing and Demo 1.0 release work remain separate. No owner action or authentication is required to complete this interim publication.

The only repository files authored in this task are `docs/release/DEPLOYMENT_HISTORY.md` and this report. They are preserved in a separate **local documentation-only commit**, intentionally not pushed during this delivery to avoid further deployment builds solely for recording receipts. This does not change the validated remote development source or production source. Its SHA can be recovered with `git log -1 --format=%H -- docs/release/INTERIM_PRODUCTION_UPDATE_2026_11_21.md`; the final handoff also records it. Source/build artifacts and temporary browser helpers were not staged.
