/**
 * PlayerController — movement, collide-slide, Bound/Brace, gust stagger,
 * knockdown and form switching (TECH_SPEC §1 gameplay/player.ts +
 * DESIGN §2 form duality).
 *
 * - accel 30 u/s² toward human 3.2 / fox 5.0 u/s, exponential friction
 * - camera-relative 8-dir input (screen-up = world (−0.707, 0, −0.707))
 * - circle vs statics collide-slide against the ACTIVE collider set
 *   (live array reference — the gate splices its collider in place)
 * - Bound (fox Space): 3 m hop / 0.35 s, parabolic visual arc on the
 *   avatar root, 0.6 s cooldown; mid-hop the colliders in the
 *   `boundPassable` set (the creek-narrows water collider) are ignored
 * - Brace (human Space, held): kneel, no movement, stagger+knockdown immune
 * - gust stagger: lash + human + outdoors + not bracing + not in a wind
 *   shadow → 40 % speed (DESIGN §3)
 * - knockdown via applyKnockdown(pushDir): tumble + ~3 m push, recover on
 *   3 E-presses or 2.6 s auto bail-out + 0.25 s snap-free; 0.8 s grace
 * - form switch on F (when director.canPlayerAct(), not mid-swap, not
 *   down): emits FormChanged at request time; the avatar's onSwapVisual
 *   hook (wired in main.ts) handles burst/time-dip/punch-zoom/input lock
 * - footstep cadence from distance travelled, surface from the active
 *   scene (grass/wood)
 *
 * The controller owns the truth position (`pos`); the avatar root mirrors
 * it (y carries the Bound arc). No per-frame allocations.
 */
import * as THREE from 'three';
import type { ColliderShape, KitsuneForm, MotionState, WindShadow, WindState } from '@/core/types';
import type { EventBus } from '@/core/events';
import type { Input } from '@/core/input';
import type { GameDirector } from '@/core/director';
import { circleVsStatics } from '@/world/colliders';
import type { PlayerAvatar } from '@/characters/playerAvatar';

// Camera-relative movement basis (TECH_SPEC §2): screen-up on the ground
// is world (−0.707, 0, −0.707); screen-right is world (+0.707, 0, −0.707).
const SCREEN_RIGHT_X = 0.7071;
const SCREEN_RIGHT_Z = -0.7071;
const SCREEN_UP_X = -0.7071;
const SCREEN_UP_Z = -0.7071;

const ACCEL = 30;
const SPEED_HUMAN = 3.2;
const SPEED_FOX = 5.0;
const FRICTION_RATE = 11;
const STAGGER_MULT = 0.4;

const BOUND_DIST = 3;
const BOUND_TIME = 0.35;
const BOUND_COOLDOWN = 0.6;
const BOUND_ARC_HEIGHT = 0.85;

// Knockdown cost target (DESIGN §3 + M4 feel pass): push 0.5 s + trapped
// (3×E ≈ 1–1.5 s, auto bail-out 2.6 s) + 0.25 s snap-free ≈ 2.3–3.4 s down,
// plus the ~3 m walk-back — the whole mistake costs ~3–5 s, never more.
const KNOCK_PUSH_DIST = 3;
const KNOCK_PUSH_TIME = 0.5;
const KNOCK_RECOVER_PRESSES = 3;
const KNOCK_AUTO_RECOVER_SEC = 2.6;
const KNOCK_GRACE_SEC = 0.8;
const KNOCK_SNAP_LOCK_SEC = 0.25;

/** Footstep stride in metres (cadence syncs with the rigs' gait feel). */
const STRIDE_HUMAN = 0.95;
const STRIDE_FOX = 0.72;
const FOOTSTEP_MIN_SPEED = 0.6;

type PlayerState = 'normal' | 'bound' | 'knockdown';

export interface PlayerControllerOptions {
  avatar: PlayerAvatar;
  input: Input;
  bus: EventBus;
  director: GameDirector;
  /** Live wind state (stagger checks). */
  getWind: () => WindState;
  /** True while the exterior scene is active. */
  isOutdoors: () => boolean;
  /** Footstep surface for the active scene. */
  getSurface: () => 'grass' | 'wood';
  /** Bound launch/landing + knockdown dust (vfx.dustPoof). */
  onDust?: (pos: THREE.Vector3) => void;
}

export class PlayerController {
  /** The truth position (ground plane; y stays 0 — the arc is visual). */
  readonly pos = new THREE.Vector3();
  /** Current velocity (XZ on .x/.z, y unused) — camera look-ahead input. */
  readonly velocity = new THREE.Vector3();

