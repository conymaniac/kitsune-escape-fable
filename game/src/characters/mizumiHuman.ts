/**
 * Mizumi — human form. STREAM C, M2 real art inside the FINAL rig.
 *
 * Group tree (names FINAL — M2 swapped only the meshes inside):
 *   mizumiHuman
 *   └─ body            (bob / pitch / roll)
 *      ├─ torso        (pivot at hips; breathe scale on torsoMesh)
 *      │   ├─ head     (pivot at neck)
 *      │   ├─ armL / armR   (pivot at shoulder, geometry hangs −Y)
 *      ├─ skirt
 *      │   ├─ skirtF / skirtB / skirtL / skirtR  (panels pivot at hip ring)
 *      ├─ legL / legR  (pivot at hip, geometry hangs −Y)
 *
 * Look (DESIGN mood): teenage girl, slightly big-head stylization, dark
 * indigo-black bob + low twin-tails, short deep-indigo kimono top with a
 * vermillion obi and cream collar/cuffs, bare legs + wooden sandals, the
 * kitsune mask worn OFF-face on the side of her head (vermillion-marked
 * white — the visible accent that F swaps to the fox). One vertex-colored
 * toon material; per-group parts are fused into single meshes so the whole
 * rig stays at 10 draw calls (+10 ink hulls).
 *
 * Anim: idle breathe (0.4 Hz torso scale + head drift), walk (arm/leg
 * counter-rotate, |sin| bob 0.06, 4 skirt panels lag with inertia springs),
 * cut (0.5 s arm arc), pickup (crouch lerp), brace (kneel), knockdown.
 */
