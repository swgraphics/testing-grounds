from pathlib import Path
p=Path('/mnt/data/tg1602/src/components/world/treeGenerator.js')
s=p.read_text()
s=s.replace('    randomness: 50,\n\n    secondary:', '    randomness: 50,\n    custom: [],\n\n    secondary:')
p.write_text(s)

p=Path('/mnt/data/tg1602/src/components/world/treeBranches.js')
s=p.read_text()
# Insert custom branch helpers before createProceduralBranchGeometry
marker='export function createProceduralBranchGeometry(\n'
insert=r'''
function createCustomBranchData(trunkDefinition, branchDefinition, seed, proceduralCount) {
  const custom = Array.isArray(branchDefinition?.custom) ? branchDefinition.custom : [];
  if (!custom.length) return [];

  const height = lerp(4.5, 8.5, clamp01((trunkDefinition?.height ?? 50) / 100));
  const radius = lerp(0.16, 0.42, clamp01((trunkDefinition?.radius ?? 50) / 100));
  const taper = clamp01((trunkDefinition?.taper ?? 50) / 100);
  const maxBend = lerp(0, 0.85, clamp01((trunkDefinition?.bend ?? 50) / 100));
  const branchThickness = lerp(0.035, 0.16, clamp01((branchDefinition?.thickness ?? 50) / 100));
  const secondaryCount = Math.max(0, Math.min(8, Math.round(branchDefinition?.secondary?.count ?? 0)));
  const result = [];

  const trunkPoint = (t) => {
    const clampedT = THREE.MathUtils.clamp(Number(t) || 0.5, 0.05, 0.95);
    const bendAmount = Math.sin(clampedT * Math.PI * 0.5) * maxBend;
    return new THREE.Vector3(
      bendAmount,
      clampedT * height,
      Math.sin(clampedT * Math.PI) * maxBend * 0.22,
    );
  };

  custom.forEach((entry, customIndex) => {
    const origin = entry?.origin
      ? new THREE.Vector3(Number(entry.origin[0]) || 0, Number(entry.origin[1]) || 0, Number(entry.origin[2]) || 0)
      : trunkPoint(entry?.trunkT ?? 0.55);
    const direction = new THREE.Vector3(
      Number(entry?.direction?.[0]) || 1,
      Number(entry?.direction?.[1]) || 0.12,
      Number(entry?.direction?.[2]) || 0,
    ).normalize();
    const length = THREE.MathUtils.clamp(Number(entry?.length) || 2.2, 0.45, 6);
    const thickness = THREE.MathUtils.clamp(Number(entry?.thickness) || branchThickness, 0.02, 0.22);
    const end = origin.clone().add(direction.clone().multiplyScalar(length));
    const branch = {
      index: proceduralCount + result.length,
      custom: true,
      customIndex,
      trunkT: Number(entry?.trunkT ?? 0.55),
      origin,
      end,
      direction,
      length,
      thickness,
      localRadius: radius,
      azimuth: Math.atan2(direction.z, direction.x),
      elevation: Math.acos(THREE.MathUtils.clamp(direction.y, -1, 1)),
      taper: THREE.MathUtils.clamp(Number(entry?.taper ?? 50), 0, 100) / 100,
    };
    result.push(branch);

    for (let childIndex = 0; childIndex < secondaryCount; childIndex += 1) {
      const t = 0.34 + ((childIndex + 1) / (secondaryCount + 1)) * 0.42;
      const childOrigin = origin.clone().lerp(end, t);
      const phase = seed * 0.17 + customIndex * 2.41 + childIndex * 2.399;
      const radial = new THREE.Vector3(Math.cos(phase), 0, Math.sin(phase));
      const childDirection = direction.clone().multiplyScalar(0.58).add(radial.multiplyScalar(0.78));
      childDirection.y += 0.16 + (childIndex % 2) * 0.08;
      childDirection.normalize();
      const childLength = length * THREE.MathUtils.lerp(0.38, 0.62, (childIndex % 5) / 4);
      result.push({
        index: proceduralCount + result.length,
        custom: true,
        customIndex,
        secondary: true,
        trunkT: branch.trunkT,
        origin: childOrigin,
        end: childOrigin.clone().add(childDirection.clone().multiplyScalar(childLength)),
        direction: childDirection,
        length: childLength,
        thickness: thickness * 0.56,
        localRadius: radius,
        azimuth: Math.atan2(childDirection.z, childDirection.x),
        elevation: Math.acos(THREE.MathUtils.clamp(childDirection.y, -1, 1)),
        taper: branch.taper,
      });
    }
  });

  return result;
}

'''
s=s.replace(marker,insert+marker)
# replace return branches; before function end in createProceduralBranchData
old='''  return branches;\n}\n\nfunction createCustomBranchData'''
# helper was inserted after function, so change first occurrence before helper marker
if old not in s:
    raise SystemExit('branch return marker not found')
