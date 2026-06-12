/**
 * Wind-sway vertex injection for built-in (toon) materials (STREAM A, M2).
 *
 * `injectSway(material)` patches the material via onBeforeCompile:
 * vertices displace along the shared wind direction, scaled by the
 * per-vertex `aSwayWeight` attribute (B-world authors it on willow
 * curtains / reeds / grass: 0 at anchored roots → 1 at free tips).
 * Geometry WITHOUT the attribute renders unchanged (GL default 0).
 *
 * Response curve: a small idle breath that is always alive (so foliage
 * never freezes between gusts) + a gust lash term ∝ strength² — calm
 * (~0.15) barely registers, telegraph (0.55) clearly stirs, lash (0.9)
 * whips hard. Uniforms are the shared `styleUniforms` holders; nothing
 * per-material to tick.
 *
 * Caveats (accepted, documented):
 * - Displacement happens in object space along the world wind dir; merged
 *   static dressing is world-baked so the two coincide. Rotated willow
 *   groups sway a few degrees off true — unreadable in motion.
 * - The shadow-depth pass does not sway (built-in depth material).
 *   Shadows of foliage stay calm; soft 1024² shadows hide it.
 */
import type * as THREE from 'three';
import { styleUniforms } from './chunks';

export const SWAY_ATTRIBUTE = 'aSwayWeight';

const SWAY_PARS = /* glsl */ `
attribute float aSwayWeight;
uniform float uKsTime;
uniform float uKsWindStrength;
uniform vec2 uKsWindDir;
`;

const SWAY_VERTEX = /* glsl */ `
#include <begin_vertex>
{
  float ksW = aSwayWeight;
  if (ksW > 0.0001) {
    float ksPhase = dot(transformed.xz, vec2(0.35, 0.41)) + transformed.y * 0.45;
    // idle breath — always alive, slightly faster in stronger air
    float ksIdle = sin(uKsTime * 1.35 + ksPhase) * 0.6
                 + sin(uKsTime * 2.17 + ksPhase * 1.7) * 0.4;
    // gust lash — strength² response + a flutter harmonic during the whip
    float ksS = uKsWindStrength;
    float ksGust = ksS * ksS * (0.75 + 0.45 * sin(uKsTime * 4.6 + ksPhase * 1.3)
                                      + 0.20 * sin(uKsTime * 9.3 + ksPhase * 2.9));
    float ksAmp = ksW * (0.085 * ksIdle * (0.35 + ksS) + 0.62 * ksGust);
    transformed.xz += uKsWindDir * ksAmp;
    // tips droop slightly as they are pushed — curtains, not flags
    transformed.y -= abs(ksAmp) * 0.22;
  }
}
`;

/**
 * Opt-in wind sway for a built-in material (call once per material —
 * kit.toon(key, { sway: true }) does). Idempotent per material.
 */
export function injectSway(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uKsTime'] = styleUniforms.uTime;
    shader.uniforms['uKsWindStrength'] = styleUniforms.uWindStrength;
    shader.uniforms['uKsWindDir'] = styleUniforms.uWindDir;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SWAY_PARS}`)
      .replace('#include <begin_vertex>', SWAY_VERTEX);
  };
  // All sway-injected materials share one program variant.
  material.customProgramCacheKey = () => 'kitsune-sway';
}
