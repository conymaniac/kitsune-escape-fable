/**
 * Shared GLSL snippets + the style stream's shared shader-time/wind
 * uniforms (STREAM A, M2).
 *
 * GLSL: value noise 2D/3D, 2-octave fbm, fresnel. All functions are
 * prefixed `ks` so they can be concatenated into any shader (including
 * onBeforeCompile patches of built-in materials) without collisions.
 *
 * UNIFORM SHARING MODEL: every custom shader material (water/ghost/wisp/
 * sky/sway-injection) references the *holder objects* exported here
 * (`styleUniforms.uTime` etc.) directly in its uniforms map, so one write
 * per frame animates everything. The WindSystem owns the authoritative
 * WindUniforms — main.ts calls `bindWindUniforms(wind.uniforms)` once and
 * postfx.render(dt) calls `tickStyleUniforms(dt)` every frame, which
 * copies the bound values (or self-advances time pre-bind).
 *
 * Material clones (yanagi's per-instance ghost, vfx pools) deep-clone
 * uniforms — the shader factories patch `clone()` to re-link these shared
 * holders (see shaders/ghost.ts, shaders/wisp.ts).
 *
 * FOG COMPAT: built-in materials (MeshToonMaterial) fog natively. Custom
 * ShaderMaterials must set `material.fog = true`, merge
 * THREE.UniformsLib.fog into their uniforms and apply
 *   `col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFogDepth))`
 * with `vFogDepth = -(viewMatrix * worldPos).z` from the vertex stage
 * (the water shader does; ghost/wisp/sky stay fog-free on purpose —
 * spirit glow and the dome must not grey out).
 */
import * as THREE from 'three';
import type { WindUniforms } from '@/core/types';

// ───────────────────────────────────────────── shared uniform holders ──

/**
 * The style stream's live uniform holders. Reference these OBJECTS in
 * shader uniform maps — never copy them.
 */
export const styleUniforms = {
  uTime: { value: 0 },
  uWindStrength: { value: 0.15 },
  uWindDir: { value: new THREE.Vector2(0.7071, 0.7071) },
};

let boundWind: WindUniforms | null = null;

/** Wire the WindSystem's authoritative uniforms (main.ts, once at boot). */
export function bindWindUniforms(uniforms: WindUniforms): void {
  boundWind = uniforms;
}

/**
 * Advance the shared shader clock — called once per frame by
 * postfx.render(dt). Pre-bind (or in tests) time self-advances.
 */
export function tickStyleUniforms(dt: number): void {
  if (boundWind) {
    styleUniforms.uTime.value = boundWind.uTime.value;
    styleUniforms.uWindStrength.value = boundWind.uWindStrength.value;
    styleUniforms.uWindDir.value.copy(boundWind.uWindDir.value);
  } else {
    styleUniforms.uTime.value += dt;
  }
}

// ─────────────────────────────────────────────────────── GLSL chunks ──

/** Cheap 2D hash → [0,1). */
export const GLSL_HASH2 = /* glsl */ `
float ksHash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
`;

/** Cheap 3D hash → [0,1). */
export const GLSL_HASH3 = /* glsl */ `
float ksHash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
`;

/** Smooth value noise on the plane → [0,1]. Requires GLSL_HASH2. */
export const GLSL_VALUE_NOISE2 = /* glsl */ `
float ksValueNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = ksHash21(i);
  float b = ksHash21(i + vec2(1.0, 0.0));
  float c = ksHash21(i + vec2(0.0, 1.0));
  float d = ksHash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

/** Smooth value noise in 3D → [0,1]. Requires GLSL_HASH3. */
export const GLSL_VALUE_NOISE3 = /* glsl */ `
float ksValueNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = ksHash31(i);
  float n100 = ksHash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = ksHash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = ksHash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = ksHash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = ksHash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = ksHash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = ksHash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}
`;

/** 2-octave fbm → roughly [0,1]. Requires GLSL_VALUE_NOISE2. */
export const GLSL_FBM2 = /* glsl */ `
float ksFbm2(vec2 p) {
  return ksValueNoise2(p) * 0.667 + ksValueNoise2(p * 2.13 + 17.7) * 0.333;
}
`;

/** Fresnel term: 0 facing the camera → 1 at the silhouette. */
export const GLSL_FRESNEL = /* glsl */ `
float ksFresnel(vec3 viewDir, vec3 normal, float power) {
  return pow(1.0 - clamp(abs(dot(viewDir, normal)), 0.0, 1.0), power);
}
`;

/** Everything 2D in one paste. */
export const GLSL_NOISE_COMMON = GLSL_HASH2 + GLSL_VALUE_NOISE2 + GLSL_FBM2;
