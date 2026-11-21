// World metres and degrees. Preview camera controls never enter this definition.
export const GEOLOGY_VERSION = 1;
export const GEOLOGY_GRID = 4;
export const GEOLOGY_TYPES = ['canyon-wall', 'giant-rock', 'cliff-face', 'canyon-edge'];
export const GEOLOGY_DEFAULTS = Object.freeze({
  'canyon-wall': { height: 28, width: 76, length: 104, floorWidth: 24, seed: 173, edgeDeformation: .35, scale: 1, rotation: 0 },
  'giant-rock': { height: 18, width: 36, length: 30, floorWidth: 8, seed: 317, edgeDeformation: .55, scale: 1, rotation: 0 },
  'cliff-face': { height: 32, width: 60, length: 24, floorWidth: 8, seed: 719, edgeDeformation: .45, scale: 1, rotation: 0 },
  'canyon-edge': { height: 20, width: 24, length: 64, floorWidth: 8, seed: 173, edgeDeformation: .35, scale: 1, rotation: 0 },
});
const finite = (value, fallback, low, high) => Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Number(value))) : fallback;
export function geologyDefinition(type, input = {}) {
  const defaults = GEOLOGY_DEFAULTS[type];
  if (!defaults) throw Error('Unknown geology type');
  const width = finite(input.width, defaults.width, 8, 160);
  const floorWidth=finite(input.floorWidth,Math.min(defaults.floorWidth,width-8),4,width-4);
  const minimumOffset=type==='canyon-edge'?-120:Math.min(0,3-floorWidth/2);
  const side = value => {
    const result={offset:finite(value?.offset,0,minimumOffset,120),start:finite(value?.start,0,0,120),end:finite(value?.end,0,0,120)};
    for(const [key,low,high] of [['height',1,100],['width',4,160],['edgeDeformation',0,1],['seed',1,199999]])if(value?.[key]!=null)result[key]=finite(value[key],defaults[key]??24,low,high);
    if(result.seed!=null)result.seed=Math.round(result.seed);
    if(value?.deformations!=null){
      if(!Array.isArray(value.deformations)||value.deformations.length>64)throw Error('Invalid canyon deformation list');
      result.deformations=value.deformations.map(item=>{
        if(!item||!['center','length','amount','seed'].every(key=>Number.isFinite(item[key])))throw Error('Invalid canyon deformation');
        return {center:finite(item.center,0,-360,360),length:finite(item.length,48,8,160),amount:finite(item.amount,0,-1,1),seed:Math.round(finite(item.seed,173,1,199999))};
      });
    }
    return result;
  };
  return { version: GEOLOGY_VERSION, height: finite(input.height, defaults.height, 1, 100), width,
    length: finite(input.length, defaults.length, 8, 240), floorWidth,
    seed: Math.round(finite(input.seed, defaults.seed, 1, 99999)), edgeDeformation: finite(input.edgeDeformation, defaults.edgeDeformation, 0, 1),
    scale: finite(input.scale, defaults.scale, .25, 3), rotation: finite(input.rotation, defaults.rotation, -360, 360),
    sides: { left: side(input.sides?.left), right: side(input.sides?.right) } };
}

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, z, seed) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295 * 2 - 1;
}
export function geologyNoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z), tx = smooth(0, 1, x - ix), tz = smooth(0, 1, z - iz);
  const a = hash(ix, iz, seed), b = hash(ix + 1, iz, seed), c = hash(ix, iz + 1, seed), d = hash(ix + 1, iz + 1, seed);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}
const detail = (x, z, seed) => .58 * geologyNoise(x * .055, z * .055, seed) + .28 * geologyNoise(x * .17, z * .17, seed + 11) + .14 * geologyNoise(x * .51, z * .51, seed + 29);

// Local refinements have compact support: both the value and its derivative fade
// to zero at the section ends, preserving the rest of this bank and its neighbor.
export function geologyEdgeDeformation(settings,x){
  let offset=0,rim=0;
  for(const edit of settings.deformations??[]){
    const distance=Math.abs(x-edit.center)/(edit.length/2);
    if(distance>=1)continue;
    const weight=1-smooth(.45,1,distance),noise=detail(x-edit.center+17,31,edit.seed);
    offset+=12*edit.amount*weight*(.45+noise);
    rim+=.18*edit.amount*weight*detail(x-edit.center+47,83,edit.seed+97);
  }
  return {offset,rim};
}

