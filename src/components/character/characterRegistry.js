export const characterRegistry = {
  adventurer: {
  id: "adventurer",
  displayName: "Adventurer",

  animationSource: "fbx",

  modelPath: "/models/characters/Adventurer.glb",

  animations: {
    idle: "/animations/adventurer/Breathing Idle.fbx",
    walk: "/animations/adventurer/Walking.fbx",
    run: "/animations/adventurer/Running.fbx",
    crouchWalk:
      "/animations/adventurer/Crouched Walking.fbx",
    jump: "/animations/adventurer/Jumping.fbx",
    runJump:
      "/animations/adventurer/Run Jump.fbx",
    slide:
      "/animations/adventurer/Running Slide.fbx",
    wallRun:
      "/animations/adventurer/Wall Run.fbx",
  },

  scale: 1,
  height: -0.34,

  rotation: {
    x: -Math.PI / 2,
    y: 0,
    z: 0,
  },

  cameraHeight: 1.4,
  cameraDistance: 4.8,
  cameraLookAtHeight: 2.1,
  cameraShoulderOffset: 0.65,
  cameraLookAheadDistance: 3.0,
  cameraPitchHeightStrength: 1.4,
},

  velociraptor: {
    id: "velociraptor",
    displayName: "Velociraptor",

    animationSource: "embedded",

    modelPath:
      "/models/characters/velociraptor/velociraptor_custom.glb",

    animationMap: {
  idle: "Armature|Velociraptor_Idle",
  walk: "Armature|Velociraptor_Walk",
  run: "Armature|Velociraptor_Run",
  jump: "Armature|Velociraptor_Jump",
},

    scale: 0.25,
    height: -0.83,

    cameraHeight: 0.9,
    cameraDistance: 4.8,

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
};

export const activeCharacterId = "adventurer";