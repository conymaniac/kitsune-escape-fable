/**
 * Yanagi onna — the ghost woman under the Cursed Willow, cradling a baby
 * bundle. STREAM C, M2 real art inside the FINAL rig + APIs.
 *
 * Group tree (names FINAL — M2 swapped only the meshes inside):
 *   yanagi
 *   └─ hover            (slow Y sine; wind sway lean)
 *      └─ robe          (pivot at hem — standAndBow pitches here)
 *         ├─ head       (pivot at neck)
 *         ├─ armL / armR  (cradle pivots at shoulders)
 *         └─ bundle     (the baby bundle in her arms)
 *
 * Look (DESIGN canon): young woman in a long PURPLE kimono, head bowed to
 * the baby bundle wrapped in a cream shawl, long loose black hair down her
 * back. The robe is a bell-shaped lathe whose hem floats above the ground
 * — no legs — and the ghost shader's uv.y hem erosion tatters it into
 * nothing. Faint floral pattern = pale-violet petal quads hovering just
 * off the robe surface (the ghost shader has no vertex colors, so pattern
 * lives in tinted material clones + geometry).
 *
 * Every part uses an owned clone of kit.ghost(); clones get their uBase
 * uniform tinted per part (kimono purple / pale bone / ink hair / aged
 * shawl) with a defensive fallback for non-shader kits. The setDissolve →
 * material.opacity path is untouched: the ghost material proxies opacity
 * into uOpacity + uDissolve internally.
 *
 * APIs (FINAL):
 *   setDissolve(t 0..1)  — fades all owned ghost clones (shader dissolve).
 *   setWindSway(strength) — 0..1 sway amplitude tie-in for the WindSystem.
 *   standAndBow(onComplete?) — one-shot finale pose lerp: rise, bow, rise.
 */
import * as THREE from 'three';
import type { MaterialKit, MotionState } from '@/core/types';
import { col, colMix, fuse, lathe, remapUvY, xf } from './geo';
import { CharacterBase, clamp01, lerp, limbPivot, meshIn, namedGroup, smoothstep01 } from './rig';

/** Tint a ghost-clone's base color (shader uBase, or .color on stubs). */
function tintGhost(mat: THREE.Material, color: THREE.Color): void {
  const uniforms = (mat as THREE.ShaderMaterial).uniforms as
    | Record<string, THREE.IUniform | undefined>
    | undefined;
  const base = uniforms?.['uBase']?.value as unknown;
  if (base instanceof THREE.Color) {
    base.copy(color);
    return;
  }
  const plain = (mat as unknown as { color?: unknown }).color;
  if (plain instanceof THREE.Color) plain.copy(color);
}

/** Resting hover height of the hem above the ground. */
const HOVER_BASE = 0.05;
const STAND_HOVER_BASE = 0.18;

/** standAndBow timeline (seconds). */
const T_RISEN = 1.0;
const T_BOW_START = 1.4;
const T_BOWED = 2.2;
const T_BOW_HOLD = 2.8;
const T_DONE = 3.6;

export class Yanagi extends CharacterBase {
  private readonly hover: THREE.Group;
  private readonly robe: THREE.Group;
  private readonly head: THREE.Group;
  private readonly hairMesh: THREE.Mesh;
  private readonly armL: THREE.Group;
  private readonly armR: THREE.Group;

  /** Cloned ghost materials owned by this instance (dissolve-safe). */
  private readonly ghostMats: THREE.Material[] = [];
  private readonly baseOpacities: number[] = [];

  private dissolve = 0;
  private windSway = 0.4;

  /** standAndBow one-shot timeline; negative = not started. */
  private bowT = -1;
  private bowDone = false;
  private onBowComplete: (() => void) | null = null;

