/**
 * MaterialKit factory — REAL internals (STREAM A, M2) behind the frozen
 * M0 API (core/types.ts MaterialKit). Toon ramps + custom shaders;
 * instances cached per key+opts.
 *
 * Style-guide header (silhouette rules, TECH_SPEC §3):
 * - every prop must read at 64 px height; exaggerate proportions 10–20 %;
 * - no face >~1.5 u without vertex-color variation;
 * - single light-direction assumption (the moon, high NW) — forms are
 *   modelled to read under one key light;
 * - ink outlines on the 3 characters only (kit.ink() inverted hulls);
 * - wisps/ghost/water are the only transparent materials; additive wisps
 *   are depthWrite:false;
 * - shadows stay lifted indigo (ramp lift), never black — ink is reserved
 *   for outlines and the pine ridge.
 *
 * EXTENSIONS over the frozen interface (assignable to MaterialKit, see
 * KitsuneMaterialKit):
 * - toon(key, { sway: true })  — opt-in wind sway (shaders/sway.ts);
 *   geometry must carry the aSwayWeight float attribute (0 root → 1 tip).
 * - toon(key, { ramp: 'hard' | 'soft' }) — override the per-key default
 *   (soft 4-band watercolor ramp on ground-ish keys, hard 3-band
 *   ink ramp everywhere else).
 * - wisp(colorKey?) — tinted kitsunebi (violet at the cursed willow,
 *   teal default). Cached per key.
 */
import * as THREE from 'three';
import { palette, type PaletteKey } from './palette';
import type { MaterialKit, ToonOptions } from '@/core/types';
import { hardRamp, softRamp } from './ramps';
import { injectSway } from './shaders/sway';
import { createWaterMaterial } from './shaders/water';
import { createGhostMaterial } from './shaders/ghost';
import { createWispMaterial } from './shaders/wisp';
import { GLSL_NOISE_COMMON } from './shaders/chunks';

// ───────────────────────────────────────────── extended kit surface ──

export interface StyleToonOptions extends ToonOptions {
  /** Wind sway vertex injection (needs aSwayWeight on the geometry). */
  sway?: boolean;
  /** Ramp override; default = soft for ground keys, hard otherwise. */
  ramp?: 'hard' | 'soft';
}

/** The concrete kit — frozen MaterialKit plus stream-A extensions. */
export interface KitsuneMaterialKit extends MaterialKit {
  toon(colorKey: PaletteKey, opts?: StyleToonOptions): THREE.Material;
  wisp(colorKey?: PaletteKey): THREE.Material;
}

export { bindWindUniforms, tickStyleUniforms } from './shaders/chunks';

/** Keys that read as large/ground surfaces → soft 4-band watercolor ramp. */
const SOFT_RAMP_KEYS: ReadonlySet<PaletteKey> = new Set<PaletteKey>([
  'grassNight',
  'earthBrown',
  'earthDark',
  'lakeShallow',
  'tatamiStraw',
  'thatchStraw',
]);

/**
 * Keys that default to wind sway. Foliage geometry carries aSwayWeight
 * (B-world authors it: willow curtains, reeds, grass — thick wood gets
 * weight 0); meshes without the attribute read 0 and stay rigid, so the
 * default is safe for every willowGreen user.
 */
const SWAY_KEYS: ReadonlySet<PaletteKey> = new Set<PaletteKey>(['willowGreen']);

// ─────────────────────────────────────────────────────── sky shader ──

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uMoonGlow;
uniform vec3 uMoonDir;
varying vec3 vDir;

${GLSL_NOISE_COMMON}

