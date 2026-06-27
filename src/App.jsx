import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Stats } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import TestingGrounds from "./scenes/TestingGrounds";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "action1", keys: ["KeyE"] },
  { name: "action2", keys: ["KeyF"] },
  { name: "action3", keys: ["KeyQ"] },
  { name: "action4", keys: ["KeyR"] },
];

export default function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ position: [20, 18, 20], fov: 55 }}>
        <color attach="background" args={["#050608"]} />

        <Physics gravity={[0, -9.81, 0]}>
          <TestingGrounds />
        </Physics>

        <Stats />
      </Canvas>
    </KeyboardControls>
  );
}