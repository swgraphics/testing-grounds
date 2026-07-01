import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function FBXAnimatedCharacter({ character, animationState }) {
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

  const clips = useMemo(() => {
    const animationClips = [];

    idle.animations[0].name = "idle";
    walk.animations[0].name = "walk";
    run.animations[0].name = "run";

    animationClips.push(idle.animations[0]);
    animationClips.push(walk.animations[0]);
    animationClips.push(run.animations[0]);

    if (crouchWalk) {
      crouchWalk.animations[0].name = "crouchWalk";
      animationClips.push(crouchWalk.animations[0]);
    }

    if (jump) {
      jump.animations[0].name = "jump";
      animationClips.push(jump.animations[0]);
    }

    if (runJump) {
      runJump.animations[0].name = "runJump";
      animationClips.push(runJump.animations[0]);
    }

    if (slide) {
      slide.animations[0].name = "slide";
      animationClips.push(slide.animations[0]);
    }

    if (wallRun) {
      wallRun.animations[0].name = "wallRun";
      animationClips.push(wallRun.animations[0]);
    }

    return animationClips;
  }, [idle, walk, run, crouchWalk, jump, runJump, slide, wallRun]);

  const { actions } = useAnimations(clips, groupRef);

  useEffect(() => {
    const currentAction = actions[animationState] || actions.idle;

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
      rotation={[character.rotation.x, character.rotation.y, character.rotation.z]}
    >
      <primitive object={scene} />
    </group>
  );
}

function EmbeddedAnimatedCharacter({ character, animationState }) {
  const groupRef = useRef();

  const { scene, animations } = useGLTF(character.modelPath);
  console.log("Available animations:");
  scene.animations.forEach((clip) => console.log(clip.name));
  const renamedAnimations = useMemo(() => {
    return animations.map((clip) => {
      const mappedName =
        Object.entries(character.animationMap || {}).find(
          ([, originalClipName]) => originalClipName === clip.name
        )?.[0] || clip.name;

      const clonedClip = clip.clone();
      clonedClip.name = mappedName;

      return clonedClip;
    });
  }, [animations, character.animationMap]);

  const { actions } = useAnimations(renamedAnimations, groupRef);

  useEffect(() => {
    const currentAction = actions[animationState] || actions.idle;

    if (!currentAction) return;

    currentAction.reset().fadeIn(0.18);
    currentAction.setLoop(THREE.LoopRepeat, Infinity);
    currentAction.clampWhenFinished = false;
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
      rotation={[character.rotation.x, character.rotation.y, character.rotation.z]}
    >
      <primitive object={scene} />
    </group>
  );
}

export default function PlayableCharacter({ character, animationState = "idle" }) {
  if (character.animationSource === "embedded") {
    return (
      <EmbeddedAnimatedCharacter
        character={character}
        animationState={animationState}
      />
    );
  }

  return (
    <FBXAnimatedCharacter
      character={character}
      animationState={animationState}
    />
  );
}