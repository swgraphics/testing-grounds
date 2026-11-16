import { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useInteractionStore } from "../../systems/interaction/interactionStore";
import { useWorldStore } from "../../systems/world/worldStore";
import { clearGameplayInput, gameplayInputAllowed } from "../../systems/input/inputOwnership";
import { resolveObjectTarget, resolveTreeProfileId } from "../../systems/objects/objectEditing";
import { gamepadState } from "../../systems/input/gamepadState";
import { createCrimsonTreeDefinition } from "./treeGenerator";
import { beginHistoryTransaction, commitHistoryTransaction, getHistoryPathSnapshot } from "../../systems/history/historyStore";

const centerPointer = new THREE.Vector2(0, 0);

function mergeCrimsonDefinition(definition, patch) {
  const base = createCrimsonTreeDefinition(definition ?? {});
  return createCrimsonTreeDefinition({
    ...base,
    trunk: { ...base.trunk, ...(patch?.trunk ?? {}) },
    branches: {
      ...base.branches,
      ...(patch?.branches ?? {}),
      overrides: { ...base.branches.overrides, ...(patch?.branches?.overrides ?? {}) },
      secondary: { ...base.branches.secondary, ...(patch?.branches?.secondary ?? {}) },
    },
    leaves: { ...base.leaves, ...(patch?.leaves ?? {}) },
  });
}

function findTreeHit(intersections) {
  for (const hit of intersections) {
    let object = hit.object;
    while (object) {
      if (object.userData?.tgCrimsonTreeTrunk && object.userData?.tgCrimsonTreeId) {
        return { hit, object, type: "trunk", branch: null };
      }
      if (object.userData?.tgCrimsonTreeBranch && object.userData?.tgCrimsonTreeId) {
        const data = object.userData.tgTreeBranchData ?? [];
        const branchIndex = Number.isFinite(hit.faceIndex) ? Math.floor(hit.faceIndex / 12) : -1;
        return { hit, object, type: "branch", branch: data[branchIndex] ?? null };
      }
      object = object.parent;
    }
  }
  return null;
}

function getTreeRoot(object) {
  let root = object;
  while (root.parent && root.parent.type !== "Scene") root = root.parent;
  return root;
}

