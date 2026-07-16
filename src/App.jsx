import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import AreaDiscovery from "./components/ui/AreaDiscovery";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import TestingGrounds from "./scenes/TestingGrounds";
import InputHUD from "./components/ui/InputHUD";
import TitleScreen from "./components/ui/TitleScreen";
import CompassRibbon from "./components/ui/CompassRibbon";
import {
  showLoadingOverlay,
  hideLoadingOverlay,
} from "./systems/ui/loadingOverlay";

export default function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);

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

        <Stats />
      </Canvas>

      {!showTitleScreen && (
  <>
    <InputHUD />
    <CompassRibbon />
    <AreaDiscovery />
  </>
)}

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