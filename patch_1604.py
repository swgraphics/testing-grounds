from pathlib import Path

root=Path('/mnt/data/tg1604')

# 1) world schema
p=root/'src/systems/world/worldStore.js'
s=p.read_text()
s=s.replace('export const WORLD_SCHEMA_VERSION = 6;', 'export const WORLD_SCHEMA_VERSION = 7;')
p.write_text(s)

# 2) MeshMenu: persist full tree definition in scatter profile
p=root/'src/components/ui/MeshMenu.jsx'
s=p.read_text()
old='''    modelPath: selectedMesh.modelPath,\n    density: Number(scatterProfile?.density ?? 50),'''
new='''    modelPath: selectedMesh.modelPath,\n    modelType: selectedMesh.modelType,\n    treeDefinition: selectedMesh.treeDefinition ?? (selectedMesh.modelType === "crimson-tree" ? createCrimsonTreeDefinition() : undefined),\n    density: Number(scatterProfile?.density ?? 50),'''
if old not in s: raise SystemExit('MeshMenu addToScatter anchor not found')
s=s.replace(old,new,1)
old='''      modelPath: selectedMesh.modelPath ?? scatterProfile?.modelPath,\n      enabled: true,\n      [key]: Number(value),'''
new='''      modelPath: selectedMesh.modelPath ?? scatterProfile?.modelPath,\n      modelType: selectedMesh.modelType ?? scatterProfile?.modelType,\n      treeDefinition: selectedMesh.treeDefinition ?? scatterProfile?.treeDefinition,\n      enabled: true,\n      [key]: Number(value),'''
if old not in s: raise SystemExit('MeshMenu updateScatter anchor not found')
s=s.replace(old,new,1)
p.write_text(s)

