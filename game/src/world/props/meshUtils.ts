/**
 * Shared geometry/vertex-color helpers for the M2 world art pass.
 *
 * Conventions (binding for every prop in world/props):
 * - NO raw hex colors: vertex colors are expressed as palette-to-palette
 *   RATIOS (`tone()` / `toneLerp()`), so `material.color × vertexColor`
 *   lands exactly on palette mixes. Pure luminance jitter multiplies all
 *   three channels equally.
 * - Sway meshes carry a float attribute named EXACTLY `aSwayWeight`
 *   (0 = anchored, 1 = free tip) — the A-style sway shader consumes it.
 *   Meshes without the attribute read 0 in the shader (no sway).
 * - Faceting comes from `faceted()` (de-index + flat normals), NOT from
 *   flatShading material variants — keeps the MaterialKit cache small so
 *   mergeStatic collapses more draw calls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { palette, type PaletteKey } from '@/style/palette';

// ───────────────────────────────────────────────────────── randomness ──

/** Cheap deterministic value noise in [0,1) from 2 floats. */
export function noise2(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Smooth-ish fbm over 2 octaves of `noise2` interpolation, in [0,1]. */
export function smoothNoise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = noise2(ix, iy);
  const b = noise2(ix + 1, iy);
  const c = noise2(ix, iy + 1);
  const d = noise2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ─────────────────────────────────────────────────────── color ratios ──

const toneCache = new Map<string, THREE.Color>();

/**
 * Vertex-color ratio that turns a mesh whose material base color is
 * `baseKey` into `targetKey` (channel-wise target/base, NaN-safe).
 */
export function tone(baseKey: PaletteKey, targetKey: PaletteKey): THREE.Color {
  const key = `${baseKey}>${targetKey}`;
  let c = toneCache.get(key);
  if (!c) {
    const base = new THREE.Color(palette[baseKey]);
    const target = new THREE.Color(palette[targetKey]);
    c = new THREE.Color(
      base.r > 1e-4 ? target.r / base.r : 1,
      base.g > 1e-4 ? target.g / base.g : 1,
      base.b > 1e-4 ? target.b / base.b : 1,
    );
    toneCache.set(key, c);
  }
  return c;
}

const tmpColor = new THREE.Color();

/** Lerp between two `tone()` ratios (shared scratch — copy if kept). */
export function toneLerp(
  baseKey: PaletteKey,
  fromKey: PaletteKey,
  toKey: PaletteKey,
  t: number,
): THREE.Color {
  return tmpColor.copy(tone(baseKey, fromKey)).lerp(tone(baseKey, toKey), Math.min(Math.max(t, 0), 1));
}

/**
 * Paint a geometry's `color` attribute: `fn(x, y, z, out)` writes the
 * per-vertex ratio into `out`. Returns the same geometry.
 */
export function paintVertexColors(
  geometry: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number, out: THREE.Color) => void,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const out = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    out.setRGB(1, 1, 1);
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), out);
    colors[i * 3 + 0] = out.r;
    colors[i * 3 + 1] = out.g;
    colors[i * 3 + 2] = out.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Flat luminance jitter vertex colors (breaks big flat faces cheaply). */
export function paintJitter(
  geometry: THREE.BufferGeometry,
  base = 0.92,
  spread = 0.16,
  scale = 1.7,
): THREE.BufferGeometry {
  return paintVertexColors(geometry, (x, y, z, out) => {
    const j = base + spread * noise2(x * scale + y * 0.7, z * scale - y * 0.7);
    out.setRGB(j, j, j);
  });
}

// ────────────────────────────────────────────────────── geometry ops ──

/** De-index + flat normals — faceted look without a flatShading material. */
export function faceted(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  geometry.dispose();
  return flat;
}

/** Displace vertices radially from the local Y axis by noise (rocks, blobs). */
export function jitterRadial(
  geometry: THREE.BufferGeometry,
  amount: number,
  seed = 1,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = noise2(x * 2.3 + seed * 17.1 + y, z * 2.3 - seed * 7.7 + y);
    const k = 1 + (n - 0.5) * 2 * amount;
    pos.setXYZ(i, x * k, y * (1 + (n - 0.5) * amount), z * k);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Set the `aSwayWeight` attribute from a per-vertex function
 * (0 anchored … 1 free tip). KEEP THE NAME — the sway shader reads it.
 */
export function paintSwayWeight(
  geometry: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number) => number,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position');
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i += 1) {
    w[i] = Math.min(Math.max(fn(pos.getX(i), pos.getY(i), pos.getZ(i)), 0), 1);
  }
  geometry.setAttribute('aSwayWeight', new THREE.BufferAttribute(w, 1));
  return geometry;
}