  private readonly avatar: PlayerAvatar;
  private readonly input: Input;
  private readonly bus: EventBus;
  private readonly director: GameDirector;
  private readonly getWind: () => WindState;
  private readonly isOutdoors: () => boolean;
  private readonly getSurface: () => 'grass' | 'wood';
  private readonly onDust: ((pos: THREE.Vector3) => void) | null;

  private colliders: readonly ColliderShape[] = [];
  private boundPassable: ReadonlySet<ColliderShape> = new Set();
  /** Reused buffer: active colliders minus boundPassable, rebuilt per hop. */
  private readonly boundColliders: ColliderShape[] = [];
  private windShadows: readonly WindShadow[] = [];

  private state: PlayerState = 'normal';
  private headingValue = Math.PI; // facing -Z (north) at spawn
  private bracing = false;
  private controlLock = 0;

  // bound
  private boundT = 0;
  private boundCooldown = 0;
  private readonly boundVel = new THREE.Vector2();

  // knockdown
  private readonly knockDir = new THREE.Vector2();
  private knockT = 0;
  private knockPresses = 0;
  private knockGrace = 0;

  // footsteps
  private strideAccum = 0;

  // scratch
  private readonly motion: MotionState = { speed: 0, heading: 0, grounded: true };

  constructor(options: PlayerControllerOptions) {
    this.avatar = options.avatar;
    this.input = options.input;
    this.bus = options.bus;
    this.director = options.director;
    this.getWind = options.getWind;
    this.isOutdoors = options.isOutdoors;
    this.getSurface = options.getSurface;
    this.onDust = options.onDust ?? null;
  }

  // ── public surface ──

  get form(): KitsuneForm {
    return this.avatar.form;
  }

  /** Facing heading in radians around +Y (0 = +Z). */
  get facing(): number {
    return this.headingValue;
  }

  isKnockedDown(): boolean {
    return this.state === 'knockdown';
  }

  isBounding(): boolean {
    return this.state === 'bound';
  }

  isBracing(): boolean {
    return this.bracing;
  }

  isSwapping(): boolean {
    return this.avatar.isSwapping();
  }

  /** Movement/verbs ignored while > 0 (transform burst, scene swaps). */
  lockControls(seconds: number): void {
    this.controlLock = Math.max(this.controlLock, seconds);
  }

  /** Swap the active collider set (scene swap). Keep arrays LIVE. */
  setColliders(colliders: readonly ColliderShape[]): void {
    this.colliders = colliders;
  }

  /** Colliders Bound may cross (creek-narrows water — see exterior.ts). */
  setBoundPassable(set: ReadonlySet<ColliderShape>): void {
    this.boundPassable = set;
  }

  setWindShadows(shadows: readonly WindShadow[]): void {
    this.windShadows = shadows;
  }

  /** Hard-set position (spawn, scene swap). Clears motion + states. */
  teleport(p: THREE.Vector3): void {
    this.pos.set(p.x, 0, p.z);
    this.velocity.set(0, 0, 0);
    this.state = 'normal';
    this.bracing = false;
    this.boundT = 0;
    this.strideAccum = 0;
    this.avatar.setAction('idle');
    this.avatar.root.position.set(this.pos.x, 0, this.pos.z);
  }

  /** Instant form set (spawn/restart) — no burst, no events. */
  setFormInstant(form: KitsuneForm): void {
    this.avatar.setForm(form, true);
  }

  /**
   * Wind/lash hazard entry: tumble + ~3 m push. Ignored while bracing
   * (DESIGN §3 finale: Brace beside her), already down, or in grace.
   * Returns true when the knockdown landed (wind's once-per-gust rule).
   */
  applyKnockdown(pushDir: THREE.Vector2): boolean {
    if (this.state === 'knockdown' || this.knockGrace > 0 || this.bracing) return false;
    // No tumbles while a dialog panel/cutscene owns the moment — the ghost
    // stands inside the cursed lash zone, and being whipped down mid-
    // conversation reads as a bug, not as weather (M4 feel pass).
    if (!this.director.canPlayerAct()) return false;
    this.state = 'knockdown';
    this.bracing = false;
    this.boundT = 0;
    this.knockDir.copy(pushDir);
    if (this.knockDir.lengthSq() < 1e-6) this.knockDir.set(0, 1);
    this.knockDir.normalize();
    this.knockT = 0;
    this.knockPresses = 0;
    this.velocity.set(0, 0, 0);
    this.avatar.root.position.y = 0;
    this.avatar.setAction('knockdown');
    this.onDust?.(this.pos);
    this.bus.emit('Knockdown');
    return true;
  }

