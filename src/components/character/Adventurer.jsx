import { useGLTF } from "@react-three/drei";

// Character tuning
const CHARACTER_SCALE = 4.8;
const CHARACTER_HEIGHT = 6.3;
const CHARACTER_ROTATION = Math.PI;

export default function Adventurer() {
  const { scene } = useGLTF("/models/characters/Adventurer.glb");

  return (
    <primitive
      object={scene}
      scale={CHARACTER_SCALE}
      position={[0, CHARACTER_HEIGHT, 0]}
      rotation={[0, CHARACTER_ROTATION, 0]}
    />
  );
}