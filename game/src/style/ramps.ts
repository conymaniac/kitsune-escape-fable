/**
 * Toon gradient ramps — runtime-generated grayscale DataTextures used as
 * MeshToonMaterial.gradientMap (TECH_SPEC pillar 5: code-built lookup
 * tables, no image files).
 *
 * `makeToonRamp(steps, lift)` builds an N×1 single-channel ramp whose
 * darkest band sits at `lift` (0..1) so shadows stay moonlit indigo-wash
 * instead of crushing to black — the single most important knob for the
 * ink-and-watercolor read.
 *
 * Two house ramps:
 * - `hardRamp()`  — 3 crisp bands, NearestFilter. Characters and props:
 *   bold ink-illustration shading, reads at 64 px.
 * - `softRamp()`  — 4 bands baked into a 16-texel texture with feathered
 *   band edges + LinearFilter. Ground and large surfaces: the feathering
 *   (≈⅓ band width) reads as a watercolor bleed instead of a hard terminator
 *   sweeping across big faces.
 */
import * as THREE from 'three';

function makeRampTexture(values: Uint8Array, filter: THREE.MagnificationTextureFilter): THREE.DataTexture {
  const texture = new THREE.DataTexture(values, values.length, 1, THREE.RedFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = filter;
  texture.magFilter = filter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Hard-banded N×1 grayscale ramp (NearestFilter). `steps` 2..8 bands,
 * `lift` raises the darkest band (0 = black shadows, 0.4 = washed).
 */
export function makeToonRamp(steps: number, lift = 0): THREE.DataTexture {
  const n = Math.max(2, Math.min(8, Math.round(steps)));
  const values = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    // Slight ease toward the lit end so mid bands sit brighter than linear —
    // a moonlit scene wants generous lit area and a thin dark accent.
    const eased = lift + (1 - lift) * Math.pow(t, 0.85);
    values[i] = Math.round(Math.min(1, eased) * 255);
  }
  return makeRampTexture(values, THREE.NearestFilter);
}

/**
 * Soft-edged ramp: `steps` bands baked into a wider texture with smooth
 * texel transitions at band boundaries, sampled with LinearFilter.
 */
export function makeSoftToonRamp(steps: number, lift = 0, width = 16): THREE.DataTexture {
  const n = Math.max(2, Math.min(8, Math.round(steps)));
  const w = Math.max(n * 2, width);
  const values = new Uint8Array(w);
  const feather = 0.35; // fraction of a band blended at each boundary
  for (let x = 0; x < w; x += 1) {
    const t = x / (w - 1); // 0..1 across the ramp (≙ dotNL)
    const band = t * n; // continuous band coordinate
    let i = Math.floor(band);
    let f = band - i;
    if (i >= n) {
      i = n - 1;
      f = 1;
    }
    // Smooth the step up to the next band inside the feather window.
    const k = f < 1 - feather ? 0 : (f - (1 - feather)) / feather;
    const s = k * k * (3 - 2 * k);
    const level = Math.min(i + s, n - 1) / (n - 1);
    const eased = lift + (1 - lift) * Math.pow(level, 0.85);
    values[x] = Math.round(Math.min(1, eased) * 255);
  }
  return makeRampTexture(values, THREE.LinearFilter);
}

let hard: THREE.DataTexture | null = null;
let soft: THREE.DataTexture | null = null;

/** The house character/prop ramp — 3 crisp bands, indigo-lifted shadows. */
export function hardRamp(): THREE.DataTexture {
  if (!hard) hard = makeToonRamp(3, 0.36);
  return hard;
}

/** The house ground/large-surface ramp — 4 feathered watercolor bands. */
export function softRamp(): THREE.DataTexture {
  if (!soft) soft = makeSoftToonRamp(4, 0.3);
  return soft;
}
