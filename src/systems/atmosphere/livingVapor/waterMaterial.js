import * as THREE from 'three';
import { terrainSettings } from '../../terrain/terrainSettings';

// Adapted from CloudField 2.0 Lake(), itself adapted from CAUSTIC//VOLUME Lite.
// Copyright (c) 2026 Scottie. MIT: THIRD_PARTY_LICENSES/CAUSTIC-VOLUME-MIT.txt.
// Keep TG's standard lighting/transparency. Surface caustics have no underwater
// receiver/depth here, so they are omitted rather than painted onto the lake.
const WATER_COMMON = /* glsl */ `
varying vec3 vTGWaterWorld;
uniform float uTGTime;
uniform float uTGWaveResponse;
uniform float uTGWind;

vec2 tgRipple(vec2 p, vec2 waveVector, float speed, float height,
              float offset, float bend, float footprint,
              float warp, vec2 warpGradient) {
  vec2 gradient=waveVector+bend*warpGradient;
  // Fade subpixel ripples at distance/grazing angles instead of letting them shimmer.
  float resolved=1.0-smoothstep(0.45,2.0,length(gradient)*footprint);
  float phase=dot(p,waveVector)-uTGTime*speed+offset+bend*warp;
  return cos(phase)*gradient*height*resolved;
}

vec2 tgSeaSlope(vec2 p) {
  // Two slow, broad bends vary spacing without a tiled noise texture or random frames.
  vec2 bendA=vec2(0.017,0.011), bendB=vec2(-0.009,0.023);
  float phaseA=dot(p,bendA)+uTGTime*0.09;
  float phaseB=dot(p,bendB)-uTGTime*0.07;
  float warp=2.0*sin(phaseA)+1.3*sin(phaseB);
  vec2 warpGradient=2.0*cos(phaseA)*bendA+1.3*cos(phaseB)*bendB;
  float footprint=max(length(dFdx(p)),length(dFdy(p)));
  // Broad undulations, directional waves, then restrained fine ripples.
  // Wavelengths, headings and speeds deliberately have no common repeating tile.
  vec2 slope=tgRipple(p,vec2(0.1547,0.0705),0.43,0.12,0.2,0.65,footprint,warp,warpGradient);
  slope+=tgRipple(p,vec2(0.5256,0.5066),0.81,0.07,2.1,1.10,footprint,warp,warpGradient);
  slope+=tgRipple(p,vec2(1.2052,-0.5134),1.07,0.035,4.6,0.85,footprint,warp,warpGradient);
  slope+=tgRipple(p,vec2(-1.3489,2.5330),1.64,0.012,1.3,1.30,footprint,warp,warpGradient);
  slope+=tgRipple(p,vec2(0.8208,5.0639),2.31,0.004,3.7,1.65,footprint,warp,warpGradient);
  return slope*uTGWaveResponse*mix(0.2,1.0,uTGWind);
}
`;

export function createLivingWaterMaterial(opacity = 0.72) {
  const uniforms = {
    uTGTime: { value: 0 }, uTGWaveResponse: { value: 0 }, uTGWind: { value: 0 },
  };
  const material = new THREE.MeshStandardMaterial({ color: '#4e9ac2', emissive: '#0d4c72', emissiveIntensity: 0.18, transparent: true, opacity, roughness: 0.26, metalness: 0.04, side: THREE.DoubleSide, depthWrite: false });
  material.userData.livingWaterUniforms = uniforms;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTGWaterWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvTGWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + WATER_COMMON)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        vec2 tgSlope=tgSeaSlope(vTGWaterWorld.xz);
        normal=normalize(normal+mat3(viewMatrix)*vec3(-tgSlope.x,0.0,-tgSlope.y)*faceDirection);`);
    // StandardMaterial's sun/sky response follows TG Lighting / Atmosphere Palette.
    // No independent emissive glint or surface-wide caustic mask is added.
  };
  material.customProgramCacheKey = () => 'tg-cloudfield-water-natural-v2';
  return material;
}

export function updateLivingWater(material, time) {
  const uniforms = material.userData.livingWaterUniforms;
  const speed = THREE.MathUtils.clamp((Number(terrainSettings.windSpeed) || 0) / 100, 0, 1);
  uniforms.uTGTime.value = time * THREE.MathUtils.lerp(0.12, 1.5, speed);
  uniforms.uTGWaveResponse.value = THREE.MathUtils.clamp((Number(terrainSettings.waterWaveStrength) || 0) / 100, 0, 1);
  uniforms.uTGWind.value = THREE.MathUtils.clamp((Number(terrainSettings.windStrength) || 0) / 100, 0, 1);
}
