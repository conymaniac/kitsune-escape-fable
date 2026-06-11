/**
 * Yanagi onna — the ghost woman under the Cursed Willow, cradling a baby
 * bundle. STREAM C, M1 placeholder geometry, FINAL rig + APIs.
 *
 * Group tree (names FINAL — M2 swaps only the meshes inside):
 *   yanagi
 *   └─ hover            (slow Y sine; wind sway lean)
 *      └─ robe          (pivot at hem — standAndBow pitches here)
 *         ├─ head       (pivot at neck)
 *         ├─ armL / armR  (cradle pivots at shoulders)
 *         └─ bundle     (the baby bundle in her arms)
 *
 * No legs below the shawl hem — the robe is a tapered shell that ends
 * above the ground; she hovers.
 *
 * APIs (FINAL):
 *   setDissolve(t 0..1)  — M1 fades opacity; M2 swaps in the ghost shader's
 *                          uDissolve without touching this signature.
 *   setWindSway(strength) — 0..1 sway amplitude tie-in for the WindSystem.
 *   standAndBow(onComplete?) — one-shot finale pose lerp: rise, bow, rise.
 */
import * as THREE from 'three';
import type { MaterialKit, MotionState } from '@/core/types';
import { CharacterBase, clamp01, lerp, limbPivot, meshIn, namedGroup, smoothstep01 } from './rig';

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

    // One cloned ghost material per instance: fading opacity must never
    // mutate the shared cached kit.ghost() used elsewhere (wisps, smoke).
    const ghost = kit.ghost().clone();
    this.ghostMats.push(ghost);

    this.hover = namedGroup('hover', this.root);
    this.robe = namedGroup('robe', this.hover);

    // — robe shell: tapered, hem ends above ground, NO legs —
    meshIn(this.robe, new THREE.CylinderGeometry(0.105, 0.36, 1.0, 12), ghost, 0, 0.68, 0, 'robeMesh');
    const shoulders = meshIn(this.robe, new THREE.SphereGeometry(0.13, 10, 8), ghost, 0, 1.16, 0, 'shoulders');
    shoulders.scale.set(1.45, 0.6, 1);

    // — head + long hair down the back —
    this.head = namedGroup('head', this.robe, 0, 1.24, 0);
    meshIn(this.head, new THREE.SphereGeometry(0.125, 12, 10), ghost, 0, 0.08, 0, 'headMesh');
    this.hairMesh = meshIn(this.head, new THREE.SphereGeometry(0.135, 10, 8), ghost, 0, -0.02, -0.07, 'hairMesh');
    this.hairMesh.scale.set(1.05, 1.9, 0.8);

    // — cradling arms (pivot at shoulders, hang −Y, folded inward) —
    const armGeo = new THREE.CylinderGeometry(0.035, 0.042, 0.34, 7);
    this.armL = limbPivot('armL', this.robe, 0.15, 1.14, 0.04);
    this.armR = limbPivot('armR', this.robe, -0.15, 1.14, 0.04);
    meshIn(this.armL, armGeo, ghost, 0, -0.17, 0, 'armLMesh');
    meshIn(this.armR, armGeo, ghost, 0, -0.17, 0, 'armRMesh');

    // — the baby bundle in her arms —
    const bundle = namedGroup('bundle', this.robe, 0, 0.92, 0.2);
    const bundleMesh = meshIn(bundle, new THREE.SphereGeometry(0.095, 10, 8), ghost, 0, 0, 0, 'bundleMesh');
    bundleMesh.scale.set(1.6, 1, 1);
    bundleMesh.rotation.z = 0.25;

    // Remember base opacity for the dissolve fade.
    this.baseOpacities.push(ghost.opacity);
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
