import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import AreaDiscovery from "./components/ui/AreaDiscovery";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import TestingGrounds from "./scenes/TestingGrounds";
import InputHUD from "./components/ui/InputHUD";
import TitleScreen from "./components/ui/TitleScreen";
import CompassRibbon from "./components/ui/CompassRibbon";
import EditorView from "./components/ui/EditorView";
import InteractionIndicator from "./components/ui/InteractionIndicator";
import { useEditorStore } from "./systems/editor/editorStore";
import { useInteractionStore } from "./systems/interaction/interactionStore";
import { AREA_CONFIG } from "./config/areaConfig";
import { useWorldStore } from "./systems/world/worldStore";
import {
  showLoadingOverlay,
  hideLoadingOverlay,
} from "./systems/ui/loadingOverlay";


function PlaceModeExit() {
  return (
    <button
      type="button"
      className="tg-place-mode-exit"
      aria-label="Exit placement mode"
      onClick={() => window.dispatchEvent(new CustomEvent("tg-place-mode-exit"))}
    >
      ×
    </button>
  );
}

/* Testing Grounds shell: world state and editor state are intentionally kept outside the 3D render tree. */
export default function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const initializeWorld = useWorldStore((state) => state.initializeWorld);
  const editorOpen = useEditorStore((state) => state.isOpen);
  const placeMode = useInteractionStore((state) => state.activeMode === "place");
  const [returnToObjectMenu, setReturnToObjectMenu] = useState(false);

  useEffect(() => {
    initializeWorld(AREA_CONFIG);
  }, [initializeWorld]);

  useEffect(() => {
    function handlePlacementExitRequest(event) {
      if (useInteractionStore.getState().activeMode !== "place") return;
      event.preventDefault?.();
      setReturnToObjectMenu(true);
      window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
    }

    function handleEscape(event) {
      if (event.key !== "Escape") return;
      if (useInteractionStore.getState().activeMode !== "place") return;
      event.preventDefault();
      event.stopPropagation();
      setReturnToObjectMenu(true);
      window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
    }

    window.addEventListener("tg-place-mode-exit", handlePlacementExitRequest);
    window.addEventListener("keydown", handleEscape, true);

    return () => {
      window.removeEventListener("tg-place-mode-exit", handlePlacementExitRequest);
      window.removeEventListener("keydown", handleEscape, true);
    };
  }, []);

  useEffect(() => {
    if (placeMode || !returnToObjectMenu || showTitleScreen) return;

    setReturnToObjectMenu(false);
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("tg-mesh-menu-open"));
    });
  }, [placeMode, returnToObjectMenu, showTitleScreen]);

  const [loadingVisible, setLoadingVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] =
    useState("LOADING WORLD");

  useEffect(() => {
    function handleLoadingStart(event) {
      setLoadingMessage(
        event.detail?.message || "LOADING WORLD"
      );

      setLoadingVisible(true);
    }

    function handleLoadingEnd() {
      setLoadingVisible(false);
    }

    window.addEventListener(
      "tg-loading-start",
      handleLoadingStart
    );

    window.addEventListener(
      "tg-loading-end",
      handleLoadingEnd
    );

    return () => {
      window.removeEventListener(
        "tg-loading-start",
        handleLoadingStart
      );

      window.removeEventListener(
        "tg-loading-end",
        handleLoadingEnd
      );
    };
  }, []);

  function handleStartWorld() {
    showLoadingOverlay("LOADING WORLD");

    /*
     * Hide the title screen and mount the player/HUD.
     */
    setShowTitleScreen(false);

    /*
     * Wait for React and the browser to render the
     * gameplay view before removing the overlay.
     */
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          hideLoadingOverlay();
        }, 900);
      });
    });
  }

  return (
    <>
      <div className={`tg-canvas-shell ${editorOpen && !placeMode ? "editor-open" : ""}`}>
        <Canvas
          shadows
          camera={{
            position: [20, 18, 20],
            fov: 55,
          }}
        >
          <color
            attach="background"
            args={["#050608"]}
          />

          <Physics gravity={[0, -9.81, 0]}>
            <TestingGrounds
              titleMode={showTitleScreen}
            />
          </Physics>
        </Canvas>
      </div>

      {!showTitleScreen && !placeMode && (
        <>
          <InputHUD />
          <CompassRibbon />
          <AreaDiscovery />
          <InteractionIndicator />
          <EditorView />
        </>
      )}

      {!showTitleScreen && placeMode && <PlaceModeExit />}

      {showTitleScreen && (
        <TitleScreen
          onStart={handleStartWorld}
        />
      )}

      <LoadingOverlay
        visible={loadingVisible}
        message={loadingMessage}
      />
    </>
  );
}