s=s.replace(old,'''  return branches;\n}\n\nfunction createCustomBranchData''',1)
# Need append custom in createProceduralBranchGeometry by replacing branch source
s=s.replace('''  const branches =\n    createProceduralBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed\n    );''','''  const proceduralBranches =\n    createProceduralBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed\n    );\n  const branches = [\n    ...proceduralBranches,\n    ...createCustomBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed,\n      proceduralBranches.length\n    ),\n  ];''',1)
# Need export combined data: replace end return branches in original function only with append
old='''  return branches;\n}\n\nfunction createCustomBranchData'''
# no change; instead modify original function's return to include custom, but helper is defined after and function declaration hoisted
s=s.replace('''  return branches;\n}\n\nfunction createCustomBranchData''','''  return [\n    ...branches,\n    ...createCustomBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed,\n      branches.length\n    ),\n  ];\n}\n\nfunction createCustomBranchData''',1)
# Remove duplicate custom append in geometry? It now receives combined and we appended again. Fix geometry back to just call data.
s=s.replace('''  const proceduralBranches =\n    createProceduralBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed\n    );\n  const branches = [\n    ...proceduralBranches,\n    ...createCustomBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed,\n      proceduralBranches.length\n    ),\n  ];''','''  const branches =\n    createProceduralBranchData(\n      trunkDefinition,\n      branchDefinition,\n      seed\n    );''',1)
p.write_text(s)

# Model: branch data already computed from function; add branch props and userData.
p=Path('/mnt/data/tg1602/src/components/world/CrimsonTreeModel.jsx')
s=p.read_text()
s=s.replace('''  onTrunkPointerDown,\n\n  treeDefinition,''','''  onTrunkPointerDown,\n  onBranchPointerMove,\n  onBranchPointerOut,\n  onBranchPointerDown,\n\n  treeDefinition,''')
s=s.replace('''  <mesh\n    geometry={proceduralBranchGeometry}\n    castShadow\n    receiveShadow\n  >''','''  <mesh\n    geometry={proceduralBranchGeometry}\n    userData={{\n      tgCrimsonTreeBranch: Boolean(treeId) || interactiveTrunk,\n      tgCrimsonTreeId: treeId,\n      tgTreeDefinition: treeDefinition,\n      tgTreeBranchData: proceduralBranchData,\n    }}\n    onPointerMove={interactiveTrunk ? onBranchPointerMove : undefined}\n    onPointerOut={interactiveTrunk ? onBranchPointerOut : undefined}\n    onPointerDown={interactiveTrunk ? onBranchPointerDown : undefined}\n    castShadow\n    receiveShadow\n  >''')
p.write_text(s)

