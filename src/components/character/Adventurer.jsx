import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { characterConfig } from "../../config/characterConfig";

const Adventurer = forwardRef(function Adventurer(
  { animationState = "idle" },
  ref
) {
  const groupRef = useRef();

  useImperativeHandle(ref, () => groupRef.current);

  const { scene } = useGLTF("/models/characters/Adventurer.glb");

  const idle = useFBX("/animations/adventurer/Breathing Idle.fbx");
  const walk = useFBX("/animations/adventurer/Walking.fbx");
  const run = useFBX("/animations/adventurer/Running.fbx");

  const animations = useMemo(() => {
    idle.animations[0].name = "idle";
    walk.animations[0].name = "walk";
    run.animations[0].name = "run";

    return [idle.animations[0], walk.animations[0], run.animations[0]];
  }, [idle, walk, run]);

  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const currentAction = actions[animationState];

    if (!currentAction) return;

    currentAction.reset().fadeIn(0.2).play();

    return () => {
      currentAction.fadeOut(0.2);
    };
  }, [actions, animationState]);

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
});

export default Adventurer;