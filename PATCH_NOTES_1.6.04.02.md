# Testing Grounds — Patch 1.6.04.02

## Crimson Tree persistence + scatter scope correction

This patch revises the 1.6.04.01 scattered-tree editing scope to follow the Testing Grounds zoom-in / zoom-out interaction model.

### Scope hierarchy
- **SINGLE TREE** is now the default when editing a tree that came from scatter.
- **ALL SCATTERED** is an explicit higher-level scope for editing the entire scattered population represented by that tree profile.
- Within **SINGLE TREE**, **ALL BRANCHES** remains the default gesture scope. Grabbing one branch can therefore reshape all branches on that one tree.
- **SINGLE BRANCH** is the precision level beneath a single tree. It affects only the selected branch on that tree.
- **ALL SCATTERED + SINGLE BRANCH** is intentionally prevented. Switching to ALL SCATTERED automatically returns branch scope to ALL BRANCHES so a single-branch gesture cannot silently fan out across the forest.

### Resulting interaction model
```text
ALL SCATTERED
    ↓ zoom in
SINGLE TREE
    ↓ zoom in
SINGLE BRANCH
```

The branch gesture remains the approved high-impact TG interaction at the single-tree level:
**grab one branch → all branches on that tree respond.**

At the forest level, the user explicitly chooses **ALL SCATTERED** before population-wide changes are allowed.

### Performance intent
- Normal scattered-tree editing now regenerates/updates only the selected tree instance.
- Population-wide editing remains an explicit operation so it cannot be triggered accidentally by ordinary gesture editing.
- The larger scatter rendering hitch remains bookmarked for the future 1.8/1.9 optimization pass.

### Protected
- Existing gesture-editing behavior
- Leaf vertex editing
- Leaf presets
- Shortcut system
- Terrain/object systems
- Sun controls
