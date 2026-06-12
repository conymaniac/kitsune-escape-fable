/**
 * Willow trees — the shore row and the hero Cursed Willow (M2 real art).
 *
 * Recipe (TECH_SPEC §3): noisy lathe trunk with bark-striation vertex
 * colors, 6–8 drooping CatmullRom branch tubes, hanging ribbon leaf
 * curtains (subdivided planes, two-tone cold green vertex gradient,
 * `aSwayWeight` = normalized distance from the attachment point — the
 * A-style sway shader consumes that exact attribute name).
 *
 * FINAL contract (unchanged from M1): `cuttableBranches` are the three
 * named `cuttable-0..2` meshes the finale cuts (cursed willow only — empty
 * for row willows) at the SAME local positions; `canopyCenter` is the
 * LOCAL-space canopy centre. Cuttable meshes keep userData.cuttable +
 * noMerge (mergeStatic re-parents the ORIGINALS, so questScript/vfx refs
 * stay valid).
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import {
  bake,
  mergeGeoms,
  noise2,
  noisyLathe,
  paintSwayWeight,
  paintVertexColors,
  taperedTube,
  tone,
  toneLerp,
} from '@/world/props/meshUtils';

export interface WillowOptions {
  /** The Cursed Willow: tallest, gets the 3 cuttable branch clusters. */
  cursed?: boolean;
  /** Total height in units (row ≈ 5.5, cursed ≈ 7). */
  height?: number;
}

export interface WillowBuild {
  group: THREE.Group;
  /** Named `cuttable-0..2` cluster meshes (cursed willow only). */
  cuttableBranches: THREE.Mesh[];
  /** LOCAL-space canopy centre (for lash-zone / VFX placement). */
  canopyCenter: THREE.Vector3;
}

const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/**
 * One hanging leaf ribbon: subdivided plane, gentle outward S-bend and
 * bottom taper, two-tone cold gradient, aSwayWeight 0 (top) → 1 (tip).
 * Local origin = attachment point, ribbon hangs down −Y, faces ±Z.
 */
function leafRibbon(
  width: number,
  hang: number,
  seed: number,
  cursed: boolean,
): THREE.BufferGeometry {
  const segs = 6;
  const g = new THREE.PlaneGeometry(width, hang, 1, segs);
  // plane spans y −hang/2..hang/2 — shift so the TOP edge is the origin
  g.translate(0, -hang / 2, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const t = -y / hang; // 0 top … 1 tip
    // outward S-bend + taper toward a ragged tip
    const bend = Math.sin(t * Math.PI) * width * 0.45 + t * t * width * 0.35;
    const taper = 1 - t * 0.55 + 0.12 * noise2(seed * 3.1, t * 7 + seed);
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) + bend);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  // two-tone cold gradient (base material = willowGreen): crown-lit top →
  // willowDeep shadowed tip; cursed willows pull colder/darker.
  paintVertexColors(g, (x, y, _z, out) => {
    const t = Math.min(-y / hang, 1);
    out.copy(toneLerp('willowGreen', 'willowGreen', 'willowDeep', t * 1.15));
    const j = 0.88 + 0.24 * noise2(x * 9 + seed, y * 5 - seed);
    out.multiplyScalar(cursed ? j * 0.88 : j);
    if (cursed) out.b *= 1.12; // spectral cold cast on the haunted tree
  });
  paintSwayWeight(g, (_x, y) => -y / hang);
  return g;
}

