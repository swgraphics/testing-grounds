# TESTING GROUNDS — PATCH 1.6.04
## CRIMSON TREE — PERSISTENCE + SCATTER

SOURCE OF TRUTH
Testing Grounds 1.6.03.04 (passed).

USER-REQUESTED GOAL
- Save → Place → Scatter → Load preserves the complete procedural Crimson Tree.
- The saved tree remains procedural rather than being flattened into a static mesh.

IMPLEMENTED
- World schema advanced to v7.
- Scatter profiles now retain modelType and complete treeDefinition data.
- Custom saved Crimson Trees can be added to Scatter using their exact edited procedural definition.
- Built-in Crimson Tree scatter remains supported.
- Scatter generation is deterministic from the persisted profile and seed.
- Custom saved-tree scatter is capped independently from the legacy 900-tree world scatter ceiling to avoid multiplying the existing performance cost when several saved tree profiles are active.
- Scatter instances have stable tree IDs derived from profile, chunk, and index.
- Per-scattered-tree procedural edits are stored as treeOverrides in the owning scatter profile.
- Scatter tree overrides therefore survive world Save → Load.
- Existing leaf vertices, leaf presets, branch overrides, trunk settings, secondary branch settings, and other nested tree-definition values travel with the saved tree definition.

PRESERVED
- 1.6.03.04 leaf vertex editing.
- 1.6.03.04 shortcut workflow.
- 1.6.03.04 object/terrain fixes.
- Gesture-editing behavior.
- Sun controls.

VERIFICATION
- Archive/source structural checks should be run before local testing.
- Local Vite build remains authoritative for JSX compilation/runtime.
