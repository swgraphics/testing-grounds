# Development checkpoint and later Demo 1.0 release

Task 11 authorizes committing/pushing `feat/terrain-export-ui-v2` and its Vercel
Preview only. Production promotion or merging into `main` is not authorized.
No application code is changed by this synchronization task.

## Verified inputs

- Repository: https://github.com/swgraphics/testing-grounds
- Development worktree: `testing-grounds-dev-07-08`.
- Base: `c55b052c8a48760878f7f45980a874f5453903df`.
- Freshly fetched production branch: `main`,
  `612d0756d3f89aecece0666922eaca18c6155a1b`.
- `main` has three unique merge commits; its tree equals the shared `7afc23e`
  base. The development base additionally includes the water fix and cleanup.
  No incompatible remote content changes were found. No merge is performed.
- GitHub's Vercel records associate current `main` with successful Production
  deployment `https://testing-grounds-74xefxlsk-swgraphics99.vercel.app`.
  Deployment URLs identify project `testing-grounds`, scope `swgraphics99`.
- Existing public production URL: https://testing-grounds-ten.vercel.app/
  (HTTP 200; bundle `/assets/index-bv21GrcX.js` before this task).
- Other branch pushes have successful Preview deployment records. Immutable
  deployment URLs currently redirect unauthenticated requests to Vercel login.
  No local Vercel CLI/project link or connected Vercel integration was found.
  Private project settings require authenticated confirmation.

## Commit-content review

Includes Terrain Export, current UI/title, world-first navigation, forest and
vegetation updates, Crash Tester 2.0, focused/browser tests, approved references,
and associated documentation. Required runtime assets and original models stay.
The largest new binary is the required 14.7 MB GLB, below GitHub's 100 MB limit.

Excluded and retained locally: `TG_CODEX_TASK_07.md`,
`public/images/TG_ICON (1).svg`, `src/components/ui/TitleMedia.jsx`, and
`src/config/titleMedia.js` (obsolete handoff/duplicate/unreferenced media code).
Build output, browser profiles, screenshots, dumps and `.local` artifacts remain
ignored. Credential-pattern scan found no matches in the proposed text contents.
Machine-specific paths are confined to historical notes and Windows Chrome tests.

Font OFL and Lucide ISC/MIT notices are included, matching their published
[font notice](https://raw.githubusercontent.com/google/fonts/main/ofl/specialgothicexpandedone/OFL.txt)
and [icon notice](https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE).
The new GLB is owner-supplied and byte-identical to the provided Blender export.
This checkpoint is not final distribution-rights clearance: retain the Demo 1.0
licensing gate for Meshy account/output terms, Quaternius animation provenance,
and all other shipped third-party assets.

## Validation and remaining release gates

PASS `npm.cmd run build`, five focused Node suites, local browser UI smoke, and
`git diff --check`. Browser smoke includes real GLB download, sculpting, object
placement, independent panels, persistence, navigation, movement and camera.
Forest/character/title runtime evidence is documented in the preceding task
reports. Test artifacts remain local.

Repository lint is not clean: 61 errors and 30 warnings. Comparison with the
tracked Git baseline found one new unused `THREE` import diagnostic and one new
`isDefaultCrimson` memo-dependency warning in `Landscape.jsx`; other diagnostics
remain legacy. They are recorded rather than fixed in this no-development task.

Before Demo 1.0: resolve/accept lint findings, finish stability and physical
controller checks, verify authenticated Preview smoke results, complete licensing
review, and obtain explicit production-release authorization.

## Later production procedure — do not execute in Task 11

1. Fetch again, identify the exact approved development commit, and confirm that
   the reviewed Preview was built from that SHA. Recheck `main` for new changes.
2. In Vercel project `testing-grounds` under `swgraphics99`, verify the connected
   repository, production branch `main`, `npm run build` and output `dist`.
   Record the currently serving Production deployment and domains for rollback.
3. After the separate Demo 1.0 authorization, review and merge the feature PR
   into `main` without force-pushing. The observed Git integration should build
   a Production deployment for the resulting merge SHA. Confirm Ready/success
   and the exact SHA before accepting the release.
4. Smoke-test the actual production domain: title, default/blank/saved worlds,
   character and textures, compass, sculpting, editable trees and GLB export.
   Do not treat a Preview build alone as production-environment validation.

This follows Vercel's documented
[production-branch deployment behavior](https://vercel.com/docs/deployments/promoting-a-deployment).

## Rollback procedure

In Vercel's project overview choose **Instant Rollback**, select the previous
known-good Production deployment, verify the production domain and SHA, then
confirm. The current rollback reference is `612d075` / `74xefxlsk` above; record
its successor/current state again at launch. Hobby plans allow the immediately
previous production deployment, while broader histories depend on plan/access.

Recheck the public domain and old bundle after rollback. Vercel disables automatic
production-domain assignment after rollback; verify that state before any later
launch. Prepare a normal Git revert PR for the bad release if appropriate, and
only restore promotion/auto-assignment after a separately approved corrected build.
No history rewriting or hard reset is needed. See
[Vercel Instant Rollback](https://vercel.com/docs/instant-rollback).
