// Test-only instrumentation, imported by the Chrome performance harness.
export function installCloudProfiler({ THREE, height, palette }) {
  const root = window.__root, scene = root.getState().scene;
  const renderer = root.getState().gl, gl = renderer.getContext();
  const extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const P = window.__P = { enabled: false, mode: { simulation: true, rendering: true }, times: {}, pending: [], lastInput: 0, snapshot: null };
  const add = (name, duration) => { if (!P.enabled) return; const value = P.times[name] ??= { calls: 0, ms: 0, max: 0 }; value.calls++; value.ms += duration; value.max = Math.max(value.max, duration); };
  const wrap = (object, name, label = name) => {
    const original = object[name];
    object[name] = function (...args) { const start = performance.now(); const value = original.apply(this, args); add(label, performance.now() - start); return value; };
  };
  const cloudSubscriber = root.getState().internal.subscribers.find(entry => String(entry.ref.current).includes('livingVaporStats'));
  if (!cloudSubscriber) throw Error('Living Vapor frame callback not found');
  const update = cloudSubscriber.ref.current;
  cloudSubscriber.ref.current = (...args) => {
    if (!P.mode.simulation && !P.mode.rendering) { for (const cloud of window.__cloud.runtimeClouds.values()) cloud.root.visible = false; return; }
    const start = performance.now(); const value = update(...args); add('cloudFrame', performance.now() - start); return value;
  };
  P.instrumentClouds = () => {
    for (const cloud of window.__cloud.runtimeClouds.values()) {
      if (cloud.userProfiled) continue; cloud.userProfiled = true;
      for (const name of ['_forces', '_vorticity', '_project', '_advect', '_advectField', '_maccormackFinish', '_finish', '_retainMass', 'mass', 'maxDensity', 'fillBytes', 'emit', 'gesture']) wrap(cloud.sim, name);
      const step = cloud.sim.step;
      cloud.sim.step = function (...args) { if (!P.mode.simulation) return; const start = performance.now(); const value = step.apply(this, args); add('step', performance.now() - start); return value; };
      const visuals = cloud.updateVisuals;
      cloud.updateVisuals = function (...args) { const start = performance.now(); const value = visuals.apply(this, args); cloud.root.visible = P.mode.rendering; add('visuals', performance.now() - start); return value; };
      wrap(cloud, 'syncTexture');
    }
  };
  wrap(THREE.Raycaster.prototype, 'intersectObjects', 'raycastScene');
  wrap(THREE.BufferGeometry.prototype, 'computeVertexNormals', 'normals');
  wrap(CanvasRenderingContext2D.prototype, 'putImageData', 'mapRaster');
  for (const method of ['texImage3D', 'texSubImage3D']) {
    const original = gl[method].bind(gl);
    gl[method] = (...args) => { const start = performance.now(); const value = original(...args); if (P.enabled) { P.uploads.calls++; P.uploads.current++; P.uploads.bytes += args.find(arg => ArrayBuffer.isView(arg))?.byteLength ?? 0; } add('uploadAPI', performance.now() - start); return value; };
  }
  const pendingQueries = [];
  let baseTerrain = null;
  const lights = [];
  scene.traverse(object => { if (object.userData.tgTerrainRegion === 'base-terrain') baseTerrain = object; if (object.isDirectionalLight) lights.push(object); });
  const originalRender = renderer.render;
  renderer.render = function (...args) {
    if (!P.enabled) return originalRender.apply(this, args);
    for (let i = pendingQueries.length - 1; i >= 0; i--) {
      const entry = pendingQueries[i];
      if (!gl.getQueryParameter(entry.query, gl.QUERY_RESULT_AVAILABLE)) continue;
      if (!gl.getParameter(extension.GPU_DISJOINT_EXT) && entry.epoch === P.epoch) P.gpu.push(gl.getQueryParameter(entry.query, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(entry.query); pendingQueries.splice(i, 1);
    }
    const query = extension ? gl.createQuery() : null;
    if (query) gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
    const start = performance.now(); const value = originalRender.apply(this, args); add('renderSubmission', performance.now() - start);
    P.uploads.maxPerRender = Math.max(P.uploads.maxPerRender, P.uploads.current); P.uploads.current = 0;
    if (query) { gl.endQuery(extension.TIME_ELAPSED_EXT); pendingQueries.push({ query, epoch: P.epoch }); }
    if (P.pending.length) {
      const direction = palette.getAtmospherePalette().sunDirection;
      const sunlight = lights.some(object => object.position.clone().normalize().distanceTo(direction) < 0.01);
      const terrainMesh = baseTerrain;
      const expected = height.getTerrainHeightAt(50, 50);
      let terrainReady = false;
      if (terrainMesh) {
        const positions = terrainMesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) if (Math.abs(positions.getX(i) - 50) < 0.01 && Math.abs(positions.getZ(i) - 50) < 0.01) { terrainReady = Math.abs(positions.getY(i) - expected) < 0.001; break; }
      }
      const remaining = [];
      for (const input of P.pending) {
        if (input.kind === 'sun' ? sunlight : terrainReady) P.latencies.push({ kind: input.kind, ms: performance.now() - input.start, settingToRenderMs: performance.now() - input.settingAt, whileHeld: Boolean(window.__profilePointerHeld) });
        else remaining.push(input);
      }
      P.pending = remaining;
    }
    return value;
  };
  new PerformanceObserver(list => { if (P.enabled) P.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, ms: entry.duration }))); }).observe({ type: 'longtask', buffered: false });
  const recordInput = event => { if (P.enabled) P.lastInput = event.timeStamp; };
  window.addEventListener('keydown', recordInput, true);
  window.addEventListener('input', recordInput, true);
  window.addEventListener('pointerdown', recordInput, true);
  window.addEventListener('pointermove', recordInput, true);
  window.addEventListener('terrain-settings-changed', event => {
    if (!P.enabled) return;
    const key = event.detail?.key;
    const kind = key === 'sunHeight' || key === 'sunRotation' ? 'sun' : key === 'terrainEditVersion' ? 'terrain' : null;
    if (kind) P.pending.push({ kind, start: P.lastInput || performance.now(), settingAt: performance.now() });
  });
  const frame = time => { if (P.enabled) { if (P.lastFrame) P.frames.push(time - P.lastFrame); P.lastFrame = time; } requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  P.start = label => {
    P.label = label; P.epoch = (P.epoch ?? 0) + 1; P.times = {}; P.frames = []; P.gpu = []; P.longTasks = []; P.latencies = []; P.pending = []; P.lastFrame = 0; P.lastInput = 0; P.uploads = { calls: 0, bytes: 0, current: 0, maxPerRender: 0 }; P.started = performance.now(); P.reactStart = window.__reactCommits ?? 0; P.enabled = true;
  };
  P.stop = () => {
    P.enabled = false;
    const percentile = (values, fraction) => { const sorted = values.slice().sort((a, b) => a - b); return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] : null; };
    const durationMs = performance.now() - P.started;
    const result = { label: P.label, durationMs, frames: P.frames.length, fps: P.frames.length * 1000 / Math.max(1, P.frames.reduce((a, b) => a + b, 0)), medianFrameMs: percentile(P.frames, 0.5), p95FrameMs: percentile(P.frames, 0.95), worstFrameMs: percentile(P.frames, 1), gpuMs: P.gpu.length ? P.gpu.reduce((a, b) => a + b, 0) / P.gpu.length : null, gpuSamples: P.gpu.length, times: P.times, uploads: P.uploads, latencies: P.latencies, pendingInputs: P.pending.length, longTasks: P.longTasks, reactCommits: (window.__reactCommits ?? 0) - P.reactStart, memory: { ...renderer.info.memory }, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length, cloudSteps: [...window.__cloud.runtimeClouds.values()].map(cloud => cloud.sim.stepCount) };
    return result;
  };
  P.visibility = ({ water = true, legacy = true } = {}) => {
    scene.traverse(object => { if (object.material?.userData?.livingWaterUniforms) { const global = object.material.opacity === 0.72; (global ? object.parent : object.parent.parent).visible = water; } if (object.material?.uniforms?.coverage) object.visible = legacy; });
  };
  P.captureReact = false;
  return { gpuTimers: Boolean(extension), cloudFrameFound: true, backend: (() => { const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); })() };
}
