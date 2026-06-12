/**
 * Kitsunebi wisp shader (STREAM A, M2 — TECH_SPEC §1).
 *
 * Additive in-shader radial-gradient falloff, depthWrite:false, uPhase
 * flicker on the shared clock. The falloff combines a radial uv term
 * (perfect on camera-facing quads, vfx rings and the sky halo) with a
 * facing term |N·V| (perfect on the M1 sphere wisps — silhouette fades
 * out), so every current consumer reads as a soft spirit-flame glow:
 * wisps.ts spheres, vfx.ts billboarded quads + ground rings, sky.ts halo.
 *
 * Tinting: kit.wisp(colorKey?) hands a palette key here — violet motes at
 * the cursed willow, teal at the lake. Core blends toward smoke-white so
 * the centre blooms.
 *
 * clone() is patched (vfx pools clone per particle): fresh material with
 * shared time uniforms re-linked and a re-rolled uPhase per clone so
 * pooled flames never flicker in sync.
 */
import * as THREE from 'three';
import { palette, type PaletteKey } from '@/style/palette';
import { styleUniforms } from './chunks';

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNrm;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNrm = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uPhase;
uniform float uIntensity;
uniform float uOpacity;
uniform vec3 uColor;
uniform vec3 uCore;
varying vec2 vUv;
varying vec3 vNrm;
varying vec3 vViewDir;

void main() {
  float r = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);
  float radial = smoothstep(1.0, 0.12, r);
  float facing = pow(abs(dot(normalize(vViewDir), normalize(vNrm))), 1.35);
  float flick = 0.78 + 0.22 * sin(uTime * 6.3 + uPhase) * sin(uTime * 2.13 + uPhase * 1.7);
  float glow = radial * facing * flick * uOpacity;
  vec3 col = mix(uColor, uCore, smoothstep(0.3, 0.95, radial)) * glow * uIntensity;
  gl_FragColor = vec4(col, glow);
}
`;

export function createWispMaterial(colorKey: PaletteKey = 'spectralTeal'): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    name: `kitsune-wisp-${colorKey}`,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: styleUniforms.uTime,
      uPhase: { value: Math.random() * Math.PI * 2 },
      uIntensity: { value: 2.3 },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(palette[colorKey]) },
      uCore: { value: new THREE.Color(palette.smokeWhite) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // — opacity proxy: vfx pools fade particles via material.opacity —
  let op = 1;
  const uOpacity = material.uniforms['uOpacity'] as { value: number };
  Object.defineProperty(material, 'opacity', {
    configurable: true,
    get: () => op,
    set: (v: number) => {
      op = v;
      uOpacity.value = v;
    },
  });

  // vfx pools clone per particle — keep shared clock, re-roll phase.
  material.clone = (() => {
    const fresh = createWispMaterial(colorKey);
    fresh.opacity = op;
    return fresh;
  }) as unknown as typeof material.clone;

  return material;
}