# Interaction system rewrite for toggle, directional controls, 3D ring, branch edit.
p=Path('/mnt/data/tg1602/src/components/world/CrimsonTreeInteractionSystem.jsx')
s=p.read_text()
s=s.replace('import { gamepadState } from "../../systems/input/gamepadState";\n' if False else 'import { useInteractionStore } from "../../systems/interaction/interactionStore";','import { useInteractionStore } from "../../systems/interaction/interactionStore";\nimport { gamepadState } from "../../systems/input/gamepadState";')
# replace whole file simpler
p.write_text(r'''import { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { gamepadState } from "../../systems/input/gamepadState";

const centerPointer = new THREE.Vector2(0, 0);

function findTreeHit(intersections) {
  for (const hit of intersections) {
    let object = hit.object;
    while (object) {
      if (object.userData?.tgCrimsonTreeTrunk && object.userData?.tgCrimsonTreeId) {
        return { hit, object, type: "trunk", branch: null };
      }
      if (object.userData?.tgCrimsonTreeBranch && object.userData?.tgCrimsonTreeId) {
        const branchData = object.userData?.tgTreeBranchData ?? [];
        const branchIndex = Number.isFinite(hit.faceIndex)
          ? Math.floor(hit.faceIndex / 12)
          : -1;
        return {
          hit,
          object,
          type: "branch",
          branch: branchData[branchIndex] ?? null,
        };
      }
      object = object.parent;
    }
  }
  return null;
}

function localPointForObject(object, worldPoint) {
  let root = object;
  while (root.parent && root.parent.type !== "Scene") root = root.parent;
  const point = worldPoint.clone();
  root.worldToLocal(point);
  return point;
}

export default function CrimsonTreeInteractionSystem() {
  const { camera, scene } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const targetRef = useRef(null);
  const activeTreeIdRef = useRef(null);
  const editModeRef = useRef("trunk");
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragStartHeightRef = useRef(50);
  const dragStartBendRef = useRef(50);
  const targetDefinitionRef = useRef(null);
  const targetObjectRef = useRef(null);
  const [ring, setRing] = useState(null);

  useFrame(() => {
    if (document.body.classList.contains("tg-editor-active")) return;
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(centerPointer, camera);
    const result = findTreeHit(raycaster.intersectObjects(scene.children, true));
    const nextId = result?.object?.userData?.tgCrimsonTreeId ?? null;
    const sameTarget = targetRef.current?.treeId === nextId && targetRef.current?.type === result?.type &&
      (result?.type !== "branch" || targetRef.current?.branch?.index === result?.branch?.index);
    if (!sameTarget) {
      targetRef.current = result
        ? { treeId: nextId, type: result.type, branch: result.branch, point: result.hit.point.clone() }
        : null;
      targetDefinitionRef.current = result?.object?.userData?.tgTreeDefinition ?? null;
      targetObjectRef.current = result?.object ?? null;
      window.dispatchEvent(new CustomEvent("crimson-tree-reticle-target-changed", {
        detail: {
          active: Boolean(nextId),
          treeId: nextId,
          type: result?.type ?? null,
          branchIndex: result?.branch?.index ?? null,
          treeDefinition: result?.object?.userData?.tgTreeDefinition ?? null,
        },
      }));
    }

    if (useInteractionStore.getState().activeTool === "TREE" && result) {
      const worldPoint = result.hit.point.clone();
      const object = result.object;
      const parent = object.parent;
      if (parent) {
        const q = new THREE.Quaternion();
        parent.getWorldQuaternion(q);
        const scale = object.getWorldScale(new THREE.Vector3());
        const radius = result.type === "branch"
          ? Math.max(0.13, Number(result.branch?.thickness ?? 0.08) * scale.x * 2.8)
          : Math.max(0.16, 0.42 * scale.x);
        const position = worldPoint.addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -0.012);
        const normal = result.type === "branch"
          ? new THREE.Vector3(...(result.branch?.direction ?? [1, 0, 0]))
          : new THREE.Vector3(0, 1, 0);
        normal.applyQuaternion(q).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        setRing({ position, quaternion, radius, type: result.type });
      }
    } else if (ring) {
      setRing(null);
    }
  });

  useEffect(() => {
    function enterTreeEdit(treeId) {
      if (!treeId) return;
      activeTreeIdRef.current = treeId;
      editModeRef.current = "trunk";
      useInteractionStore.getState().activate({ target: `tree:${treeId}`, tool: "TREE", mode: "edit" });
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-enter", { detail: { treeId, mode: "trunk" } }));
    }

    function exitTreeEdit() {
      draggingRef.current = false;
      activeTreeIdRef.current = null;
      editModeRef.current = "trunk";
      if (useInteractionStore.getState().activeTool === "TREE") useInteractionStore.getState().deactivate();
      setRing(null);
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-exit"));
    }

    function handleMode(event) {
      const mode = event.detail?.mode;
      if (!mode || !["trunk", "branch"].includes(mode)) return;
      editModeRef.current = mode;
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-changed", { detail: { mode } }));
    }

    function handlePointerDown(event) {
      if (event.button !== 0 || document.body.classList.contains("tg-editor-active")) return;
      const target = event.target;
      if (target?.closest?.("button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view, .tg-tree-interaction-panel")) return;
      const result = targetRef.current;
      if (!result?.treeId) return;

      const activeTree = useInteractionStore.getState().activeTool === "TREE" && activeTreeIdRef.current === result.treeId;
      if (!activeTree) {
        enterTreeEdit(result.treeId);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      draggingRef.current = true;
      dragStartYRef.current = event.clientY;
      dragStartXRef.current = event.clientX;
      const def = targetDefinitionRef.current;
      dragStartHeightRef.current = Number(def?.trunk?.height ?? 50);
      dragStartBendRef.current = Number(def?.trunk?.bend ?? 50);
      event.preventDefault();
      event.stopPropagation();
    }

    function handlePointerMove(event) {
      if (!draggingRef.current || useInteractionStore.getState().activeTool !== "TREE") return;
      const treeId = activeTreeIdRef.current;
      if (!treeId) return;
      const dx = event.clientX - dragStartXRef.current;
      const dy = event.clientY - dragStartYRef.current;
      const mode = editModeRef.current;
      const patch = mode === "branch"
        ? { branches: { custom: createDraggedBranch(event) } }
        : { trunk: {
            height: THREE.MathUtils.clamp(dragStartHeightRef.current - dy * 0.28, 0, 100),
            bend: THREE.MathUtils.clamp(dragStartBendRef.current + dx * 0.28, 0, 100),
          } };
      if (mode === "branch" && !patch.branches.custom) return;
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, patch } }));
    }

    function createDraggedBranch(event) {
      const result = targetRef.current;
      const object = targetObjectRef.current;
      if (!result?.hit || !object) return null;
      const root = object.parent;
      if (!root) return null;
      const localOrigin = localPointForObject(object, result.point);
      const dx = event.clientX - dragStartXRef.current;
      const dy = event.clientY - dragStartYRef.current;
      const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
      const directionWorld = cameraRight.multiplyScalar(dx * 0.012).add(cameraUp.multiplyScalar(-dy * 0.008));
      directionWorld.add(new THREE.Vector3(localOrigin.x, 0, localOrigin.z).normalize().multiplyScalar(0.7));
      directionWorld.normalize();
      const originY = THREE.MathUtils.clamp(localOrigin.y / 8.5, 0.05, 0.95);
      const existing = targetDefinitionRef.current?.branches?.custom ?? [];
      const current = existing[result.branch?.customIndex ?? existing.length - 1];
      const baseLength = Number(current?.length ?? 2.2);
      const length = THREE.MathUtils.clamp(baseLength + Math.hypot(dx, dy) * 0.018, 0.55, 6);
      const custom = [...existing];
      const index = result.branch?.customIndex ?? custom.length;
      custom[index] = {
        ...(custom[index] ?? {}),
        trunkT: originY,
        origin: [localOrigin.x, localOrigin.y, localOrigin.z],
        direction: [directionWorld.x, directionWorld.y, directionWorld.z],
        length,
      };
      return custom;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && useInteractionStore.getState().activeTool === "TREE") {
        event.preventDefault();
        exitTreeEdit();
      }
    }

    function handleGamepad() {
      if (useInteractionStore.getState().activeTool !== "TREE" || !gamepadState.connected) return;
      const x = Number(gamepadState.leftStickX) || 0;
      const y = Number(gamepadState.leftStickY) || 0;
      if (Math.abs(x) < 0.12 && Math.abs(y) < 0.12) return;
      const treeId = activeTreeIdRef.current;
      if (!treeId || editModeRef.current !== "trunk") return;
      const def = targetDefinitionRef.current;
      const height = THREE.MathUtils.clamp(Number(def?.trunk?.height ?? 50) - y * 1.4, 0, 100);
      const bend = THREE.MathUtils.clamp(Number(def?.trunk?.bend ?? 50) + x * 1.4, 0, 100);
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, patch: { trunk: { height, bend } } } }));
    }

    const timer = window.setInterval(handleGamepad, 50);
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", () => { draggingRef.current = false; }, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("crimson-tree-edit-exit-request", exitTreeEdit);
    window.addEventListener("crimson-tree-edit-mode-request", handleMode);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", () => { draggingRef.current = false; }, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("crimson-tree-edit-exit-request", exitTreeEdit);
      window.removeEventListener("crimson-tree-edit-mode-request", handleMode);
    };
  }, [camera]);

  return ring ? (
    <mesh position={ring.position} quaternion={ring.quaternion} renderOrder={20}>
      <torusGeometry args={[ring.radius, 0.012, 8, 64]} />
      <meshBasicMaterial color="#2a8fff" transparent opacity={0.95} depthTest depthWrite={false} />
    </mesh>
  ) : null;
}
''')