  constructor(kit: MaterialKit) {
    super('yanagi', { stride: 0, crossfadeSec: 0.3, headingRate: 6, speedRef: 1 });

    // Owned ghost-material clones, tinted per part: fading opacity must
    // never mutate the shared cached kit.ghost() used elsewhere (smoke).
    const ghostRobe = kit.ghost().clone();
    tintGhost(ghostRobe, col('kimonoPurple'));
    const ghostPale = kit.ghost().clone(); // bone-smoke default (face)
    const ghostHair = kit.ghost().clone();
    tintGhost(ghostHair, colMix('inkBlack', 'nightIndigo', 0.45));
    const ghostShawl = kit.ghost().clone();
    tintGhost(ghostShawl, col('paperAged'));
    const ghostPetal = kit.ghost().clone();
    tintGhost(ghostPetal, colMix('kimonoPurple', 'smokeWhite', 0.55));
    this.ghostMats.push(ghostRobe, ghostPale, ghostHair, ghostShawl, ghostPetal);

    this.hover = namedGroup('hover', this.root);
    this.robe = namedGroup('robe', this.hover);

    // — robe shell: bell-shaped kimono lathe, hem floats above ground, NO
    //   legs. Profile starts at the hem so uv.y 0 = hem → shader erosion
    //   tatters the lower edge into nothing. —
    const robeGeo = lathe(
      [
        [0.42, 0.1], // floating hem
        [0.36, 0.34],
        [0.255, 0.64],
        [0.175, 0.92], // waist
        [0.19, 1.06], // chest
        [0.155, 1.16], // shoulders
        [0.06, 1.23], // neck
        [0.004, 1.255], // closed top
      ],
      10,
    );
    meshIn(this.robe, robeGeo, ghostRobe, 0, 0, 0, 'robeMesh');

    // — faint floral pattern: pale-violet petal quads riding just off the
    //   robe surface (uv.y remapped up so they dodge the hem erosion) —
    const petalAt = (theta: number, y: number, r: number, tilt: number): THREE.BufferGeometry =>
      xf(remapUvY(new THREE.PlaneGeometry(0.075, 0.075), 0.5, 1), {
        x: Math.sin(theta) * (r + 0.012),
        y,
        z: Math.cos(theta) * (r + 0.012),
        ry: theta,
        rz: tilt,
      });
    const petals = fuse(
      petalAt(0.3, 0.45, 0.32, 0.5),
      petalAt(-0.55, 0.62, 0.26, -0.3),
      petalAt(1.1, 0.78, 0.21, 0.2),
      petalAt(-1.3, 0.38, 0.345, 0.7),
      petalAt(2.0, 0.55, 0.285, -0.5),
      petalAt(0.05, 0.95, 0.18, 0.35),
    );
    meshIn(this.robe, petals, ghostPetal, 0, 0, 0, 'kimonoFlorals');

    // — head (bowed toward the bundle by animate()) + long loose hair —
    this.head = namedGroup('head', this.robe, 0, 1.24, 0);
    meshIn(this.head, new THREE.SphereGeometry(0.115, 7, 4), ghostPale, 0, 0.075, 0.01, 'headMesh');
    const hairCap = xf(new THREE.SphereGeometry(0.135, 7, 4), {
      y: 0.085,
      z: -0.025,
      sx: 1.02,
      sy: 1.05,
    });
    const hairFall = xf(new THREE.SphereGeometry(0.1, 6, 4), {
      y: -0.22,
      z: -0.13,
      sx: 0.8,
      sy: 2.6,
      sz: 0.42,
    });
    const strand = (side: 1 | -1): THREE.BufferGeometry =>
      xf(new THREE.ConeGeometry(0.025, 0.34, 4), {
        x: side * 0.105,
        y: -0.1,
        z: 0.03,
        rx: Math.PI,
        rz: side * 0.1,
      });
    this.hairMesh = meshIn(
      this.head,
      fuse(hairCap, hairFall, strand(1), strand(-1)),
      ghostHair,
      0,
      0,
      0,
      'hairMesh',
    );

    // — cradling kimono sleeves (pivot at shoulders, hang −Y, folded
    //   inward by animate(); open ends erode like the hem) —
    const sleeveGeo = (): THREE.BufferGeometry =>
      new THREE.CylinderGeometry(0.05, 0.105, 0.4, 6, 1, true);
    this.armL = limbPivot('armL', this.robe, 0.15, 1.14, 0.04);
    this.armR = limbPivot('armR', this.robe, -0.15, 1.14, 0.04);
    meshIn(this.armL, sleeveGeo(), ghostRobe, 0, -0.2, 0, 'armLMesh');
    meshIn(this.armR, sleeveGeo(), ghostRobe, 0, -0.2, 0, 'armRMesh');

    // — the baby bundle: cream shawl wrap with a swaddled head bump —
    // (pushed slightly forward of the sleeves so it silhouettes at iso
    // distance — "head bowed toward the baby" must read)
    const bundle = namedGroup('bundle', this.robe, 0, 0.92, 0.24);
    const wrap = xf(new THREE.SphereGeometry(0.095, 6, 4), { sx: 1.62, sy: 0.95, sz: 1.1, rz: 0.25 });
    const bump = xf(new THREE.SphereGeometry(0.05, 5, 3), { x: 0.125, y: 0.04, z: 0.01 });
    meshIn(bundle, fuse(wrap, bump), ghostShawl, 0, 0, 0, 'bundleMesh');

    // Remember base opacities for the dissolve fade.
    for (const mat of this.ghostMats) this.baseOpacities.push(mat.opacity);
  }

