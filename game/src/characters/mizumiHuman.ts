/**
 * Mizumi — human form. STREAM C, M1 placeholder geometry, FINAL rig + anim.
 *
 * Group tree (names FINAL — M2 swaps only the meshes inside):
 *   mizumiHuman
 *   └─ body            (bob / pitch / roll)
 *      ├─ torso        (pivot at hips; breathe scale on torsoMesh)
 *      │   ├─ head     (pivot at neck)
 *      │   ├─ armL / armR   (pivot at shoulder, geometry hangs −Y)
 *      ├─ skirt
 *      │   ├─ skirtF / skirtB / skirtL / skirtR  (panels pivot at hip ring)
 *      ├─ legL / legR  (pivot at hip, geometry hangs −Y)
 *
 * Anim: idle breathe (0.4 Hz torso scale + head drift), walk (arm/leg
 * counter-rotate, |sin| bob 0.06, 4 skirt panels lag with inertia springs),
 * cut (0.5 s arm arc), pickup (crouch lerp), brace (kneel), knockdown.
 */
import * as THREE from 'three';
import type { CharacterAction, MaterialKit, MotionState } from '@/core/types';
import {
  AngleSpring,
  CharacterBase,
  addInkHull,
  clamp01,
  lerp,
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
  'torsoPitch',
  'breathe',
  'headPitch',
  'headYaw',
  'armLX',
  'armRX',
  'armLZ',
  'armRZ',
  'legLX',
  'legRX',
] as const;

type Channel = (typeof CHANNELS)[number];
type HumanPose = Record<Channel, number>;

function newPose(): HumanPose {
  const p = {} as HumanPose;
  zeroPose(CHANNELS, p);
  return p;
}

/** Hip height of the body group (bob is applied on top of this). */
const BODY_Y = 0.66;
const CUT_DURATION = 0.5;
const PICKUP_DURATION = 0.7;

export class MizumiHuman extends CharacterBase {
  private readonly body: THREE.Group;
  private readonly torso: THREE.Group;
  private readonly torsoMesh: THREE.Mesh;
  private readonly head: THREE.Group;
  private readonly armL: THREE.Group;
  private readonly armR: THREE.Group;
  private readonly legL: THREE.Group;
  private readonly legR: THREE.Group;
  private readonly skirtF: THREE.Group;
  private readonly skirtB: THREE.Group;
  private readonly skirtL: THREE.Group;
  private readonly skirtR: THREE.Group;

  // Skirt panel inertia springs (lag layer on top of the pose mix).
  private readonly springF = new AngleSpring(90, 9);
  private readonly springB = new AngleSpring(90, 9);
  private readonly springL = new AngleSpring(90, 9);
  private readonly springR = new AngleSpring(90, 9);

  private readonly poseA = newPose();
  private readonly poseB = newPose();
  private readonly pose = newPose();

