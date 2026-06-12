/**
 * Character mesh-crafting helpers — STREAM C, M2.
 *
 * Low-poly part baking for the three characters: transform-bake primitive
 * geometries, paint vertex colors, and fuse the parts of one rigid group
 * into a single mesh (keeps per-character draw calls at or below the M1
 * placeholder count even though the art has far more shape detail).
 *
 * Vertex-color convention: MeshToonMaterial MULTIPLIES the color attribute
 * with material.color, so each painted character uses the LIGHTEST color
 * of its build as the toon base key and paints per-vertex multipliers
 * (target ÷ base). `mulFor()` computes them from palette keys — no raw
 * hex anywhere (purity grep). THREE.Color works in linear space, which is
 * exactly the space vertex colors are sampled in.
 *
 * NaN guard (BUILD_STATE M2 A-style notes — NaN verts poison bloom):
 * `lathe()` clamps profile radii ≥ 4 mm so no degenerate ring ever feeds
 * `normalize(0)` in GLSL; `mulFor` guards divides.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { palette, type PaletteKey } from '@/style/palette';

const MAT = new THREE.Matrix4();
const POS = new THREE.Vector3();
const QUAT = new THREE.Quaternion();
const EUL = new THREE.Euler();
const SCL = new THREE.Vector3();

export interface PartXf {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  /** Uniform scale multiplied onto sx/sy/sz. */
  s?: number;
}

/** Bake scale→rotate→translate into the geometry (normals included). */
export function xf(geo: THREE.BufferGeometry, t: PartXf = {}): THREE.BufferGeometry {
  EUL.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
  QUAT.setFromEuler(EUL);
  POS.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  const u = t.s ?? 1;
  SCL.set((t.sx ?? 1) * u, (t.sy ?? 1) * u, (t.sz ?? 1) * u);
  MAT.compose(POS, QUAT, SCL);
  geo.applyMatrix4(MAT);
  return geo;
}

/** Mutate vertex positions in place (silhouette warps — flares, tapers). */
export function warp(
  geo: THREE.BufferGeometry,
  fn: (p: THREE.Vector3) => void,
): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    fn(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  return geo;
}

/** THREE.Color (linear) for a palette key. */
export function col(key: PaletteKey): THREE.Color {
  return new THREE.Color(palette[key]);
}

/** Linear mix of two palette colors. */
export function colMix(a: PaletteKey, b: PaletteKey, t: number): THREE.Color {
  return col(a).lerp(col(b), t);
}

/**
 * Per-vertex MULTIPLIER that renders `target` when the material base color
 * is palette[base]. Channels clamp at 1 — pick the lightest build color as
 * the base key.
 */
export function mulFor(target: THREE.Color, base: PaletteKey): THREE.Color {
  const b = col(base);
  return new THREE.Color(
    Math.min(1, target.r / Math.max(b.r, 1e-3)),
    Math.min(1, target.g / Math.max(b.g, 1e-3)),
    Math.min(1, target.b / Math.max(b.b, 1e-3)),
  );
}

/**
 * Paint a color attribute via callback over PRE-BAKE local coordinates
 * (call before `xf`). The callback receives position, normal and an
 * out-color preloaded to white (= the material base color).
 */
export function paint(
  geo: THREE.BufferGeometry,
  fn: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) => void,
): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const nrm = geo.getAttribute('normal');
  const out = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    c.setScalar(1);
    fn(p, n, c);
    out[i * 3] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return geo;
}

/** Paint the whole geometry one multiplier color. */
export function paintFlat(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  return paint(geo, (_p, _n, c) => c.copy(color));
}

/** Merge parts into one geometry; the inputs are disposed. */
export function fuse(...parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('geo.fuse: attribute layouts disagree');
  for (const g of parts) g.dispose();
  return merged;
}

/**
 * Low-poly lathe from [radius, y] profile pairs. Radii clamp ≥ 4 mm —
 * a zero-radius ring makes degenerate triangles whose normals normalize
 * NaN in GLSL and white out the bloom chain.
 */
export function lathe(
  profile: ReadonlyArray<readonly [number, number]>,
  segments: number,
): THREE.LatheGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.004), y));
  return new THREE.LatheGeometry(pts, segments);
}

/**
 * Remap uv.y into [lo, hi]. The ghost shader erodes alpha near uv.y 0
 * (hem tatter) — small decorative quads remap up to stay solid.
 */
export function remapUvY(geo: THREE.BufferGeometry, lo: number, hi: number): THREE.BufferGeometry {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, lo + uv.getY(i) * (hi - lo));
  }
  uv.needsUpdate = true;
  return geo;
}
