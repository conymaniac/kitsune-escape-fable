/**
 * Light rigs + scene fog (STREAM A, M2 — TECH_SPEC §7 budget).
 *
 * Exterior (5 lights exactly):
 *  1. moon key DirectionalLight (moonlight, 1.2) — the ONE 1024² shadow
 *     map, tight 40×40 ortho frustum; follow(target) keeps it over the
 *     playable spine (call every frame with the player / diorama focus).
 *  2. hemisphere fill — cold indigo sky over dark charcoal-plum ground.
 *  3. warm rim DirectionalLight from the cottage side (NW), no shadow —
 *     a faint amber kiss on west-facing edges, the cottage's reach.
 *  4. window PointLight — the shoji glow pool by the cottage east wall.
 *  5. lantern PointLight — warm pool at the promontory stone lantern
 *     (beside the cursed willow: warm vs spectral contrast where the
 *     finale plays out).
 *  flicker(dt, windStrength): both point lights breathe; wind agitates.
 *  Scene fog: linear indigo — the map edges melt into night (ortho iso
 *  depth spans ≈ ±12 on-screen around the 60 u follow distance, so the
 *  near/far straddle that band).
 *
 * Interior (3 lights): warm paper-lantern key PointLight + cool indigo
 * hemisphere fill + a faint moon-blue directional slanting through the
 * east window. No fog (10×8 room, the vignette does the framing).
 */
import * as THREE from 'three';
import { palette } from './palette';

export interface ExteriorRig {
  moon: THREE.DirectionalLight;
  windowLight: THREE.PointLight;
  lanternLight: THREE.PointLight;
  /** Re-centre the shadow frustum (player / title-diorama focus). */
  follow(target: THREE.Vector3): void;
  /** Per-frame warm-light breathing; wind gusts agitate the flames. */
  flicker(dt: number, windStrength: number): void;
  dispose(): void;
}

export interface InteriorRig {
  lantern: THREE.PointLight;
  flicker(dt: number, windStrength?: number): void;
  dispose(): void;
}

// Exterior anchor points (FINAL world data — see world/exterior.ts):
// cottage window plane sits at (-21.48, 1.3, -20.5) facing east; the
// promontory stone lantern stands at (15, 0, -13.8), core at y 0.86.
// Lights are PHYSICAL (intensity/d² since r165) — keep them well clear of
// geometry or the nearest surface gets 10-40× radiance and bloom torches
// the frame. The window light floats 1.7 u east of the wall plane.
const WINDOW_POS = new THREE.Vector3(-19.8, 1.15, -20.5);
const LANTERN_POS = new THREE.Vector3(15, 1.05, -13.8);

const WINDOW_INTENSITY = 4.5;
const LANTERN_INTENSITY = 5;

/** Build the exterior night rig into the scene; returns live handles. */
export function makeExteriorRig(scene: THREE.Scene): ExteriorRig {
  // Background: scene.background converts per render target (linear into
  // the postfx HDR buffer, sRGB on screen). renderer.setClearColor alone
  // encodes for the screen at call time → double-encodes through the
  // composer's OutputPass (washed lavender instead of deep night).
  scene.background = new THREE.Color(palette.nightDeep);

  // 1 — moon key with the single shadow map
  const moon = new THREE.DirectionalLight(palette.moonlight, 1.2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -20;
  moon.shadow.camera.right = 20;
  moon.shadow.camera.top = 20;
  moon.shadow.camera.bottom = -20;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 90;
  moon.shadow.bias = -0.002;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);

  // 2 — hemisphere fill: indigo sky bounce over dark plum ground
  const hemi = new THREE.HemisphereLight(palette.nightHorizon, palette.inkBlack, 0.62);
  scene.add(hemi);

  // 3 — warm rim from the cottage quarter (NW), shadowless
  const rim = new THREE.DirectionalLight(palette.lanternAmber, 0.24);
  rim.position.set(-30, 9, -26);
  scene.add(rim, rim.target);

  // 4 — the shoji window pool
  const windowLight = new THREE.PointLight(palette.shojiGlow, WINDOW_INTENSITY, 9, 2);
  windowLight.position.copy(WINDOW_POS);
  scene.add(windowLight);

  // 5 — the promontory stone lantern pool
  const lanternLight = new THREE.PointLight(palette.lanternAmber, LANTERN_INTENSITY, 7, 2);
  lanternLight.position.copy(LANTERN_POS);
  scene.add(lanternLight);

  // fog: the night swallows the map edges (matches the sky-dome horizon)
  scene.fog = new THREE.Fog(palette.nightIndigo, 56, 150);

  let t = Math.random() * 10;

  return {
    moon,
    windowLight,
    lanternLight,

    follow(target: THREE.Vector3): void {
      moon.position.set(target.x - 12, 24, target.z - 8);
      moon.target.position.copy(target);
    },

    flicker(dt: number, windStrength: number): void {
      t += dt;
      const agitation = 0.5 + windStrength * 1.4;
      windowLight.intensity =
        WINDOW_INTENSITY * (0.94 + 0.06 * Math.sin(t * 5.3) * Math.sin(t * 1.7));
      lanternLight.intensity =
        LANTERN_INTENSITY *
        (0.86 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 2.3) * agitation + 0.04 * Math.sin(t * 23));
    },

    dispose(): void {
      scene.remove(moon, moon.target, hemi, rim, rim.target, windowLight, lanternLight);
      moon.dispose();
      hemi.dispose();
      rim.dispose();
      windowLight.dispose();
      lanternLight.dispose();
    },
  };
}

// Interior anchor: the floor lantern stands at (-0.6, 0, -1.0).
const INT_LANTERN_POS = new THREE.Vector3(-0.6, 1.05, -1.0);
const INT_LANTERN_INTENSITY = 10;

/** Build the intimate interior rig; warm low key + cool fill. */
export function makeInteriorRig(scene: THREE.Scene): InteriorRig {
  // per-target-correct clear (see makeExteriorRig)
  scene.background = new THREE.Color(palette.nightDeep);

  // warm paper-lantern key, low to the floor — long cosy falloff
  const lantern = new THREE.PointLight(palette.lanternAmber, INT_LANTERN_INTENSITY, 13, 1.6);
  lantern.position.copy(INT_LANTERN_POS);
  scene.add(lantern);

  // cool fill so the corners read indigo, not void
  const hemi = new THREE.HemisphereLight(palette.nightHorizon, palette.inkBlack, 0.5);
  scene.add(hemi);

  // moon-blue slant through the east window opening
  const moonSlant = new THREE.DirectionalLight(palette.moonlight, 0.3);
  moonSlant.position.set(7, 4, -1.2);
  moonSlant.target.position.set(2, 0, -0.4);
  scene.add(moonSlant, moonSlant.target);

  let t = Math.random() * 10;

  return {
    lantern,

    flicker(dt: number): void {
      t += dt;
      // soft indoor breathing — no wind reaches the flame
      lantern.intensity =
        INT_LANTERN_INTENSITY * (0.93 + 0.05 * Math.sin(t * 6.1) * Math.sin(t * 1.9) + 0.02 * Math.sin(t * 19));
    },

    dispose(): void {
      scene.remove(lantern, hemi, moonSlant, moonSlant.target);
      lantern.dispose();
      hemi.dispose();
      moonSlant.dispose();
    },
  };
}