export default function CrimsonTreeInteractionSystem() {
  const { camera, scene, gl } = useThree();
  const selectedRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const targetRef = useRef(null);
  const activeTreeIdRef = useRef(null);
  const editModeRef = useRef("trunk");
  const branchScopeRef = useRef("global");
  const instanceScopeRef = useRef("single");
  const branchGestureModeRef = useRef("length");
  const activeBranchIndexRef = useRef(null);
  const dragRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(50);
  const dragStartBendRef = useRef(50);
  const dragStartBranchRef = useRef(null);
  const dragStartPointRef = useRef(null);
  const definitionRef = useRef(null);
  const ringMeshRef = useRef(null);
  const ringVisibleRef = useRef(false);
  const treeHistoryRef = useRef(null);
  const frameCounterRef = useRef(0);
  const [ringVisible, setRingVisible] = useState(false);

  const updateRing = (result) => {
    const mesh = ringMeshRef.current;
    if (!mesh || !result) return;
    const root = getTreeRoot(result.object);
    const q = new THREE.Quaternion();
    root.getWorldQuaternion(q);
    const normal = result.type === "branch" && result.branch?.direction
      ? result.branch.direction.clone()
      : new THREE.Vector3(0, 1, 0);
    normal.applyQuaternion(q).normalize();
    const point = result.hit?.point ?? result.point;
    if (!point) return;
    mesh.position.copy(point);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const scale = root.getWorldScale(new THREE.Vector3());
    mesh.scale.setScalar(
      result.type === "branch"
        ? Math.max(0.12, Number(result.branch?.thickness ?? 0.06) * 2.6 * scale.x) / 0.12
        : Math.max(0.16, 0.34 * scale.x) / 0.16
    );
  };

  const refreshTarget = (pointer = centerPointer) => {
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(pointer, camera);
    const result = findTreeHit(raycaster.intersectObjects(scene.children, true));
    const treeId = result?.object?.userData?.tgCrimsonTreeId ?? null;
    const previous = targetRef.current;
    const changed = previous?.treeId !== treeId || previous?.type !== result?.type || previous?.branch?.index !== result?.branch?.index;
    if (changed) {
      const activeTree = useInteractionStore.getState().activeTool === "TREE" && activeTreeIdRef.current;
      if (result || !activeTree) {
        targetRef.current = result ? { treeId, type: result.type, branch: result.branch, point: result.hit.point.clone(), object: result.object } : null;
        definitionRef.current = result?.object?.userData?.tgTreeDefinition ?? definitionRef.current;
        window.dispatchEvent(new CustomEvent("crimson-tree-reticle-target-changed", { detail: { active: Boolean(treeId), treeId, type: result?.type ?? null, branchIndex: result?.branch?.index ?? null, treeDefinition: result?.object?.userData?.tgTreeDefinition ?? definitionRef.current } }));
      }
    } else if (result) {
      targetRef.current.point.copy(result.hit.point);
      targetRef.current.object = result.object;
      targetRef.current.branch = result.branch;
    }
    if (useInteractionStore.getState().activeTool === "TREE" && (result || targetRef.current?.treeId === activeTreeIdRef.current)) {
      if (!ringVisibleRef.current) {
        ringVisibleRef.current = true;
        setRingVisible(true);
      }
      updateRing(result ?? targetRef.current);
    } else if (ringVisibleRef.current) {
      ringVisibleRef.current = false;
      setRingVisible(false);
    }
    return result;
  };

  const resolveTreeHistoryPaths = (treeId) => {
    const world = useWorldStore.getState().world;
    const chunkId = (world.terrainSurface ? Object.values(world.chunks).find(c=>c.objects?.[treeId])?.id : null) ?? world.currentChunkId;
    const profileId=resolveTreeProfileId(treeId,world);
    if(profileId)return [['scatterProfiles',profileId]];
    return [["chunks", chunkId, "objects", treeId]];
  };

  const beginTreeHistory = (treeId) => {
    if (!treeId || treeHistoryRef.current) return;
    const paths = resolveTreeHistoryPaths(treeId);
    treeHistoryRef.current = { treeId, paths };
    beginHistoryTransaction("EDIT TREE", getHistoryPathSnapshot(paths), { paths });
  };

  const commitTreeHistory = () => {
    const transaction = treeHistoryRef.current;
    if (!transaction) return;
    const after = getHistoryPathSnapshot(transaction.paths);
    commitHistoryTransaction(after, { paths: transaction.paths });
    treeHistoryRef.current = null;
  };

  useFrame(() => {
    if (document.body.classList.contains("tg-editor-active")) return;

    // The old implementation raycast the entire scene every render frame.
    // Tree targeting only needs a responsive sampling rate; doing it every
    // third frame removes a large amount of CPU work without making the reticle
    // feel delayed.
    frameCounterRef.current += 1;
    const shouldRefresh = frameCounterRef.current % 3 === 0 || gamepadState.aPressed;
    if (shouldRefresh) {
      const result = refreshTarget();
      const treeId = result?.object?.userData?.tgCrimsonTreeId ?? targetRef.current?.treeId ?? null;
      if (gamepadState.aPressed && gameplayInputAllowed() && !useInteractionStore.getState().activeTool && treeId && result) {
        selectedRef.current = { ...targetRef.current, definition: result.object.userData.tgTreeDefinition };
        useInteractionStore.getState().setTarget('tree:' + treeId);
        window.dispatchEvent(new CustomEvent('crimson-tree-selected', { detail: { treeId, treeDefinition: selectedRef.current.definition } }));
      }
    }
  });

  useEffect(() => {
    const enter = () => {
      const selected = selectedRef.current ?? { treeId: useInteractionStore.getState().activeTarget?.replace(/^tree:/, '') };
      const treeId = selected?.treeId;
      if (!treeId || useInteractionStore.getState().activeTool) return;
      const object = resolveObjectTarget({ id: treeId, definition: selected.definition });
      if (!object) return;
      selectedRef.current = { ...selected, definition: object.treeDefinition };
      clearGameplayInput();
      activeTreeIdRef.current = treeId;
      definitionRef.current = object.treeDefinition ?? selected.definition;
      beginTreeHistory(treeId);
      instanceScopeRef.current = "single";
      branchScopeRef.current = "global";
      editModeRef.current = "trunk";
      useInteractionStore.getState().activate({ target: `tree:${treeId}`, tool: "TREE", mode: "edit" });
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-enter", { detail: { treeId, mode: "trunk", instanceScope: instanceScopeRef.current, treeDefinition: definitionRef.current } }));
      window.dispatchEvent(new CustomEvent("crimson-tree-instance-scope-changed", { detail: { scope: instanceScopeRef.current } }));
    };
    const exit = () => {
      dragRef.current = false;
      if(useInteractionStore.getState().gestureOwner==='tree-drag')useInteractionStore.getState().setGestureOwner(null);
      commitTreeHistory();
      activeTreeIdRef.current = null;
      editModeRef.current = "trunk";
      if (useInteractionStore.getState().activeTool === "TREE") {
        useInteractionStore.getState().deactivate();
        if (selectedRef.current?.treeId) useInteractionStore.getState().setTarget('tree:' + selectedRef.current.treeId);
      }
      ringVisibleRef.current = false;
      setRingVisible(false);
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-exit"));
    };
    const changeMode = (event) => {
      const mode = event.detail?.mode;
      if (!["trunk", "branch", "leaves"].includes(mode)) return;
      editModeRef.current = mode;
      dragRef.current = false;
      window.dispatchEvent(new CustomEvent("crimson-tree-edit-mode-changed", { detail: { mode } }));
    };
    const setBranchScope = (event) => {
      const scope = event.detail?.scope;
      if (scope !== "global" && scope !== "single") return;
      branchScopeRef.current = scope;
      window.dispatchEvent(new CustomEvent("crimson-tree-branch-scope-changed", { detail: { scope } }));
    };
    const setBranchGestureMode = (event) => {
      const mode = event.detail?.mode;
      if (!["length", "verticality", "thickness", "frequency", "taper"].includes(mode)) return;
      branchGestureModeRef.current = mode;
      window.dispatchEvent(new CustomEvent("crimson-tree-branch-gesture-changed", { detail: { mode } }));
    };
    const trackDefinition = (event) => {
      const patch = event.detail?.patch;
      if (!patch) return;
      const current = definitionRef.current ?? {};
      definitionRef.current = mergeCrimsonDefinition(current, patch);
    };
    const onDown = (event) => {
      if (event.button !== 0 || event.target !== gl.domElement) return;
      const tool = useInteractionStore.getState().activeTool;
      if ((tool && tool !== 'TREE') || (!tool && !gameplayInputAllowed())) return;
      if (event.target?.closest?.("button, input, select, textarea, .tg-side-panel, .tg-interaction-panel, .tg-mesh-menu, .tg-mesh-edit-backdrop, .tg-editor-view, .tg-tree-interaction-panel")) return;
      // Refresh synchronously on click so the interaction does not depend on
      // a possibly stale render-frame target. This also prevents a generic
      // Object click from winning the same pointer event.
      const rect = gl.domElement.getBoundingClientRect();
      const freshTarget = refreshTarget(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2));
      const target = freshTarget
        ? { treeId: freshTarget.object?.userData?.tgCrimsonTreeId ?? null, type: freshTarget.type, branch: freshTarget.branch, point: freshTarget.hit.point.clone(), object: freshTarget.object }
        : null;
      if (!target?.treeId) return;
      const active = useInteractionStore.getState().activeTool === "TREE" && activeTreeIdRef.current === target.treeId;
      if (!active) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        selectedRef.current = { ...target, definition: freshTarget?.object?.userData?.tgTreeDefinition };
        useInteractionStore.getState().setTarget('tree:' + target.treeId);
        window.dispatchEvent(new CustomEvent('crimson-tree-selected', { detail: { treeId: target.treeId, treeDefinition: selectedRef.current.definition } }));
        return;
      }
      // Tree Edit is persistent. A click never toggles it off. In branch mode
      // the clicked branch becomes the physical gesture handle.
      dragRef.current = true;
      useInteractionStore.getState().setGestureOwner('tree-drag');
      clearGameplayInput();
      dragStartXRef.current = event.clientX;
      dragStartYRef.current = event.clientY;
      dragStartHeightRef.current = Number(definitionRef.current?.trunk?.height ?? 50);
      dragStartBendRef.current = Number(definitionRef.current?.trunk?.bend ?? 50);
      dragStartPointRef.current = target.point?.clone?.() ?? null;
      activeBranchIndexRef.current = Number.isFinite(Number(target.branch?.index)) ? Number(target.branch.index) : null;
      dragStartBranchRef.current = {
        length: Number(definitionRef.current?.branches?.length ?? 50),
        verticality: Number(definitionRef.current?.branches?.verticality ?? 50),
        thickness: Number(definitionRef.current?.branches?.thickness ?? 50),
        frequency: Number(definitionRef.current?.branches?.frequency ?? 50),
        taper: Number(definitionRef.current?.branches?.taper ?? 50),
      };
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };
    const onMove = (event) => {
      if (!dragRef.current || useInteractionStore.getState().activeTool !== "TREE") return;
      const treeId = activeTreeIdRef.current;
      if (!treeId) return;
      const dx = event.clientX - dragStartXRef.current;
      const dy = event.clientY - dragStartYRef.current;
      if (editModeRef.current === "trunk") {
        window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScopeRef.current, patch: { trunk: { height: THREE.MathUtils.clamp(dragStartHeightRef.current - dy * 0.28, 0, 100), bend: THREE.MathUtils.clamp(dragStartBendRef.current + dx * 0.28, 0, 100) } } } }));
      } else if (editModeRef.current === "branch") {
        const start = dragStartBranchRef.current ?? {};
        const gestureMode = event.shiftKey
          ? "thickness"
          : event.ctrlKey
            ? "frequency"
            : event.altKey
              ? "taper"
              : branchGestureModeRef.current;
        const sensitivity = 0.32;
        const deltaX = dx * sensitivity;
        const deltaY = -dy * sensitivity;
        const scope = branchScopeRef.current;

        if (scope === "global" || activeBranchIndexRef.current == null) {
          const patchValues = {};
          if (gestureMode === "length") patchValues.length = THREE.MathUtils.clamp((start.length ?? 50) + deltaX, 0, 100);
          if (gestureMode === "verticality") patchValues.verticality = THREE.MathUtils.clamp((start.verticality ?? 50) + deltaY, 0, 100);
          if (gestureMode === "thickness") patchValues.thickness = THREE.MathUtils.clamp((start.thickness ?? 50) + deltaX, 0, 100);
          if (gestureMode === "frequency") patchValues.frequency = THREE.MathUtils.clamp((start.frequency ?? 50) + deltaX, 0, 100);
          if (gestureMode === "taper") patchValues.taper = THREE.MathUtils.clamp((start.taper ?? 50) + deltaX, 0, 100);
          if (gestureMode === "length" && Math.abs(dy) > Math.abs(dx) * 1.35) {
            patchValues.verticality = THREE.MathUtils.clamp((start.verticality ?? 50) + deltaY, 0, 100);
          }
          window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScopeRef.current, patch: { branches: patchValues } } }));
        } else {
          const index = activeBranchIndexRef.current;
          const existing = { ...(definitionRef.current?.branches?.overrides?.[index] ?? {}) };
          const currentValue = Number(existing[gestureMode] ?? start[gestureMode] ?? 50);
          const delta = gestureMode === "verticality" ? deltaY : deltaX;
          existing[gestureMode] = THREE.MathUtils.clamp(currentValue + delta, 0, 100);
          window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScopeRef.current, patch: { branches: { overrides: { [index]: existing } } } } }));
        }
      }
    };
    const onUp = () => { dragRef.current = false;if(useInteractionStore.getState().gestureOwner==='tree-drag')useInteractionStore.getState().setGestureOwner(null); };
    const onKey = (event) => {
      if (event.defaultPrevented || document.querySelector('.tg-leaf-editor-window,.tg-mesh-edit-backdrop')) return;
      if (event.key === 'Escape' && useInteractionStore.getState().activeTool === 'TREE') { event.preventDefault(); event.stopImmediatePropagation(); exit(); return; }
      if (event.code === 'KeyE' && gameplayInputAllowed() && !useInteractionStore.getState().activeTool) enter();
      if (useInteractionStore.getState().activeTool !== "TREE" || editModeRef.current !== "branch") return;
      if (event.key.toLowerCase() === "g") { event.preventDefault(); setBranchScope({ detail: { scope: branchScopeRef.current === "global" ? "single" : "global" } }); }
      if (event.key.toLowerCase() === "1") setBranchGestureMode({ detail: { mode: "length" } });
      if (event.key.toLowerCase() === "2") setBranchGestureMode({ detail: { mode: "verticality" } });
      if (event.key.toLowerCase() === "3") setBranchGestureMode({ detail: { mode: "thickness" } });
      if (event.key.toLowerCase() === "4") setBranchGestureMode({ detail: { mode: "frequency" } });
      if (event.key.toLowerCase() === "5") setBranchGestureMode({ detail: { mode: "taper" } });
    };
    const poll = () => {
      const pad = navigator.getGamepads?.().find(entry => entry?.connected);
      if (useInteractionStore.getState().activeTool !== 'TREE' || !pad?.buttons[7]?.pressed) return;
      if (document.querySelector('.tg-leaf-editor-window,.tg-mesh-edit-backdrop') || document.activeElement?.hasAttribute('data-gamepad-adjusting')) return;
      // The inspector owns input: direct RT gestures must not re-enable world movement/camera.
      const x = Number(pad.axes[0]) || 0;
      const y = Number(pad.axes[1]) || 0;
      if (Math.abs(x) < 0.12 && Math.abs(y) < 0.12) return;
      const treeId = activeTreeIdRef.current;
      if (!treeId) return;
      if (editModeRef.current === "trunk") {
        const height = THREE.MathUtils.clamp(Number(definitionRef.current?.trunk?.height ?? 50) - y * 1.4, 0, 100);
        const bend = THREE.MathUtils.clamp(Number(definitionRef.current?.trunk?.bend ?? 50) + x * 1.4, 0, 100);
        window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScopeRef.current, patch: { trunk: { height, bend } } } }));
        return;
      }
      if (editModeRef.current !== "branch") return;
      const modifier = pad?.buttons?.[2]?.pressed ? "thickness" : pad?.buttons?.[3]?.pressed ? "frequency" : pad?.buttons?.[1]?.pressed ? "taper" : branchGestureModeRef.current;
      const start = dragStartBranchRef.current ?? { ...definitionRef.current?.branches };
      const gestureDelta = modifier === "verticality" ? -y * 1.4 : x * 1.4;
      if (branchScopeRef.current === "global" || activeBranchIndexRef.current == null) {
        const patchValues = {};
        if (modifier === "length") patchValues.length = THREE.MathUtils.clamp(Number(definitionRef.current?.branches?.length ?? 50) + gestureDelta, 0, 100);
        if (modifier === "verticality") patchValues.verticality = THREE.MathUtils.clamp(Number(definitionRef.current?.branches?.verticality ?? 50) + gestureDelta, 0, 100);
        if (modifier === "thickness") patchValues.thickness = THREE.MathUtils.clamp(Number(definitionRef.current?.branches?.thickness ?? 50) + gestureDelta, 0, 100);
        if (modifier === "frequency") patchValues.frequency = THREE.MathUtils.clamp(Number(definitionRef.current?.branches?.frequency ?? 50) + gestureDelta, 0, 100);
        if (modifier === "taper") patchValues.taper = THREE.MathUtils.clamp(Number(definitionRef.current?.branches?.taper ?? 50) + gestureDelta, 0, 100);
        window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScopeRef.current, patch: { branches: patchValues } } }));
      } else {
        const index = activeBranchIndexRef.current;
        const existing = { ...(definitionRef.current?.branches?.overrides?.[index] ?? {}) };
        existing[modifier] = THREE.MathUtils.clamp(Number(existing[modifier] ?? start[modifier] ?? 50) + gestureDelta, 0, 100);
        window.dispatchEvent(new CustomEvent("crimson-tree-edit-change", { detail: { treeId, scope: instanceScopeRef.current, patch: { branches: { overrides: { [index]: existing } } } } }));
      }
    };
    const timer = window.setInterval(poll, 50);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    window.addEventListener("blur", onUp, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("crimson-tree-edit-exit-request", exit);
    window.addEventListener("crimson-tree-edit-selected-request", enter);
    window.addEventListener("crimson-tree-edit-mode-request", changeMode);
    window.addEventListener("crimson-tree-edit-change", trackDefinition);
    function setInstanceScope(event) {
      const scope = event.detail?.scope;
      if (scope !== "global" && scope !== "single") return;
      instanceScopeRef.current = scope;

      // Forest-wide editing is intentionally a higher-level scope. A
      // single-branch operation must never silently fan out across every
      // scattered instance, so entering ALL SCATTERED also locks the branch
      // scope back to ALL BRANCHES.
      if (scope === "global" && branchScopeRef.current !== "global") {
        branchScopeRef.current = "global";
        window.dispatchEvent(new CustomEvent("crimson-tree-branch-scope-changed", { detail: { scope: "global" } }));
      }

      window.dispatchEvent(new CustomEvent("crimson-tree-instance-scope-changed", { detail: { scope } }));
    }
    window.addEventListener("crimson-tree-instance-scope-request", setInstanceScope);
    window.addEventListener("crimson-tree-branch-scope-request", setBranchScope);
    window.addEventListener("crimson-tree-branch-gesture-request", setBranchGestureMode);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("blur", onUp, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("crimson-tree-edit-exit-request", exit);
      window.removeEventListener("crimson-tree-edit-selected-request", enter);
      window.removeEventListener("crimson-tree-edit-mode-request", changeMode);
      window.removeEventListener("crimson-tree-edit-change", trackDefinition);
      window.removeEventListener("crimson-tree-instance-scope-request", setInstanceScope);
      window.removeEventListener("crimson-tree-branch-scope-request", setBranchScope);
      window.removeEventListener("crimson-tree-branch-gesture-request", setBranchGestureMode);
    };
  }, [camera, gl.domElement]);

  return (
    <mesh ref={ringMeshRef} visible={ringVisible} renderOrder={20}>
      <torusGeometry args={[0.16, 0.012, 8, 64]} />
      <meshBasicMaterial color="#2a8fff" transparent opacity={0.95} depthTest depthWrite={false} />
    </mesh>
  );
}
