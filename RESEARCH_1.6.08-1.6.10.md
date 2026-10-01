# Research kickoff — 1.6.08 / 1.6.09 / 1.6.10

This is research direction only; no 1.6.08–1.6.10 implementation is included in Correction Patch 1.6.07.01.

## 1.6.08 — Weather

### Rain / Snow

Three.js currently provides WebGPU compute-particle examples for rain and snow, including a rain example compatible with native lights/shadows and a snow example using 100k particles. These are useful reference architectures for a future GPU-backed weather system.

### Thunder / Lightning

Keep these event-driven and cheap: lightning should be a short-lived world/sky lighting event rather than a constantly simulated object field. Thunder can be decoupled from the visual flash and triggered with a delayed audio/event response.

### Wind / environment

Weather should publish a small environmental field/state rather than directly animating every affected object. That keeps the future 1.6.09 response layer compatible with grouped animation and LOD.

## 1.6.09 — Environmental Response + Grass

Three.js documents `InstancedMesh` as the mechanism for rendering many objects with shared geometry/material while reducing draw calls. Three.js also documents `LOD` for distance-based switching between high-, medium-, and low-detail representations. These directly support the TG rule: detail follows attention.

Recommended architecture to investigate next session:

1. Environmental field state: wind direction/strength, water/current direction/strength, weather intensity.
2. Grass as instanced/pooled patches rather than thousands of independent meshes.
3. Near = higher detail / more individual response; mid = patch/group response; far = cheaper representation.
4. Animation should be driven by shared field values and group phase offsets, not per-blade React state.
5. Do not introduce GPU compute just because it exists; benchmark the browser workload first.

## 1.6.10 — Presets

Treat presets as serialized configuration snapshots, not another simulation system. Proposed layers:

- World preset: world/chunk-level configuration.
- Terrain preset: terrain settings + relevant terrain edit configuration where appropriate.
- Weather preset: weather state/settings once 1.6.08 exists.
- Time preset: sun/sky/time settings.
- Trees preset: procedural tree definitions/populations.
- Paint Brush preset: brush/tool configuration for the simple rock/dirt/grass/sand paint system.

The existing TG persistence/history architecture should be reused rather than creating a parallel save format.

## Sources

- Three.js InstancedMesh docs: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js LOD docs: https://threejs.org/docs/pages/LOD.html
- Three.js WebGPU compute rain example: https://threejs.org/examples/webgpu_compute_particles_rain
- Three.js WebGPU compute snow example: https://threejs.org/examples/webgpu_compute_particles_snow.html
- Three.js WebGPU compute particles example: https://threejs.org/examples/webgpu_compute_particles.html