  // ── per-frame ──

  update(dt: number): void {
    this.controlLock = Math.max(0, this.controlLock - dt);
    this.boundCooldown = Math.max(0, this.boundCooldown - dt);
    this.knockGrace = Math.max(0, this.knockGrace - dt);

    const canAct = this.director.canPlayerAct() && this.controlLock <= 0;

    switch (this.state) {
      case 'knockdown':
        this.updateKnockdown(dt, canAct);
        break;
      case 'bound':
        this.updateBound(dt);
        break;
      default:
        this.updateNormal(dt, canAct);
    }

    // Mirror the truth position onto the avatar root (y = Bound arc).
    this.avatar.root.position.x = this.pos.x;
    this.avatar.root.position.z = this.pos.z;

    this.motion.heading = this.headingValue;
    this.motion.grounded = this.state !== 'bound';
    this.avatar.update(dt, this.motion);
  }

  // ── states ──

  private updateNormal(dt: number, canAct: boolean): void {
    const form = this.avatar.form;
    const swapping = this.avatar.isSwapping();

    // Form switch (F) — DESIGN §2: disabled only mid-dialogue/knockdown.
    if (canAct && !swapping && this.input.justPressed('transform')) {
      const next: KitsuneForm = form === 'human' ? 'fox' : 'human';
      this.avatar.setForm(next);
      this.bus.emit('FormChanged', next);
      // onSwapVisual('anticipation') → main locks controls 0.2 s.
    }

    // Brace (human Space, held): kneel, no movement.
    const wantBrace = canAct && form === 'human' && this.input.isDown('formVerb');
    if (wantBrace !== this.bracing) {
      this.bracing = wantBrace;
      this.avatar.setAction(wantBrace ? 'brace' : 'idle');
    }

    // Bound (fox Space): 3 m hop.
    if (
      canAct &&
      form === 'fox' &&
      !this.bracing &&
      this.boundCooldown <= 0 &&
      this.input.justPressed('formVerb')
    ) {
      this.startBound();
      return;
    }

    // Movement input (camera-relative).
    let inputX = 0;
    let inputZ = 0;
    if (canAct && !this.bracing) {
      const axis = this.input.axis();
      inputX = axis.x * SCREEN_RIGHT_X + axis.y * SCREEN_UP_X;
      inputZ = axis.x * SCREEN_RIGHT_Z + axis.y * SCREEN_UP_Z;
    }
    const hasInput = inputX * inputX + inputZ * inputZ > 1e-6;

    // Gust stagger (DESIGN §3): lash staggers the human in the open.
    let maxSpeed = form === 'human' ? SPEED_HUMAN : SPEED_FOX;
    const wind = this.getWind();
    if (
      wind.phase === 'lash' &&
      form === 'human' &&
      this.isOutdoors() &&
      !this.bracing &&
      !this.inWindShadow()
    ) {
      maxSpeed *= STAGGER_MULT;
    }

    if (hasInput) {
      const len = Math.hypot(inputX, inputZ);
      this.velocity.x += (inputX / len) * ACCEL * dt;
      this.velocity.z += (inputZ / len) * ACCEL * dt;
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > maxSpeed) {
        const k = maxSpeed / speed;
        this.velocity.x *= k;
        this.velocity.z *= k;
      }
    } else {
      const k = Math.exp(-FRICTION_RATE * dt);
      this.velocity.x *= k;
      this.velocity.z *= k;
      if (Math.hypot(this.velocity.x, this.velocity.z) < 0.04) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }
    if (this.bracing) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Integrate + collide-slide.
    this.pos.x += this.velocity.x * dt;
    this.pos.z += this.velocity.z * dt;
    circleVsStatics(this.pos, this.avatar.collisionRadius, this.colliders);

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.motion.speed = speed;
    if (speed > 0.15) {
      this.headingValue = Math.atan2(this.velocity.x, this.velocity.z);
    }

