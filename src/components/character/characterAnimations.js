import { AnimationClip } from "three";

// Keep one mixer while exposing both gameplay aliases and library clip names.
export function buildCharacterClips(character, embedded, universal, universal2) {
  const isCrashTester = character.family === "crashTester";
  const source = isCrashTester ? [...embedded, ...universal, ...universal2] : embedded;
  const clips = new Map();
  for (const clip of source) if (!clips.has(clip.name)) clips.set(clip.name, clip);
  const result = new Map();
  for (const [name, clip] of clips) {
    if (isCrashTester && (name.startsWith("A_TPose") || (/\.\d+$/.test(name) && clips.has(name.replace(/\.\d+$/, ""))))) continue;
    const aliases = Object.entries(character.animationMap ?? {}).filter(([, original]) => original === name).map(([alias]) => alias);
    const names = isCrashTester ? [name, ...aliases] : [aliases[0] ?? name];
    for (const actionName of names) {
      if (result.has(actionName)) continue;
      // Mixer actions have their own identity but share immutable track data.
      const copy = new AnimationClip(actionName, clip.duration, clip.tracks, clip.blendMode);
      result.set(actionName, copy);
    }
  }
  return [...result.values()];
}
