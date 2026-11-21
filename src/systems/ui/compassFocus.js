import { DIRECTIONS, useNavigationStore } from './navigationStore';
import { confirmCompass, backCompass } from './navigationActions';
const controls = root => [...(root?.querySelectorAll('button:not(:disabled)') ?? [])].filter(e => e.getClientRects().length);
export function focusCompassGroup(name) {
  const nav = useNavigationStore.getState();
  const root = document.querySelector('[data-compass-group="'+name+'"]');
  if (!root) return;
  if (name === 'radial') {
    const direction = DIRECTIONS.includes(nav.selected) ? nav.selected : 'north';
    nav.select(direction);root.querySelector('[data-direction="'+direction+'"]')?.focus();
  } else controls(root)[0]?.focus();
}
export function cycleCompassGroup(delta) {
  if (document.querySelector('.tg-shortcut-picker')) return;
  const names = ['shortcuts','radial','quick'].filter(name => document.querySelector('[data-compass-group="'+name+'"]'));
  const current = document.activeElement?.closest('[data-compass-group]')?.dataset.compassGroup ?? 'radial';
  focusCompassGroup(names[(names.indexOf(current)+delta+names.length)%names.length]);
}
export function navigateCompass(direction) {
  const picker = document.querySelector('.tg-shortcut-picker');
  if (picker) {
    const items = [...picker.querySelectorAll('button:not(:disabled),input')].filter(e=>e.getClientRects().length);
    const index=items.indexOf(document.activeElement),delta=['south','east'].includes(direction)?1:-1;
    const next=items[Math.max(0,Math.min(items.length-1,index+delta))];next?.focus();next?.scrollIntoView({block:'nearest'});return;
  }
  const group = document.activeElement?.closest('[data-compass-group]');
  if (group && group.dataset.compassGroup !== 'radial') {
    if ((group.dataset.compassGroup === 'quick' && direction === 'west') || (group.dataset.compassGroup === 'shortcuts' && direction === 'east')) {
      useNavigationStore.getState().select(direction === 'west' ? 'east' : 'west');focusCompassGroup('radial');return;
    }
    const items = controls(group), index = items.indexOf(document.activeElement);
    const delta = ['south','east'].includes(direction) ? 1 : -1;
    items[Math.max(0,Math.min(items.length-1,index+delta))]?.focus();return;
  }
  const nav = useNavigationStore.getState();
  if (nav.selected === direction && nav.lastDirection === direction && ['east','west'].includes(direction)) {
    const name = direction === 'east' ? 'quick' : 'shortcuts';
    if (document.querySelector('[data-compass-group="'+name+'"]')) { focusCompassGroup(name);return; }
  }
  nav.navigate(direction);
}
export function confirmCompassFocus() {
  const active = document.activeElement;
  if (document.querySelector('.tg-shortcut-picker')) { if (active?.closest('.tg-shortcut-picker')) active.click?.();return; }
  if (active?.closest('[data-compass-group="quick"],[data-compass-group="shortcuts"]')) active.click?.();
  else if (active?.closest('[data-compass]') && !active.matches('[data-direction],[data-compass-action]')) active.click?.();
  else confirmCompass();
}
export function backCompassFocus() {
  if (document.querySelector('.tg-shortcut-picker')) { window.dispatchEvent(new CustomEvent('tg-shortcut-picker-close'));return; }
  if (document.activeElement?.closest('[data-compass-group="quick"],[data-compass-group="shortcuts"]')) focusCompassGroup('radial');
  else backCompass();
}
