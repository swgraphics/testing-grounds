export const characterRegistry = {
  adventurer: {
    id: "adventurer",
    displayName: "Adventurer",

    modelPath: "/models/characters/Adventurer.glb",

    animations: {
      idle: "/animations/adventurer/Breathing Idle.fbx",
      walk: "/animations/adventurer/Walking.fbx",
      run: "/animations/adventurer/Running.fbx",
      crouchWalk: "/animations/adventurer/Crouched Walking.fbx",
      jump: "/animations/adventurer/Jumping.fbx",
      runJump: "/animations/adventurer/Run Jump.fbx",
      slide: "/animations/adventurer/Running Slide.fbx",
      wallRun: "/animations/adventurer/Wall Run.fbx",
    },

    scale: 1,
    height: 1.7,

    rotation: {
      x: -Math.PI / 2,
      y: 0,
      z: 0,
    },

    camera: {
      height: 3,
      distance: 5.4,
    },

    movement: {
      walkSpeed: 1,
      runSpeed: 1,
      superSpeedMultiplier: 50,
    },
  },

  velociraptor: {
    id: "velociraptor",
    displayName: "Velociraptor",

    modelPath: "/models/characters/velociraptor/Velociraptor.glb",

    animations: {
      idle: "/animations/velociraptor/Idle.fbx",
      walk: "/animations/velociraptor/Walk.fbx",
      run: "/animations/velociraptor/Run.fbx",
    },

    scale: 1,
    height: 0,

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    camera: {
      height: 2.2,
      distance: 7.5,
    },

    movement: {
      walkSpeed: 1,
      runSpeed: 1.25,
      superSpeedMultiplier: 50,
    },
  },
};

export const activeCharacterId = "adventurer";