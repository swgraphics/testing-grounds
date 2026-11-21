import { useEffect } from "react";
import { version } from "../../../package.json";
import "./TitleScreen.css";

export default function TitleScreen({ onStart, onLoad, hasSavedWorld }) {
  useEffect(() => {
    const start = () => onStart("default");
    window.addEventListener("tg-gamepad-start", start);
    return () => window.removeEventListener("tg-gamepad-start", start);
  }, [onStart]);

  return (
    <div className="tg-title-screen tg-title-v3" data-input-context="title">
      <div className="tg-title-frame" aria-hidden="true" />
      <main className="tg-title-content" aria-labelledby="tg-title-heading">
        <img className="tg-title-brand tg-brand-vector" src="/brand/TG_Logo_landscape.svg" alt="Testing Grounds" />
        <h1 id="tg-title-heading">WELCOME!</h1>
        <p className="tg-title-intro">
          Testing Grounds combines procedural world generation, real-time 3D rendering, environmental systems, character exploration, physics, and live development controls into a single interactive environment.
        </p>
        <div className="tg-title-actions" aria-label="Starting world">
          <button type="button" className="tg-title-enter" data-title-action="enter" onClick={() => onStart("default")}>ENTER WORLD</button>
          <button type="button" className="tg-title-blank" data-title-action="blank" onClick={() => onStart("blank")}>BLANK CANVAS</button>
        </div>
        <button type="button" className="tg-title-load" data-title-action="load" onClick={onLoad} disabled={!hasSavedWorld}>LOAD SAVED WORLD</button>
      </main>
      <footer className="tg-title-credits">
        <span>CREATED BY STEPHEN WILSON</span>
        <div className="tg-title-signature">
          <img src="/brand/TCompass.svg" alt="" className="tg-title-compass tg-brand-vector" />
          <span className="tg-title-version">v{version}</span>
        </div>
      </footer>
    </div>
  );
}
