import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { terrainSettings } from "../../systems/terrain/terrainSettings";

const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform float time;
uniform float density;
uniform float speed;
uniform float coverage;
uniform float windStrength;
uniform vec3 color;
uniform float seed;
varying vec2 vUv;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i + seed);
  float b = hash(i + vec2(1.0, 0.0) + seed);
  float c = hash(i + vec2(0.0, 1.0) + seed);
  float d = hash(i + vec2(1.0, 1.0) + seed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 centered = vUv - 0.5;
  float radial = 1.0 - smoothstep(0.18, 0.56, length(centered));

  vec2 p = vWorldPosition.xz * vec2(0.028, 0.034);
  p += vec2(
    time * speed * (0.03 + windStrength * 0.0018),
    -time * speed * 0.012
  );

  float large = noise(p * 0.72);
  float medium = noise(p * 1.65);
  float detail = noise(p * 3.8);
  float n = large * 0.52 + medium * 0.34 + detail * 0.14;

  float threshold = 1.0 - coverage * 0.86;
  float mist = smoothstep(threshold - 0.16, threshold + 0.11, n);
  float breakup = smoothstep(0.24, 0.72, noise(p * 2.2 + vec2(4.3, -2.1)));

  float alpha = mist * breakup * radial * mix(0.025, 0.34, density);
  gl_FragColor = vec4(color, alpha);
}
`;

function FogPatch({ position, scale, rotation, material }) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      material={material}
      renderOrder={3}
    >
      <planeGeometry args={[72, 72, 1, 1]} />
    </mesh>
  );
}

const PATCHES = [
  [[-72, 0.15, -48], [1.25, 0.62, 0.8], [0, 0.18, 0]],
  [[-12, 0.42, -76], [1.05, 0.52, 0.72], [0, -0.28, 0]],
  [[54, 0.24, -34], [1.42, 0.58, 0.86], [0, 0.38, 0]],
  [[88, 0.55, 30], [0.92, 0.48, 0.68], [0, -0.14, 0]],
  [[18, 0.32, 64], [1.32, 0.54, 0.82], [0, 0.52, 0]],
  [[-70, 0.18, 62], [1.08, 0.5, 0.74], [0, -0.46, 0]],
  [[-132, 0.28, 8], [0.86, 0.44, 0.66], [0, 0.22, 0]],
  [[128, 0.36, -62], [1.12, 0.46, 0.7], [0, -0.35, 0]],
];

export default function GroundFog() {
  const groupRef = useRef();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        uniforms: {
          time: { value: 0 },
          density: { value: 0 },
          speed: { value: 0.35 },
          coverage: { value: 0.55 },
          windStrength: { value: 25 },
          color: { value: new THREE.Color("#9a9da2") },
          seed: { value: 0 },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  );

  useFrame((state) => {
    const density = THREE.MathUtils.clamp(Number(terrainSettings.groundFogDensity) / 100, 0, 1);
    material.uniforms.time.value = state.clock.elapsedTime;
    material.uniforms.density.value = density;
    material.uniforms.speed.value = Number(terrainSettings.groundFogSpeed) || 0;
    material.uniforms.coverage.value = THREE.MathUtils.clamp(Number(terrainSettings.groundFogCoverage) / 100, 0, 1);
    material.uniforms.windStrength.value = Number(terrainSettings.windStrength) || 0;
    material.uniforms.seed.value = Number(terrainSettings.scatterSeed) || 0;

    if (groupRef.current) {
      groupRef.current.position.y = Number(terrainSettings.groundFogHeight) || 0.5;
    }

    const light = THREE.MathUtils.lerp(0.86, 0.58, density);
    material.uniforms.color.value.setRGB(light, light, light * 1.02);
  });

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {PATCHES.map(([position, scale, rotation], index) => (
        <FogPatch
          key={index}
          position={position}
          scale={scale}
          rotation={rotation}
          material={material}
        />
      ))}
    </group>
  );
}
