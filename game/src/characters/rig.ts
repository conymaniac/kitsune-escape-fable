/**
 * Segmented-rig helpers — STREAM C.
 *
 * The rig STRUCTURE here is FINAL: named Group trees, pivot conventions and
 * all animation code survive into M2 — M2 only swaps the primitive geometry
 * living inside the named groups.
 *
 * Conventions (binding for every character):
 * - Model space faces +Z; `root.rotation.y = heading` (heading 0 = +Z, per
 *   MotionState contract).
 * - Limb pivot groups sit AT the joint (shoulder / hip / tail base / ear
 *   base); geometry hangs along −Y (or extends −Z for tails).
 * - For a −Y-hanging limb, `rotation.x < 0` swings it forward (+Z),
 *   `rotation.x > 0` backward (−Z); `rotation.z` splays it sideways.
 * - Walk phase accumulates with DISTANCE, not time:
 *   `phase += speed * dt * stride` — footstep events sync for free.
 */
import * as THREE from 'three';
import type { CharacterAction, ICharacter, MaterialKit, MotionState } from '@/core/types';

// ───────────────────────────────────────────────────────── math utils ──

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Hermite ease on a clamped 0..1 input. */
export function smoothstep01(t: number): number {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
}

/** Frame-rate-independent exponential smoothing factor (0..1). */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

/** Shortest signed angular delta from `from` to `to` (radians, −π..π). */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ─────────────────────────────────────────────────────── group builders ──

/** Create a named Group at a local position, attached to `parent`. */
export function namedGroup(
  name: string,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Limb pivot convention helper — identical to namedGroup but documents
 * intent: the group origin IS the joint; geometry hangs −Y (or −Z) inside.
 */
export function limbPivot(
  name: string,
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
): THREE.Group {
  return namedGroup(name, parent, x, y, z);
}

/** Build a mesh, position it, name it, attach it. The M2 swap point. */
export function meshIn(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  name?: string,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  if (name) m.name = name;
  parent.add(m);
  return m;
}

/**
 * Inverted-hull ink outline: adds a backface-rendered clone of the mesh,
 * scaled 1.02, using kit.ink(). Characters only (TECH_SPEC pillar 6).
 * M1: visually crude is fine; M2 polishes per-mesh hull scales.
 */
export function addInkHull(mesh: THREE.Mesh, kit: MaterialKit, scale = 1.02): THREE.Mesh {
  const hull = new THREE.Mesh(mesh.geometry, kit.ink());
  hull.name = `${mesh.name || 'mesh'}.inkHull`;
  hull.scale.setScalar(scale);
  mesh.add(hull);
  return hull;
}

// ──────────────────────────────────────────────────────────── pose mix ──

/**
 * Lerp every channel of two numeric pose records into `out`.
 * Pass a cached `keys` array — no per-frame allocations in update paths.
 */
export function mixPose<K extends string>(
  keys: readonly K[],
  a: Readonly<Record<K, number>>,
  b: Readonly<Record<K, number>>,
  t: number,
  out: Record<K, number>,
): void {
  for (const k of keys) out[k] = a[k] + (b[k] - a[k]) * t;
}

/** Zero every channel of a pose record. */
export function zeroPose<K extends string>(keys: readonly K[], out: Record<K, number>): void {
  for (const k of keys) out[k] = 0;
}

// ─────────────────────────────────────────────────────── inertia spring ──

/** Tiny critically-damp-ish angle spring for lagging cloth/tail layers. */
export class AngleSpring {
  value = 0;
  private vel = 0;

  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}

  update(target: number, dt: number): number {
    this.vel += (target - this.value) * this.stiffness * dt;
    this.vel *= Math.exp(-this.damping * dt);
    this.value += this.vel * dt;
    return this.value;
  }

  reset(v = 0): void {
    this.value = v;
    this.vel = 0;
  }
}

// ─────────────────────────────────────────────────────── character base ──