/** Merge a list of geometries into one (they must share attribute layout). */
export function mergeGeoms(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geoms, false);
  for (const g of geoms) g.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Bake a transform onto a geometry (compose of TRS, in that order). */
export function bake(
  geometry: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rotY = 0,
  rotX = 0,
  rotZ = 0,
  scale = 1,
): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'YXZ')),
    new THREE.Vector3(scale, scale, scale),
  );
  return geometry.applyMatrix4(m);
}

/**
 * Trapezoid prism (thatch-roof row): length along X, trapezoid cross
 * section in the ZY plane — bottom edge width `zBot`, top edge width
 * `zTop`, height `h`. Origin at the bottom-centre. Faceted, with caps.
 */
export function trapPrism(
  xLen: number,
  zBot: number,
  zTop: number,
  h: number,
): THREE.BufferGeometry {
  const hx = xLen / 2;
  const zb = zBot / 2;
  const zt = zTop / 2;
  // 8 corners: bottom rect (y0), top rect (y h)
  const v = [
    [-hx, 0, -zb], [hx, 0, -zb], [hx, 0, zb], [-hx, 0, zb], // 0..3 bottom
    [-hx, h, -zt], [hx, h, -zt], [hx, h, zt], [-hx, h, zt], // 4..7 top
  ];
  const quads = [
    [3, 2, 6, 7], // south slope (+z)
    [1, 0, 4, 5], // north slope (−z)
    [0, 3, 7, 4], // west cap
    [2, 1, 5, 6], // east cap
    [4, 7, 6, 5], // top
    [0, 1, 2, 3], // bottom
  ];
  const positions: number[] = [];
  for (const [a, b, c, d] of quads as Array<[number, number, number, number]>) {
    const pa = v[a]!;
    const pb = v[b]!;
    const pc = v[c]!;
    const pd = v[d]!;
    positions.push(...pa, ...pb, ...pc, ...pa, ...pc, ...pd);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Lathe-like trunk/pillar: stacked rings around Y with a radius profile
 * and per-vertex radial noise. `profile(t)` (t = 0 base … 1 top) returns
 * the ring radius. Indexed, smooth normals.
 */
export function noisyLathe(
  height: number,
  segments: number,
  rings: number,
  profile: (t: number) => number,
  radialNoise = 0.12,
  seed = 1,
  lean = 0,
  capTop = true,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r += 1) {
    const t = r / rings;
    const y = t * height;
    const radius = profile(t);
    const leanX = lean * t * t * height;
    for (let s = 0; s <= segments; s += 1) {
      const a = (s / segments) * Math.PI * 2;
      const n = noise2(Math.cos(a) * 2 + seed * 13.7, Math.sin(a) * 2 + t * 5 + seed);
      const rr = radius * (1 + (n - 0.5) * 2 * radialNoise);
      positions.push(Math.cos(a) * rr + leanX, y, Math.sin(a) * rr);
    }
  }
  const ringStride = segments + 1;
  for (let r = 0; r < rings; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = r * ringStride + s;
      indices.push(a, a + ringStride, a + 1, a + 1, a + ringStride, a + ringStride + 1);
    }
  }
  if (capTop) {
    const centerIndex = positions.length / 3;
    positions.push(lean * height, height, 0);
    const topRow = rings * ringStride;
    for (let s = 0; s < segments; s += 1) {
      indices.push(topRow + s, centerIndex, topRow + s + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/**
 * Tapered tube along a CatmullRom curve (branches). Radius shrinks from
 * `r0` to `r1` along the curve. Smooth normals, indexed.
 */
export function taperedTube(
  points: THREE.Vector3[],
  r0: number,
  r1: number,
  tubular = 7,
  radial = 5,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, tubular, r0, radial, false);
  const pos = geometry.getAttribute('position');
  const ringStride = radial + 1;
  const center = new THREE.Vector3();
  for (let ringIndex = 0; ringIndex <= tubular; ringIndex += 1) {
    const t = ringIndex / tubular;
    curve.getPointAt(t, center);
    const k = (r0 + (r1 - r0) * t) / r0;
    for (let s = 0; s < ringStride; s += 1) {
      const i = ringIndex * ringStride + s;
      pos.setXYZ(
        i,
        center.x + (pos.getX(i) - center.x) * k,
        center.y + (pos.getY(i) - center.y) * k,
        center.z + (pos.getZ(i) - center.z) * k,
      );
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
