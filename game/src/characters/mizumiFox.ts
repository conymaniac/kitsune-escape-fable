/**
 * Mizumi — fox form. STREAM C, M1 placeholder geometry, FINAL rig + anim.
 *
 * Group tree (names FINAL — M2 swaps only the meshes inside):
 *   mizumiFox
 *   └─ body                 (bob / pitch / roll; pivot at chest height)
 *      ├─ head              (pivot at neck; counterphase bob)
 *      │   ├─ earL / earR   (pivot at ear base; random flick layer)
 *      ├─ legFL / legFR / legBL / legBR  (pivot at shoulder/hip, hang −Y)
 *      └─ tail0 ─ tail1 ─ tail2          (chained pivots, extend −Z)
 *
 * Anim: trot (diagonal leg pairs, spine/head bob counterphase), 3-seg tail
 * follow-through `rot[i] = sin(t*2 − i*0.6) * amp`, random ear-flick timer,
 * leap (tucked), sit (spirit-sense pose), knockdown.
 */
import * as THREE from 'three';
import type { CharacterAction, MaterialKit, MotionState } from '@/core/types';
import {
  CharacterBase,
  addInkHull,
  limbPivot,
  meshIn,
  mixPose,
  namedGroup,
  smoothstep01,
  zeroPose,
} from './rig';

const CHANNELS = [
  'rootY',
  'bodyPitch',
  'bodyRoll',
  'headPitch',
  'headYaw',
  'headY',
  'earPerk',
  'legFLX',
  'legFRX',
  'legBLX',
  'legBRX',
  'tailLift',
  'tailWag',
] as const;

type Channel = (typeof CHANNELS)[number];
type FoxPose = Record<Channel, number>;

function newPose(): FoxPose {
  const p = {} as FoxPose;
  zeroPose(CHANNELS, p);
  return p;
}

/** Chest height of the body group. */
const BODY_Y = 0.3;
/** Head pivot local height inside body. */
const HEAD_Y = 0.1;
const TAIL_SEGMENTS = 3;

export class MizumiFox extends CharacterBase {
  private readonly body: THREE.Group;
  private readonly head: THREE.Group;
  private readonly earL: THREE.Group;
  private readonly earR: THREE.Group;
  private readonly legFL: THREE.Group;
  private readonly legFR: THREE.Group;
  private readonly legBL: THREE.Group;
  private readonly legBR: THREE.Group;
  private readonly tail: THREE.Group[] = [];

  // Random ear-flick layer.
  private nextFlickAt = 2;
  private flickT = 1; // ≥1 means no flick in progress
  private flickLeft = true;

  private readonly poseA = newPose();
  private readonly poseB = newPose();
  private readonly pose = newPose();

