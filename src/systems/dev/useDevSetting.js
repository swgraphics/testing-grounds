import { useSyncExternalStore } from 'react';
import { devSettings } from './devSettings';
const subscribe = callback => { window.addEventListener('dev-settings-changed', callback); return () => window.removeEventListener('dev-settings-changed', callback); };
export function useDevSetting(key) { return useSyncExternalStore(subscribe, () => devSettings[key], () => devSettings[key]); }
