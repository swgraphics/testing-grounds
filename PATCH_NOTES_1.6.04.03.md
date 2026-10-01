# Testing Grounds 1.6.04.03

## Scatter Population Architecture

### Custom procedural tree canopy
- Custom procedural Crimson Tree-derived scatter profiles no longer receive the legacy Crimson canopy.
- The saved `treeDefinition` is authoritative for custom tree canopy generation.
- The legacy canopy is reserved for the default Crimson Tree population.

### Scatter menu
- Scatter is now a population manager rather than a panel for only the selected object.
- Default `CRIMSON TREE` appears first and is labeled `DEFAULT`.
- Custom scatter profiles appear underneath and are labeled `CUSTOM`.
- Tree populations expose `DENSITY` and `COVERAGE`.
- Canyon Wall / geology profiles expose `WIDTH` and `HEIGHT`.
- Each population has its own `REMOVE` action.
- Removing a custom population removes its scatter profile but does not delete the source object.
- Removing the default Crimson Tree disables its default population while retaining its settings; `ENABLE` restores it.
- Multiple custom populations can coexist.
- Selecting a population from the manager selects it for scatter editing without entering Place mode.
- The selected object can be added to Scatter directly from the manager.

### Persistence / scope
- Existing 1.6.04.02 single-tree vs all-scattered tree editing scope is preserved.
- No scatter performance optimization is included; the generation hitch remains bookmarked for the future 1.8/1.9 rendering optimization pass.

## Verification
- JSX delimiter sanity checks and JavaScript syntax checks should be run locally before runtime testing.
- ZIP integrity verified after packaging.
