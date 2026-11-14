import NavigationShell from "./components/ui/NavigationShell";
import { returnToWorldView } from "./systems/ui/navigationActions";
import { useTerrainExportStore } from "./systems/terrain/terrainExportStore";
import { useNavigationStore } from "./systems/ui/navigationStore";
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
import InteractionPanel from "./components/ui/InteractionPanel";
import CrimsonTreeInteractionPanel from "./components/ui/CrimsonTreeInteractionPanel";
import AdaptiveReticle from "./components/ui/AdaptiveReticle";
import GamepadMenuNavigator from "./components/ui/GamepadMenuNavigator";
import LeafVertexEditorWindow from "./components/ui/LeafVertexEditorWindow";
import MeshMenu from "./components/ui/MeshMenu";
import { useEditorStore } from "./systems/editor/editorStore";
import { useInteractionStore } from "./systems/interaction/interactionStore";
import { AREA_CONFIG } from "./config/areaConfig";
import { useWorldStore } from "./systems/world/worldStore";
import { clearHistory } from "./systems/history/historyStore";
import {
  loadWorldSettings,
  initializeBlankCanvasTerrain,
  loadChunkTerrainSettings,
} from "./systems/terrain/terrainSettings";
import { hasSavedWorld } from "./systems/world/worldPersistence";
import { updateDevSetting } from "./systems/dev/devSettings";
import {
  showLoadingOverlay,
  hideLoadingOverlay,
} from "./systems/ui/loadingOverlay";



/* Testing Grounds shell: world state and editor state are intentionally kept outside the 3D render tree. */
export default function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const initializeWorld = useWorldStore((state) => state.initializeWorld);
  const editorOpen = useEditorStore((state) => state.isOpen);
  const worldType = useWorldStore((state) => state.world.worldType);
  const placeMode = useInteractionStore((state) => state.activeMode === "place");
  const [returnToObjectMenu, setReturnToObjectMenu] = useState(false);

  useEffect(() => {
    initializeWorld(AREA_CONFIG);
    clearHistory();
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
      // Let inline rename fields cancel before a shell dismissal can blur/save them.
      if (event.target?.matches?.('.tg-editor-area-rename-input,.tg-mesh-card-rename-input')) return;
      if (useNavigationStore.getState().compassOpen || useNavigationStore.getState().helpOpen) return;
      if (document.querySelector(".tg-terrain-export")) {
        const closeButton = document.querySelector('.tg-terrain-export [aria-label="Close terrain export"]');
        if (!closeButton?.disabled) useTerrainExportStore.getState().setOpen(false);
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (document.querySelector(".tg-chunk-dialog,.tg-mesh-edit-backdrop,.tg-mesh-menu")) return;
      const editor = useEditorStore.getState();
      if (editor.devToolsOpen || editor.devToolsPanelOpen) {
        editor.closeDevTools(); document.activeElement?.blur?.();
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (useInteractionStore.getState().panelOpen) {
        useInteractionStore.getState().closePanel();
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (editor.isOpen) {
        const id = event.target?.closest?.('[id^="tg-panel-"]')?.id?.slice(9);
        if (id && id in editor.panels) editor.setPanel(id, false);
        else returnToWorldView();
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (event.target?.closest?.(".tg-terrain-export,.tg-chunk-dialog,.tg-mesh-edit-backdrop")) return;
      event.preventDefault();
      event.stopPropagation();
      setReturnToObjectMenu(false);
      window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
      window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
      useInteractionStore.getState().clear();
      useEditorStore.getState().closeDevTools();
      useEditorStore.getState().close();
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

  function finishWorldStart() {
    setShowTitleScreen(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => hideLoadingOverlay(), 900);
      });
    });
  }

  function handleStartWorld(startMode = "default") {
    showLoadingOverlay(startMode === "blank" ? "CREATING BLANK CANVAS" : "LOADING WORLD");

    if (startMode === "blank") {
      useWorldStore.getState().initializeBlankWorld();
      initializeBlankCanvasTerrain();
      updateDevSetting("fpvMode", true);
    } else {
      initializeWorld(AREA_CONFIG);
      loadChunkTerrainSettings(useWorldStore.getState().world.currentChunkId);
    }

    finishWorldStart();
  }

  function handleLoadWorld() {
    if (!hasSavedWorld()) return;
    showLoadingOverlay("LOADING SAVED WORLD");
    loadWorldSettings();
    clearHistory();
    finishWorldStart();
  }

  return (
    <>
      <div className={`tg-canvas-shell ${editorOpen ? "editor-open" : ""}`}>
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
          <CompassRibbon />
          {worldType !== "blank" && <AreaDiscovery />}
          <InteractionPanel />
          <CrimsonTreeInteractionPanel />
          <LeafVertexEditorWindow />
          <AdaptiveReticle />
        </>
      )}

      {!showTitleScreen && <><InputHUD /><EditorView /><MeshMenu /></>}
      {!showTitleScreen && <NavigationShell />}
      <GamepadMenuNavigator />

      {showTitleScreen && (
        <TitleScreen
          onStart={handleStartWorld}
          onLoad={handleLoadWorld}
          hasSavedWorld={hasSavedWorld()}
        />
      )}

      <LoadingOverlay
        visible={loadingVisible}
        message={loadingMessage}
      />
    </>
  );
}
