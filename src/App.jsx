import NavigationShell from "./components/ui/NavigationShell";
import { returnToWorldView, backFromObjectPlacement, focusPanel } from "./systems/ui/navigationActions";
import { clearGameplayInput } from "./systems/input/inputOwnership";
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
import EditorView from "./components/ui/EditorView";
import WorldToolLifecycle from "./components/ui/WorldToolLifecycle";
import CrimsonTreeInteractionPanel from "./components/ui/CrimsonTreeInteractionPanel";
import AdaptiveReticle from "./components/ui/AdaptiveReticle";
import CloudInteractionPanel from './components/ui/CloudInteractionPanel';
import CanyonEdgeControls from "./components/ui/CanyonEdgeControls";
import GeologySelectionActions from './components/ui/GeologySelectionActions';
import { endAdjustment } from "./systems/ui/controlAdjustment";
import GamepadMenuNavigator from "./components/ui/GamepadMenuNavigator";
import LeafVertexEditorWindow from "./components/ui/LeafVertexEditorWindow";
import MeshMenu from "./components/ui/MeshMenu";
import { useEditorStore, panelLayoutStyle } from "./systems/editor/editorStore";
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
  const visiblePanels = useEditorStore(state => state.visiblePanels);
  const worldMapSize = useEditorStore(state => state.worldMapSize);
  const viewMode = useEditorStore(state => state.viewMode);
  const panelsOpen = Object.values(visiblePanels).some(Boolean);
  const [devToolsHost, setDevToolsHost] = useState(null);
  const [libraryHost, setLibraryHost] = useState(null);
  const worldType = useWorldStore((state) => state.world.worldType);
  const spatialTerrain = useWorldStore((state) => Boolean(state.world.terrainSurface));
  const placeMode = useInteractionStore((state) => state.activeMode === "place");

  useEffect(() => {
    initializeWorld(AREA_CONFIG);
    clearHistory();
  }, [initializeWorld]);

  useEffect(() => {
    function handlePlacementExitRequest(event) {
      if (backFromObjectPlacement()) event.preventDefault?.();
    }
    function handlePlacementStart(event) {
      if (event.detail?.mesh) useNavigationStore.getState().setPlacementOrigin(event.detail.origin === "south" ? "south" : null);
    }

    function handleEscape(event) {
      if (event.key !== "Escape") return;
      if (useNavigationStore.getState().compassOpen || useNavigationStore.getState().helpOpen) return;
      if (endAdjustment()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if(!window.dispatchEvent(new Event('tg-cancel-tool-preview',{cancelable:true}))){event.preventDefault();event.stopImmediatePropagation();return;}
      if (document.querySelector('.tg-leaf-editor-window')) {
        window.dispatchEvent(new CustomEvent('tg-leaf-editor-close'));
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (!document.querySelector('.tg-mesh-edit-backdrop') && document.querySelector('.tg-tree-interaction-panel')) {
        window.dispatchEvent(new CustomEvent('crimson-tree-edit-exit-request'));
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      const panelMenu = event.target?.closest?.(".tg-panel-visibility[open]");
      if (panelMenu) {
        panelMenu.open = false; panelMenu.querySelector("summary")?.focus();
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      // Let inline rename fields cancel before a shell dismissal can blur/save them.
      if (event.target?.matches?.('.tg-editor-area-rename-input,.tg-mesh-card-rename-input')) return;
      if (useNavigationStore.getState().compassOpen || useNavigationStore.getState().helpOpen) return;
      if (document.querySelector(".tg-terrain-export")) {
        const closeButton = document.querySelector('.tg-terrain-export [aria-label="Close terrain export"]');
        if (!closeButton?.disabled) useTerrainExportStore.getState().setOpen(false);
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (document.querySelector(".tg-chunk-dialog,.tg-mesh-edit-backdrop")) return;
      if (backFromObjectPlacement()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      const editor = useEditorStore.getState();
      if (Object.values(editor.visiblePanels).some(Boolean)) {
        const direction = event.target?.closest?.("[data-directional-panel]")?.dataset.directionalPanel;
        if (direction) {
          editor.closePanel(direction); clearGameplayInput(); document.activeElement?.blur?.();
          const next = Object.keys(editor.visiblePanels).find(key => key !== direction && editor.visiblePanels[key]);
          if (next) focusPanel(next);
        }
        else returnToWorldView();
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if (event.target?.closest?.(".tg-terrain-export,.tg-chunk-dialog,.tg-mesh-edit-backdrop")) return;
      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent("tg-mesh-cancel-placement"));
      window.dispatchEvent(new CustomEvent("tg-mesh-menu-close"));
      useInteractionStore.getState().clear();
      useEditorStore.getState().closeDevTools();
      useEditorStore.getState().close();
    }

    function onWorldPointerDown(event) {
      if (event.target !== document.querySelector('.tg-canvas-shell canvas')) return;
      endAdjustment();document.activeElement?.blur?.();
      if (!useNavigationStore.getState().compassOpen) return;
      useNavigationStore.getState().closeCompass();
      clearGameplayInput(); document.activeElement?.blur?.();
      window.requestAnimationFrame(() => { if (!useNavigationStore.getState().compassOpen) document.activeElement?.blur?.(); });
    }
    window.addEventListener('pointerdown', onWorldPointerDown, true);
    window.addEventListener("tg-place-mode-exit", handlePlacementExitRequest);
    window.addEventListener("tg-mesh-place-request", handlePlacementStart);
    window.addEventListener("keydown", handleEscape, true);
    return () => {
      window.removeEventListener('pointerdown', onWorldPointerDown, true);
      window.removeEventListener("tg-place-mode-exit", handlePlacementExitRequest);
      window.removeEventListener("tg-mesh-place-request", handlePlacementStart);
      window.removeEventListener("keydown", handleEscape, true);
    };
  }, []);

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
      <div style={panelLayoutStyle(visiblePanels, worldMapSize)} data-view-mode={viewMode} className={`tg-canvas-shell ${panelsOpen && viewMode === "editor" ? "editor-open" : "world-overlay"}`}>
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
        {!showTitleScreen && !placeMode && <AdaptiveReticle />}
      </div>

      {!showTitleScreen && !placeMode && (
        <>
          {(worldType !== "blank" || spatialTerrain) && <AreaDiscovery />}
          <CrimsonTreeInteractionPanel />
          <LeafVertexEditorWindow />
          <CloudInteractionPanel />
          <GeologySelectionActions />
          <CanyonEdgeControls />
        </>
      )}

      {!showTitleScreen && <><WorldToolLifecycle /><InputHUD devToolsHost={devToolsHost} /><EditorView onDevToolsHost={setDevToolsHost} onLibraryHost={setLibraryHost} /><MeshMenu host={libraryHost} /></>}
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
