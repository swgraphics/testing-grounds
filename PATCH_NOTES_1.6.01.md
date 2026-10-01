# Testing Grounds 1.6.01 — Crimson Tree Trunk Interaction

## Scope
First vertical slice of the Crimson Tree direct procedural editing system.

## Included
- Crimson Tree trunk is now a direct interaction target in the live world.
- Adaptive Reticle gains a minimal tree-target state when the center reticle is aimed at a Crimson Tree trunk.
- Clicking a targeted trunk enters `TREE // EDIT` mode and opens the branded Tree Interaction panel.
- Vertical pointer dragging while in Tree Interaction changes the procedural trunk height in real time.
- Tree Interaction panel includes live Trunk Height, Taper, Bend, and Width controls.
- ESC / panel X provide the explicit exit path.
- Object Editor Window gains a `DIRECT TREE EDIT` mode for Crimson Tree.
- In Direct Tree Edit mode, the editor preview uses a blue reticle over the trunk and click-drag vertical movement changes trunk height live.
- Saved placed Crimson Trees retain a real generator definition so trunk interaction has data to edit.
- The existing Sun control implementation was not changed.
- The static Interaction Panel outer border is returned to the established crimson Dev Tools styling; blue remains reserved for active interaction.

## Deliberately Not Included Yet
- Primary branch creation
- Branch taper / secondary branch generation controls
- Automatic leaf regeneration changes beyond the existing generator behavior
- Leaf vertex editing
- Tree-specific save/load/scatter completion beyond the existing object persistence path

Those are reserved for the subsequent 1.6.02–1.6.04 tree passes.

## Verification
- Raw delimiter balance checked on changed JS/JSX files.
- No production Vite build was run because the development archive does not contain `node_modules` or `public`.