  // ── final public APIs ──

  /** 0 = fully present, 1 = fully unravelled. M1: opacity fade + rise. */
  setDissolve(t: number): void {
    this.dissolve = clamp01(t);
    for (let i = 0; i < this.ghostMats.length; i++) {
      const mat = this.ghostMats[i];
      const base = this.baseOpacities[i];
      if (mat && base !== undefined) mat.opacity = base * (1 - this.dissolve);
    }
    this.root.visible = this.dissolve < 1;
  }

  getDissolve(): number {
    return this.dissolve;
  }

  /** Tie sway amplitude to WindState.strength (0..1). */
  setWindSway(strength: number): void {
    this.windSway = clamp01(strength);
  }

  /**
   * Finale one-shot: she stands for the first time, bows, straightens.
   * Safe to call once; subsequent calls are ignored while running/finished.
   */
  standAndBow(onComplete?: () => void): void {
    if (this.bowT >= 0) return;
    this.bowT = 0;
    this.bowDone = false;
    this.onBowComplete = onComplete ?? null;
  }

  isStanding(): boolean {
    return this.bowT >= 0;
  }

  // ── anim ──

  protected override animate(dt: number, _motion: MotionState): void {
    // standAndBow timeline → cradle / rise / bow weights.
    let rise = 0; // 0 = hunched cradle, 1 = standing tall
    let bow = 0; // 0..1 forward bow pitch
    if (this.bowT >= 0) {
      this.bowT += dt;
      const t = this.bowT;
      rise = smoothstep01(t / T_RISEN);
      if (t < T_BOW_START) bow = 0;
      else if (t < T_BOWED) bow = smoothstep01((t - T_BOW_START) / (T_BOWED - T_BOW_START));
      else if (t < T_BOW_HOLD) bow = 1;
      else bow = 1 - smoothstep01((t - T_BOW_HOLD) / (T_DONE - T_BOW_HOLD));
      if (t >= T_DONE && !this.bowDone) {
        this.bowDone = true;
        const cb = this.onBowComplete;
        this.onBowComplete = null;
        if (cb) cb();
      }
    }

    // — hovering: slow Y sine, rises slightly when standing + dissolving —
    const hoverBase = lerp(HOVER_BASE, STAND_HOVER_BASE, rise);
    this.hover.position.y = hoverBase + Math.sin(this.time * 0.8) * 0.05 + this.dissolve * 0.45;

    // — wind sway: gentle lean + drift, amplitude tied to wind strength —
    const sway = 0.25 + this.windSway * 0.75;
    this.hover.rotation.z = Math.sin(this.time * 0.6) * 0.045 * sway;
    this.hover.position.x = Math.sin(this.time * 0.45) * 0.02 * sway;
    this.hairMesh.rotation.x = Math.sin(this.time * 1.1) * 0.07 * sway;

    // — robe pivots at the hem: hunch (cradle) → straighten → bow —
    const hunch = lerp(0.14, 0, rise);
    this.robe.rotation.x = hunch + bow * 0.55;

    // — head: gazes down at the bundle, lifts as she stands —
    this.head.rotation.x = lerp(0.42, 0.12, rise) + bow * 0.25 + Math.sin(this.time * 0.7) * 0.02;
    this.head.rotation.y = Math.sin(this.time * 0.33) * 0.05 * (1 - rise);

    // — cradling arms: folded inward; loosen slightly as she rises —
    const cradleX = lerp(-1.05, -0.55, rise);
    this.armL.rotation.x = cradleX + Math.sin(this.time * 0.8) * 0.015; // rocking
    this.armR.rotation.x = cradleX - Math.sin(this.time * 0.8) * 0.015;
    this.armL.rotation.z = lerp(-0.55, -0.2, rise);
    this.armR.rotation.z = lerp(0.55, 0.2, rise);
  }

  override dispose(): void {
    super.dispose();
    for (const mat of this.ghostMats) mat.dispose(); // we own the clones
    this.ghostMats.length = 0;
  }
}