# Panel: mode + branch controls, no need blue new UI.
p=Path('/mnt/data/tg1602/src/components/ui/CrimsonTreeInteractionPanel.jsx')
s=p.read_text()
s=s.replace('const [definition, setDefinition] = useState(null);','const [definition, setDefinition] = useState(null);\n  const [mode, setMode] = useState("trunk");')
s=s.replace('''    function handleEnter(event) {\n      setTreeId(event.detail?.treeId ?? null);\n    }''','''    function handleEnter(event) {\n      setTreeId(event.detail?.treeId ?? null);\n      setMode(event.detail?.mode ?? "trunk");\n    }''')
s=s.replace('''    function handleExit() {\n      setTreeId(null);\n      setDefinition(null);\n    }''','''    function handleExit() {\n      setTreeId(null);\n      setDefinition(null);\n      setMode("trunk");\n    }\n\n    function handleMode(event) {\n      setMode(event.detail?.mode ?? "trunk");\n    }''')
s=s.replace('''    window.addEventListener("crimson-tree-edit-exit", handleExit);''','''    window.addEventListener("crimson-tree-edit-exit", handleExit);\n    window.addEventListener("crimson-tree-edit-mode-changed", handleMode);''')
s=s.replace('''      window.removeEventListener("crimson-tree-edit-exit", handleExit);''','''      window.removeEventListener("crimson-tree-edit-exit", handleExit);\n      window.removeEventListener("crimson-tree-edit-mode-changed", handleMode);''')
# add branch values and mode button before sliders
needle='''  const radius = Number(definition?.trunk?.radius ?? 50);\n\n  function update(key, value) {'''
replacement='''  const radius = Number(definition?.trunk?.radius ?? 50);\n  const branchTaper = Number(definition?.branches?.taper ?? 50);\n  const secondaryCount = Number(definition?.branches?.secondary?.count ?? 2);\n\n  function update(key, value) {'''
s=s.replace(needle,replacement)
# change update to handle branch keys
s=s.replace('''    const patch = { trunk: { [key]: Number(value) } };''','''    const patch = key === "branchTaper"\n      ? { branches: { taper: Number(value) } }\n      : key === "secondaryCount"\n        ? { branches: { secondary: { count: Number(value) } } }\n        : { trunk: { [key]: Number(value) } };''')
# insert mode buttons after title row
needle='''      </div>\n\n      {slider("TRUNK HEIGHT", height, "height")}'''
replacement='''      </div>\n\n      <div className="tg-tree-interaction-mode-row">\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "trunk" ? "active" : ""}`} onClick={() => { setMode("trunk"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "trunk" } })); }}>TRUNK</button>\n        <button type="button" className={`tg-tree-interaction-mode ${mode === "branch" ? "active" : ""}`} onClick={() => { setMode("branch"); window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-request", { detail: { mode: "branch" } })); }}>BRANCH</button>\n      </div>\n\n      {slider("TRUNK HEIGHT", height, "height")}'''
s=s.replace(needle,replacement)
# add branch sliders before hint
needle='''      {slider("TRUNK WIDTH", radius, "radius")}\n\n      <div className="tg-tree-interaction-hint">'''
replacement='''      {slider("TRUNK WIDTH", radius, "radius")}\n\n      <div className="tg-tree-interaction-section">BRANCH CONTROL</div>\n      {slider("BRANCH TAPER", branchTaper, "branchTaper")}\n      {slider("SECONDARY BRANCHES", secondaryCount * 12.5, "secondaryCount")}\n\n      <div className="tg-tree-interaction-hint">{mode === "branch" ? "LOOK AT A BRANCH / CLICK + DRAG TO EXTRUDE" : "UP / DOWN = HEIGHT  ·  LEFT / RIGHT = BEND"}</div>'''
s=s.replace(needle,replacement)
# secondary slider should map 0-100 to count. Current update receives 0-100 and sets count huge. Fix slider custom separately.
s=s.replace('''      {slider("SECONDARY BRANCHES", secondaryCount * 12.5, "secondaryCount")}''','''      {slider("SECONDARY BRANCHES", secondaryCount * 12.5, "secondaryCount")}''')
# adjust update secondary value / 12.5
s=s.replace('''? { branches: { secondary: { count: Number(value) } } }''','''? { branches: { secondary: { count: Math.round(Number(value) / 12.5) } } }''')
p.write_text(s)

