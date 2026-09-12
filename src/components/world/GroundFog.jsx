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
varying vec2 vUv;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 p = vWorldPosition.xy * vec2(0.055, 0.085);
  p += vec2(time * speed * (0.035 + windStrength * 0.002), -time * speed * 0.008);

  float large = noise(p * 0.7);
  float medium = noise(p * 1.55);
  float detail = noise(p * 3.4);
  float n = large * 0.52 + medium * 0.34 + detail * 0.14;

  float threshold = 1.0 - coverage * 0.82;
  float cloud = smoothstep(threshold - 0.10, threshold + 0.12, n);

  float edgeX = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
  float edgeY = smoothstep(0.0, 0.13, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
  float edgeFade = edgeX * edgeY;

  float opacity = cloud * edgeFade * mix(0.07, 0.68, density);
  gl_FragColor = vec4(color, opacity);
}
`;

function FogSheet({ rotation = 0, offset = [0, 0, 0], material }) {
  return (
    <mesh
      position={offset}
      rotation={[0, rotation, 0]}
      material={material}
      renderOrder={3}
    >
      <planeGeometry args={[320, 28, 1, 1]} />
    </mesh>
  );
}

export default function GroundFog() {
  const groupRef = useRef();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          time: { value: 0 },
          density: { value: 0 },
          speed: { value: 0.35 },
          coverage: { value: 0.55 },
          windStrength: { value: 25 },
          color: { value: new THREE.Color("#9a9da2") },
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

    // Fog formations live in world space. The shader provides the wind-driven drift,
    // so the field does not rotate or follow the camera.
    if (groupRef.current) {
      groupRef.current.position.y = Number(terrainSettings.groundFogHeight) || 3.5;
    }

    const light = THREE.MathUtils.lerp(0.84, 0.46, density);
    material.uniforms.color.value.setRGB(light, light, light * 1.02);
  });

  return (
    <group ref={groupRef} position={[0, 3.5, 0]}>
      <FogSheet rotation={0} offset={[0, 0, -24]} material={material} />
      <FogSheet rotation={Math.PI / 2} offset={[28, 0, 0]} material={material} />
      <FogSheet rotation={-Math.PI / 2} offset={[-30, 0, 22]} material={material} />
    </group>
  );
}
