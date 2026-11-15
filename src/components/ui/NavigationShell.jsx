import { useEffect, useRef } from "react";
import { COMPASS_MENUS, DIRECTIONS, useNavigationStore } from "../../systems/ui/navigationStore";
import { confirmCompass, runNavigationAction, returnToWorldView } from "../../systems/ui/navigationActions";
import { clearGameplayInput, getInputContext, isTextInput } from "../../systems/input/inputOwnership";
import { useHistoryStore } from "../../systems/history/historyStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { saveWorldSettings, loadWorldSettings } from "../../systems/terrain/terrainSettings";
import { hasSavedWorld } from "../../systems/world/worldPersistence";
import "./NavigationShell.css";

export function NatureIcon({ name, ...props }) {
  return <img src={`/icons/lucide/${name}.svg`} alt="" aria-hidden="true" className="tg-hud-icon" {...props} />;
}
function RadialCompass() {
  const savedWorldAvailable = useWorldStore(() => hasSavedWorld());
  const menu = useNavigationStore(state => state.menu);
  const selected = useNavigationStore(state => state.selected);
  const trail = useNavigationStore(state => state.trail);
  const root = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    clearGameplayInput();
    // End any existing pointer orbit/brush gesture before taking ownership.
    window.dispatchEvent(new PointerEvent("pointerup"));
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { root.current?.querySelector(`[data-direction="${selected}"],[data-compass-action="${selected}"]`)?.focus(); }, [selected, menu]);
  const undo = useHistoryStore(state => state.undoStack.length > 0);
  const redo = useHistoryStore(state => state.redoStack.length > 0);
  return <div className="tg-compass-overlay" role="dialog" aria-modal="true" aria-label={`${menu} compass`} data-compass ref={root}>
    <header className="tg-compass-header tg-hud-surface">
      <img className="tg-brand-vector" src="/brand/TG-Logo wide.svg" alt="Testing Grounds" />
      <button className="tg-ui-button" disabled={!undo} onClick={() => useHistoryStore.getState().undo()}>UNDO</button>
      <button className="tg-ui-button" disabled={!redo} onClick={() => useHistoryStore.getState().redo()}>REDO</button>
      <div className="tg-compass-top-actions">
        <button className="tg-ui-button" data-compass-action="editor-view" onFocus={() => useNavigationStore.getState().select("editor-view")} onClick={() => runNavigationAction("editor-view")}>EDITOR VIEW</button>
        <button className="tg-ui-button" data-compass-action="tools" onFocus={() => useNavigationStore.getState().select("tools")} onClick={() => useNavigationStore.getState().enterMenu("tools")}>TOOLS</button>
        <button className="tg-ui-button" data-compass-action="world-view" onFocus={() => useNavigationStore.getState().select("world-view")} onClick={returnToWorldView}>WORLD VIEW</button>
      </div>
    </header>
    <h1 className="tg-compass-title">{menu.toUpperCase()} //</h1>
    <div className="tg-compass-layout">
      <div className="tg-compass-ring" aria-hidden="true"><img src="/brand/TCompass.svg" alt="" className="tg-brand-vector" /><span /></div>
      {COMPASS_MENUS[menu].map((entry, index) => <button key={entry.label}
        className={`tg-compass-destination ${DIRECTIONS[index]} ${selected === DIRECTIONS[index] ? "selected" : ""}`}
        data-direction={DIRECTIONS[index]} aria-pressed={selected === DIRECTIONS[index]}
        onMouseEnter={() => useNavigationStore.getState().select(DIRECTIONS[index])}
        onFocus={() => useNavigationStore.getState().select(DIRECTIONS[index])}
        onClick={() => { useNavigationStore.getState().select(DIRECTIONS[index]); confirmCompass(); }}>
        <span className="tg-compass-icon"><NatureIcon name={entry.icon} /></span>
        <span><small>{menu.toUpperCase()} //</small><strong>{entry.label}</strong></span>
      </button>)}
    </div>
    <aside className="tg-compass-quick"><h2>QUICK TOOLS //</h2>{[["river","droplets","Draw River"],["sun","sun","Move Sun"],["clouds","cloud","Edit Clouds"],["terrain","mountain","Edit Terrain"]].map(([action,icon,label]) => <button className="tg-ui-button" key={action} onClick={() => runNavigationAction(action)}><NatureIcon name={icon} />{label}</button>)}</aside>
    <footer className="tg-compass-footer tg-hud-surface"><button className="tg-ui-button" data-compass-action="parent" disabled={trail.length <= 1} onFocus={() => useNavigationStore.getState().select("parent")} onClick={() => useNavigationStore.getState().back()}>PARENT</button><span>Arrows / D-pad: select (Up twice: header) / Enter / A: confirm / Escape / B: World View</span><button className="tg-ui-button" onClick={saveWorldSettings}>SAVE WORLD</button><button className="tg-ui-button" disabled={!savedWorldAvailable} onClick={() => { loadWorldSettings(); useNavigationStore.getState().closeCompass(); }}>LOAD WORLD</button></footer>
  </div>;
}
export default function NavigationShell() {
  const open = useNavigationStore(state => state.compassOpen);
  const help = useNavigationStore(state => state.helpOpen);
  const helpRef = useRef(null);
  useEffect(() => {
    function handleKey(event) {
      const nav = useNavigationStore.getState();
      if (nav.helpOpen) {
        if (event.key === "Tab") { event.preventDefault(); event.stopImmediatePropagation(); document.querySelector(".tg-help-dialog button")?.focus(); return; }
        if (event.key === "Escape") { nav.setHelp(false); event.preventDefault(); event.stopImmediatePropagation(); }
        return;
      }
      if (nav.compassOpen) {
        const direction = { ArrowUp: "north", ArrowRight: "east", ArrowDown: "south", ArrowLeft: "west" }[event.key];
        if (direction || ["Enter","Escape","Tab"," "].includes(event.key)) {
          event.preventDefault(); event.stopImmediatePropagation();
          if (event.repeat) return;
          if (direction) nav.navigate(direction);
          else if (event.key === "Enter" || event.key === " ") {
            if (document.activeElement?.matches("[data-direction]")) confirmCompass();
            else document.activeElement?.click?.();
          } else if (event.key === "Escape") returnToWorldView();
          else {
            const controls = [...document.querySelectorAll('[data-compass] button:not([disabled])')];
            const index = controls.indexOf(document.activeElement);
            controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
          }
        }
        return;
      }
      if (event.key === "Tab" && !event.repeat && !isTextInput(event.target) && getInputContext() === "world") {
        event.preventDefault(); event.stopImmediatePropagation(); clearGameplayInput(); nav.openCompass();
      }
    }
    const releaseOnFocus = () => { if (getInputContext() !== "world") { clearGameplayInput(); window.dispatchEvent(new CustomEvent("mobile-camera-input", { detail: { x: 0, y: 0 } })); } };
    document.addEventListener("focusin", releaseOnFocus);
    window.addEventListener("blur", clearGameplayInput);
    window.addEventListener("keydown", handleKey, true);
    return () => { window.removeEventListener("keydown", handleKey, true); document.removeEventListener("focusin", releaseOnFocus); window.removeEventListener("blur", clearGameplayInput); };
  }, []);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement;
    helpRef.current?.querySelector("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [help]);
  return <>
    <button className="tg-compass-activate" aria-label="Open world compass" aria-haspopup="dialog" aria-expanded={open} onClick={() => { clearGameplayInput(); useNavigationStore.getState().openCompass(); }}><img className="tg-brand-vector" src="/brand/TCompass.svg" alt="" /></button>
    {open && <RadialCompass />}
    {help && <section className="tg-help-dialog tg-hud-surface" role="dialog" aria-modal="true" aria-label="Testing Grounds help" ref={helpRef}>
      <button className="tg-ui-button" onClick={() => useNavigationStore.getState().setHelp(false)}>CLOSE HELP</button>
      <h2>WORLD // CONTROLS</h2><p>WASD / left stick: move. Drag the viewport / right stick: look. Tab / Menu: open compass. Arrows / D-pad / left stick: select. Enter / A: confirm. Escape / B: World View.</p>
      <p>The Compass toggles World / Map, Objects / Library, World Editor and Dev Tools independently. Editor View starts with all four open. Use − and + to collapse and restore panels. World View closes all panels without clearing the active tool.</p><p>Choose Tools in the compass for direct world editing. Use Library for placement and Scatter for populations. Escape / B or Back to Library ends Library-origin placement and restores your browsing position. In panels use D-pad to focus controls and A to select. Click the viewport to resume world controls.</p>
    </section>}
  </>;
}
