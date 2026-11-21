// Shared between the navigator and the shell so Escape cancels adjustment first.
export const adjustmentState = { current: null };
export function endAdjustment() {
  if (!adjustmentState.current) return false;
  adjustmentState.current.removeAttribute('data-gamepad-adjusting');
  adjustmentState.current.dispatchEvent?.(new Event('tg-control-adjustment-end',{bubbles:true}));
  adjustmentState.current = null;
  return true;
}
