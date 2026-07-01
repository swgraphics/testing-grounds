import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function PlayableCharacter({
  character,
  animationState = "idle",
}) {
  const groupRef = useRef();

  const { scene } = useGLTF(character.modelPath);

  const idle = useFBX(character.animations.idle);
  const walk = useFBX(character.animations.walk);
  const run = useFBX(character.animations.run);
  const crouchWalk = character.animations.crouchWalk
    ? useFBX(character.animations.crouchWalk)
    : null;
  const jump = character.animations.jump ? useFBX(character.animations.jump) : null;
  const runJump = character.animations.runJump
    ? useFBX(character.animations.runJump)
    : null;
  const slide = character.animations.slide ? useFBX(character.animations.slide) : null;
  const wallRun = character.animations.wallRun
    ? useFBX(character.animations.wallRun)
    : null;

  const animations = useMemo(() => {
    const clips = [];

    idle.animations[0].name = "idle";
    walk.animations[0].name = "walk";
    run.animations[0].name = "run";

    clips.push(idle.animations[0]);
    clips.push(walk.animations[0]);
    clips.push(run.animations[0]);

    if (crouchWalk) {
      crouchWalk.animations[0].name = "crouchWalk";
      clips.push(crouchWalk.animations[0]);
    }

    if (jump) {
      jump.animations[0].name = "jump";
      clips.push(jump.animations[0]);
    }

    if (runJump) {
      runJump.animations[0].name = "runJump";
      clips.push(runJump.animations[0]);
    }

    if (slide) {
      slide.animations[0].name = "slide";
      clips.push(slide.animations[0]);
    }

    if (wallRun) {
      wallRun.animations[0].name = "wallRun";
      clips.push(wallRun.animations[0]);
    }

    return clips;
  }, [idle, walk, run, crouchWalk, jump, runJump, slide, wallRun]);

  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const fallbackAction = actions.idle;
    const currentAction = actions[animationState] || fallbackAction;

    if (!currentAction) return;

    currentAction.reset().fadeIn(0.18);

    if (animationState === "slide") {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    } else {
      currentAction.setLoop(THREE.LoopRepeat, Infinity);
      currentAction.clampWhenFinished = false;
    }

    currentAction.play();

    return () => {
      currentAction.fadeOut(0.18);
    };
  }, [actions, animationState]);

  return (
    <group
      ref={groupRef}
      scale={character.scale}
      position={[0, character.height, 0]}
      rotation={[
        character.rotation.x,
        character.rotation.y,
        character.rotation.z,
      ]}
    >
      <primitive object={scene} />
    </group>
  );
}