# Mesh placement deep merge tree patches
p=Path('/mnt/data/tg1602/src/components/world/MeshPlacementSystem.jsx')
s=p.read_text()
old='''        const nextDefinition = {\n          ...(entry.mesh.treeDefinition ?? {}),\n          trunk: {\n            ...(entry.mesh.treeDefinition?.trunk ?? {}),\n            ...(patch.trunk ?? {}),\n          },\n        };'''
new='''        const currentDefinition = entry.mesh.treeDefinition ?? {};\n        const nextDefinition = {\n          ...currentDefinition,\n          trunk: {\n            ...(currentDefinition.trunk ?? {}),\n            ...(patch.trunk ?? {}),\n          },\n          branches: {\n            ...(currentDefinition.branches ?? {}),\n            ...(patch.branches ?? {}),\n            secondary: {\n              ...(currentDefinition.branches?.secondary ?? {}),\n              ...(patch.branches?.secondary ?? {}),\n            },\n          },\n          leaves: {\n            ...(currentDefinition.leaves ?? {}),\n            ...(patch.leaves ?? {}),\n          },\n        };'''
if old not in s: raise SystemExit('mesh placement merge not found')
s=s.replace(old,new)
p.write_text(s)

# Mesh editor preview: add branch interaction toggle and pass props, plus state. Keep foundation intact.
p=Path('/mnt/data/tg1602/src/components/ui/MeshMenu.jsx')
s=p.read_text()
s=s.replace('''  const [directTreeEdit, setDirectTreeEdit] = useState(false);''','''  const [directTreeEdit, setDirectTreeEdit] = useState(false);\n  const [treeEditMode, setTreeEditMode] = useState("trunk");''')
# TreeEditorPreview signature and behavior: use branch mode state via props. Add callback props.
s=s.replace('''function TreeEditorPreview({ treeDefinition, rotation, scale, onHeightChange }) {''','''function TreeEditorPreview({ treeDefinition, rotation, scale, onHeightChange, onBendChange, editMode = "trunk", onBranchCreate }) {''')
# In preview pointer move/down, branch handling is more complex. Add generic branch props to CrimsonTreeModel and event handlers.
# Replace existing onHeightChange handler portion with mode-aware handlers.
s=s.replace('''    dragStartHeightRef.current = Number(treeDefinition?.trunk?.height ?? 50);''','''    dragStartHeightRef.current = Number(treeDefinition?.trunk?.height ?? 50);\n    dragStartBendRef.current = Number(treeDefinition?.trunk?.bend ?? 50);''',1)
s=s.replace('''  const dragStartHeightRef = useRef(50);\n  const previewRef''','''  const dragStartHeightRef = useRef(50);\n  const dragStartBendRef = useRef(50);\n  const previewRef''')
s=s.replace('''      const deltaY = event.clientY - dragStartYRef.current;\n      onHeightChange(\n        THREE.MathUtils.clamp(\n          dragStartHeightRef.current - deltaY * 0.28,\n          0,\n          100\n        )\n      );''','''      const deltaY = event.clientY - dragStartYRef.current;\n      const deltaX = event.clientX - dragStartXRef.current;\n      if (editMode === "branch") {\n        onBranchCreate?.(deltaX, deltaY);\n      } else {\n        onHeightChange(THREE.MathUtils.clamp(dragStartHeightRef.current - deltaY * 0.28, 0, 100));\n        onBendChange?.(THREE.MathUtils.clamp(dragStartBendRef.current + deltaX * 0.28, 0, 100));\n      }''',1)
s=s.replace('''    dragStartYRef.current = event.clientY;\n    dragStartHeightRef.current''','''    dragStartYRef.current = event.clientY;\n    dragStartXRef.current = event.clientX;\n    dragStartHeightRef.current''',1)
# pass branch handlers in model. Need use pointer down handler only; branch create simplistic based on cursor drag.
s=s.replace('''            onTrunkPointerDown={handlePointerDown}\n          />''','''            onTrunkPointerDown={handlePointerDown}\n            onBranchPointerDown={editMode === "branch" ? handlePointerDown : undefined}\n            onBranchPointerMove={editMode === "branch" ? handlePointerMove : undefined}\n            onBranchPointerOut={handlePointerOut}\n          />''',1)
# Add branch custom state in MeshEditModal
s=s.replace('''  const [branchRandomness, setBranchRandomness] = useState(\n    Number(baseDefinition.branches?.randomness ?? 50)\n  );''','''  const [branchRandomness, setBranchRandomness] = useState(\n    Number(baseDefinition.branches?.randomness ?? 50)\n  );\n  const [branchTaper, setBranchTaper] = useState(\n    Number(baseDefinition.branches?.taper ?? 50)\n  );\n  const [secondaryBranchCount, setSecondaryBranchCount] = useState(\n    Number(baseDefinition.branches?.secondary?.count ?? 2)\n  );''')
s=s.replace('''        randomness: branchRandomness,\n      },''','''        randomness: branchRandomness,\n        taper: branchTaper,\n        secondary: {\n          ...(baseDefinition.branches?.secondary ?? {}),\n          count: secondaryBranchCount,\n        },\n        custom: baseDefinition.branches?.custom ?? [],\n      },''')
s=s.replace('''    branchRandomness,\n    crownWidth,''','''    branchRandomness,\n    branchTaper,\n    secondaryBranchCount,\n    crownWidth,''')
# direct preview props and branch creation handler via local setTreeDefinition impossible; use setters for state by changing custom branch array through local state not currently. We'll use treeDefinition branches custom state separate.
s=s.replace('''  const [treeEditMode, setTreeEditMode] = useState("trunk");''','''  const [treeEditMode, setTreeEditMode] = useState("trunk");\n  const [customBranches, setCustomBranches] = useState(baseDefinition.branches?.custom ?? []);''')
s=s.replace('''        custom: baseDefinition.branches?.custom ?? [],''','''        custom: customBranches,''')
s=s.replace('''    secondaryBranchCount,\n    crownWidth,''','''    secondaryBranchCount,\n    customBranches,\n    crownWidth,''')
# Pass props to preview
s=s.replace('''                onHeightChange={setTrunkHeight}\n              />''','''                onHeightChange={setTrunkHeight}\n                onBendChange={setTrunkBend}\n                editMode={treeEditMode}\n                onBranchCreate={(dx, dy) => {\n                  const angle = Math.atan2(-dy, dx);\n                  const direction = [Math.cos(angle), 0.16, Math.sin(angle)];\n                  const next = [...customBranches];\n                  const index = Math.max(0, next.length - 1);\n                  next[index] = {\n                    ...(next[index] ?? {}),\n                    trunkT: 0.62,\n                    origin: [0, 5.2, 0],\n                    direction,\n                    length: THREE.MathUtils.clamp(1.4 + Math.hypot(dx, dy) * 0.02, 0.6, 5.5),\n                  };\n                  setCustomBranches(next);\n                }}\n              />''',1)
# Add mode buttons in editor controls before trunk section
s=s.replace('''          <div className="tg-mesh-edit-section-label">\n            TRUNK\n          </div>''','''          <div className="tg-mesh-edit-section-label">\n            TREE EDIT MODE\n          </div>\n          <div className="tg-mesh-edit-mode-row">\n            <button type="button" className={`tg-mesh-edit-action ${treeEditMode === "trunk" ? "active" : ""}`} onClick={() => setTreeEditMode("trunk")}>TRUNK</button>\n            <button type="button" className={`tg-mesh-edit-action ${treeEditMode === "branch" ? "active" : ""}`} onClick={() => setTreeEditMode("branch")}>BRANCH</button>\n          </div>\n\n          <div className="tg-mesh-edit-section-label">\n            TRUNK\n          </div>''',1)
# Add branch controls in editor after randomness
s=s.replace('''          {renderSlider(\n            "BRANCH RANDOMNESS",\n            branchRandomness,\n            setBranchRandomness\n          )}''','''          {renderSlider(\n            "BRANCH RANDOMNESS",\n            branchRandomness,\n            setBranchRandomness\n          )}\n\n          {renderSlider("BRANCH TAPER", branchTaper, setBranchTaper)}\n          {renderSlider("SECONDARY BRANCHES", secondaryBranchCount * 12.5, (value) => setSecondaryBranchCount(Math.round(Number(value) / 12.5)))}''',1)
p.write_text(s)

