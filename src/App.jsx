import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Stats } from "@react-three/drei";

import TestingGrounds from "./scenes/TestingGrounds";

export default function App() {
  return (
    <Canvas
      shadows
      camera={{
        position: [20, 18, 20],
        fov: 55,
      }}
    >
      {/* Background color */}
      <color attach="background" args={["#050608"]} />

      <Physics gravity={[0, -9.81, 0]}>
        <TestingGrounds />
      </Physics>

      <Stats />
    </Canvas>
  );
}