/**
 * IsoCamera — TECH_SPEC §1/§2 (STREAM D).
 *
 * OrthographicCamera, azimuth 45° / elevation 30°, fixed view direction
 * (0.6124, 0.5, 0.6124), distance 60, near 0.1 / far 200. Frustum from
 * viewHeight (exterior 14, interior 9) with a tweened setViewHeight.
 * Exponential follow (1 − exp(−dt·6)), velocity look-ahead (0.15 s of
 * velocity), world-bounds soft clamp (bounds minus the half-frustum:
 * marginX = vh/2·aspect, marginZ = vh/2 — the clamped point feeds the
 * exponential follow, so the camera eases into the limit), translation
 * shake(amp, durSec) and a punch-zoom impulse for the transform burst.
 *
 * The view direction never changes, so the rotation is computed once and
 * per-frame work is position + frustum only. No per-frame allocations.
 */
import * as THREE from 'three';

/** Fixed iso view direction (camera sits at target + dir·dist). */
export const CAM_DIR = new THREE.Vector3(0.6124, 0.5, 0.6124);
export const CAM_DIST = 60;
export const VIEW_HEIGHT_EXTERIOR = 14;
export const VIEW_HEIGHT_INTERIOR = 9;

const FOLLOW_RATE = 6;
const LOOK_AHEAD_SEC = 0.15;

export interface CameraBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export class IsoCamera {
  readonly camera: THREE.OrthographicCamera;

  private aspect: number;
  private viewHeight = VIEW_HEIGHT_EXTERIOR;
  /** viewHeight tween state. */
  private vhFrom = VIEW_HEIGHT_EXTERIOR;
  private vhTo = VIEW_HEIGHT_EXTERIOR;
  private vhT = 1;
  private vhDur = 0;

  private bounds: CameraBounds | null = null;

  /** Smoothed follow point on the ground plane. */
  private readonly followPos = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();

  // shake
  private shakeAmp = 0;
  private shakeDur = 0;
  private shakeT = Number.POSITIVE_INFINITY;
  private readonly shakeOffset = new THREE.Vector3();

  // punch-zoom (frustum scale impulse, eases back to 1)
  private punchAmount = 0;
  private punchDur = 0.2;
  private punchT = Number.POSITIVE_INFINITY;

  constructor(aspect: number) {
    this.aspect = aspect;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    // Rotation is fixed forever: aim once, then only translate.
    this.camera.position.copy(CAM_DIR).multiplyScalar(CAM_DIST);
    this.camera.lookAt(0, 0, 0);
    this.applyFrustum(1);
    this.applyPosition();
  }

  // ── configuration ──

  resize(aspect: number): void {
    this.aspect = aspect;
    this.applyFrustum(this.currentPunchScale());
  }

  /** Tween the frustum height (exterior 14 ↔ interior 9). */
  setViewHeight(h: number, tweenSec = 0): void {
    if (tweenSec <= 0) {
      this.viewHeight = h;
      this.vhFrom = h;
      this.vhTo = h;
      this.vhT = 1;
      this.applyFrustum(this.currentPunchScale());
      return;
    }
    this.vhFrom = this.viewHeight;
    this.vhTo = h;
    this.vhT = 0;
    this.vhDur = tweenSec;
  }

  /** Soft world-bounds clamp; null disables clamping. */
  setBounds(bounds: CameraBounds | null): void {
    this.bounds = bounds;
  }

  /** Translation shake (knockdown thump, shutter slam). */
  shake(amp: number, durSec: number): void {
    this.shakeAmp = amp;
    this.shakeDur = Math.max(durSec, 0.01);
    this.shakeT = 0;
  }

  /** Brief punch-zoom (transform burst: punch(0.02) = 2 % zoom-in). */
  punch(amount = 0.02, durSec = 0.2): void {
    this.punchAmount = amount;
    this.punchDur = Math.max(durSec, 0.01);
    this.punchT = 0;
  }

  /** Hard-snap the follow point (scene swaps, spawn). */
  snapTo(target: THREE.Vector3): void {
    this.desired.copy(target);
    this.clampDesired();
    this.followPos.copy(this.desired);
    this.applyPosition();
  }

  // ── per-frame ──

  /**
   * Follow `target` (+ velocity look-ahead when given). Call once per
   * frame after gameplay, before render.
   */
  update(dt: number, target: THREE.Vector3, velocity: THREE.Vector3 | null): void {
    // viewHeight tween
    if (this.vhT < 1) {
      this.vhT = Math.min(1, this.vhT + dt / this.vhDur);
      const e = this.vhT * this.vhT * (3 - 2 * this.vhT); // smoothstep
      this.viewHeight = this.vhFrom + (this.vhTo - this.vhFrom) * e;
    }

    // punch envelope
    let punchScale = 1;
    if (this.punchT < this.punchDur) {
      this.punchT += dt;
      punchScale = this.currentPunchScale();
    }
    this.applyFrustum(punchScale);

    // exponential follow toward the (clamped) look-ahead point
    this.desired.copy(target);
    if (velocity) this.desired.addScaledVector(velocity, LOOK_AHEAD_SEC);
    this.clampDesired();
    const k = Math.min(Math.max(1 - Math.exp(-dt * FOLLOW_RATE), 0), 1);
    this.followPos.lerp(this.desired, k);

    // shake (decaying random translation in the camera plane)
    if (this.shakeT < this.shakeDur) {
      this.shakeT += dt;
      const decay = 1 - this.shakeT / this.shakeDur;
      const a = this.shakeAmp * decay * decay;
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * a,
        (Math.random() - 0.5) * 1.2 * a,
        (Math.random() - 0.5) * 2 * a,
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    this.applyPosition();
  }

  /**
   * Project a world point to normalized screen coords (0..1, origin
   * top-left) — the ui/screens.ts projector contract. Writes into `out`.
   */
  projectToScreen(world: THREE.Vector3, out: { x: number; y: number }): { x: number; y: number } {
    this.projTmp.copy(world).project(this.camera);
    out.x = (this.projTmp.x + 1) / 2;
    out.y = (1 - this.projTmp.y) / 2;
    return out;
  }

  private readonly projTmp = new THREE.Vector3();

  // ── internals ──

  private currentPunchScale(): number {
    if (this.punchT >= this.punchDur) return 1;
    const k = this.punchT / this.punchDur;
    // fast in (first 25 %), ease out — zoom IN means a smaller frustum
    const env = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
    return 1 - this.punchAmount * env;
  }

  private applyFrustum(scale: number): void {
    const halfH = (this.viewHeight / 2) * scale;
    const halfW = halfH * this.aspect;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.updateProjectionMatrix();
  }

  private clampDesired(): void {
    const b = this.bounds;
    if (!b) return;
    const marginZ = this.viewHeight / 2;
    const marginX = marginZ * this.aspect;
    const minX = b.minX + marginX;
    const maxX = b.maxX - marginX;
    const minZ = b.minZ + marginZ;
    const maxZ = b.maxZ - marginZ;
    // Inverted range (bounds smaller than the frustum) → lock to centre.
    this.desired.x = minX > maxX ? (b.minX + b.maxX) / 2 : Math.min(Math.max(this.desired.x, minX), maxX);
    this.desired.z = minZ > maxZ ? (b.minZ + b.maxZ) / 2 : Math.min(Math.max(this.desired.z, minZ), maxZ);
  }

  private applyPosition(): void {
    this.camera.position
      .copy(this.followPos)
      .addScaledVector(CAM_DIR, CAM_DIST)
      .add(this.shakeOffset);
  }
}