# 3) Replace TreeScatter with persistence-aware procedural tree scatter collection.
p=root/'src/components/world/Landscape.jsx'
s=p.read_text()
start=s.index('function TreeScatter() {')
end=s.index('\nfunction FoliageScatter() {', start)
new_block=r'''function mergeScatterTreeDefinition(baseDefinition, patch) {
  const base = createCrimsonTreeDefinition(baseDefinition ?? {});
  return createCrimsonTreeDefinition({
    ...base,
    ...patch,
    trunk: { ...base.trunk, ...(patch?.trunk ?? {}) },
    branches: {
      ...base.branches,
      ...(patch?.branches ?? {}),
      overrides: {
        ...(base.branches?.overrides ?? {}),
        ...(patch?.branches?.overrides ?? {}),
      },
      secondary: {
        ...base.branches.secondary,
        ...(patch?.branches?.secondary ?? {}),
      },
    },
    leaves: { ...base.leaves, ...(patch?.leaves ?? {}) },
  });
}

function makeProfileTreePoints(count, coverage, seedOffset, centerX = 0, centerZ = 0) {
  const spread = 80 + Number(coverage ?? 50) * 2.2;
  return makeScatterPoints(count, seedOffset, {
    minX: centerX - spread,
    maxX: centerX + spread,
    minZ: centerZ - spread,
    maxZ: centerZ + spread,
    minScale: 0.55,
    maxScale: 1.8,
  });
}

function ProceduralTreeScatterProfile({ profileId, profile, currentChunkId, currentChunk, terrainValues, editableTreeId, onEditChange }) {
  const crownRefs = useRef([]);
  const frameCounterRef = useRef(0);

  const density = Math.max(0, Math.min(100, Number(profile?.density ?? 0)));
  const coverage = Math.max(0, Math.min(100, Number(profile?.coverage ?? 50)));
  const isDefaultCrimson = profileId === "crimson-tree";
  const maxCount = isDefaultCrimson ? MAX_TREES : 260;
  const count = countFromSlider(density, maxCount);
  const chunkX = isDefaultCrimson ? 0 : Number(currentChunk?.position?.[0] ?? 0);
  const chunkZ = isDefaultCrimson ? 0 : Number(currentChunk?.position?.[2] ?? 0);
  const seedBase = Number(terrainValues.scatterSeed) || 1;
  const profileSeed = Number(profile?.seed ?? 1);
  const baseDefinition = profile?.treeDefinition
    ? createCrimsonTreeDefinition(profile.treeDefinition)
    : createCrimsonTreeDefinition();
  const treeOverrides = profile?.treeOverrides ?? {};

  const trees = useMemo(() => {
    crownRefs.current = [];
    const points = makeProfileTreePoints(
      count,
      coverage,
      10 + seedBase * 100 + profileSeed * 7919 + profileId.length * 31,
      chunkX,
      chunkZ,
    );

    return points.map((point, index) => {
      const treeId = `scatter-tree-${profileId}-${currentChunkId}-${index}`;
      const override = treeOverrides[treeId];
      const treeDefinition = mergeScatterTreeDefinition(
        { ...baseDefinition, seed: point.seed },
        override,
      );
      const y = getTerrainHeightAt(point.x, point.z);

      return (
        <CrimsonTree
          key={treeId}
          position={[point.x, y, point.z]}
          scale={point.scale}
          rotation={point.rotation}
          variant={point.variant}
          treeDefinition={treeDefinition}
          treeId={treeId}
          editable={editableTreeId === treeId}
          treeSeed={point.seed}
          legacyCrown
          collisionEnabled={isDefaultCrimson && index < MAX_TREE_COLLIDERS}
          physicsKey={`tree-body-${profileId}-${index}-${seedBase}-${y.toFixed(3)}`}
          crownRef={(object) => {
            crownRefs.current[index] = object;
          }}
        />
      );
    });
  }, [count, coverage, seedBase, profileSeed, profileId, currentChunkId, chunkX, chunkZ, baseDefinition, treeOverrides, editableTreeId, terrainValues.heightMultiplier, terrainValues.mountainHeight, terrainValues.cliffSharpness, terrainValues.rollingHills, terrainValues.ridgeStrength, terrainValues.plateauAmount, terrainValues.geometryStrength]);

  const windStrength = Number(terrainValues.windStrength) || 0;
  const windSpeed = Number(terrainValues.windSpeed) || 0;

  useFrame((state) => {
    frameCounterRef.current += 1;
    if (frameCounterRef.current % 2 !== 0) return;

    const strength = windStrength / 100;
    if (strength <= 0) {
      crownRefs.current.forEach((crown) => {
        if (!crown) return;
        crown.rotation.x = 0;
        crown.rotation.z = 0;
      });
      return;
    }

    const speed = 0.25 + (windSpeed / 100) * 2.75;
    const time = state.clock.elapsedTime * speed;
    crownRefs.current.forEach((crown) => {
      if (!crown) return;
      const phase = crown.userData.windPhase ?? 0;
      crown.rotation.z = Math.sin(time + phase) * strength * 0.055;
      crown.rotation.x = Math.cos(time * 0.65 + phase) * strength * 0.025;
    });
  });

  return <>{trees}</>;
}

function TreeScatter() {
  const profiles = useWorldStore((state) => state.world.scatterProfiles ?? {});
  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const currentChunk = useWorldStore((state) => state.world.chunks?.[state.world.currentChunkId]);
  const [editableTreeId, setEditableTreeId] = useState(null);

  const terrainValues = {
    scatterSeed: useTerrainSetting("scatterSeed", 1),
    heightMultiplier: useTerrainSetting("heightMultiplier", 1.5),
    mountainHeight: useTerrainSetting("mountainHeight", 1.5),
    cliffSharpness: useTerrainSetting("cliffSharpness", 1.5),
    rollingHills: useTerrainSetting("rollingHills", 1.5),
    ridgeStrength: useTerrainSetting("ridgeStrength", 1.5),
    plateauAmount: useTerrainSetting("plateauAmount", 0),
    geometryStrength: useTerrainSetting("geometryStrength", 55),
    windStrength: useTerrainSetting("windStrength", 25),
    windSpeed: useTerrainSetting("windSpeed", 35),
  };

  useEffect(() => {
    function handleTreeEditChange(event) {
      const treeId = event.detail?.treeId;
      const patch = event.detail?.patch;
      if (!treeId || !treeId.startsWith("scatter-tree-")) return;

      const matchingProfileId = Object.keys(useWorldStore.getState().world.scatterProfiles ?? {})
        .find((profileId) => treeId.startsWith(`scatter-tree-${profileId}-${currentChunkId}-`));
      if (!matchingProfileId) return;

      setEditableTreeId(treeId);
      const world = useWorldStore.getState().world;
      const profile = world.scatterProfiles?.[matchingProfileId] ?? {};
      const existing = mergeScatterTreeDefinition(profile.treeDefinition ?? {}, profile.treeOverrides?.[treeId] ?? {});
      const nextDefinition = mergeScatterTreeDefinition(existing, patch);

      useWorldStore.getState().upsertScatterProfile(matchingProfileId, {
        treeDefinition: profile.treeDefinition ?? createCrimsonTreeDefinition(),
        treeOverrides: {
          ...(profile.treeOverrides ?? {}),
          [treeId]: nextDefinition,
        },
      });
    }

    function handleTreeEditExit() {
      setEditableTreeId(null);
    }

    window.addEventListener("crimson-tree-edit-change", handleTreeEditChange);
    window.addEventListener("crimson-tree-edit-exit", handleTreeEditExit);
    return () => {
      window.removeEventListener("crimson-tree-edit-change", handleTreeEditChange);
      window.removeEventListener("crimson-tree-edit-exit", handleTreeEditExit);
    };
  }, [currentChunkId]);

  const treeProfiles = useMemo(() => (
    Object.entries(profiles).filter(([profileId, profile]) =>
      profile?.enabled && (
        profileId === "crimson-tree" ||
        profile?.modelType === "crimson-tree" ||
        profile?.treeDefinition?.generator === "TreeGenerator"
      )
    )
  ), [profiles]);

  return (
    <>
      {treeProfiles.map(([profileId, profile]) => (
        <ProceduralTreeScatterProfile
          key={`tree-scatter-${profileId}`}
          profileId={profileId}
          profile={profile}
          currentChunkId={currentChunkId}
          currentChunk={currentChunk}
          terrainValues={terrainValues}
          editableTreeId={editableTreeId}
        />
      ))}
    </>
  );
}
'''
s=s[:start]+new_block+s[end:]
p.write_text(s)

