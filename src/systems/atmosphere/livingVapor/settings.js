// Living Vapor objects coexist with TG's procedural sky clouds.
export const MAX_CLOUDS = 6;
export const SIM_BUDGET_MS = 5;
export const DEFAULT_CLOUD = Object.freeze({ density: 0.8, persistencePercent: 90, radius: 0.38, fill: false, cage: true });

// Below 100%, tau = 2 * 120^(p/99) seconds (2..240 s, exponential decay).
// Infinity is an explicit solver mode, never a large finite lifetime.
export function persistenceSeconds(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return p === 100 ? Infinity : 2 * Math.pow(120, p / 99);
}

export function cageIsVisible(guides, preference) { return Boolean(guides && preference); }