export interface CharacterTuning {
  /** Phase radians advanced per metre travelled (gait frequency). */
  stride: number;
  /** Seconds for the action-pose crossfade (0..1 blend scalar). */
  crossfadeSec: number;
  /** Exponential smoothing rate for facing/heading rotation. */
  headingRate: number;
  /** Speed (m/s) at which the locomotion blend saturates to 1. */
  speedRef: number;
}

/**
 * Abstract ICharacter base — phase accumulator, action crossfade scalar,
 * heading smoothing. Subclasses build their Group tree in the constructor
 * and implement `animate()` (called once per update, after bookkeeping).
 */
export abstract class CharacterBase implements ICharacter {
  readonly root: THREE.Group;

  /** Distance-driven gait phase (radians). */
  protected phase = 0;
  /** Total accumulated time (s). */
  protected time = 0;
  /** Smoothed facing (radians around +Y, 0 = +Z). */
  protected heading = 0;
  /** Smoothed 0..1 locomotion weight derived from motion.speed. */
  protected moveBlend = 0;

  protected action: CharacterAction = 'idle';
  protected prevAction: CharacterAction = 'idle';
  /** Seconds since the current action started. */
  protected actionTime = 0;
  /** Seconds since the previous action started (keeps fading pose alive). */
  protected prevActionTime = 0;
  /** Raw 0..1 crossfade scalar; use `actionBlend` for the eased value. */
  private blendRaw = 1;

  protected constructor(
    name: string,
    protected readonly tuning: CharacterTuning,
  ) {
    this.root = new THREE.Group();
    this.root.name = name;
  }

  // ── ICharacter ──

  setAction(action: CharacterAction): void {
    if (action === this.action) return;
    this.prevAction = this.action;
    this.prevActionTime = this.actionTime;
    this.action = action;
    this.actionTime = 0;
    this.blendRaw = 0;
    this.onActionChanged(action);
  }

  update(dt: number, motion: MotionState): void {
    this.time += dt;
    this.actionTime += dt;
    this.prevActionTime += dt;

    // Distance-driven phase accumulator.
    this.phase += motion.speed * dt * this.tuning.stride;

    // Action crossfade scalar.
    if (this.blendRaw < 1) {
      this.blendRaw = Math.min(1, this.blendRaw + dt / this.tuning.crossfadeSec);
    }

    // Facing/heading rotation smoothing (only while actually moving).
    if (motion.speed > 0.05) {
      this.heading += angleDelta(this.heading, motion.heading) * damp(this.tuning.headingRate, dt);
    }
    this.root.rotation.y = this.heading;

    // Locomotion weight.
    const targetMove = clamp01(motion.speed / this.tuning.speedRef);
    this.moveBlend += (targetMove - this.moveBlend) * damp(12, dt);

    // One-shot actions (cut, pickup…) auto-revert to idle when done.
    const oneShot = this.oneShotDuration(this.action);
    if (oneShot !== undefined && this.actionTime >= oneShot) this.setAction('idle');

    this.animate(dt, motion);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    // Materials come from the cached MaterialKit — never disposed here.
  }

  // ── shared state accessors ──

  getAction(): CharacterAction {
    return this.action;
  }

  /** Hard-set facing (spawn / cutscene placement / form-swap sync). */
  setHeading(heading: number): void {
    this.heading = heading;
    this.root.rotation.y = heading;
  }

  getHeading(): number {
    return this.heading;
  }

  /** Eased 0..1 crossfade weight: 0 = prevAction pose, 1 = current pose. */
  protected get actionBlend(): number {
    return smoothstep01(this.blendRaw);
  }

  /** Return a duration to make an action one-shot (auto-revert to idle). */
  protected oneShotDuration(_action: CharacterAction): number | undefined {
    return undefined;
  }

  /** Optional subclass hook fired on every action change. */
  protected onActionChanged(_action: CharacterAction): void {}

  /** Per-frame pose work. Bookkeeping above is already done. */
  protected abstract animate(dt: number, motion: MotionState): void;
}