void main() {
  float hRaw = vDir.y;
  float h = clamp(hRaw, -0.08, 1.0);
  // indigo night gradient: horizon band → mid indigo → deep zenith
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.2, 0.65, h));
  // faint watercolor wash so the dome never reads as flat fill
  float wash = ksFbm2(vec2(vDir.x * 5.0 + vDir.z * 3.0, vDir.y * 7.0 + vDir.z * 4.0));
  col *= 0.93 + wash * 0.14;
  // gentle sky-glow around the moon (the disc itself is a mesh)
  float m = pow(max(dot(normalize(vDir), uMoonDir), 0.0), 7.0);
  col += uMoonGlow * m * 0.16;
  // horizon breath just above the treeline
  col += uHorizon * smoothstep(0.2, 0.0, abs(h - 0.03)) * 0.22;
  // below the treeline the dome melts into deep night — the iso camera
  // looks past the map edge into the lower bowl; without this it holds
  // the horizon band and reads as a washed lavender void.
  col = mix(col, uZenith, smoothstep(-0.05, -0.28, hRaw));
  gl_FragColor = vec4(col, 1.0);
}
`;

function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'kitsune-sky',
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uZenith: { value: new THREE.Color(palette.nightDeep) },
      uMid: { value: new THREE.Color(palette.nightIndigo) },
      uHorizon: { value: new THREE.Color(palette.nightHorizon) },
      uMoonGlow: { value: new THREE.Color(palette.moonlight) },
      uMoonDir: { value: new THREE.Vector3(-0.45, 0.52, -0.55).normalize() },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

// ──────────────────────────────────────────────────────── the kit ──

export function createMaterialKit(): KitsuneMaterialKit {
  const cache = new Map<string, THREE.Material>();

  function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let mat = cache.get(key);
    if (!mat) {
      mat = make();
      cache.set(key, mat);
    }
    return mat as T;
  }

  return {
    toon(colorKey: PaletteKey, opts: StyleToonOptions = {}): THREE.Material {
      const key = `toon:${colorKey}:${JSON.stringify(opts)}`;
      return cached(key, () => {
        const rampKind = opts.ramp ?? (SOFT_RAMP_KEYS.has(colorKey) ? 'soft' : 'hard');
        const mat = new THREE.MeshToonMaterial({
          color: palette[colorKey],
          gradientMap: rampKind === 'soft' ? softRamp() : hardRamp(),
          vertexColors: opts.vertexColors ?? false,
          transparent: opts.transparent ?? false,
          opacity: opts.opacity ?? 1,
          side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        });
        // MeshToonMaterial has no flatShading switch worth fighting —
        // greybox flatShading reads through the hard ramp anyway; honour
        // the flag where it exists for forward compat.
        if (opts.flatShading !== undefined) {
          (mat as THREE.MeshToonMaterial & { flatShading?: boolean }).flatShading =
            opts.flatShading;
        }
        if (opts.emissiveKey) {
          mat.emissive.setHex(palette[opts.emissiveKey]);
          mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
        }
        if (opts.sway ?? SWAY_KEYS.has(colorKey)) injectSway(mat);
        return mat;
      });
    },

    emissive(colorKey: PaletteKey, intensity = 1): THREE.Material {
      const key = `emissive:${colorKey}:${intensity}`;
      return cached(key, () => {
        // Map intensity so 1 lands just past the bloom threshold (.85):
        // glow surfaces halo softly; sub-1 intensities stay bloom-free.
        const color = new THREE.Color(palette[colorKey]).multiplyScalar(0.85 + intensity * 0.55);
        return new THREE.MeshBasicMaterial({ color, fog: false });
      });
    },

    water(): THREE.Material {
      return cached('water', createWaterMaterial);
    },

    ghost(): THREE.Material {
      return cached('ghost', createGhostMaterial);
    },

    wisp(colorKey: PaletteKey = 'spectralTeal'): THREE.Material {
      return cached(`wisp:${colorKey}`, () => createWispMaterial(colorKey));
    },

    sky(): THREE.Material {
      return cached('sky', createSkyMaterial);
    },

    ink(): THREE.Material {
      return cached('ink', () => {
        return new THREE.MeshBasicMaterial({
          color: palette.inkBlack,
          side: THREE.BackSide,
        });
      });
    },
  };
}
