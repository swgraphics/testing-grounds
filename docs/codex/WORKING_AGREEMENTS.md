# Working Agreements

- Be practical, specific, and evidence-based; avoid unsupported reassurance.
- Preserve existing work and inspect Git state before editing.
- No destructive Git operations; no branch changes, commits, pushes, deployments, or backup modifications without explicit permission.
- Read current code and call sites before changing a system; check for existing implementations before adding abstractions/dependencies.
- Ask before expanding scope or making significant design choices.
- Be cautious around player movement/controller and intro-camera behavior.
- Inspect `package.json` for actual scripts and lockfiles; do not assume test/lint/build commands exist.
- Run relevant checks when authorized; report exact commands and outcomes. State clearly when a check could not run.
- Review the final diff and list changed files, behavior, validation, limitations, and follow-up decisions.
- Patch archives should contain only intended files and a short application guide; verify the archive before linking.