  constructor(kit: MaterialKit) {
    super('mizumiHuman', { stride: 3.8, crossfadeSec: 0.16, headingRate: 14, speedRef: 3.2 });

    const kimono = kit.toon('vermillion');
    const trim = kit.toon('paperBone');
    const skin = kit.toon('paperBone');
    const hair = kit.toon('inkCharcoal');

    this.body = namedGroup('body', this.root, 0, BODY_Y, 0);

    // — torso —
    this.torso = namedGroup('torso', this.body);
    this.torsoMesh = meshIn(
      this.torso,
      new THREE.CylinderGeometry(0.115, 0.15, 0.44, 10),
      kimono,
      0,
      0.24,
      0,
      'torsoMesh',
    );
    meshIn(this.torso, new THREE.BoxGeometry(0.28, 0.09, 0.21), trim, 0, 0.2, 0, 'obi');

    // — head (pivot at neck) —
    this.head = namedGroup('head', this.torso, 0, 0.5, 0);
    const headMesh = meshIn(this.head, new THREE.SphereGeometry(0.155, 12, 10), skin, 0, 0.1, 0, 'headMesh');
    const hairMesh = meshIn(this.head, new THREE.SphereGeometry(0.165, 12, 10), hair, 0, 0.145, -0.035, 'hairMesh');
    hairMesh.scale.set(1, 1.02, 1);

    // — arms (pivot at shoulders, hang −Y) — "L" = +X side —
    this.armL = limbPivot('armL', this.torso, 0.17, 0.42, 0);
    this.armR = limbPivot('armR', this.torso, -0.17, 0.42, 0);
    const armGeo = new THREE.CylinderGeometry(0.042, 0.052, 0.42, 8);
    const handGeo = new THREE.SphereGeometry(0.042, 8, 6);
    const armLMesh = meshIn(this.armL, armGeo, kimono, 0, -0.21, 0, 'armLMesh');
    const armRMesh = meshIn(this.armR, armGeo, kimono, 0, -0.21, 0, 'armRMesh');
    meshIn(this.armL, handGeo, skin, 0, -0.44, 0, 'handL');
    meshIn(this.armR, handGeo, skin, 0, -0.44, 0, 'handR');

    // — skirt: 4 panels pivoting at the hip ring, hanging −Y —
    const skirt = namedGroup('skirt', this.body);
    const panelFB = new THREE.BoxGeometry(0.27, 0.5, 0.02);
    const panelLR = new THREE.BoxGeometry(0.02, 0.5, 0.23);
    this.skirtF = limbPivot('skirtF', skirt, 0, 0.02, 0.105);
    this.skirtB = limbPivot('skirtB', skirt, 0, 0.02, -0.105);
    this.skirtL = limbPivot('skirtL', skirt, 0.115, 0.02, 0);
    this.skirtR = limbPivot('skirtR', skirt, -0.115, 0.02, 0);
    const skirtFMesh = meshIn(this.skirtF, panelFB, kimono, 0, -0.25, 0, 'skirtFMesh');
    const skirtBMesh = meshIn(this.skirtB, panelFB, kimono, 0, -0.25, 0, 'skirtBMesh');
    const skirtLMesh = meshIn(this.skirtL, panelLR, kimono, 0, -0.25, 0, 'skirtLMesh');
    const skirtRMesh = meshIn(this.skirtR, panelLR, kimono, 0, -0.25, 0, 'skirtRMesh');

    // — legs (pivot at hips, hang −Y) —
    this.legL = limbPivot('legL', this.body, 0.07, 0, 0);
    this.legR = limbPivot('legR', this.body, -0.07, 0, 0);
    const legGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.62, 8);
    const legLMesh = meshIn(this.legL, legGeo, trim, 0, -0.31, 0, 'legLMesh');
    const legRMesh = meshIn(this.legR, legGeo, trim, 0, -0.31, 0, 'legRMesh');

