# Testing Grounds — Codex Instructions

TG is a React/Vite/Three.js-based world-building and game-development environment. Read `docs/codex/PROJECT_CONTEXT.md`, `WORKING_AGREEMENTS.md`, `PROJECT_ROADMAP.md`, and `DECISIONS_AND_KNOWN_ISSUES.md` before substantial work. Current code is authoritative; historical notes must be verified.

## Safety rules
- Start by checking repository root, `git status --short --branch`, and relevant diffs.
- Preserve all pre-existing user changes. Never run destructive Git commands (`reset --hard`, `clean`, broad checkout/restore). Do not switch branches, commit, push, deploy, or modify backups without explicit approval.
- Do not install, remove, or upgrade dependencies without approval.
- Prefer focused, reviewable patches over broad refactors.
- Be cautious with player-controller, movement, and intro-camera code; previous changes caused regressions.
- Never claim a test passed unless it was actually run and its result observed.
- Separate confirmed code facts from historical notes, proposals, and assumptions.
- For code changes, report changed files, behavior, exact checks run/results, limitations, and next decisions.
- Update durable project docs only when a decision or correction is confirmed.

## First-session rule
The first task is read-only: no edits, installs, branch changes, commits, pushes, deploys, resets, or cleanup. Inspect and report, then wait for approval.
