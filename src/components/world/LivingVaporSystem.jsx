import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CloudObject, SIM_STEP } from '../../systems/atmosphere/livingVapor/cloudObject.js';
import { rayHitCloud, pointerLocal, clampToCage, rayPlane } from '../../systems/atmosphere/livingVapor/cloudMath.js';
import { registerCloudSnapshotProvider, restoreVapor, encodeVapor } from '../../systems/atmosphere/livingVapor/cloudPersistence.js';
import { cloudRecords, runtimeClouds, useCloudUI, createCloud, selectCloud, changeCloud, checkpointCloud, recordCloudTransform } from '../../systems/atmosphere/livingVapor/cloudState.js';
import { persistenceSeconds, SIM_BUDGET_MS } from '../../systems/atmosphere/livingVapor/settings.js';
import { useWorldStore } from '../../systems/world/worldStore';
import { useWorldGuideStore } from '../../systems/ui/worldGuideStore';
import { useInteractionStore } from '../../systems/interaction/interactionStore';
import { useNavigationStore } from '../../systems/ui/navigationStore';
import { clearGameplayInput, gameplayInputAllowed, isTextInput } from '../../systems/input/inputOwnership';
import { getAtmospherePalette } from '../../systems/atmosphere/atmospherePalette';
import { cloudSettings } from '../../systems/atmosphere/clouds/CloudSettings';

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const arr = v => v.toArray();
function pickLivingCloud(origin, direction) {
  let nearest = null;
  for (const cloud of runtimeClouds.values()) {
    const hit = rayHitCloud(origin, direction, cloud.frame);
    if (hit && (!nearest || hit.t < nearest.hit.t)) nearest = { cloud, hit };
  }
  return nearest;
}

