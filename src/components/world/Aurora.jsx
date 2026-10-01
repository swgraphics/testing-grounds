import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { terrainSettings } from "../../systems/terrain/terrainSettings";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform float time;
uniform float intensity;
uniform float speed;
uniform vec3 color;
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  f = f*f*(3.0-2.0*f);
  return mix(hash(i), hash(i+1.0), f);
}

void main() {
  float waveA = noise(vUv.x * 5.0 + time * speed * 0.22);
  float waveB = noise(vUv.x * 13.0 - time * speed * 0.15);
  float curtain = sin(vUv.x * 18.0 + waveA * 4.0 + time * speed) * 0.5 + 0.5;
  float vertical = smoothstep(0.0, 0.42, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
  float bands = smoothstep(0.2, 0.85, curtain * 0.65 + waveB * 0.55);
  float alpha = bands * vertical * intensity * 0.78;
  gl_FragColor = vec4(color, alpha);
}
`;

export default function Aurora() {
  const { camera } = useThree();
  const groupRef = useRef();
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      intensity: { value: 0 },
      speed: { value: 0.45 },
      color: { value: new THREE.Color("#65ffd0") },
    },
    vertexShader,
    fragmentShader,
  }), []);

  useFrame((state) => {
    const enabled = Boolean(terrainSettings.auroraEnabled);
    const night = 1 - THREE.MathUtils.clamp((terrainSettings.sunHeight - 8) / 42, 0, 1);
    const visibility = 0.58 + night * 0.42;
    material.uniforms.time.value = state.clock.elapsedTime;
    material.uniforms.intensity.value = enabled ? Math.max(0.18, (Number(terrainSettings.auroraIntensity) / 100) * visibility * 1.35) : 0;
    material.uniforms.speed.value = Number(terrainSettings.auroraSpeed) || 0;
    groupRef.current.position.copy(camera.position);
    groupRef.current.position.y += Number(terrainSettings.auroraHeight) || 64;
    groupRef.current.rotation.y = -camera.rotation.y;
  });

  return (
    <group ref={groupRef} renderOrder={5}>
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((rotation) => (
        <mesh key={rotation} rotation={[0, rotation, 0]} material={material}>
          <planeGeometry args={[720, 180, 1, 1]} />
        </mesh>
      ))}
    </group>
  );
}