/** A short, thick wrapping branch cluster (the finale's E-cut targets). */
function makeCuttableCluster(
  kit: MaterialKit,
  index: number,
  towards: THREE.Vector3,
): THREE.Mesh {
  const geoms: THREE.BufferGeometry[] = [];
  const dir = towards.clone().setY(0).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);

  // 3 gnarled arcs that bow toward the ghost spot like grasping fingers
  for (let b = 0; b < 3; b += 1) {
    const o = (b - 1) * 0.34;
    const lift = 0.45 + 0.18 * noise2(index * 7 + b, b * 3.3);
    const pts = [
      v3(-dir.x * 0.55 + side.x * o, 0.65 + lift, -dir.z * 0.55 + side.z * o),
      v3(side.x * o * 1.3, 0.35 + lift * 0.6, side.z * o * 1.3),
      v3(dir.x * 0.5 + side.x * o * 0.8, 0.18, dir.z * 0.5 + side.z * o * 0.8),
      v3(dir.x * 0.85 + side.x * o * 0.4, 0.34, dir.z * 0.85 + side.z * o * 0.4),
    ];
    const tube = taperedTube(pts, 0.09 + 0.02 * (2 - b), 0.035, 7, 5);
    paintVertexColors(tube, (x, y, z, out) => {
      const j = 0.7 + 0.45 * noise2(x * 6 + index, y * 6 + z * 6 + b);
      out.copy(tone('willowDeep', 'woodDark')).multiplyScalar(j);
    });
    paintSwayWeight(tube, () => 0); // thick wood: the shader must not move it
    geoms.push(tube);
  }
  // leaf tangles hanging off the arcs
  for (let leaf = 0; leaf < 4; leaf += 1) {
    const a = (leaf / 4) * Math.PI * 2 + index;
    const ribbon = leafRibbon(0.3, 0.55 + 0.2 * noise2(leaf, index), index * 5 + leaf, true);
    bake(ribbon, Math.cos(a) * 0.45, 0.62, Math.sin(a) * 0.45, Math.PI / 2 - a);
    geoms.push(ribbon);
  }

  const mesh = new THREE.Mesh(
    mergeGeoms(geoms),
    kit.toon('willowGreen', { vertexColors: true, doubleSided: true }),
  );
  mesh.name = `cuttable-${index}`;
  mesh.userData['cuttable'] = true;
  mesh.userData['noMerge'] = true;
  return mesh;
}

