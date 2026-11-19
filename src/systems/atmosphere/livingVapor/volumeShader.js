// GLSL for the cloud renderer and the cage lines.
//
// These strings are written in the same style Three.js expects for a ShaderMaterial
// (`varying`, `gl_FragColor`, `texture()`), and they are ALSO loaded by the standalone
// test harness in tools/render-harness, so the exact shader that ships has been compiled
// and rendered on a real WebGL2 driver before you ever run it.
//
// How the cloud is drawn: a box (the cloud's bounding volume) is rendered, and for every
// pixel the shader walks a ray through that box in the CLOUD'S OWN coordinates, sampling
// the simulated density texture. Because the ray is built from the camera position
// expressed in cloud-local space (uCamLocal), the cloud looks correct from any angle, at
// any rotation or scale, and even if the camera is inside it.

export const VOLUME_VERTEX = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const VOLUME_FRAGMENT = /* glsl */ `
  precision highp float;
  precision highp int;
  precision highp sampler3D;

  varying vec3 vLocal;
  uniform sampler3D uDensity;   // simulated vapor density, 0..1, in cage space
  uniform vec3 uCamLocal;       // camera position in cloud-local space
  uniform vec3 uSunLocal;       // direction TO the sun in cloud-local space
  uniform vec3 uUpLocal;        // world "up" in cloud-local space
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;       // ambient light from above
  uniform vec3 uGroundColor;    // ambient light bounced from below
  uniform vec3 uRimColor;
  uniform float uDensityScale;
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;

  const float STEP = 0.058;       // ray step, in cloud-local units (the cage is 2 wide)
  const float SIGMA = 7.5;        // how strongly vapor blocks light
  const int MAX_STEPS = 76;

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
                   mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
                   mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }

  // Raw simulated density, softly windowed by the cage so nothing hard-clips at the box.
  float stored(vec3 p) {
    if (any(greaterThan(abs(p), vec3(1.0)))) return 0.0;
    float d = texture(uDensity, p * 0.5 + 0.5).r * uDensityScale;
    float r = length(p);
    return d * (1.0 - smoothstep(0.86, 1.0, r));
  }

  // Density used for lighting rays (no noise: cheap).
  float lightDensity(vec3 p) {
    return smoothstep(0.05, 0.55, stored(p));
  }

  // Density used for the picture: the simulated vapor, with rounded billow lobes and fine
  // edge erosion layered on top. The noise only reshapes vapor that exists. It cannot
  // invent a cloud in empty air, and it fades out inside dense cores.
  float shapedDensity(vec3 p, float d) {
    float edge = smoothstep(0.0, 0.22, d) * (1.0 - smoothstep(0.55, 1.1, d));
    vec3 q = p + vec3(uSeed * 0.137, uSeed * 0.071, uSeed * 0.053);
    vec3 drift = vec3(0.0, uTime * 0.035, 0.0);
    float lobes = noise3(q * 3.4 + drift) - 0.5;
    float billow = noise3(q * 7.3 - drift * 1.7 + 11.0) - 0.5;
    float fine = noise3(q * 16.0 + drift * 2.5 + 23.0) - 0.5;
    float shaped = d + edge * (lobes * 1.05 + billow * 0.62 + fine * 0.20);
    return smoothstep(0.17, 0.50, shaped);
  }

  float hg(float cosT, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * 3.14159265 * pow(1.0 + g2 - 2.0 * g * cosT, 1.5));
  }

  void main() {
    vec3 ro = uCamLocal;
    vec3 rd = normalize(vLocal - ro);

    // ray / box intersection, box = [-1,1]^3 (works when the camera is outside OR inside)
    vec3 inv = 1.0 / rd;
    vec3 t0 = (-1.0 - ro) * inv;
    vec3 t1 = (1.0 - ro) * inv;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float tNear = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
    float tFar = min(min(tmax.x, tmax.y), tmax.z);
    if (tFar <= tNear) discard;

    // random start offset per pixel hides stepping bands
    float jitter = hash13(vec3(gl_FragCoord.xy, uSeed));
    float t = tNear + jitter * STEP;

    float cosView = dot(rd, uSunLocal);
    float phase = 0.55 * hg(cosView, 0.62) + 0.45 * hg(cosView, -0.18);

    vec3 acc = vec3(0.0);
    float trans = 1.0;

    for (int i = 0; i < MAX_STEPS; i++) {
      if (t > tFar || trans < 0.02) break;
      vec3 p = ro + rd * t;
      float d = stored(p);
      if (d > 0.012) {
        float rho = shapedDensity(p, d);
        if (rho > 0.01) {
          // How much vapor lies between this point and the sun?
          float shade = 0.0;
          for (int k = 1; k <= 5; k++) shade += lightDensity(p + uSunLocal * (float(k) * 0.17));
          float toSun = exp(-shade * 0.17 * 5.5);
          // How much vapor is above? -> darker flat undersides, brighter tops
          float above = lightDensity(p + uUpLocal * 0.18) + lightDensity(p + uUpLocal * 0.42) + lightDensity(p + uUpLocal * 0.8);
          float openSky = exp(-above * 0.5);
          float height = clamp(dot(p, uUpLocal) * 0.5 + 0.5, 0.0, 1.0);

          // direct sun + a soft "multiple scattering" glow so the inside of a thick cloud is not black
          float scatter = exp(-shade * 0.17 * 1.3);
          vec3 sunLight = uSunColor * (toSun * (0.30 + 1.45 * phase) + 0.34 * scatter);
          vec3 ambient = mix(uGroundColor, uSkyColor, height * 0.55 + openSky * 0.45) * (0.40 + 0.42 * openSky);
          float powder = 1.0 - 0.55 * exp(-rho * 3.0); // thin edges look slightly darker, like real cumulus
          vec3 rim = uRimColor * toSun * pow(1.0 - rho, 2.0) * 0.22;
          vec3 col = (sunLight + ambient + rim) * powder;

          float a = 1.0 - exp(-rho * SIGMA * STEP);
          acc += trans * a * col;
          trans *= 1.0 - a;
        }
      }
      t += STEP;
    }

    float alpha = (1.0 - trans) * uOpacity;
    if (alpha < 0.004) discard;
    vec3 color = acc / max(1.0 - trans, 0.0001);
    // soft shoulder instead of a hard clip, so bright lobes keep their gradation
    color = vec3(1.0) - exp(-color * 1.9);
    gl_FragColor = vec4(color, alpha);
  }
`;

// ---- cage lines -----------------------------------------------------------------------------
// The cage is a wireframe ellipsoid whose lines slowly undulate and shift form.
export const CAGE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uCamLocal;
  varying float vFacing;
  void main() {
    vec3 q = normalize(position);
    float t = uTime;
    float s = uSeed;
    float wob = 0.035 * sin(q.x * 3.1 + t * 0.55 + s)
              + 0.028 * sin(q.y * 4.3 - t * 0.42 + s * 1.7)
              + 0.026 * sin(q.z * 3.7 + q.x * 2.0 + t * 0.37 + s * 0.6)
              + 0.022 * sin(dot(q, vec3(2.1, 1.3, -1.7)) * 2.0 + t * 0.8 + s * 2.3);
    vec3 pos = q * (0.93 + wob);
    vFacing = dot(normalize(pos), normalize(uCamLocal - pos));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const CAGE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFacing;
  void main() {
    float a = uAlpha * mix(0.32, 1.0, smoothstep(-0.35, 0.55, vFacing));
    gl_FragColor = vec4(uColor, a);
  }
`;
