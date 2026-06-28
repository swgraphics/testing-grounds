import { useEffect, useRef } from "react";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { characterConfig } from "../../config/characterConfig";

export default function Adventurer() {
  const groupRef = useRef();

  const { scene } = useGLTF("/models/characters/Adventurer.glb");

  const idleAnimation = useFBX("/animations/adventurer/Breathing Idle.fbx");

  idleAnimation.animations[0].name = "Breathing Idle";

  const { actions } = useAnimations(idleAnimation.animations, groupRef);

  useEffect(() => {
    const idleAction = actions["Breathing Idle"];

    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play();
    }

    return () => {
      if (idleAction) {
        idleAction.fadeOut(0.2);
      }
    };
  }, [actions]);

  return (
    <group
      ref={groupRef}
      scale={characterConfig.scale}
      position={[0, characterConfig.height, 0]}
      rotation={[
  characterConfig.rotationX,
  characterConfig.rotationY,
  characterConfig.rotationZ,
]}
    >
      <primitive object={scene} />
    </group>
  );
}