export default function LivingVaporSystem() {
  const { camera, gl, scene } = useThree();
  const group = useRef(null), gesture = useRef(null), target = useRef(null), sensed = useRef(null), cursor = useRef(new THREE.Vector2());
  const records = useWorldStore(state => cloudRecords(state.world));
  const temp = useRef({ ray: new THREE.Raycaster(), forward: new THREE.Vector3(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), right: new THREE.Vector3(), up: new THREE.Vector3(), cameraPosition: new THREE.Vector3(), moveDelta: new THREE.Vector3(), top: new THREE.Color(), bottom: new THREE.Color(), rim: new THREE.Color() });
  const scheduler = useRef({ index: 0, elapsed: 0, frames: 0, totalMs: 0, steps: 0, budgetHits: 0 });
  const padPrevious = useRef({});
  const supported = gl.capabilities.isWebGL2 && gl.getContext().getParameter(gl.getContext().MAX_3D_TEXTURE_SIZE) >= 32;

  const finish = useCallback(() => {
    const active = gesture.current;
    if (!active && useInteractionStore.getState().gestureOwner !== 'cloud-gesture') return;
    gesture.current = null;
    if (active) {
      try { gl.domElement.releasePointerCapture(active.pointerId); } catch { /* capture may already be released */ }
      if (['move', 'rotate', 'scale'].includes(active.tool)) recordCloudTransform(active.id, active.before);
      checkpointCloud(active.id);
    }
    if (useInteractionStore.getState().gestureOwner === 'cloud-gesture') useInteractionStore.getState().setGestureOwner(null);
    clearGameplayInput();
  }, [gl]);

  const close = useCallback(() => {
    finish();
    useCloudUI.setState({ panelOpen: false });
    if (useInteractionStore.getState().activeTool === 'CLOUD') useInteractionStore.getState().deactivate();
    document.activeElement?.blur?.();
  }, [finish]);

  const edit = useCallback(id => {
    if (!id || !cloudRecords(useWorldStore.getState().world)[id]) return;
    selectCloud(id);
    useCloudUI.setState({ panelOpen: true });
    useInteractionStore.getState().activate({ target: `cloud:${id}`, tool: 'CLOUD', mode: 'select' });
    clearGameplayInput();
  }, []);

  useEffect(() => {
    useCloudUI.setState({ supported });
    if (!supported) useCloudUI.setState({ message: 'Living Vapor requires WebGL2 with 3D textures. Existing world tools remain available.' });
    return registerCloudSnapshotProvider(world => {
      if (world !== useWorldStore.getState().world) return world.livingVapor;
      const objects = {};
      for (const [id, record] of Object.entries(cloudRecords(world))) {
        const cloud = runtimeClouds.get(id);
        objects[id] = cloud ? { ...record, fillPoint: [...cloud.fillPoint], opticalScale: cloud.opticalScale ?? 1, vapor: encodeVapor(cloud.sim) } : record;
      }
      return world.livingVapor || Object.keys(objects).length ? { version: 1, objects } : undefined;
    });
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    for (const [id, cloud] of runtimeClouds) {
      if (!records[id]) { cloud.dispose(); runtimeClouds.delete(id); }
    }
    for (const record of Object.values(records)) {
      let cloud = runtimeClouds.get(record.id);
      if (!cloud) {
        cloud = new CloudObject({ id: record.id, family: record.family, seed: record.seed, position: record.position });
        runtimeClouds.set(record.id, cloud);
        group.current.add(cloud.root);
      }
      if (record.vapor && record.vapor !== cloud.savedVapor) {
        cloud.sim.clear();
        restoreVapor(cloud.sim, record.vapor);
        cloud.opticalScale = record.opticalScale ?? 1;
        cloud.savedVapor = record.vapor;
      }
      cloud.sim.family = record.family;
      cloud.sim.persistence = persistenceSeconds(record.persistencePercent);
      cloud.root.position.fromArray(record.position);
      cloud.root.quaternion.fromArray(record.quaternion);
      cloud.root.scale.set(...cloud.dims.map((value, i) => value * record.scale[i]));
      cloud.fillPoint = [...record.fillPoint];
      cloud.cageVisible = record.cage;
    }
    const selected = useCloudUI.getState().selectedId;
    if (selected && !records[selected]) { useCloudUI.setState({ selectedId: null, panelOpen: false }); close(); }
  }, [records, supported, close]);

  useEffect(() => () => {
    finish();
    for (const cloud of runtimeClouds.values()) cloud.dispose();
    runtimeClouds.clear();
    emit('tg-cloud-reticle-target-changed', { active: false });
  }, [finish]);

  useEffect(() => {
    const dom = gl.domElement, T = temp.current;
    const ray = event => {
      if (event) {
        const rect = dom.getBoundingClientRect();
        cursor.current.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      }
      T.ray.setFromCamera(cursor.current, camera);
      camera.getWorldDirection(T.forward);
      return { origin: arr(T.ray.ray.origin), dir: arr(T.ray.ray.direction), forward: arr(T.forward) };
    };
    const place = r => {
      const placement = useCloudUI.getState().placement;
      if (!placement) return false;
      const position = r.origin.map((v, i) => v + r.dir[i] * 30);
      const id = createCloud(placement.family, position);
      if (id) {
        useInteractionStore.getState().deactivate();
        useInteractionStore.getState().setTarget(`cloud:${id}`);
        useNavigationStore.getState().setPlacementOrigin(null);
        emit('tg-mesh-placement-completed');
      }
      return true;
    };
    const begin = (r, pointerId) => {
      const ui = useCloudUI.getState();
      const cloud = runtimeClouds.get(ui.selectedId);
      if (!cloud || useInteractionStore.getState().activeTool !== 'CLOUD') return false;
      const hit = rayHitCloud(r.origin, r.dir, cloud.frame);
      if (!hit) return false;
      const pos = clampToCage(pointerLocal(r.origin, r.dir, cloud.frame, r.forward) ?? hit.local);
      finish();
      gesture.current = { id: cloud.id, tool: ui.tool, pointerId, pos, vel: [0, 0, 0], lastX: 0, lastY: 0, lastTime: performance.now(), before: cloudRecords(useWorldStore.getState().world)[cloud.id] };
      if (ui.tool === 'move') {
        const planePoint = arr(cloud.root.position);
        const hitPoint = rayPlane(r.origin, r.dir, planePoint, r.forward) ?? planePoint;
        gesture.current.movePlanePoint = planePoint;
        gesture.current.movePlaneNormal = [...r.forward];
        gesture.current.moveOffset = planePoint.map((value, index) => value - hitPoint[index]);
      } else cloud.fillPoint = [...pos];
      useInteractionStore.getState().setGestureOwner('cloud-gesture');
      clearGameplayInput();
      return true;
    };
    const onDown = e => {
      if (e.button !== 0 || e.target !== dom) return;
      const owner = useInteractionStore.getState();
      if (!gameplayInputAllowed() && owner.activeTool !== 'CLOUD') return;
      if (useNavigationStore.getState().compassOpen) return;
      document.activeElement?.blur?.();
      const r = ray(e);
      if (place(r)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (begin(r, e.pointerId)) {
        gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY;
        try { dom.setPointerCapture(e.pointerId); } catch { /* optional */ }
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      if (owner.activeTool) return;
      const picked = pickLivingCloud(r.origin, r.dir);
      if (!picked) return;
      // Foreground terrain and ordinary objects occlude cloud selection.
      const foreground = T.ray.intersectObjects(scene.children, true).find(hit => hit.object.isMesh && !hit.object.material?.transparent);
      if (foreground && foreground.distance < picked.hit.t) return;
      selectCloud(picked.cloud.id);
      owner.setTarget(`cloud:${picked.cloud.id}`);
      e.preventDefault(); e.stopImmediatePropagation();
    };
    const onMove = e => {
      if (e.target === dom) ray(e);
      const s = gesture.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const cloud = runtimeClouds.get(s.id);
      const record = cloudRecords(useWorldStore.getState().world)[s.id];
      if (!cloud || !record) { finish(); return; }
      const now = performance.now(), dt = Math.max(0.008, (now - s.lastTime) / 1000);
      const r = ray(e);
      if (s.tool === 'move') {
        const point = rayPlane(r.origin, r.dir, s.movePlanePoint, s.movePlaneNormal);
        if (point) {
          const position = point.map((value, index) => value + s.moveOffset[index]);
          cloud.root.position.fromArray(position);
          changeCloud(s.id, { position }, false);
        }
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      const pos = clampToCage(pointerLocal(r.origin, r.dir, cloud.frame, r.forward) ?? s.pos);
      s.vel = pos.map((v, i) => THREE.MathUtils.clamp((v - s.pos[i]) / dt, -4, 4));
      s.pos = pos;
      cloud.fillPoint = [...pos];
      if (s.tool === 'rotate') {
        T.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        T.qa.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (e.clientX - s.lastX) * 0.009);
        T.qb.setFromAxisAngle(T.right, (e.clientY - s.lastY) * 0.009);
        cloud.root.quaternion.premultiply(T.qa).premultiply(T.qb).normalize();
        changeCloud(s.id, { quaternion: cloud.root.quaternion.toArray() }, false);
      } else if (s.tool === 'scale') {
        const factor = Math.exp(-(e.clientY - s.lastY) * 0.006);
        changeCloud(s.id, { scale: record.scale.map(value => Math.max(0.3, Math.min(3.5, value * factor))) }, false);
      }
      s.lastX = e.clientX; s.lastY = e.clientY; s.lastTime = now;
      e.preventDefault(); e.stopImmediatePropagation();
    };
    const onKey = e => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && useInteractionStore.getState().activeTool === 'CLOUD') {
        if (document.activeElement?.hasAttribute('data-gamepad-adjusting')) return;
        close(); e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      if (isTextInput(e.target)) return;
      if (e.code === 'KeyE' && gameplayInputAllowed() && useInteractionStore.getState().activeTarget?.startsWith('cloud:')) {
        edit(useCloudUI.getState().selectedId); e.preventDefault(); e.stopImmediatePropagation();
      }
    };
    const startPlacement = e => {
      const origin = e.detail.origin === 'east' ? 'east' : 'south';
      const destination = origin === 'east' ? 'Dev Tools / CLOUDS' : 'the Library';
      finish(); useCloudUI.setState({ placement: e.detail.mesh, panelOpen: false, message: `Aim into the world and click / RT to place. Escape / B returns to ${destination}.` });
      useNavigationStore.getState().setPlacementOrigin(origin);
    };
    const cancel = () => { finish(); useCloudUI.setState({ placement: null, message: '' }); };
    const editSelected = () => edit(useCloudUI.getState().selectedId);
    const toolSelected = () => {
      finish();
      const id = useCloudUI.getState().selectedId;
      if (id) useInteractionStore.getState().activate({ target: `cloud:${id}`, tool: 'CLOUD', mode: 'select' });
      document.activeElement?.blur?.();
    };
    const gamepadPlace = () => {
      if (useCloudUI.getState().placement) { cursor.current.set(0, 0); place(ray()); }
    };
    const listeners = [['pointerdown', onDown, true], ['pointermove', onMove, true], ['pointerup', finish, true], ['pointercancel', finish, true], ['blur', finish], ['keydown', onKey, true], ['tg-cloud-place-request', startPlacement], ['tg-mesh-place-request', cancel], ['tg-mesh-cancel-placement', cancel], ['tg-return-to-world', close], ['tg-cloud-close', close], ['tg-cloud-edit-selected', editSelected], ['tg-cloud-tool-selected', toolSelected], ['tg-gamepad-place', gamepadPlace]];
    listeners.forEach(args => window.addEventListener(...args));
    const unsubscribe = useInteractionStore.subscribe((state, previous) => {
      if (previous.activeTool === 'CLOUD' && state.activeTool !== 'CLOUD') { finish(); useCloudUI.setState({ panelOpen: false }); }
      if (useCloudUI.getState().placement && (state.activeTool !== 'OBJECT' || state.activeMode !== 'place')) useCloudUI.setState({ placement: null });
    });
    return () => { listeners.forEach(args => window.removeEventListener(...args)); unsubscribe(); };
  }, [camera, gl, scene, finish, close, edit]);

  useFrame(({ clock }, delta) => {
    if (!supported) return;
    const T = temp.current, ui = useCloudUI.getState(), data = cloudRecords(useWorldStore.getState().world);
    const list = [...runtimeClouds.values()], S = scheduler.current;
    const palette = getAtmospherePalette();
    T.top.copy(cloudSettings.usePalette ? palette.cloudTopColor : T.top.set(cloudSettings.upperColor));
    T.bottom.copy(cloudSettings.usePalette ? palette.cloudBottomColor : T.bottom.set(cloudSettings.lowerColor));
    T.rim.copy(cloudSettings.usePalette ? palette.cloudEdgeColor : T.rim.set(cloudSettings.edgeColor));
    const now = performance.now();
    for (const cloud of list) cloud.accumulator = Math.min(cloud.accumulator + Math.min(delta, 0.1), SIM_STEP * 3);
    for (let visit = 0; visit < list.length; visit++) {
      const cloud = list[(S.index + visit) % list.length], record = data[cloud.id];
      if (!record || cloud.accumulator < SIM_STEP) continue;
      const active = gesture.current?.id === cloud.id ? gesture.current : null;
      if (active?.tool === 'emit' || record.fill) cloud.sim.emit(...(active?.pos ?? cloud.fillPoint), record.radius, record.density, SIM_STEP);
      if (active?.tool === 'gesture') {
        const velocity = performance.now() - active.lastTime > 100 ? active.vel.map(v => v * 0.8) : active.vel;
        cloud.sim.gesture(ui.gesture, ...active.pos, ...velocity, record.radius, 1, SIM_STEP);
      }
      cloud.sim.step(SIM_STEP); cloud.accumulator -= SIM_STEP; S.steps++;
      if (performance.now() - now >= SIM_BUDGET_MS) { S.index = (S.index + visit + 1) % list.length; S.budgetHits++; break; }
    }
    S.totalMs += performance.now() - now; S.frames++;
    for (const cloud of list) cloud.updateVisuals({ camera, sunWorld: palette.sunDirection, sunColor: palette.sunColor, skyColor: T.top, groundColor: T.bottom, rimColor: T.rim, guides: useWorldGuideStore.getState().visible, time: clock.elapsedTime, selected: cloud.id === ui.selectedId });
    S.elapsed += delta;
    if (S.elapsed > 1) { useCloudUI.setState({ limited: S.budgetHits / S.frames > 0.15 }); S.elapsed = 0; }
    // Diagnostics are attached to the scene node and remain out of serialized data.
    if (group.current) group.current.userData.livingVaporStats = { frames: S.frames, steps: S.steps, totalSimulationMs: S.totalMs, budgetHits: S.budgetHits, count: list.length };

    const owner = useInteractionStore.getState();
    T.ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    if (S.frames % 4 === 0) {
      const candidate = gameplayInputAllowed() && (!owner.activeTool || owner.activeTool === 'CLOUD') ? pickLivingCloud(arr(T.ray.ray.origin), arr(T.ray.ray.direction)) : null;
      const foreground = candidate ? T.ray.intersectObjects(scene.children, true).find(hit => hit.object.isMesh && !hit.object.material?.transparent) : null;
      sensed.current = candidate && (!foreground || foreground.distance >= candidate.hit.t) ? candidate : null;
    }
    const picked = sensed.current;
    if (target.current !== picked?.cloud.id) { target.current = picked?.cloud.id; emit('tg-cloud-reticle-target-changed', { active: Boolean(picked), id: picked?.cloud.id }); }
    const pad = navigator.getGamepads?.().find(p => p?.connected);
    const buttons = pad?.buttons ?? [], previous = padPrevious.current;
    if (buttons[0]?.pressed && !previous.a && gameplayInputAllowed() && !owner.activeTool && picked) {
      selectCloud(picked.cloud.id); owner.setTarget(`cloud:${picked.cloud.id}`); clearGameplayInput();
    }
    if (buttons[1]?.pressed && !previous.b && owner.activeTool === 'CLOUD' && !document.activeElement?.hasAttribute('data-gamepad-adjusting')) {
      close();
      padPrevious.current = { a: Boolean(buttons[0]?.pressed), b: true };
      return;
    }
    if (buttons[7]?.pressed && owner.activeTool === 'CLOUD' && !document.activeElement?.hasAttribute('data-gamepad-adjusting') && !useNavigationStore.getState().compassOpen) {
      if (!gesture.current) {
        const cloud = runtimeClouds.get(ui.selectedId);
        if (cloud) { gesture.current = { id: cloud.id, tool: ui.tool, pos: [...cloud.fillPoint], vel: [0, 0, 0], lastTime: performance.now(), before: data[cloud.id] }; owner.setGestureOwner('cloud-gesture'); clearGameplayInput(); }
      }
      const active = gesture.current, x = Number(pad.axes[0]) || 0, y = Number(pad.axes[1]) || 0;
      if (active) {
        active.vel = [Math.abs(x) > 0.15 ? x * 1.5 : 0, Math.abs(y) > 0.15 ? -y * 1.5 : 0, 0];
        active.pos = clampToCage(active.pos.map((v, i) => v + active.vel[i] * delta)); active.lastTime = performance.now();
        const record = data[active.id];
        if (record && active.tool === 'move') {
          const horizontal = Math.abs(x) > 0.15 ? x : 0;
          const vertical = Math.abs(y) > 0.15 ? -y : 0;
          const depth = Math.abs(Number(pad.axes[3]) || 0) > 0.15 ? -Number(pad.axes[3]) : 0;
          if (horizontal || vertical || depth) {
            T.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
            T.up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
            camera.getWorldDirection(T.forward);
            camera.getWorldPosition(T.cameraPosition);
            const cloud = runtimeClouds.get(active.id);
            const speed = Math.max(4, Math.min(100, T.cameraPosition.distanceTo(cloud.root.position) * 0.6));
            T.moveDelta.set(0, 0, 0).addScaledVector(T.right, horizontal).addScaledVector(T.up, vertical).addScaledVector(T.forward, depth);
            const position = record.position.map((value, index) => value + T.moveDelta.getComponent(index) * speed * Math.min(delta, 0.1));
            cloud.root.position.fromArray(position);
            changeCloud(active.id, { position }, false);
          }
        }
        if (record && active.tool === 'rotate') { T.qa.fromArray(record.quaternion); T.qb.setFromEuler(new THREE.Euler(-y * delta, x * delta, 0)); T.qa.premultiply(T.qb); changeCloud(active.id, { quaternion: T.qa.toArray() }, false); }
        if (record && active.tool === 'scale' && Math.abs(y) > 0.15) changeCloud(active.id, { scale: record.scale.map(v => v * Math.exp(-y * delta)) }, false);
      }
    } else if (gesture.current && gesture.current.pointerId === undefined) finish();
    padPrevious.current = { a: Boolean(buttons[0]?.pressed), b: Boolean(buttons[1]?.pressed) };
  });
  return <group ref={group} name="Living Vapor" />;
}