  constructor(kit: MaterialKit) {
    super('mizumiFox', { stride: 4.6, crossfadeSec: 0.14, headingRate: 16, speedRef: 5.0 });

    const coat = kit.toon('foxOrange');
    const cream = kit.toon('foxCream');
    const dark = kit.toon('inkCharcoal');

    this.body = namedGroup('body', this.root, 0, BODY_Y, 0);

    // — body —
    const bodyMesh = meshIn(this.body, new THREE.SphereGeometry(0.17, 12, 10), coat, 0, 0, -0.02, 'bodyMesh');
    bodyMesh.scale.set(1, 0.95, 1.9);
    const chestMesh = meshIn(this.body, new THREE.SphereGeometry(0.1, 10, 8), cream, 0, -0.03, 0.22, 'chestMesh');

    // — head (pivot at neck) —
    this.head = namedGroup('head', this.body, 0, HEAD_Y, 0.3);
    const headMesh = meshIn(this.head, new THREE.SphereGeometry(0.115, 12, 10), coat, 0, 0.02, 0, 'headMesh');
    const muzzle = meshIn(this.head, new THREE.ConeGeometry(0.05, 0.13, 8), cream, 0, -0.01, 0.14, 'muzzle');
    muzzle.rotation.x = Math.PI / 2;

    // — ears (pivot at base; cones point up) —
    const earGeo = new THREE.ConeGeometry(0.038, 0.11, 6);
    this.earL = limbPivot('earL', this.head, 0.065, 0.1, 0.0);
    this.earR = limbPivot('earR', this.head, -0.065, 0.1, 0.0);
    const earLMesh = meshIn(this.earL, earGeo, coat, 0, 0.05, 0, 'earLMesh');
    const earRMesh = meshIn(this.earR, earGeo, coat, 0, 0.05, 0, 'earRMesh');

    // — legs (pivot at shoulder/hip, hang −Y) — "L" = +X side —
    const legGeo = new THREE.CylinderGeometry(0.026, 0.032, 0.27, 7);
    this.legFL = limbPivot('legFL', this.body, 0.08, -0.05, 0.19);
    this.legFR = limbPivot('legFR', this.body, -0.08, -0.05, 0.19);
    this.legBL = limbPivot('legBL', this.body, 0.08, -0.05, -0.17);
    this.legBR = limbPivot('legBR', this.body, -0.08, -0.05, -0.17);
    const legMeshes: THREE.Mesh[] = [];
    for (const leg of [this.legFL, this.legFR, this.legBL, this.legBR]) {
      legMeshes.push(meshIn(leg, legGeo, dark, 0, -0.125, 0, `${leg.name}Mesh`));
    }

    // — tail: 3 chained segments extending −Z, follow-through layer —
    const tailMeshes: THREE.Mesh[] = [];
    let tailParent: THREE.Object3D = this.body;
    for (let i = 0; i < TAIL_SEGMENTS; i++) {
      const seg = limbPivot(`tail${i}`, tailParent, 0, i === 0 ? 0.06 : 0.015, i === 0 ? -0.3 : -0.16);
      const segMesh = meshIn(
        seg,
        new THREE.CylinderGeometry(0.052 - i * 0.012, 0.06 - i * 0.012, 0.16, 7),
        i === TAIL_SEGMENTS - 1 ? cream : coat,
        0,
        0,
        -0.08,
        `tail${i}Mesh`,
      );
      segMesh.rotation.x = -Math.PI / 2;
      tailMeshes.push(segMesh);
      this.tail.push(seg);
      tailParent = seg;
    }

    // Ink hulls (characters only).
    for (const m of [bodyMesh, chestMesh, headMesh, muzzle, earLMesh, earRMesh, ...legMeshes, ...tailMeshes]) {
      addInkHull(m, kit);
    }
  }

  protected override animate(dt: number, _motion: MotionState): void {
    this.evalPose(this.prevAction, this.prevActionTime, this.poseA);
    this.evalPose(this.action, this.actionTime, this.poseB);
    mixPose(CHANNELS, this.poseA, this.poseB, this.actionBlend, this.pose);
    const p = this.pose;
    const m = this.moveBlend;

    // Spine bob — head bobs in counterphase (|cos| vs |sin|).
    this.body.position.y = BODY_Y + p.rootY + Math.abs(Math.sin(this.phase)) * 0.045 * m;
    this.body.rotation.x = p.bodyPitch;
    this.body.rotation.z = p.bodyRoll;
    this.head.position.y = HEAD_Y + p.headY - Math.abs(Math.cos(this.phase)) * 0.025 * m;
    this.head.rotation.x = p.headPitch;
    this.head.rotation.y = p.headYaw;

    this.legFL.rotation.x = p.legFLX;
    this.legFR.rotation.x = p.legFRX;
    this.legBL.rotation.x = p.legBLX;
    this.legBR.rotation.x = p.legBRX;

    // — ears: perk pose + random flick layer —
    if (this.time >= this.nextFlickAt && this.flickT >= 1) {
      this.flickT = 0;
      this.flickLeft = Math.random() < 0.5;
      this.nextFlickAt = this.time + 2 + Math.random() * 3;
    }
    let flickL = 0;
    let flickR = 0;
    if (this.flickT < 1) {
      this.flickT = Math.min(1, this.flickT + dt / 0.18);
      const f = Math.sin(this.flickT * Math.PI) * 0.55;
      if (this.flickLeft) flickL = f;
      else flickR = -f;
    }
    const earBack = -0.18 * p.earPerk; // perk tips forward, flat folds back
    const earSplay = 0.55 * Math.max(0, -p.earPerk); // knockdown splays out
    this.earL.rotation.x = earBack;
    this.earR.rotation.x = earBack;
    this.earL.rotation.z = flickL + earSplay;
    this.earR.rotation.z = flickR - earSplay;

    // — 3-seg tail follow-through: rot[i] = sin(t*2 − i*0.6) * amp —
    const amp = 0.18 + m * 0.32;
    for (let i = 0; i < this.tail.length; i++) {
      const seg = this.tail[i];
      if (!seg) continue;
      seg.rotation.y = Math.sin(this.time * 2 - i * 0.6) * amp + p.tailWag * (1 + i * 0.4);
      seg.rotation.x = p.tailLift * (i === 0 ? 1 : 0.45) + Math.sin(this.time * 1.3 - i * 0.6) * 0.06;
    }
  }

