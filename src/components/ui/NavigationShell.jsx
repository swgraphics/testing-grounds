import { useEffect, useRef, useSyncExternalStore } from "react";
import { COMPASS_MENUS, DIRECTIONS, useNavigationStore } from "../../systems/ui/navigationStore";
import CompassShortcuts from "./CompassShortcuts";
import CompassQuickTools from "./CompassQuickTools";
import { navigateCompass, confirmCompassFocus, backCompassFocus } from "../../systems/ui/compassFocus";
import { confirmCompass, runNavigationAction, activateCompassControl, backCompass } from "../../systems/ui/navigationActions";
import { endAdjustment } from "../../systems/ui/controlAdjustment";
import { clearGameplayInput, getInputContext, isTextInput } from "../../systems/input/inputOwnership";
import { useWorldStore } from "../../systems/world/worldStore";
import { saveWorldSettings, loadWorldSettings } from "../../systems/terrain/terrainSettings";
import { hasSavedWorld } from "../../systems/world/worldPersistence";
import { useEditorStore } from '../../systems/editor/editorStore';
import { useInteractionStore } from '../../systems/interaction/interactionStore';
import { useTerrainExportStore } from '../../systems/terrain/terrainExportStore';
import { compassControlState, hasBlockingInterface } from '../../systems/ui/compassState';
import "./NavigationShell.css";
const subscribeInterfaces=listener=>{const observer=new MutationObserver(listener);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-modal']});return()=>observer.disconnect()};
const interfaceSnapshot=()=>hasBlockingInterface();

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
    endAdjustment(); clearGameplayInput();
    // End any existing pointer orbit/brush gesture before taking ownership.
    window.dispatchEvent(new PointerEvent("pointerup"));
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { root.current?.querySelector(`[data-direction="${selected}"],[data-compass-action="${selected}"]`)?.focus(); }, [selected, menu]);
  return <div className="tg-compass-overlay" role="dialog" aria-modal="true" aria-label={`${menu} compass`} data-compass data-depth={trail.length > 1 ? "secondary" : "primary"} data-cardinal-active={DIRECTIONS.includes(selected)} style={{ "--tg-point-x": {north:"50%",south:"50%",west:"0%",east:"100%"}[selected], "--tg-point-y": {north:"0%",south:"100%",west:"50%",east:"50%"}[selected] }} ref={root}>
    <header className="tg-compass-header">
      <img className="tg-brand-vector" src="/brand/TG-Logo wide.svg" alt="Testing Grounds" />
      <div className="tg-compass-top-actions">
        <button className="tg-ui-button" data-compass-action="editor-view" onFocus={() => useNavigationStore.getState().select("editor-view")} onClick={() => runNavigationAction("editor-view")}>EDITOR VIEW</button>
        <button className="tg-ui-button" data-compass-action="tools" onFocus={() => useNavigationStore.getState().select("tools")} onClick={() => useNavigationStore.getState().enterMenu("tools")}>TOOLS</button>
      </div>
    </header>
    <h1 className="tg-compass-title">{menu.toUpperCase()} //</h1>
    <div className="tg-compass-layout" data-compass-group="radial">
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
    <CompassShortcuts />
    <CompassQuickTools />
    <footer className="tg-compass-footer"><button className="tg-ui-button" data-compass-action="parent" aria-label="Back" onFocus={() => useNavigationStore.getState().select("parent")} onClick={backCompass}>BACK</button><button className="tg-ui-button" onClick={saveWorldSettings}>SAVE WORLD</button><button className="tg-ui-button" disabled={!savedWorldAvailable} onClick={() => { loadWorldSettings(); useNavigationStore.getState().closeCompass(); }}>LOAD WORLD</button></footer>
  </div>;
}
export default function NavigationShell() {
  const navigation=useNavigationStore(state=>state);
  const editor=useEditorStore(state=>state);
  const interaction=useInteractionStore(state=>state);
  const exportOpen=useTerrainExportStore(state=>state.open);
  const blocking=useSyncExternalStore(subscribeInterfaces,interfaceSnapshot,()=>false);
  const state=compassControlState(navigation,editor,interaction,blocking||exportOpen);
  const open=navigation.compassOpen&&editor.viewMode!=='editor';
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
        const picker = document.querySelector('.tg-shortcut-picker');
        if (picker && event.target?.matches('input[type="search"]') && ['ArrowLeft','ArrowRight','Home','End',' '].includes(event.key)) return;
        const direction = { ArrowUp: "north", ArrowRight: "east", ArrowDown: "south", ArrowLeft: "west" }[event.key];
        if (direction || ["Enter","Escape","Tab"," "].includes(event.key)) {
          event.preventDefault(); event.stopImmediatePropagation();
          if (event.repeat) return;
          if (direction) navigateCompass(direction);
          else if (event.key === "Enter" || event.key === " ") {
            confirmCompassFocus();
          } else if (event.key === "Escape") backCompassFocus();
          else {
            const scope = picker || document.querySelector('[data-compass]');
            const controls = [...scope.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(e=>e.getClientRects().length);
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
    <button type="button" className="tg-compass-activate" data-compass-state={{world:'orange',interface:'white',tool:'blue'}[state]} aria-label={state==='world'?'Open world compass':'Return to world'} aria-haspopup={state==='world'?'dialog':undefined} aria-expanded={open} onPointerDown={event=>event.stopPropagation()} onClick={activateCompassControl}><span className="tg-compass-control-mark" aria-hidden="true" /></button>
    {open && <><div className="tg-compass-backdrop" aria-hidden="true" /><RadialCompass /></>}
    {help && <section className="tg-help-dialog tg-hud-surface" role="dialog" aria-modal="true" aria-label="Testing Grounds help" ref={helpRef}>
      <button className="tg-ui-button" onClick={() => useNavigationStore.getState().setHelp(false)}>CLOSE HELP</button>
      <h2>WORLD // CONTROLS</h2><p>WASD / left stick: move. Drag the viewport / right stick: look. Tab / Menu: open compass. Arrows / D-pad / left stick: select. Enter / A: confirm. Escape / B: back or close Compass.</p>
      <p>The Compass toggles World / Map, Objects / Library, World Editor and Dev Tools independently. Editor View starts with all four open. Use − and + to collapse and restore panels. The Compass icon returns directly to a clean world and exits the active tool. North is World Editor; West is World Map.</p><p>Choose Tools in the compass for direct world editing. Use Library for placement and Scatter for populations. Escape / B or Back to Library ends Library-origin placement and restores your browsing position. In Compass use LB/RB to switch between directions, Quick Tools and Shortcuts. In panels use D-pad or left stick to focus controls, LB/RB to switch open panels, and A to select. On sliders and lists, A starts adjustment; B or A finishes adjustment. Click the viewport to resume world controls.</p>
    </section>}
  </>;
}