// Returns a target elevation above the frozen foundation and a transition weight.
// It never reads manual sculpt/vertex fields or any other geology feature.
export function geologyProfile(type, definition, x, z) {
  const d = definition, e = d.edgeDeformation, h = d.height;
  if (type === 'giant-rock') {
    const u = x / (d.width * .5), v = z / (d.length * .5);
    const sector=(Math.atan2(v,u)/Math.PI+1)*4.5,si=Math.floor(sector),st=sector-si;
    const fractured=hash(si%9,0,d.seed+83)*(1-st)+hash((si+1)%9,0,d.seed+83)*st;
    const perimeter = 1 + e * (.15 * detail(x, z, d.seed) + .15 * geologyNoise(u * 4, v * 4, d.seed + 7)+.18*fractured);
    const radial = Math.hypot(u + e * .09, v - e * .06) / perimeter;
    if (radial >= 1.1) return { height: 0, weight: 0 };
    const smoothTop = Math.max(0, 1 - Math.pow(radial / 1.1, 2.6));
    const top=smoothTop*(1-.18*e)+Math.floor(smoothTop*7)/7*.18*e;
    return { height: h * top * (1 + e * (.16 * detail(x + 41, z, d.seed)+.18*u-.1*v)), weight: 1 - smooth(.92, 1.1, radial) };
  }
  if (type === 'cliff-face') {
    const u = Math.abs(x) / (d.width * .5), v = z / d.length;
    const front = -.28 + e * .09 * detail(x, 0, d.seed);
    const rise = smooth(front, front + Math.max(.07, 2 / d.length), v);
    const back = 1 - smooth(.24, .55, v);
    const ledge = Math.floor(Math.max(0, v - front) * 7) / 7;
    const weight = rise * back * (1 - smooth(.8, 1.08 + e * .05 * detail(0, z, d.seed + 31), u));
    return { height: h * (1 - .13 * ledge + e * .12 * detail(x, z, d.seed)), weight };
  }
  const bank = (sign, settings, seed, inner, thickness) => {
    thickness=settings.width??thickness;
    const deformation=geologyEdgeDeformation(settings,x),bankE=settings.edgeDeformation??e,bankH=settings.height??h,bankSeed=settings.seed??seed;
    const edge = inner + settings.offset + bankE * Math.min(3.5, thickness * .15) * detail(x, 0, bankSeed)+deformation.offset;
    const across = sign * z - edge;
    const faceWidth = Math.max(2, Math.min(4, thickness * .18));
    const face = smooth(-faceWidth * .25, faceWidth * .75, across);
    const outer = 1 - smooth(thickness * .72, thickness, across);
    const start = -d.length / 2 - settings.start, end = d.length / 2 + settings.end;
    const caps = smooth(start, start + 6, x) * (1 - smooth(end - 6, end, x));
    const refined=deformation.offset!==0||deformation.rim!==0||settings.height!=null||settings.width!=null||settings.edgeDeformation!=null||settings.seed!=null;
    const sideMask=type==='canyon-wall'&&refined?smooth(0,2,sign*z):1;
    return { height: bankH * (1 + bankE * (.07 * detail(x, sign * 27, bankSeed) + .025 * geologyNoise(x * .4, 0, bankSeed + 43))+deformation.rim), weight: face * outer * caps * sideMask };
  };
  if (type === 'canyon-edge') return bank(1, d.sides.right, d.seed, 0, d.width);
  const thickness = Math.max(2, (d.width - d.floorWidth) / 2);
  const left = bank(-1, d.sides.left, d.seed, d.floorWidth / 2, thickness);
  const right = bank(1, d.sides.right, d.seed + 1013, d.floorWidth / 2, thickness);
  return left.weight >= right.weight ? left : right;
}

export function geologyLocalPoint(record, x, z) {
  const d = record.definition, angle = d.rotation * Math.PI / 180;
  const dx = (x - record.position[0]) / d.scale, dz = (z - record.position[2]) / d.scale;
  return { x: Math.cos(angle) * dx - Math.sin(angle) * dz, z: Math.sin(angle) * dx + Math.cos(angle) * dz };
}
export function geologyWorldPoint(record, x, z) {
  const d = record.definition, a = d.rotation * Math.PI / 180, s = d.scale;
  return [record.position[0] + (Math.cos(a) * x + Math.sin(a) * z) * s, record.position[2] + (-Math.sin(a) * x + Math.cos(a) * z) * s];
}
export function geologyBounds(record) {
  const d = record.definition;
  const along = d.length / 2 + Math.max(d.sides.left.start, d.sides.left.end, d.sides.right.start, d.sides.right.end);
  const displacement=side=>(side.deformations??[]).reduce((sum,edit)=>sum+18*Math.abs(edit.amount),0);
  const across = record.geologyType === 'canyon-edge' ? (d.sides.right.width??d.width) + Math.abs(d.sides.right.offset) + 12+displacement(d.sides.right) : Math.max(d.width*.6,...['left','right'].map(side=>d.floorWidth/2+(d.sides[side].width??(d.width-d.floorWidth)/2)+d.sides[side].offset+displacement(d.sides[side])));
  const points = [[-along, -across], [-along, across], [along, -across], [along, across]].map(([x, z]) => geologyWorldPoint(record, x, z));
  // Rocks/cliffs use WIDTH along X and LENGTH along Z.
  if (record.geologyType === 'giant-rock' || record.geologyType === 'cliff-face') {
    const margin = record.geologyType === 'giant-rock' ? .9 : .6;
    points.splice(0, points.length, ...[[-d.width * margin, -d.length * margin], [-d.width * margin, d.length * margin], [d.width * margin, -d.length * margin], [d.width * margin, d.length * margin]].map(([x, z]) => geologyWorldPoint(record, x, z)));
  }
  return { minX: Math.min(...points.map(p => p[0])) - GEOLOGY_GRID, maxX: Math.max(...points.map(p => p[0])) + GEOLOGY_GRID,
    minZ: Math.min(...points.map(p => p[1])) - GEOLOGY_GRID, maxZ: Math.max(...points.map(p => p[1])) + GEOLOGY_GRID };
}
export const boundsIntersect = (a, b) => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
export const unionBounds = (a, b) => !a ? b : !b ? a : ({ minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minZ: Math.min(a.minZ, b.minZ), maxZ: Math.max(a.maxZ, b.maxZ) });