  /** Pure pose evaluation per action — the crossfade lerps two of these. */
  private evalPose(action: CharacterAction, t: number, out: FoxPose): void {
    zeroPose(CHANNELS, out);

    switch (action) {
      case 'idle':
      case 'walk':
      case 'none':
      // Fox has no cut/pickup — fall back to locomotion so the avatar
      // never poses wrong if gameplay forwards a human-only action.
      case 'cut':
      case 'pickup': {
        // Trot: diagonal pairs (FL+BR vs FR+BL).
        const m = this.moveBlend;
        const diag = Math.sin(this.phase);
        out.legFLX = diag * 0.7 * m;
        out.legBRX = diag * 0.7 * m;
        out.legFRX = -diag * 0.7 * m;
        out.legBLX = -diag * 0.7 * m;
        out.rootY = Math.sin(this.time * Math.PI * 2 * 0.5) * 0.008 * (1 - m); // idle breathe
        out.headYaw = Math.sin(this.time * 0.5) * 0.12 * (1 - m);
        out.headPitch = Math.sin(this.time * 0.37) * 0.05 * (1 - m);
        out.bodyPitch = -0.04 * m; // nose slightly down into the run
        out.earPerk = 0.4;
        break;
      }

      case 'leap': {
        // Tucked mid-air pose (Bound arc position comes from gameplay).
        const r = smoothstep01(t / 0.12);
        out.legFLX = 1.25 * r;
        out.legFRX = 1.25 * r;
        out.legBLX = -1.25 * r;
        out.legBRX = -1.25 * r;
        out.bodyPitch = -0.28 * r;
        out.tailLift = 0.5 * r;
        out.earPerk = -0.3;
        out.headPitch = -0.15 * r;
        break;
      }

      case 'sit':
      case 'brace': {
        // Spirit-sense sit: haunches down, chest up, ears pricked.
        const r = smoothstep01(t / 0.3);
        out.rootY = -0.1 * r;
        out.bodyPitch = -0.5 * r;
        out.legBLX = -1.25 * r;
        out.legBRX = -1.25 * r;
        out.legFLX = 0.5 * r; // keep front paws planted under pitched chest
        out.legFRX = 0.5 * r;
        out.headPitch = 0.32 * r; // counter the body pitch, nose level-up
        out.earPerk = 1;
        out.tailLift = 0.35 * r;
        out.tailWag = 0.5 * r; // tail curled aside
        break;
      }

      case 'knockdown': {
        // Tumbled on her side, ears flat, small struggle wiggle.
        const r = smoothstep01(t / 0.25);
        const wiggle = Math.sin(t * 16) * 0.05 * r;
        out.rootY = -0.16 * r;
        out.bodyRoll = 1.5 * r + wiggle;
        out.bodyPitch = 0.1 * r;
        out.legFLX = -0.6 * r;
        out.legFRX = 0.5 * r;
        out.legBLX = 0.6 * r;
        out.legBRX = -0.45 * r;
        out.earPerk = -1;
        out.headPitch = 0.2 * r;
        break;
      }
    }
  }
}