# 4) version/package + notes
p=root/'package.json'
import json
data=json.loads(p.read_text()); data['version']='1.6.04'; p.write_text(json.dumps(data, indent=2)+'\n')

notes=root/'PATCH_NOTES_1.6.04.md'
notes.write_text('''# TESTING GROUNDS — PATCH 1.6.04\n## CRIMSON TREE — PERSISTENCE + SCATTER\n\nSOURCE OF TRUTH\nTesting Grounds 1.6.03.04 (passed).\n\nUSER-REQUESTED GOAL\n- Save → Place → Scatter → Load preserves the complete procedural Crimson Tree.\n- The saved tree remains procedural rather than being flattened into a static mesh.\n\nIMPLEMENTED\n- World schema advanced to v7.\n- Scatter profiles now retain modelType and complete treeDefinition data.\n- Custom saved Crimson Trees can be added to Scatter using their exact edited procedural definition.\n- Built-in Crimson Tree scatter remains supported.\n- Scatter generation is deterministic from the persisted profile and seed.\n- Custom saved-tree scatter is capped independently from the legacy 900-tree world scatter ceiling to avoid multiplying the existing performance cost when several saved tree profiles are active.\n- Scatter instances have stable tree IDs derived from profile, chunk, and index.\n- Per-scattered-tree procedural edits are stored as treeOverrides in the owning scatter profile.\n- Scatter tree overrides therefore survive world Save → Load.\n- Existing leaf vertices, leaf presets, branch overrides, trunk settings, secondary branch settings, and other nested tree-definition values travel with the saved tree definition.\n\nPRESERVED\n- 1.6.03.04 leaf vertex editing.\n- 1.6.03.04 shortcut workflow.\n- 1.6.03.04 object/terrain fixes.\n- Gesture-editing behavior.\n- Sun controls.\n\nVERIFICATION\n- Archive/source structural checks should be run before local testing.\n- Local Vite build remains authoritative for JSX compilation/runtime.\n''')
print('patched', root)
