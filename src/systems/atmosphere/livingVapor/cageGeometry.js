// Line segments of a unit-sphere wireframe (latitude rings + longitude arcs).
// The cage shader (volumeShader.js) bends these into a living, undulating ellipsoid.
export function buildCagePositions(latitudes = 9, segments = 56) {
  const out = [];
  const pt = (u, v) => [Math.cos(u) * Math.cos(v), Math.sin(v), Math.sin(u) * Math.cos(v)];
  for (let j = 1; j < latitudes; j += 1) {
    const v = -Math.PI / 2 + (Math.PI * j) / latitudes;
    for (let i = 0; i < segments; i += 1) {
      const u0 = (i / segments) * Math.PI * 2;
      const u1 = ((i + 1) / segments) * Math.PI * 2;
      out.push(...pt(u0, v), ...pt(u1, v));
    }
  }
  const meridians = 12;
  const arc = 28;
  for (let m = 0; m < meridians; m += 1) {
    const u = (m / meridians) * Math.PI * 2;
    for (let j = 0; j < arc; j += 1) {
      const v0 = -Math.PI / 2 + (Math.PI * j) / arc;
      const v1 = -Math.PI / 2 + (Math.PI * (j + 1)) / arc;
      out.push(...pt(u, v0), ...pt(u, v1));
    }
  }
  return new Float32Array(out);
}
