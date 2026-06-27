import { useGLTF } from "@react-three/drei";

export default function Adventurer() {
  const { scene } = useGLTF("/models/characters/Adventurer.glb");

  return (
    <primitive
      object={scene}
      scale={1}
      position={[0, 0, 0]}
      rotation={[0, Math.PI, 0]}
    />
  );
}