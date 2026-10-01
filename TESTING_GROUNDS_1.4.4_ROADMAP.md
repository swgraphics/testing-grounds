# TESTING GROUNDS — 1.4.4 ROADMAP
## VERTEX EDITING

1.4.4 is the dedicated terrain geometry editing pass.

### 1.4.4.01 — Foundation
- Vertex interaction mode
- Vertex targeting
- Single selection
- Multi-selection groundwork
- Visual selection feedback

### 1.4.4.02 — Height Editing
- Raise selected vertices
- Lower selected vertices
- Live terrain deformation
- Preserve existing Terrain Height brush behavior

### 1.4.4.03 — Selection Workflow
- Reliable multi-selection
- Clear/reselect behavior
- Controller interaction
- Interaction-state feedback

### 1.4.4.04 — Persistence
- Compact vertex edit records
- Chunk association
- Save World integration
- Load World integration
- Reset semantics

### 1.4.4.05 — Chunk Continuity
- Shared boundary handling
- No visible cracks at edited chunk borders
- Deterministic base terrain + persistent vertex overrides

### 1.4.4.06 — Polish / Verification
- Selection visuals
- Performance review
- Undo/history integration where the existing command architecture supports it
- Full acceptance testing

### Out of scope for 1.4.4
Water, weather, Grass V2, cloud overhaul, unrelated object/visual redesign, and other feature work remain separate.