# CSS add mode row, 3D ring doesn't need DOM blue. Fix static tree panel styling to Dev Tools-like: keep red only.
p=Path('/mnt/data/tg1602/src/styles/brand.css')
s=p.read_text()
insert='''\n.tg-tree-interaction-mode-row,\n.tg-mesh-edit-mode-row {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 7px;\n  margin-bottom: 12px;\n}\n\n.tg-tree-interaction-mode,\n.tg-mesh-edit-mode-row .tg-mesh-edit-action {\n  min-height: 32px;\n  border: 1px solid rgba(205, 38, 38, 0.55);\n  background: rgba(129, 16, 18, 0.18);\n  color: var(--tg-white);\n  font-family: var(--tg-font-display);\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  cursor: pointer;\n}\n\n.tg-tree-interaction-mode.active,\n.tg-mesh-edit-mode-row .tg-mesh-edit-action.active {\n  background: var(--tg-crimson);\n  border-color: var(--tg-crimson);\n}\n\n.tg-tree-interaction-section {\n  margin-top: 16px;\n  padding-top: 11px;\n  border-top: 1px solid rgba(232, 238, 245, 0.1);\n  color: rgba(232, 238, 245, 0.55);\n  font-family: var(--tg-font-display);\n  font-size: 10px;\n  letter-spacing: 0.08em;\n}\n'''
# append once
s += insert
p.write_text(s)

# version/package and notes
for fn in ['package.json','package-lock.json']:
 p=Path('/mnt/data/tg1602')/fn
 s=p.read_text().replace('1.6.01','1.6.02')
 p.write_text(s)

Path('/mnt/data/tg1602/PATCH_NOTES_1.6.02.md').write_text('''# Testing Grounds 1.6.02\n\n## Crimson Tree — branch interaction + 1.6.01.01 refinement\n\n- Direct Tree Edit in-world is now a toggle: click/A enters the TREE edit state instead of holding the initial click.\n- Tree edit panel remains available while the state is active.\n- Left stick / mouse drag supports height and bend in trunk mode.\n- Added trunk/branch edit mode controls.\n- Added procedural custom branch data and secondary branch generation.\n- Branch mesh is targetable for branch interaction and extrusion.\n- Added a world-space blue torus interaction ring that is depth-tested so trunk/branch geometry occludes the rear half.\n- Extended tree definition merging so branch edits persist through the placement system.\n- Added Object Editor trunk/branch mode controls and branch parameters.\n- Preserved Sun control implementation; no Sun files intentionally changed.\n\nNo production Vite build was run; dependency/build environment is not included in this development archive.\n''')