    // Ink hulls (characters only).
    for (const m of [
      this.torsoMesh,
      headMesh,
      hairMesh,
      armLMesh,
      armRMesh,
      legLMesh,
      legRMesh,
      skirtFMesh,
      skirtBMesh,
      skirtLMesh,
      skirtRMesh,
    ]) {
      addInkHull(m, kit);
    }
  }

  protected override oneShotDuration(action: CharacterAction): number | undefined {
    if (action === 'cut') return CUT_DURATION;
    if (action === 'pickup') return PICKUP_DURATION;
    return undefined;
  }

  protected override animate(dt: number, _motion: MotionState): void {
    this.evalPose(this.prevAction, this.prevActionTime, this.poseA);
    this.evalPose(this.action, this.actionTime, this.poseB);
    mixPose(CHANNELS, this.poseA, this.poseB, this.actionBlend, this.pose);
    const p = this.pose;

    this.body.position.y = BODY_Y + p.rootY;
    this.body.rotation.x = p.bodyPitch;
    this.body.rotation.z = p.bodyRoll;

    this.torso.rotation.x = p.torsoPitch;
    const b = 1 + p.breathe;
    this.torsoMesh.scale.set(b, 1 + p.breathe * 0.5, b);

    this.head.rotation.x = p.headPitch;
    this.head.rotation.y = p.headYaw;

    this.armL.rotation.x = p.armLX;
    this.armR.rotation.x = p.armRX;
    this.armL.rotation.z = p.armLZ;
    this.armR.rotation.z = p.armRZ;
    this.legL.rotation.x = p.legLX;
    this.legR.rotation.x = p.legRX;

    // — skirt panels: inertia springs lag behind legs / crouch flare —
    const m = this.moveBlend;
    const kick = Math.abs(Math.sin(this.phase)) * m;
    const flare = Math.max(0, -p.rootY) * 0.9; // crouching pushes panels out
    this.skirtF.rotation.x = this.springF.update(-(0.1 * m + kick * 0.3 + flare), dt);
    this.skirtB.rotation.x = this.springB.update(0.16 * m + kick * 0.26 + flare, dt);
    this.skirtL.rotation.z = this.springL.update(0.06 * m + kick * 0.18 + flare * 0.8 + p.bodyRoll * 0.5, dt);
    this.skirtR.rotation.z = this.springR.update(-(0.06 * m + kick * 0.18 + flare * 0.8) + p.bodyRoll * 0.5, dt);
  }

  /** Pure pose evaluation per action — the crossfade lerps two of these. */
  private evalPose(action: CharacterAction, t: number, out: HumanPose): void {
    zeroPose(CHANNELS, out);
    const breatheIdle = Math.sin(this.time * Math.PI * 2 * 0.4) * 0.02;

    switch (action) {
      case 'idle':
      case 'walk':
      case 'none': {
        // Locomotion is driven by moveBlend regardless of idle/walk label.
        const m = this.moveBlend;
        const swing = Math.sin(this.phase);
        out.breathe = breatheIdle * (1 - m * 0.6);
        out.headYaw = Math.sin(this.time * 0.6) * 0.05 * (1 - m);
        out.headPitch = Math.sin(this.time * 0.43) * 0.03 * (1 - m);
        out.armLX = -swing * 0.55 * m;
        out.armRX = swing * 0.55 * m;
        out.armLZ = 0.07;
        out.armRZ = -0.07;
        out.legLX = swing * 0.6 * m;
        out.legRX = -swing * 0.6 * m;
        out.rootY = Math.abs(Math.sin(this.phase)) * 0.06 * m;
        out.torsoPitch = 0.06 * m;
        break;
      }

      case 'cut': {
        // 0.5 s dagger arc: raise up-behind → slash down-forward → settle.
        const k = clamp01(t / CUT_DURATION);
        let arm: number;
        let torso: number;
        if (k < 0.35) {
          const e = smoothstep01(k / 0.35);
          arm = lerp(0, 2.4, e);
          torso = lerp(0, -0.12, e);
        } else if (k < 0.6) {
          const e = smoothstep01((k - 0.35) / 0.25);
          arm = lerp(2.4, -0.95, e);
          torso = lerp(-0.12, 0.32, e);
        } else {
          const e = smoothstep01((k - 0.6) / 0.4);
          arm = lerp(-0.95, -0.45, e);
          torso = lerp(0.32, 0.18, e);
        }
        out.armRX = arm;
        out.armRZ = -0.25;
        out.armLX = -0.3;
        out.armLZ = 0.2;
        out.torsoPitch = torso;
        out.headPitch = 0.15;
        out.legLX = -0.35;
        out.legRX = 0.25;
        out.rootY = -0.04;
        break;
      }

      case 'pickup': {
        // Crouch lerp down and back up.
        const dip = Math.sin(clamp01(t / PICKUP_DURATION) * Math.PI);
        out.rootY = -0.26 * dip;
        out.torsoPitch = 0.75 * dip;
        out.headPitch = 0.35 * dip;
        out.armLX = -1.1 * dip;
        out.armRX = -1.1 * dip;
        out.legLX = 0.9 * dip;
        out.legRX = 0.9 * dip;
        break;
      }

      case 'brace': {
        // Kneel against the gust — held until the action changes.
        const r = smoothstep01(t / 0.25);
        out.rootY = -0.32 * r;
        out.torsoPitch = 0.4 * r;
        out.headPitch = 0.35 * r;
        out.legLX = 1.3 * r;
        out.legRX = 0.45 * r;
        out.armLX = -1.2 * r;
        out.armRX = -1.2 * r;
        out.armLZ = 0.45 * r;
        out.armRZ = -0.45 * r;
        out.breathe = breatheIdle * 0.5;
        break;
      }

      case 'knockdown': {
        // Tumbled on her side, tangled — small struggle wiggle.
        const r = smoothstep01(t / 0.3);
        const wiggle = Math.sin(t * 14) * 0.04 * r;
        out.rootY = -0.48 * r;
        out.bodyRoll = 1.45 * r + wiggle;
        out.bodyPitch = 0.25 * r;
        out.armLX = -0.8 * r;
        out.armRX = 0.6 * r;
        out.legLX = 0.55 * r;
        out.legRX = -0.3 * r;
        out.headPitch = 0.3 * r;
        break;
      }

      case 'leap': {
        // Rarely used in human form — small tucked hop pose.
        out.legLX = 1.0;
        out.legRX = 1.0;
        out.armLX = -0.6;
        out.armRX = -0.6;
        out.torsoPitch = 0.2;
        break;
      }

      case 'sit': {
        // Seiza kneel.
        const r = smoothstep01(t / 0.35);
        out.rootY = -0.4 * r;
        out.legLX = 1.4 * r;
        out.legRX = 1.4 * r;
        out.armLX = -0.5 * r;
        out.armRX = -0.5 * r;
        out.headPitch = 0.1 * r;
        out.breathe = breatheIdle;
        break;
      }
    }
  }
}
