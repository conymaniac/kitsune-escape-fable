/**
 * PlayerAvatar — owns BOTH Mizumi forms and the 0.45 s transform sequence
 * (DESIGN §2). STREAM C, FINAL API.
 *
 * Sequence: 0.10 s anticipation squash on the outgoing form → forms swap
 * HIDDEN inside the burst flash → incoming form pops with a 1.1× scale
 * overshoot and settles by 0.45 s.
 *
 * This class emits NO game events (FormChanged etc. are gameplay's job) —
 * it exposes `onSwapVisual` hooks so the integrator can fire the vfx
 * transformBurst, the transform SFX, the 0.85 time-scale dip, the camera
 * punch-zoom and the 0.2 s input lock at the right beats.
 */
import * as THREE from 'three';
import type { CharacterAction, ICharacter, KitsuneForm, MaterialKit, MotionState } from '@/core/types';
import { clamp01, lerp, smoothstep01 } from './rig';
import type { CharacterBase } from './rig';
import { MizumiHuman } from './mizumiHuman';
import { MizumiFox } from './mizumiFox';

export const HUMAN_COLLISION_RADIUS = 0.35;
export const FOX_COLLISION_RADIUS = 0.25;

/** Total transform duration (DESIGN §2 — tune-first, the heart). */
export const TRANSFORM_DURATION = 0.45;
/** Anticipation squash window before the hidden swap. */
const ANTICIPATION_END = 0.1;
/** Where in the settle window the 1.1× overshoot peaks. */
const OVERSHOOT_PEAK = 0.45;

/**
 * Visual beats of the transform:
 * - 'anticipation' — sequence started, outgoing form squashes.
 * - 'burst'        — forms just swapped hidden; fire vfx.transformBurst,
 *                    the transform SFX, time-dip and punch-zoom NOW.
 * - 'settle'       — overshoot settled, sequence complete.
 */
export type SwapVisualPhase = 'anticipation' | 'burst' | 'settle';

export type SwapVisualHook = (
  phase: SwapVisualPhase,
  worldPosition: THREE.Vector3,
  toForm: KitsuneForm,
) => void;

export class PlayerAvatar implements ICharacter {
  readonly root = new THREE.Group();
  readonly human: MizumiHuman;
  readonly fox: MizumiFox;

  /** Integrator hook — see SwapVisualPhase. The avatar emits no events. */
  onSwapVisual: SwapVisualHook | null = null;

  private formValue: KitsuneForm;
  private swapT = Number.POSITIVE_INFINITY; // ≥ duration: no swap running
  private burstFired = true;
  private outgoing: CharacterBase | null = null;
  private readonly tmp = new THREE.Vector3();

  constructor(kit: MaterialKit, initialForm: KitsuneForm = 'human') {
    this.human = new MizumiHuman(kit);
    this.fox = new MizumiFox(kit);
    this.root.name = 'playerAvatar';
    this.root.add(this.human.root, this.fox.root);

    this.formValue = initialForm;
    this.human.root.visible = initialForm === 'human';
    this.fox.root.visible = initialForm === 'fox';
  }

  // ── form ──

  get form(): KitsuneForm {
    return this.formValue;
  }

  /** Collision radius of the current (target) form: human 0.35 / fox 0.25. */
  get collisionRadius(): number {
    return this.formValue === 'human' ? HUMAN_COLLISION_RADIUS : FOX_COLLISION_RADIUS;
  }

  /** The currently-active form's character (the target form mid-swap). */
  get character(): ICharacter {
    return this.charOf(this.formValue);
  }

  isSwapping(): boolean {
    return this.swapT < TRANSFORM_DURATION;
  }

  /**
   * Switch forms with the 0.45 s transform sequence (or instantly for
   * spawn/restart). Mid-swap re-requests resolve cleanly: the running
   * sequence is cut short and a fresh one starts toward the new form.
   */
  setForm(form: KitsuneForm, instant = false): void {
    if (form === this.formValue) return;

    const old = this.charOf(this.formValue);
    const next = this.charOf(form);
    this.formValue = form;

    // Carry facing + action across the swap so the new form pops in-pose.
    next.setHeading(old.getHeading());
    next.setAction(old.getAction());

    old.root.scale.setScalar(1);
    next.root.scale.setScalar(1);

    if (instant) {
      old.root.visible = false;
      next.root.visible = true;
      this.swapT = Number.POSITIVE_INFINITY;
      this.outgoing = null;
      this.burstFired = true;
      return;
    }

    this.swapT = 0;
    this.burstFired = false;
    this.outgoing = old;
    old.root.visible = true;
    next.root.visible = false;
    this.fireSwapVisual('anticipation');
  }

  // ── ICharacter ──

  setAction(action: CharacterAction): void {
    this.charOf(this.formValue).setAction(action);
  }

  update(dt: number, motion: MotionState): void {
    const active = this.charOf(this.formValue);

    if (this.swapT < TRANSFORM_DURATION) {
      this.swapT += dt;
      const t = this.swapT;

      if (t < ANTICIPATION_END) {
        // Anticipation: squash the outgoing form.
        const k = smoothstep01(t / ANTICIPATION_END);
        const old = this.outgoing;
        if (old) old.root.scale.set(1 + 0.18 * k, 1 - 0.3 * k, 1 + 0.18 * k);
      } else {
        if (!this.burstFired) {
          // The swap hides inside the burst flash.
          this.burstFired = true;
          const old = this.outgoing;
          if (old) {
            old.root.visible = false;
            old.root.scale.setScalar(1);
          }
          active.root.visible = true;
          this.fireSwapVisual('burst');
        }
        // Settle: pop in small → 1.1× overshoot → 1.0.
        const k = clamp01((t - ANTICIPATION_END) / (TRANSFORM_DURATION - ANTICIPATION_END));
        let s: number;
        if (k < OVERSHOOT_PEAK) {
          const e = smoothstep01(k / OVERSHOOT_PEAK);
          s = lerp(0.55, 1.1, e);
        } else {
          const e = smoothstep01((k - OVERSHOOT_PEAK) / (1 - OVERSHOOT_PEAK));
          s = lerp(1.1, 1.0, e);
        }
        active.root.scale.setScalar(s);

        if (this.swapT >= TRANSFORM_DURATION) {
          active.root.scale.setScalar(1);
          this.outgoing = null;
          this.fireSwapVisual('settle');
        }
      }
    }

    // Only the active form animates; the hidden one stays parked.
    active.update(dt, motion);
  }

  dispose(): void {
    this.human.dispose();
    this.fox.dispose();
    this.root.removeFromParent();
  }

  // ── internals ──

  private charOf(form: KitsuneForm): CharacterBase {
    return form === 'human' ? this.human : this.fox;
  }

  private fireSwapVisual(phase: SwapVisualPhase): void {
    if (!this.onSwapVisual) return;
    this.root.getWorldPosition(this.tmp);
    this.onSwapVisual(phase, this.tmp, this.formValue);
  }
}
