/**
 * Mizumi — fox form. STREAM C, M2 real art inside the FINAL rig.
 *
 * Group tree (names FINAL — M2 swapped only the meshes inside):
 *   mizumiFox
 *   └─ body                 (bob / pitch / roll; pivot at chest height)
 *      ├─ head              (pivot at neck; counterphase bob)
 *      │   ├─ earL / earR   (pivot at ear base; random flick layer)
 *      ├─ legFL / legFR / legBL / legBR  (pivot at shoulder/hip, hang −Y)
 *      └─ tail0 ─ tail1 ─ tail2          (chained pivots, extend −Z)
 *
 * Look (DESIGN mood): slender elegant kitsune — vermillion-orange coat,
 * cream chest/belly, spectral-white face markings, dark sock legs and ear
 * tips, one brush tail (thin base → thick belly → tapering white tip).
 * Base toon key is smokeWhite so the white markings carry a faint spectral
 * blue — every other tone is a vertex-color multiplier (see geo.ts).
 *
 * Anim: trot (diagonal leg pairs, spine/head bob counterphase), 3-seg tail
 * follow-through `rot[i] = sin(t*2 − i*0.6) * amp`, random ear-flick timer,
 * leap (tucked), sit (spirit-sense pose), knockdown.
 */
import * as THREE from 'three';
import type { CharacterAction, MaterialKit, MotionState } from '@/core/types';
import { col, fuse, mulFor, paint, paintFlat, xf } from './geo';
import {
  CharacterBase,
  addInkHull,
  clamp01,
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

    // One vertex-colored toon material; smokeWhite base so the white face
    // markings keep a faint spectral blue (multipliers can only darken).
    const pelt = kit.toon('smokeWhite', { vertexColors: true });

    const ORANGE = mulFor(col('foxOrange'), 'smokeWhite');
    const CREAM = mulFor(col('foxCream'), 'smokeWhite');
    const DARK = mulFor(col('inkCharcoal'), 'smokeWhite');
    const WHITE = new THREE.Color(1, 1, 1);

    this.body = namedGroup('body', this.root, 0, BODY_Y, 0);

    // — body: slender trunk, orange back melting to a cream belly, plus a
    //   cream chest ruff — fused into one mesh —
    const trunk = xf(
      paint(new THREE.SphereGeometry(0.17, 8, 5), (_p, n, c) => {
        const belly = clamp01((-n.y - 0.12) / 0.5);
        c.copy(ORANGE).lerp(CREAM, belly);
      }),
      { sx: 0.75, sy: 0.82, sz: 1.95 },
    );
    const ruff = xf(paintFlat(new THREE.SphereGeometry(0.095, 6, 4), CREAM), {
      y: -0.005,
      z: 0.23,
      sx: 0.85,
      sy: 1.05,
      sz: 0.75,
    });
    const bodyMesh = meshIn(this.body, fuse(trunk, ruff), pelt, 0, 0, -0.02, 'bodyMesh');

    // — head (pivot at neck): slim wedge skull + muzzle, white mask-marking
    //   hints painted on (cheeks/jaw white, nose tip dark) —
    this.head = namedGroup('head', this.body, 0, HEAD_Y, 0.3);
    const skull = xf(
      paint(new THREE.SphereGeometry(0.1, 7, 4), (p, _n, c) => {
        const cheek = p.y < 0.008 && p.z > 0.02 ? 1 : 0;
        const brow = p.y > 0.055 && p.z > 0.03 ? 0.55 : 0;
        c.copy(ORANGE).lerp(WHITE, Math.max(cheek, brow));
      }),
      { sx: 0.85, sy: 0.88, sz: 0.98 },
    );
    const muzzle = xf(
      paint(new THREE.ConeGeometry(0.045, 0.15, 6), (p, _n, c) => {
        if (p.y > 0.06) c.copy(DARK); // nose tip
        else if (p.z > 0.008) c.copy(WHITE); // white jaw (post-rotation underside)
        else c.copy(ORANGE);
      }),
      { y: -0.028, z: 0.105, rx: Math.PI / 2 },
    );
    const headMesh = meshIn(this.head, fuse(skull, muzzle), pelt, 0, 0.02, 0.01, 'headMesh');

    // — ears (pivot at base): BIG flattened blades, dark backs/tips —
    this.earL = limbPivot('earL', this.head, 0.065, 0.1, 0.0);
    this.earR = limbPivot('earR', this.head, -0.065, 0.1, 0.0);
    const earGeo = (): THREE.BufferGeometry =>
      xf(
        paint(new THREE.ConeGeometry(0.055, 0.17, 4), (p, _n, c) =>
          c.copy(ORANGE).lerp(DARK, clamp01((p.y + 0.01) / 0.07)),
        ),
        { sz: 0.5 },
      );
    const earLMesh = meshIn(this.earL, earGeo(), pelt, 0, 0.07, -0.005, 'earLMesh');
    const earRMesh = meshIn(this.earR, earGeo(), pelt, 0, 0.07, -0.005, 'earRMesh');

    // — legs (pivot at shoulder/hip, hang −Y): slender, dark socks —
    this.legFL = limbPivot('legFL', this.body, 0.08, -0.05, 0.19);
    this.legFR = limbPivot('legFR', this.body, -0.08, -0.05, 0.19);
    this.legBL = limbPivot('legBL', this.body, 0.08, -0.05, -0.17);
    this.legBR = limbPivot('legBR', this.body, -0.08, -0.05, -0.17);
    const legMeshes: THREE.Mesh[] = [];
    for (const leg of [this.legFL, this.legFR, this.legBL, this.legBR]) {
      const g = paint(new THREE.CylinderGeometry(0.021, 0.029, 0.27, 5), (p, _n, c) =>
        c.copy(ORANGE).lerp(DARK, clamp01((-p.y - 0.01) / 0.05)),
      );
      legMeshes.push(meshIn(leg, g, pelt, 0, -0.125, 0, `${leg.name}Mesh`));
    }

    // — tail: 3 chained segments extending −Z; brush silhouette —
    //   thin base → thick belly → tapering spectral-white tip.
    // Segments are long ellipsoids overlapping ~50 % so the union reads as
    // ONE brush (thin root → fat belly → tapering white tip), while the
    // chained pivots still give the follow-through whip.
    const tailMeshes: THREE.Mesh[] = [];
    const SEG_SCALE: ReadonlyArray<readonly [number, number, number, number]> = [
      [0.06, 0.82, 0.82, 1.7], // r, sx, sy, sz — root
      [0.085, 1, 1, 1.5], // brush belly (swallows the root's tail half)
      [0.068, 0.85, 0.85, 1.8], // tapering tip rooted inside the belly
    ];
    const SEG_PIVOT: ReadonlyArray<readonly [number, number]> = [
      [0.06, -0.28],
      [0.005, -0.13],
      [0, -0.13],
    ];
    let tailParent: THREE.Object3D = this.body;
    for (let i = 0; i < TAIL_SEGMENTS; i++) {
      const [py, pz] = SEG_PIVOT[i] ?? [0, -0.16];
      const seg = limbPivot(`tail${i}`, tailParent, 0, py, pz);
      const [r, sx, sy, sz] = SEG_SCALE[i] ?? [0.05, 1, 1, 1.5];
      const tipBlend = i === TAIL_SEGMENTS - 1;
      const g = xf(
        paint(new THREE.SphereGeometry(r, 6, 4), (p, n, c) => {
          if (tipBlend) c.copy(ORANGE).lerp(WHITE, clamp01((-p.z + 0.005) / 0.06));
          else c.copy(ORANGE).lerp(CREAM, clamp01((-n.y - 0.3) / 0.5) * 0.55);
        }),
        { sx, sy, sz },
      );
      const segMesh = meshIn(seg, g, pelt, 0, 0, -0.1, `tail${i}Mesh`);
      tailMeshes.push(segMesh);
      this.tail.push(seg);
      tailParent = seg;
    }

    // Ink hulls (characters only) — thin parts get larger hull scales.
    addInkHull(bodyMesh, kit, 1.035);
    addInkHull(headMesh, kit, 1.05);
    addInkHull(earLMesh, kit, 1.08);
    addInkHull(earRMesh, kit, 1.08);
    for (const m of legMeshes) addInkHull(m, kit, 1.14);
    for (const m of tailMeshes) addInkHull(m, kit, 1.06);
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