export function buildWillow(kit: MaterialKit, options: WillowOptions = {}): WillowBuild {
  const cursed = options.cursed ?? false;
  const height = options.height ?? (cursed ? 7 : 5.5);
  const group = new THREE.Group();
  group.name = cursed ? 'willow-cursed' : 'willow';
  const seed = Math.round(height * 13) + (cursed ? 31 : 7);

  const barkMat = kit.toon('woodDark', { vertexColors: true });
  const leafMat = kit.toon('willowGreen', { vertexColors: true, doubleSided: true });

  // — trunk: noisy lathe, root flare, bark striations, tortured lean —
  const trunkH = height * 0.55;
  const baseR = cursed ? 0.52 : 0.36;
  const trunk = noisyLathe(
    trunkH,
    10,
    7,
    (t) => baseR * (1 - 0.52 * t) * (1 + 1.1 * Math.pow(1 - t, 7)),
    cursed ? 0.16 : 0.11,
    seed,
    cursed ? 0.09 : 0.02,
  );
  paintVertexColors(trunk, (x, y, z, out) => {
    const angle = Math.atan2(z, x);
    const stripe = 0.72 + 0.4 * noise2(angle * 2.2 + seed, y * 2.6); // bark striations
    const rootDark = 0.78 + 0.22 * Math.min(y / (trunkH * 0.4), 1);
    out.setRGB(stripe * rootDark, stripe * rootDark, stripe * rootDark * 1.05);
  });
  const trunkMesh = new THREE.Mesh(trunk, barkMat);
  group.add(trunkMesh);

  // — 6–8 drooping CatmullRom branch tubes from the trunk crown —
  const branchCount = cursed ? 8 : 6;
  const crownY = trunkH * 0.96;
  const reach = height * 0.42;
  const branchGeoms: THREE.BufferGeometry[] = [];
  const curtainGeoms: THREE.BufferGeometry[] = [];
  const tips: Array<[number, number, number]> = [];
  for (let b = 0; b < branchCount; b += 1) {
    const a = (b / branchCount) * Math.PI * 2 + noise2(b, seed) * 0.7;
    const n = noise2(b * 3.7, seed * 1.3);
    const r = reach * (0.8 + 0.4 * n);
    const peak = crownY + height * (0.16 + 0.1 * n);
    const droop = crownY - height * (0.1 + 0.16 * noise2(b, seed * 2.9));
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    const pts = [
      v3(cx * 0.1, crownY - 0.3, cz * 0.1),
      v3(cx * r * 0.4, peak, cz * r * 0.4),
      v3(cx * r * 0.85, peak - height * 0.06, cz * r * 0.85),
      v3(cx * r * 1.15, droop, cz * r * 1.15),
    ];
    const tube = taperedTube(pts, cursed ? 0.13 : 0.1, 0.03, 8, 5);
    paintVertexColors(tube, (x, y, z, out) => {
      const j = 0.7 + 0.42 * noise2(x * 4 + b, y * 4 + z * 2 + seed);
      out.setRGB(j, j, j * 1.04);
    });
    branchGeoms.push(tube);
    tips.push([cx * r * 1.15, droop, cz * r * 1.15]);

    // curtains along the outer half of each branch
    for (let c = 0; c < 3; c += 1) {
      const t = 0.55 + c * 0.225;
      const px = cx * r * (0.4 + 0.75 * (t - 0.4));
      const pz = cz * r * (0.4 + 0.75 * (t - 0.4));
      const py = peak - (peak - droop) * Math.pow(Math.max(t - 0.4, 0) / 0.6, 1.6);
      const hang = height * (0.34 + 0.18 * noise2(b * 5 + c, seed)) * (0.7 + t * 0.45);
      const ribbon = leafRibbon(0.4 + 0.14 * noise2(c, b), hang, seed + b * 9 + c, cursed);
      bake(ribbon, px, py, pz, Math.PI / 2 - a + (noise2(b, c) - 0.5) * 0.6);
      curtainGeoms.push(ribbon);
    }
  }
  group.add(new THREE.Mesh(mergeGeoms(branchGeoms), barkMat));

  // — inner crown veil (short ribbons close to the trunk fill the core) —
  const canopyY = height * 0.7;
  for (let c = 0; c < branchCount + 4; c += 1) {
    const a = (c / (branchCount + 4)) * Math.PI * 2 + 0.4;
    const rr = reach * 0.45;
    const ribbon = leafRibbon(0.5, height * 0.3, seed * 3 + c, cursed);
    bake(ribbon, Math.cos(a) * rr, crownY + height * 0.12, Math.sin(a) * rr, Math.PI / 2 - a);
    curtainGeoms.push(ribbon);
  }
  // The leaf-curtain canopy is an OCCLUDER (M4 gameplay/occluderFade.ts —
  // DESIGN §4 fade to ~15 %): tagged + noMerge so it keeps mesh identity
  // through mergeStatic and can be faded per willow. The bark skeleton
  // stays opaque — a faded canopy reads as an ink outline of branches.
  const canopy = new THREE.Mesh(mergeGeoms(curtainGeoms), leafMat);
  canopy.name = cursed ? 'willow-canopy-cursed' : 'willow-canopy';
  canopy.userData['occluder'] = true;
  canopy.userData['noMerge'] = true;
  group.add(canopy);

  // — cuttable branch clusters (the finale's three E-cuts) —
  const cuttableBranches: THREE.Mesh[] = [];
  if (cursed) {
    // Same FINAL local positions as M1; ghost spot local ≈ (+1.3, −0.7).
    const ghostLocal = v3(1.3, 0, -0.7);
    const clusters: Array<[number, number, number]> = [
      [1.0, 0.5, -1.5],
      [2.1, 0.55, -0.7],
      [1.3, 0.5, 0.4],
    ];
    for (let i = 0; i < clusters.length; i += 1) {
      const c = clusters[i];
      if (!c) continue;
      const towards = ghostLocal.clone().sub(v3(c[0], 0, c[2]));
      const cluster = makeCuttableCluster(kit, i, towards);
      cluster.position.set(c[0], c[1], c[2]);
      group.add(cluster);
      cuttableBranches.push(cluster);
    }
  }

  return { group, cuttableBranches, canopyCenter: new THREE.Vector3(0, canopyY, 0) };
}
