import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import TestingGrounds from "./scenes/TestingGrounds";
import InputHUD from "./components/ui/InputHUD";
import TitleScreen from "./components/ui/TitleScreen";
import CompassBar from "./components/ui/CompassBar";

export default function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);

  return (
    <>
      <Canvas shadows camera={{ position: [20, 18, 20], fov: 55 }}>
        <color attach="background" args={["#050608"]} />

        <Physics gravity={[0, -9.81, 0]}>
          <TestingGrounds titleMode={showTitleScreen} />
        </Physics>

        <Stats />
      </Canvas>

      {!showTitleScreen && (
  <>
    <CompassBar />
    <InputHUD />
  </>
)}

      {showTitleScreen && (
        <TitleScreen onStart={() => setShowTitleScreen(false)} />
      )}
    </>
  );
}