import * as THREE from 'three';
import type { CharacterAction, MaterialKit, MotionState } from '@/core/types';
import { col, colMix, fuse, lathe, mulFor, paint, paintFlat, warp, xf } from './geo';
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

    // One vertex-colored toon material for the whole build; every color is
    // a per-vertex multiplier against the paperBone base (see geo.ts).
    const cloth = kit.toon('paperBone', { vertexColors: true });

    const INDIGO = mulFor(colMix('nightIndigo', 'nightHorizon', 0.4), 'paperBone');
    const VERM = mulFor(col('vermillion'), 'paperBone');
    const SKIN = mulFor(colMix('paperBone', 'paperAged', 0.55), 'paperBone');
    const HAIR = mulFor(colMix('inkBlack', 'nightHorizon', 0.24), 'paperBone');
    const WOOD = mulFor(col('woodWarm'), 'paperBone');
    const CREAM = new THREE.Color(1, 1, 1);

    this.body = namedGroup('body', this.root, 0, BODY_Y, 0);

    // — torso: short indigo kimono top + cream collar V + vermillion obi —
    // (parts baked relative to the mesh origin at torso-local y 0.26 so the
    // breathe scale and ink hull stay centered on the chest)
    this.torso = namedGroup('torso', this.body);
    const kimonoTop = paintFlat(
      lathe(
        [
          [0.155, -0.21], // hem, flares over the obi/skirt
          [0.122, -0.07], // waist
          [0.148, 0.1], // chest
          [0.115, 0.2], // shoulders
          [0.05, 0.245], // neck
          [0.004, 0.26], // closed top (the iso camera looks down)
        ],
        7,
      ),
      INDIGO,
    );
    const collarGeo = (side: 1 | -1): THREE.BufferGeometry =>
      // short crossed bands at the neckline — kimono collar V, not straps
      xf(paintFlat(new THREE.BoxGeometry(0.034, 0.1, 0.016), CREAM), {
        x: side * 0.042,
        y: 0.178,
        z: 0.132,
        ry: side * 0.35,
        rz: -side * 0.6,
      });
    const obi = xf(paintFlat(new THREE.BoxGeometry(0.275, 0.105, 0.27), VERM), { y: -0.04 });
    const knot = xf(paintFlat(new THREE.BoxGeometry(0.082, 0.068, 0.045), VERM), {
      y: -0.035,
      z: -0.138,
    });
    this.torsoMesh = meshIn(
      this.torso,
      fuse(kimonoTop, collarGeo(1), collarGeo(-1), obi, knot),
      cloth,
      0,
      0.26,
      0,
      'torsoMesh',
    );

    // — head (pivot at neck): skull + bob + low twin-tails + the off-face
    //   kitsune mask on the right side of her head —
    this.head = namedGroup('head', this.torso, 0, 0.5, 0);
    const skull = xf(paintFlat(new THREE.SphereGeometry(0.145, 7, 4), SKIN), {
      z: 0.012,
      sx: 0.92,
      sz: 0.94,
    });
    const bob = xf(paintFlat(new THREE.SphereGeometry(0.16, 7, 5), HAIR), {
      y: 0.05,
      z: -0.042,
      sx: 1.06,
      sy: 1.02,
      sz: 1.04,
    });
    const flapGeo = (side: 1 | -1): THREE.BufferGeometry =>
      xf(paintFlat(new THREE.BoxGeometry(0.05, 0.17, 0.105), HAIR), {
        x: side * 0.13,
        y: -0.025,
        z: -0.005,
        rz: side * -0.08,
      });
    const twinTail = (side: 1 | -1): THREE.BufferGeometry =>
      // hangs near-vertical behind the shoulders — reads as low tails, not wings
      xf(paintFlat(new THREE.ConeGeometry(0.045, 0.32, 5), HAIR), {
        x: side * 0.125,
        y: -0.18,
        z: -0.1,
        rx: Math.PI - 0.18,
        rz: side * 0.15,
      });
    // Kitsune mask: white plate, vermillion brow band + ear tips.
    const maskPlate = xf(
      paint(new THREE.ConeGeometry(0.085, 0.05, 7), (p, _n, c) =>
        c.copy(p.x < -0.045 ? VERM : CREAM),
      ),
      { x: 0.158, y: 0.05, z: -0.035, ry: -0.6, rz: -Math.PI / 2, sx: 1.28, sz: 0.92 },
    );
    const maskEar = (off: number): THREE.BufferGeometry =>
      xf(
        paint(new THREE.ConeGeometry(0.025, 0.055, 4), (p, _n, c) =>
          c.copy(p.y > 0.005 ? VERM : CREAM),
        ),
        { x: 0.175, y: 0.158, z: off - 0.05, rz: -0.35 },
      );
    const headMesh = meshIn(
      this.head,
      fuse(skull, bob, flapGeo(1), flapGeo(-1), twinTail(1), twinTail(-1), maskPlate, maskEar(0.06), maskEar(-0.02)),
      cloth,
      0,
      0.1,
      0,
      'headMesh',
    );

    // — arms (pivot at shoulders, hang −Y) — "L" = +X side —
    // Kimono sleeve flaring to a cream cuff, skin hand peeking below.
    this.armL = limbPivot('armL', this.torso, 0.17, 0.42, 0);
    this.armR = limbPivot('armR', this.torso, -0.17, 0.42, 0);
    const armGeo = (): THREE.BufferGeometry =>
      // cuff cream lives on the bottom CAP only (normal test) — painting the
      // bottom ring would gradient-wash the whole 1-segment sleeve side.
      fuse(
        paint(new THREE.CylinderGeometry(0.048, 0.09, 0.34, 6), (_p, n, c) =>
          c.copy(n.y < -0.9 ? CREAM : INDIGO),
        ),
        xf(paintFlat(new THREE.SphereGeometry(0.042, 4, 3), SKIN), { y: -0.235, z: 0.012 }),
      );
    const armLMesh = meshIn(this.armL, armGeo(), cloth, 0, -0.17, 0, 'armLMesh');
    const armRMesh = meshIn(this.armR, armGeo(), cloth, 0, -0.17, 0, 'armRMesh');

    // — skirt: 4 kimono panels pivoting at the hip ring, hanging −Y —
    // Flared trapezoid sheets, indigo with a cream under-robe hem stripe.
    const makePanel = (width: number, axis: 'x' | 'z'): THREE.BufferGeometry => {
      // knee-length so the bare legs read ("ran away from home at night")
      const g = new THREE.BoxGeometry(
        axis === 'x' ? width : 0.022,
        0.42,
        axis === 'x' ? 0.022 : width,
        1,
        2,
        1,
      );
      warp(g, (p) => {
        if (Math.abs(p.y) < 0.01) p.y = -0.145; // thin hem band
        const flare = 1 + (0.21 - p.y) * 0.6;
        if (axis === 'x') p.x *= flare;
        else p.z *= flare;
      });
      return paint(g, (p, _n, c) => c.copy(p.y < -0.17 ? CREAM : INDIGO));
    };
    const skirt = namedGroup('skirt', this.body);
    this.skirtF = limbPivot('skirtF', skirt, 0, 0.02, 0.105);
    this.skirtB = limbPivot('skirtB', skirt, 0, 0.02, -0.105);
    this.skirtL = limbPivot('skirtL', skirt, 0.115, 0.02, 0);
    this.skirtR = limbPivot('skirtR', skirt, -0.115, 0.02, 0);
    const skirtFMesh = meshIn(this.skirtF, makePanel(0.3, 'x'), cloth, 0, -0.21, 0, 'skirtFMesh');
    const skirtBMesh = meshIn(this.skirtB, makePanel(0.3, 'x'), cloth, 0, -0.21, 0, 'skirtBMesh');
    const skirtLMesh = meshIn(this.skirtL, makePanel(0.27, 'z'), cloth, 0, -0.21, 0, 'skirtLMesh');
    const skirtRMesh = meshIn(this.skirtR, makePanel(0.27, 'z'), cloth, 0, -0.21, 0, 'skirtRMesh');

    // — legs (pivot at hips, hang −Y): bare skin + wooden sandals —
    this.legL = limbPivot('legL', this.body, 0.07, 0, 0);
    this.legR = limbPivot('legR', this.body, -0.07, 0, 0);
    const legGeo = (): THREE.BufferGeometry =>
      fuse(
        paintFlat(new THREE.CylinderGeometry(0.045, 0.058, 0.62, 6, 1, true), SKIN),
        xf(paintFlat(new THREE.BoxGeometry(0.085, 0.03, 0.165), WOOD), { y: -0.315, z: 0.02 }),
      );
    const legLMesh = meshIn(this.legL, legGeo(), cloth, 0, -0.31, 0, 'legLMesh');
    const legRMesh = meshIn(this.legR, legGeo(), cloth, 0, -0.31, 0, 'legRMesh');

    // Ink hulls (characters only) — scales tuned per part size so thin
    // limbs still read a ~4-6 mm outline without halo gaps.
    addInkHull(this.torsoMesh, kit, 1.035);
    addInkHull(headMesh, kit, 1.03);
    addInkHull(armLMesh, kit, 1.07);
    addInkHull(armRMesh, kit, 1.07);
    addInkHull(legLMesh, kit, 1.06);
    addInkHull(legRMesh, kit, 1.06);
    for (const m of [skirtFMesh, skirtBMesh, skirtLMesh, skirtRMesh]) addInkHull(m, kit, 1.05);
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
        // Wider M2 kimono sleeves need a touch more splay to clear the obi.
        out.armLZ = 0.12;
        out.armRZ = -0.12;
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
