/**
 * The spectral lake / creek water shader (STREAM A, M2 — TECH_SPEC §1).
 *
 * One cached material serves every water plane B-world builds (lake disc,
 * creek strips — see world/props/water.ts): all spatial terms run in
 * world space, the shore term runs in uv space (radial uv distance → 1 at
 * the rim of the lake disc AND at creek banks/ends).
 *
 * Look: deep-indigo → teal depth gradient · 2-octave scrolling value
 * noise (gusts raise the amplitude via the shared wind uniforms) toon-
 * stepped into 2 highlight bands · high-exponent moon-glint streak along
 * the moon azimuth · shore-distance lightening ring + broken lap line ·
 * gentle 2-sine vertex bob. Fog-aware (the lake melts into the night with
 * the terrain).
 */
import * as THREE from 'three';
import { palette } from '@/style/palette';
import { GLSL_NOISE_COMMON, styleUniforms } from './chunks';

/** Ground-projected moon direction (matches the sky-dome moon disc). */
const MOON_GROUND_DIR = new THREE.Vector2(-0.45, -0.55).normalize();
/** The lake centre — the glint streak crosses through here. */
const MOON_FOCUS = new THREE.Vector2(27, -6);

const VERT = /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
varying vec2 vUv;
varying vec3 vWorld;
varying float vFogDepth;

void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  // gentle 2-sine bob, a touch livelier in wind
  float bob = sin(uTime * 0.8 + w.x * 0.45) * 0.02
            + sin(uTime * 1.27 + w.z * 0.62) * 0.016;
  w.y += bob * (1.0 + uWindStrength * 1.2);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
uniform vec2 uWindDir;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGlint;
uniform vec3 uSpectral;
uniform vec2 uMoonDir;
uniform vec2 uMoonFocus;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying vec2 vUv;
varying vec3 vWorld;
varying float vFogDepth;

${GLSL_NOISE_COMMON}

void main() {
  // 0 mid-water → 1 at shores (lake rim, creek banks, creek ends)
  float shore = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);

  // scrolling 2-octave noise — the fake surface; gusts raise amplitude
  vec2 drift = uWindDir * uTime * 0.32;
  float amp = 0.6 + uWindStrength * 0.7;
  float n  = ksFbm2(vWorld.xz * 0.5 + drift) * amp;
  float n2 = ksFbm2(vWorld.xz * 1.55 - drift * 1.7 + 31.7) * amp;
  float surf = n * 0.62 + n2 * 0.38;

  // depth gradient: deep indigo centre → cold teal shallows
  vec3 col = mix(uDeep, uShallow, smoothstep(0.2, 1.0, shore + (surf - 0.5) * 0.3));

  // toon-stepped highlight bands (fake-normal glints quantised to 2 steps)
  float b1 = step(0.62, surf);
  float b2 = step(0.78, surf);
  col = mix(col, uSpectral, b1 * 0.28);
  col = mix(col, uGlint * 0.75, b2 * 0.45);

  // moon-glint streak: a soft lane along the moon azimuth, lit only where
  // the stepped surface sparkles — high exponent keeps it tight
  vec2 rel = vWorld.xz - uMoonFocus;
  float dLine = abs(rel.x * uMoonDir.y - rel.y * uMoonDir.x);
  float streak = exp(-dLine * dLine * 0.09);
  float sparkle = pow(max(surf * 1.3 - 0.42, 0.0), 3.0);
  col += uGlint * streak * sparkle * 1.7;

  // shore ring: lightening + a broken lap line just inside the rim
  float ring = smoothstep(0.82, 0.97, shore);
  col = mix(col, uShallow * 1.3, ring * 0.55);
  float lap = step(0.9 + (surf - 0.5) * 0.08, shore) * (1.0 - step(0.975, shore));
  col = mix(col, uGlint * 0.85, lap * 0.3);

  col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFogDepth));
  gl_FragColor = vec4(col, 0.94);
}
`;

export function createWaterMaterial(): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    name: 'kitsune-water',
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: styleUniforms.uTime,
      uWindStrength: styleUniforms.uWindStrength,
      uWindDir: styleUniforms.uWindDir,
      uDeep: { value: new THREE.Color(palette.lakeDeep) },
      uShallow: { value: new THREE.Color(palette.lakeShallow) },
      uGlint: { value: new THREE.Color(palette.moonlight) },
      uSpectral: { value: new THREE.Color(palette.spectralTeal) },
      uMoonDir: { value: MOON_GROUND_DIR.clone() },
      uMoonFocus: { value: MOON_FOCUS.clone() },
      ...THREE.UniformsUtils.clone(THREE.UniformsLib['fog']),
    },
    transparent: true,
    fog: true,
  });
  return material;
}
