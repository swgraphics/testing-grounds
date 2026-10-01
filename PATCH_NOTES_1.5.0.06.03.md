# Testing Grounds 1.5.0.06.03

## World Map visual correction

- Replaced card-like occupied region presentation with a continuous map surface.
- Major chunk designations A/B/C/D are large, centered, and slightly transparent over their internal grids.
- Applied the same six-by-six internal grid and permanent coordinate labels to every occupied chunk.
- Removed rendered chunk titles, creator-name headers, and extra coordinate/header UI from map cells.
- Empty cells retain the plus affordance without an extra ADD CHUNK caption.
- Creator names remain editable metadata and are not removed from persistence or chunk navigation.
- Preserved map drag, cursor-edge panning, selection, and chunk creation behavior.
