/**
 * Yanagi onna ghost shader (STREAM A, M2 — TECH_SPEC §1).
 *
 * Translucent spectral body: fresnel rim in kitsunebi teal over a bone-
 * smoke core, slow upward-scrolling value noise eroding alpha at the hem
 * (keyed to uv.y, so every primitive — robe cylinder, arm tubes, vfx
 * smoke quads — tatters at its lower edge regardless of scale), and a
 * uDissolve 0..1 noise-threshold cutoff with a bright violet edge band
 * for the finale unravelling. Max opacity ≈ 0.85.
 *
 * CONTRACT GLUE (yanagi.ts / vfx.ts must keep working unchanged):
 * - Both consumers clone() the kit material and animate `material.opacity`.
 *   The factory proxies `opacity` on the instance: writing it drives both
 *   uOpacity and uDissolve = 1 − opacity/0.85, so yanagi's existing
 *   `opacity = base·(1−t)` fade *is* the shader dissolve, and vfx smoke
 *   erodes away as it fades. Reads return the last written value.
 * - clone() is patched to mint a fresh proxied material (re-linking the
 *   shared time uniforms that ShaderMaterial.clone would deep-copy) and
 *   carry over the current opacity.
 */
import * as THREE from 'three';
import { palette } from '@/style/palette';
import { GLSL_FRESNEL, GLSL_HASH2, GLSL_VALUE_NOISE2, styleUniforms } from './chunks';

export const GHOST_MAX_OPACITY = 0.85;

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNrm;
varying vec3 vViewDir;
varying vec3 vObj;

void main() {
  vUv = uv;
  vObj = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNrm = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uDissolve;
uniform vec3 uBase;
uniform vec3 uRim;
uniform vec3 uEdge;
varying vec2 vUv;
varying vec3 vNrm;
varying vec3 vViewDir;
varying vec3 vObj;

${GLSL_HASH2}
${GLSL_VALUE_NOISE2}
${GLSL_FRESNEL}

void main() {
  vec3 nrm = normalize(vNrm);
  vec3 view = normalize(vViewDir);
  float fr = ksFresnel(view, nrm, 2.3);

  // bone-smoke core, teal spectral rim
  vec3 col = uBase * 0.5 + uRim * (0.12 + fr * 1.35);
  float alpha = uOpacity * (0.5 + fr * 0.5);

  // hem erosion: upward-scrolling noise eats the lower edge
  float hemN = ksValueNoise2(vec2(vUv.x * 6.0 + vObj.x * 2.3, vUv.y * 3.0 - uTime * 0.32));
  alpha *= smoothstep(0.03, 0.42, vUv.y + (hemN - 0.5) * 0.5);

  // dissolve: noise-threshold cutoff with a bright edge band
  float dn = ksValueNoise2(vUv * 5.0 + vObj.xy * 1.4 + 7.7);
  float cut = uDissolve * 1.2;
  float keep = step(cut, dn + 0.03);
  float edge = (1.0 - smoothstep(0.0, 0.16, dn + 0.03 - cut)) * keep * step(0.002, uDissolve);
  col += uEdge * edge * 2.4;
  alpha *= keep;

  gl_FragColor = vec4(col, alpha);
}
`;

/** Internal uniform shape (typed access for the opacity proxy). */
interface GhostUniforms {
  uOpacity: { value: number };
  uDissolve: { value: number };
  [key: string]: THREE.IUniform;
}

export function createGhostMaterial(): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    name: 'kitsune-ghost',
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: styleUniforms.uTime,
      uOpacity: { value: GHOST_MAX_OPACITY },
      uDissolve: { value: 0 },
      uBase: { value: new THREE.Color(palette.smokeWhite) },
      uRim: { value: new THREE.Color(palette.spectralTeal) },
      uEdge: { value: new THREE.Color(palette.spectralViolet) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // — opacity proxy: consumers animate .opacity; we map it to the shader —
  let op = GHOST_MAX_OPACITY;
  const uniforms = material.uniforms as GhostUniforms;
  Object.defineProperty(material, 'opacity', {
    configurable: true,
    get: () => op,
    set: (v: number) => {
      op = v;
      uniforms.uOpacity.value = Math.min(v, GHOST_MAX_OPACITY);
      uniforms.uDissolve.value = Math.min(1, Math.max(0, 1 - v / GHOST_MAX_OPACITY));
    },
  });

  // — clone patch: fresh proxied material, shared time uniforms intact —
  material.clone = (() => {
    const fresh = createGhostMaterial();
    fresh.opacity = op;
    return fresh;
  }) as unknown as typeof material.clone;

  return material;
}
