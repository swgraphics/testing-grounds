export function hasBlockingInterface(doc = typeof document === 'undefined' ? null : document) {
  return Boolean(doc?.querySelector('[aria-modal="true"]:not([data-compass]),.tg-leaf-editor-window,.tg-cloud-interaction-panel'));
}

// Tool settings can remain selected behind a deliberately opened interface.
// The icon describes the surface currently owning input, without duplicating tool state.
export function compassControlState(navigation, editor, interaction, blocking = false) {
  if (navigation.compassOpen || navigation.helpOpen || blocking || editor.viewMode === 'editor' || Object.values(editor.visiblePanels).some(Boolean) || interaction.panelOpen || ['world-map-resize','object-editor'].includes(interaction.gestureOwner)) return 'interface';
  if (interaction.activeTool && (interaction.activeTool === 'CLOUD' || ['sculpt','grab','place','edit'].includes(interaction.activeMode))) return 'tool';
  return 'world';
}
