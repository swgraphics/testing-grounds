import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";

import { characterConfig } from "../../config/characterConfig";
import { animationConfig } from "../../config/animationConfig";

export default function Adventurer({ animationState = "idle" }) {
  const groupRef = useRef();

  const { scene } = useGLTF("/models/characters/Adventurer.glb");

  const idle = useFBX(animationConfig.idle);
  const walk = useFBX(animationConfig.walk);
  const run = useFBX(animationConfig.run);
  const jump = useFBX(animationConfig.jump);
  const crouchWalk = useFBX(animationConfig.crouchWalk);
  const runJump = useFBX(animationConfig.runJump);
  const slide = useFBX(animationConfig.slide);

  const animations = useMemo(() => {
    idle.animations[0].name = "idle";
    walk.animations[0].name = "walk";
    run.animations[0].name = "run";
    jump.animations[0].name = "jump";
    crouchWalk.animations[0].name = "crouchWalk";
    runJump.animations[0].name = "runJump";
    slide.animations[0].name = "slide";

    return [
      idle.animations[0],
      walk.animations[0],
      run.animations[0],
      jump.animations[0],
      crouchWalk.animations[0],
      runJump.animations[0],
      slide.animations[0],

    ];
  }, [
    idle,
    walk,
    run,
    jump,
    crouchWalk,
    runJump,
  ]);

  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const currentAction = actions[animationState];

    if (!currentAction) return;

    currentAction.reset().fadeIn(0.18).play();

    return () => {
      currentAction.fadeOut(0.18);
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
}