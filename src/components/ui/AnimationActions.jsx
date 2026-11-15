import { useEffect, useState } from "react";
import { activeCharacterId } from "../character/characterRegistry";
import { UNIVERSAL_ANIMATION_LIBRARY } from "../../config/universalAnimationLibrary";

export default function AnimationActions() {
  const [currentCharacterId, setCurrentCharacterId] = useState(activeCharacterId);
  useEffect(() => {
    const changed = event => { if (event.detail?.characterId) setCurrentCharacterId(event.detail.characterId); };
    window.addEventListener("change-character", changed);
    return () => window.removeEventListener("change-character", changed);
  }, []);
  return (
  <div className="tg-animation-library-ui">
    <p className="tg-library-guidance">ACTIVE CHARACTER: {currentCharacterId.toUpperCase()} - actions control this character.</p>
    {currentCharacterId.startsWith("crashTester") ? (
      <div className="tg-animation-library-panel" role="dialog" aria-label="Animation action library">
        <div className="tg-animation-library-heading">UNIVERSAL ANIMATION LIBRARY</div>
        <div className="tg-animation-library-hint">Choose an action to play on the active Crash Tester. Looping clips play for 4 seconds; one-shots return to normal movement.</div>
        {[
          ["movement", "MOVEMENT & TRAVERSAL"],
          ["combat", "COMBAT & REACTIONS"],
          ["interaction", "INTERACTIONS"],
          ["emote", "IDLES & EMOTES"],
        ].map(([category, label]) => {
          const clips = UNIVERSAL_ANIMATION_LIBRARY.filter((clip) => clip.category === category);
          if (!clips.length) return null;
          return (
            <section className="tg-animation-library-category" key={category}>
              <div className="tg-animation-library-category-title">{label}</div>
              <div className="tg-animation-library-grid">
                {clips.map((clip) => (
                  <button
                    type="button"
                    className="tg-animation-library-action"
                    key={clip.id}
                    title={`${clip.label} — ${clip.pack}`}
                    onClick={() => {
                      const looping = /Loop$/.test(clip.clipName) || clip.clipName === "Dance_Loop";
                      const duration = looping ? 4000 : 1400;
                      window.dispatchEvent(new CustomEvent("crash-unit-action", { detail: { action: clip.id, duration } }));
                    }}
                  >
                    {clip.label}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    ) : <p role="status">The current character has no compatible Animation Actions. Select a Crash Tester in Dev Tools.</p>}
  </div>
  );
}