    // Footstep cadence (distance-driven, like the rigs' gait phase).
    if (speed > FOOTSTEP_MIN_SPEED) {
      this.strideAccum += speed * dt;
      const stride = form === 'human' ? STRIDE_HUMAN : STRIDE_FOX;
      if (this.strideAccum >= stride) {
        this.strideAccum -= stride;
        this.bus.emit('Footstep', this.getSurface());
      }
    } else {
      this.strideAccum = 0;
    }
  }

  private startBound(): void {
    // Hop along current input direction, else along facing.
    const axis = this.input.axis();
    let dx = axis.x * SCREEN_RIGHT_X + axis.y * SCREEN_UP_X;
    let dz = axis.x * SCREEN_RIGHT_Z + axis.y * SCREEN_UP_Z;
    if (dx * dx + dz * dz < 1e-6) {
      dx = Math.sin(this.headingValue);
      dz = Math.cos(this.headingValue);
    }
    const len = Math.hypot(dx, dz);
    this.boundVel.set((dx / len) * (BOUND_DIST / BOUND_TIME), (dz / len) * (BOUND_DIST / BOUND_TIME));
    this.headingValue = Math.atan2(dx, dz);

    // Colliders for the hop: active set minus the bound-passable ones.
    this.boundColliders.length = 0;
    for (let i = 0; i < this.colliders.length; i += 1) {
      const c = this.colliders[i];
      if (c && !this.boundPassable.has(c)) this.boundColliders.push(c);
    }

    this.state = 'bound';
    this.boundT = 0;
    this.boundCooldown = BOUND_COOLDOWN;
    this.avatar.setAction('leap');
    this.onDust?.(this.pos);
  }

  private updateBound(dt: number): void {
    this.boundT += dt;
    const k = Math.min(this.boundT / BOUND_TIME, 1);

    this.pos.x += this.boundVel.x * dt;
    this.pos.z += this.boundVel.y * dt;
    circleVsStatics(this.pos, this.avatar.collisionRadius, this.boundColliders);

    // Parabolic visual arc on the avatar root.
    this.avatar.root.position.y = BOUND_ARC_HEIGHT * 4 * k * (1 - k);
    this.motion.speed = BOUND_DIST / BOUND_TIME;
    this.velocity.set(this.boundVel.x, 0, this.boundVel.y);

    if (k >= 1) {
      // Land: full collision again (pushes out if the hop fell short).
      this.state = 'normal';
      this.avatar.root.position.y = 0;
      this.avatar.setAction('idle');
      circleVsStatics(this.pos, this.avatar.collisionRadius, this.colliders);
      this.velocity.multiplyScalar(0.35); // keep a little landing momentum
      this.onDust?.(this.pos);
      this.bus.emit('Footstep', this.getSurface());
    }
  }

  private updateKnockdown(dt: number, canAct: boolean): void {
    this.knockT += dt;
    this.motion.speed = 0;
    this.velocity.set(0, 0, 0);

    // Push phase: ~3 m shove, ease-out.
    if (this.knockT <= KNOCK_PUSH_TIME) {
      const k = this.knockT / KNOCK_PUSH_TIME;
      const speed = (KNOCK_PUSH_DIST / KNOCK_PUSH_TIME) * 2 * (1 - k); // ∫ = dist
      this.pos.x += this.knockDir.x * speed * dt;
      this.pos.z += this.knockDir.y * speed * dt;
      circleVsStatics(this.pos, this.avatar.collisionRadius, this.colliders);
      return;
    }

    // Trapped: mash E (3×) or the auto bail-out frees you regardless.
    if (canAct && this.input.justPressed('interact')) this.knockPresses += 1;
    if (
      this.knockPresses >= KNOCK_RECOVER_PRESSES ||
      this.knockT - KNOCK_PUSH_TIME >= KNOCK_AUTO_RECOVER_SEC
    ) {
      // Elastic snap-free (juice #14): a dust pop + a beat of stagger
      // before control returns, so escaping reads as effortful.
      this.state = 'normal';
      this.knockGrace = KNOCK_GRACE_SEC;
      this.controlLock = Math.max(this.controlLock, KNOCK_SNAP_LOCK_SEC);
      this.avatar.setAction('idle');
      this.onDust?.(this.pos);
      this.bus.emit('KnockdownRecovered');
    }
  }

  // ── helpers ──

  private inWindShadow(): boolean {
    for (let i = 0; i < this.windShadows.length; i += 1) {
      const shadow = this.windShadows[i];
      if (!shadow) continue;
      const dx = this.pos.x - shadow.center.x;
      const dz = this.pos.z - shadow.center.z;
      if (dx * dx + dz * dz <= shadow.radius * shadow.radius) return true;
    }
    return false;
  }
}
