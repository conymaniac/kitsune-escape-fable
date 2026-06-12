/**
 * Interior props — M2 real art. The room must feel abandoned-but-once-
 * loved: every prop whispers the ending (design pillar 3).
 *
 * Recipes (TECH_SPEC §1): tatami = beveled two-tone mats, alternating
 * weave direction, dark cloth heri borders · low dining table w/ two
 * moldy plates (desaturated sickly accents) · unmade futon w/ a subtle
 * dark stain (grief archaeology, not gore) · scattered paper sheets =
 * slightly bent thin planes, cream w/ faint ink-line vertex stripes ·
 * kitchen counter + openable drawer + the dagger (dark sheath, pale
 * handle wrap) · sandals pair at the door rail · genkan sliding door ·
 * floor lantern (andon) · a small shrine shelf (the once-loved part).
 *
 * CONTRACT (FROZEN since M1): every exported signature, the papers array,
 * the drawer/dagger handles and setDrawerOpen mechanism are unchanged —
 * geometry internals only. makeShrineNook is a new ADDITIVE export.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import {
  bake,
  faceted,
  jitterRadial,
  mergeGeoms,
  noise2,
  paintVertexColors,
  smoothNoise2,
  tone,
  toneLerp,
} from '@/world/props/meshUtils';
import { seededRandom } from '@/world/props/vegetation';

/** Faceted box — uniform attribute layout for the merge buckets. */
function fbox(w: number, h: number, d: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  return faceted(new THREE.BoxGeometry(w, h, d, sx, sy, sz));
}

/** Warm furniture grain (one hand with the cottage's engawa wood). */
function paintGrain(
  g: THREE.BufferGeometry,
  seed: number,
  axis: 'x' | 'z' = 'x',
): THREE.BufferGeometry {
  return paintVertexColors(g, (x, y, z, out) => {
    const along = axis === 'x' ? x : z;
    const across = axis === 'x' ? z : x;
    const grain =
      0.68 + 0.28 * noise2(across * 7 + seed, along * 1.9) + 0.14 * noise2(along * 11, y * 6 + seed);
    out.setRGB(grain, grain * 0.99, grain * 1.04);
  });
}

// ───────────────────────────────────────────────────── low table ──

export function makeLowTable(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'low-table';
  const woodGeoms: THREE.BufferGeometry[] = [];

  // top: worn grain, edges rubbed dark, one pale ring stain (a cup once)
  const top = fbox(1.4, 0.07, 1.2, 10, 1, 8);
  paintVertexColors(top, (x, y, z, out) => {
    const grain = 0.7 + 0.26 * noise2(z * 7 + 3, x * 1.9) + 0.12 * noise2(x * 11, z * 9);
    out.setRGB(grain, grain * 0.99, grain * 1.04);
    if (Math.abs(x) > 0.6 || Math.abs(z) > 0.5) out.multiplyScalar(0.8); // rubbed edge
    const ring = Math.abs(Math.hypot(x + 0.42, z - 0.3) - 0.09);
    if (y > 0.02 && ring < 0.02) out.multiplyScalar(1.18); // pale ring stain
    if (y > 0.02 && noise2(x * 5, z * 5) > 0.86) out.multiplyScalar(0.85); // dings
  });
  bake(top, 0, 0.32, 0);
  woodGeoms.push(top);
  // skirt rails + slightly splayed legs
  for (const [w, d, zz] of [[1.24, 0.05, -0.5], [1.24, 0.05, 0.5]] as Array<[number, number, number]>) {
    const rail = fbox(w, 0.07, d);
    paintGrain(rail, zz * 7);
    bake(rail, 0, 0.26, zz);
    woodGeoms.push(rail);
  }
  for (const [lx, lz] of [[-0.58, -0.48], [0.58, -0.48], [-0.58, 0.48], [0.58, 0.48]] as Array<[number, number]>) {
    const leg = fbox(0.09, 0.31, 0.09);
    paintGrain(leg, lx * 5 + lz);
    bake(leg, lx, 0.15, lz, 0, 0, -lx * 0.06);
    woodGeoms.push(leg);
  }
  group.add(new THREE.Mesh(mergeGeoms(woodGeoms), kit.toon('woodWarm', { vertexColors: true })));

  // — two plates with moldy remains (optional Dialog 2 prop) —
  const plateGeoms: THREE.BufferGeometry[] = [];
  const moldGeoms: THREE.BufferGeometry[] = [];
  for (const [px, pz, s] of [[-0.3, 0.1, 1], [0.35, -0.2, 2]] as Array<[number, number, number]>) {
    const plate = faceted(new THREE.CylinderGeometry(0.17, 0.13, 0.04, 10));
    paintVertexColors(plate, (x, y, z, out) => {
      const j = 0.84 + 0.2 * noise2(x * 8 + s, z * 8);
      out.setRGB(j, j, j * 0.97); // bone ceramic
      const r = Math.hypot(x, z);
      if (y > 0.01 && r < 0.12) out.lerp(tone('paperBone', 'earthDark'), 0.3); // dried residue
      if (Math.abs(r - 0.155) < 0.02) out.multiplyScalar(0.88); // rim line
    });
    bake(plate, px, 0.375, pz);
    plateGeoms.push(plate);
    // mold: sickly desaturated lumps, slightly off-centre
    const mold = faceted(jitterRadial(new THREE.IcosahedronGeometry(0.07, 1), 0.3, s * 7));
    mold.scale(1.2, 0.5, 1);
    paintVertexColors(mold, (x, y, z, out) => {
      const j = 0.6 + 0.3 * noise2(x * 14 + s, z * 14);
      out.setRGB(j * 0.96, j, j * 0.9); // grey-green, drained
      if (y > 0.02 && noise2(x * 22, z * 22 + s) > 0.7) out.multiplyScalar(1.35); // pale fuzz spots
    });
    bake(mold, px + 0.025, 0.41, pz - 0.02, s);
    moldGeoms.push(mold);
  }
  group.add(new THREE.Mesh(mergeGeoms(plateGeoms), kit.toon('paperBone', { vertexColors: true })));
  group.add(new THREE.Mesh(mergeGeoms(moldGeoms), kit.toon('willowDeep', { vertexColors: true })));

  // fallen chopsticks beside the near plate
  const stickGeoms: THREE.BufferGeometry[] = [];
  for (const [ox, oa] of [[0, 0.18], [0.035, 0.34]] as Array<[number, number]>) {
    const stick = fbox(0.22, 0.012, 0.012);
    paintGrain(stick, ox * 31);
    bake(stick, -0.28 + ox, 0.365, 0.32, oa);
    stickGeoms.push(stick);
  }
  group.add(new THREE.Mesh(mergeGeoms(stickGeoms), kit.toon('woodDark', { vertexColors: true })));
  return { group };
}

// ───────────────────────────────────────────────────────── futon ──

export function makeFuton(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'futon';

  // base mattress: rumpled top, quilt channels, the subtle dark stain
  const base = fbox(1.1, 0.15, 2.0, 7, 1, 12);
  {
    const pos = base.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 0.05) {
        // rumple + a body-shaped hollow that never sprang back
        const hollow = Math.exp(-((x * x) / 0.16 + ((z + 0.25) * (z + 0.25)) / 0.5)) * 0.045;
        pos.setY(i, y + smoothNoise2(x * 3.1, z * 2.2) * 0.05 - hollow);
      }
    }
    pos.needsUpdate = true;
    base.computeVertexNormals();
  }
  paintVertexColors(base, (x, y, z, out) => {
    const weave = 0.78 + 0.18 * noise2(x * 9, z * 13) + 0.1 * noise2(z * 23, x * 17);
    out.setRGB(weave, weave * 0.99, weave * 0.96);
    if (y > 0.05) {
      // quilt channel shadow lines across
      if (Math.abs(((z + 10) % 0.45) - 0.225) > 0.19) out.multiplyScalar(0.86);
      // THE stain — subtle dark patch, low contrast, reads on a second look
      const d = Math.hypot((x - 0.16) / 0.24, (z - 0.42) / 0.34);
      if (d < 1) out.lerp(tone('paperAged', 'earthDark'), 0.38 * (1 - d) * (1 - d) + 0.08);
    } else {
      out.multiplyScalar(0.8); // shadowed sides
    }
    if (noise2(x * 4 + 9, z * 4) > 0.82) out.multiplyScalar(0.9); // grime patches
  });
  bake(base, 0, 0.075, 0);
  const baseMesh = new THREE.Mesh(base, kit.toon('paperAged', { vertexColors: true }));
  group.add(baseMesh);

  // thrown-back blanket: half slid off, woven stripe rows
  const blanketGeoms: THREE.BufferGeometry[] = [];
  const blanket = fbox(1.04, 0.1, 0.86, 6, 1, 5);
  {
    const pos = blanket.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 0.03) pos.setY(i, y + smoothNoise2(x * 4.5 + 7, z * 3.5) * 0.06);
    }
    pos.needsUpdate = true;
    blanket.computeVertexNormals();
  }
  const paintBlanket = (g: THREE.BufferGeometry): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const row = Math.floor((z + 10) / 0.14) % 2;
      const j = (0.72 + 0.16 * row + 0.14 * noise2(x * 8, z * 8)) * (y > 0.03 ? 1 : 0.78);
      out.setRGB(j, j * 0.97, j * 0.92); // dyed cloth, warm-dark
      if (noise2(x * 3 + 4, z * 3) > 0.84) out.multiplyScalar(0.88);
    });
  paintBlanket(blanket);
  bake(blanket, 0.12, 0.16, 0.62, 0.14);
  blanketGeoms.push(blanket);
  // folded-over corner
  const fold = fbox(0.5, 0.09, 0.4, 3, 1, 3);
  paintBlanket(fold);
  bake(fold, -0.18, 0.24, 0.38, -0.4);
  blanketGeoms.push(fold);
  group.add(new THREE.Mesh(mergeGeoms(blanketGeoms), kit.toon('earthBrown', { vertexColors: true })));

  // buckwheat pillow, knocked askew
  const pillow = fbox(0.42, 0.1, 0.26, 3, 1, 2);
  paintVertexColors(pillow, (x, y, z, out) => {
    const j = 0.82 + 0.2 * noise2(x * 12, z * 12);
    out.setRGB(j, j * 0.99, j * 0.95);
    if (Math.abs(x) > 0.17) out.multiplyScalar(0.82); // cinched ends
    if (y < 0) out.multiplyScalar(0.85);
  });
  bake(pillow, 0.08, 0.05, -0.8, -0.24);
  group.add(new THREE.Mesh(pillow, kit.toon('paperAged', { vertexColors: true })));
  return { group };
}

// ──────────────────────────────────────────────── scattered papers ──

/** Scattered diary papers — individual thin planes for the M4 flutter sim. */
export function makePapers(
  kit: MaterialKit,
  count = 6,
  seed = 41,
): { group: THREE.Group; papers: THREE.Mesh[] } {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  group.name = 'papers';
  const mat = kit.toon('paperBone', { vertexColors: true, doubleSided: true });
  const papers: THREE.Mesh[] = [];
  for (let i = 0; i < count; i += 1) {
    // slightly bent sheet: gentle roll + one lifted corner
    const g = faceted(new THREE.PlaneGeometry(0.3, 0.42, 3, 8));
    const pos = g.getAttribute('position');
    const roll = 0.018 + rand() * 0.014;
    const cornerX = rand() > 0.5 ? 1 : -1;
    for (let v = 0; v < pos.count; v += 1) {
      const x = pos.getX(v);
      const y = pos.getY(v);
      let lift = roll * Math.sin(((y / 0.42) + 0.5) * Math.PI);
      const corner = (x * cornerX) / 0.15 + Math.abs(y) / 0.21 - 1.5;
      if (corner > 0) lift += corner * 0.05;
      pos.setZ(v, pos.getZ(v) + lift);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    // cream paper, faint ink-line stripes, aged margins
    const inkSeed = rand() * 90;
    paintVertexColors(g, (x, y, _z, out) => {
      const j = 0.9 + 0.12 * noise2(x * 9 + inkSeed, y * 9);
      out.setRGB(j, j, j * 0.97);
      const line = ((y + 0.21) / 0.052) % 1;
      const written = noise2(Math.floor((y + 0.21) / 0.052) * 3.7 + inkSeed, x * 6);
      if (line < 0.3 && Math.abs(x) < 0.115 && written > 0.35) {
        out.lerp(tone('paperBone', 'inkCharcoal'), 0.34 + 0.2 * written);
      }
      if (Math.abs(x) > 0.13 || Math.abs(y) > 0.185) {
        out.lerp(tone('paperBone', 'paperAged'), 0.5); // handled edges
      }
    });
    const sheet = new THREE.Mesh(g, mat);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = rand() * Math.PI * 2;
    const a = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.95;
    sheet.position.set(Math.cos(a) * r, 0.02 + i * 0.004, Math.sin(a) * r * 0.8);
    sheet.name = `paper-${i}`;
    sheet.userData['noMerge'] = true;
    group.add(sheet);
    papers.push(sheet);
  }
  return { group, papers };
}

// ─────────────────────────────────────────────── kitchen + dagger ──

export interface KitchenCounterBuild {
  group: THREE.Group;
  drawer: THREE.Group;
  dagger: THREE.Mesh;
  setDrawerOpen(open: boolean): void;
}

/** Kitchen counter (NW alcove) with the dagger drawer. */
export function makeKitchenCounter(kit: MaterialKit): KitchenCounterBuild {
  const group = new THREE.Group();
  group.name = 'kitchen-counter';

  // — body: plank front w/ frame posts, recessed drawer bay —
  const warmGeoms: THREE.BufferGeometry[] = [];
  const body = fbox(2.3, 0.85, 0.8, 10, 4, 3);
  body.translate(0, 0.425, 0);
  paintVertexColors(body, (x, y, z, out) => {
    const plank = Math.floor(x / 0.3);
    const j = 0.6 + 0.28 * noise2(plank * 4.1, y * 1.7) + 0.14 * noise2(x * 9, y * 7 + z);
    out.setRGB(j, j * 0.99, j * 1.04);
    if (y < 0.12) out.multiplyScalar(0.78); // floor shadow
    // shadowed drawer bay rectangle on the south face
    if (z > 0.38 && Math.abs(x) < 0.4 && y > 0.48 && y < 0.76) out.multiplyScalar(0.6);
  });
  warmGeoms.push(body);
  for (const px of [-1.08, 1.08]) {
    const post = fbox(0.12, 0.92, 0.12);
    paintGrain(post, px * 7);
    bake(post, px, 0.46, 0.36);
    warmGeoms.push(post);
  }
  group.add(new THREE.Mesh(mergeGeoms(warmGeoms), kit.toon('woodWarm', { vertexColors: true })));

  // — dark top slab with knife scars —
  const top = fbox(2.4, 0.07, 0.9, 12, 1, 4);
  paintVertexColors(top, (x, y, z, out) => {
    const j = 0.72 + 0.3 * noise2(z * 8, x * 2.1) + 0.1 * noise2(x * 13, z * 11);
    out.setRGB(j, j, j * 1.05);
    if (y > 0.02 && noise2(x * 16, z * 3 + 5) > 0.8) out.multiplyScalar(0.74); // knife scars
  });
  bake(top, 0, 0.885, 0);
  group.add(new THREE.Mesh(top, kit.toon('woodDark', { vertexColors: true })));

  // — clutter: glazed jar, stacked bowls (one tipped) —
  const jar = faceted(jitterRadial(new THREE.CylinderGeometry(0.1, 0.13, 0.28, 8), 0.08, 5));
  paintVertexColors(jar, (x, y, z, out) => {
    const j = 0.76 + 0.28 * noise2(Math.atan2(z, x) * 1.9, y * 5);
    out.setRGB(j * 0.97, j, j * 1.1);
    if (y > 0.06) out.multiplyScalar(1.18); // glaze catch-light at the shoulder
  });
  bake(jar, -0.7, 1.06, -0.1);
  group.add(new THREE.Mesh(jar, kit.toon('inkCharcoal', { vertexColors: true })));
  const bowlGeoms: THREE.BufferGeometry[] = [];
  for (const [bx, by, bz, rx] of [[0.75, 0.97, 0.12, 0], [0.62, 0.94, -0.14, 1.2]] as Array<[number, number, number, number]>) {
    const bowl = faceted(new THREE.CylinderGeometry(0.13, 0.08, 0.09, 9));
    paintVertexColors(bowl, (x, y, z, out) => {
      const j = 0.8 + 0.22 * noise2(x * 9 + bx, z * 9);
      out.setRGB(j, j, j * 0.96);
      if (y > 0.03) out.multiplyScalar(0.88); // dusty inside
    });
    bake(bowl, bx, by, bz, 0, rx, rx * 0.6);
    bowlGeoms.push(bowl);
  }
  group.add(new THREE.Mesh(mergeGeoms(bowlGeoms), kit.toon('paperAged', { vertexColors: true })));

  // — drawer (slides +Z / south, out of the counter front) —
  const drawer = new THREE.Group();
  drawer.name = 'drawer';
  drawer.position.set(0, 0.62, 0.4);
  const frontGeoms: THREE.BufferGeometry[] = [];
  const frontPanel = fbox(0.74, 0.24, 0.06);
  paintVertexColors(frontPanel, (x, y, _z, out) => {
    const j = 0.62 + 0.26 * noise2(x * 6, y * 9) + 0.12 * noise2(x * 13, y * 17);
    out.setRGB(j, j, j * 1.04);
    if (Math.abs(x) > 0.33 || Math.abs(y) > 0.09) out.multiplyScalar(0.84); // frame edge
  });
  frontGeoms.push(frontPanel);
  const knob = fbox(0.07, 0.05, 0.04);
  paintGrain(knob, 3);
  bake(knob, 0, 0, 0.05);
  frontGeoms.push(knob);
  const front = new THREE.Mesh(mergeGeoms(frontGeoms), kit.toon('woodDark', { vertexColors: true }));
  front.userData['noMerge'] = true;
  drawer.add(front);
  // open tray (base + thin rim walls), raw pale wood inside
  const trayGeoms: THREE.BufferGeometry[] = [];
  const trayBase = fbox(0.66, 0.04, 0.42);
  paintGrain(trayBase, 11, 'z');
  bake(trayBase, 0, -0.08, -0.24);
  trayGeoms.push(trayBase);
  for (const [w, d, ox, oz] of [
    [0.66, 0.03, 0, -0.435], [0.66, 0.03, 0, -0.045],
    [0.03, 0.39, -0.315, -0.24], [0.03, 0.39, 0.315, -0.24],
  ] as Array<[number, number, number, number]>) {
    const wall = fbox(w, 0.09, d);
    paintGrain(wall, ox * 9 + oz);
    bake(wall, ox, -0.035, oz);
    trayGeoms.push(wall);
  }
  const tray = new THREE.Mesh(mergeGeoms(trayGeoms), kit.toon('woodWarm', { vertexColors: true }));
  tray.userData['noMerge'] = true;
  drawer.add(tray);

  // — the dagger (husband's keepsake): ONE mesh — dark lacquered sheath,
  //   a hand-width of pale steel showing, bronze guard, wrapped handle.
  //   Small but readable even in the dim alcove. —
  const daggerGeoms: THREE.BufferGeometry[] = [];
  const sheath = fbox(0.2, 0.045, 0.075, 3, 1, 1);
  paintVertexColors(sheath, (x, y, _z, out) => {
    out.copy(tone('woodDark', 'inkBlack'));
    const sheen = 0.85 + 0.5 * Math.max(0, noise2(x * 7, 3) - 0.55); // lacquer glint
    out.multiplyScalar(y > 0.015 ? sheen * 1.25 : sheen);
  });
  bake(sheath, 0.12, 0, 0);
  daggerGeoms.push(sheath);
  // exposed blade between guard and sheath mouth — pale moon-steel
  const blade = fbox(0.12, 0.034, 0.055, 2, 1, 1);
  paintVertexColors(blade, (x, y, _z, out) => {
    out.copy(tone('woodDark', 'moonlight')).multiplyScalar(y > 0.012 ? 1.25 : 0.9);
    if (Math.abs(x % 0.05) < 0.012) out.multiplyScalar(0.88); // hammered facets
  });
  bake(blade, -0.02, 0, 0);
  daggerGeoms.push(blade);
  const guard = faceted(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 6));
  paintVertexColors(guard, (_x, _y, _z, out) => {
    out.copy(tone('woodDark', 'earthBrown')).multiplyScalar(1.3); // dull bronze
  });
  bake(guard, -0.085, 0, 0, 0, 0, Math.PI / 2);
  daggerGeoms.push(guard);
  const handle = fbox(0.13, 0.04, 0.055, 6, 1, 1);
  paintVertexColors(handle, (x, _y, _z, out) => {
    const wrap = Math.floor((x + 1) / 0.022) % 2; // diagonal-ish wrap bands
    out.copy(tone('woodDark', 'paperBone')).multiplyScalar(wrap === 0 ? 0.95 : 0.6);
  });
  bake(handle, -0.165, 0, 0);
  daggerGeoms.push(handle);
  const pommel = fbox(0.025, 0.045, 0.06);
  paintVertexColors(pommel, (_x, _y, _z, out) => {
    out.copy(tone('woodDark', 'inkBlack')).multiplyScalar(1.1);
  });
  bake(pommel, -0.24, 0, 0);
  daggerGeoms.push(pommel);
  const dagger = new THREE.Mesh(mergeGeoms(daggerGeoms), kit.toon('woodDark', { vertexColors: true }));
  dagger.position.set(0.02, -0.035, -0.24); // resting on the tray base
  dagger.rotation.y = 0.5;
  dagger.name = 'dagger';
  dagger.userData['noMerge'] = true;
  drawer.add(dagger);

  group.add(drawer);

  const closedZ = drawer.position.z;
  function setDrawerOpen(open: boolean): void {
    drawer.position.z = open ? closedZ + 0.42 : closedZ;
  }

  return { group, drawer, dagger, setDrawerOpen };
}

// ──────────────────────────────────────────────────────── sandals ──

/** The sandals against the genkan rail — readable as "wrong" immediately. */
export function makeSandals(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'sandals';
  const soleGeoms: THREE.BufferGeometry[] = [];
  const strapGeoms: THREE.BufferGeometry[] = [];
  for (const [sx, rot] of [[-0.1, 0.12], [0.1, -0.08]] as Array<[number, number]>) {
    // woven zōri sole: rounded toe, row striations, heel-worn dark
    const sole = fbox(0.14, 0.045, 0.34, 2, 1, 4);
    {
      const pos = sole.getAttribute('position');
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        if (z < -0.12) pos.setX(i, x * (1 - (-z - 0.12) * 2.2)); // toe taper
      }
      pos.needsUpdate = true;
      sole.computeVertexNormals();
    }
    paintVertexColors(sole, (x, y, z, out) => {
      const row = Math.floor((z + 10) / 0.045) % 2;
      const j = 0.72 + 0.14 * row + 0.14 * noise2(x * 14 + sx, z * 9);
      out.setRGB(j, j * 0.98, j * 0.92); // woven straw
      if (y > 0.015 && Math.abs(x) < 0.05 && z > -0.05) out.multiplyScalar(0.82); // footprint wear
    });
    bake(sole, sx, 0.024, 0, rot);
    soleGeoms.push(sole);
    // vermillion thong: toe post + two straps to the sides
    const paintStrap = (g: THREE.BufferGeometry): THREE.BufferGeometry =>
      paintVertexColors(g, (x, y, z, out) => {
        const j = 0.78 + 0.3 * noise2(x * 17 + sx, z * 17 + y);
        out.setRGB(j, j * 0.96, j * 0.96); // worn dye
      });
    const post = fbox(0.02, 0.05, 0.02);
    paintStrap(post);
    bake(post, sx + Math.sin(rot) * 0.08, 0.06, -0.08 * Math.cos(rot), rot);
    strapGeoms.push(post);
    for (const side of [-1, 1]) {
      const strap = fbox(0.018, 0.016, 0.13);
      paintStrap(strap);
      bake(strap, sx + side * 0.035, 0.062, -0.015, rot + side * 0.5, 0, side * 0.5);
      strapGeoms.push(strap);
    }
  }
  group.add(new THREE.Mesh(mergeGeoms(soleGeoms), kit.toon('woodWarm', { vertexColors: true })));
  group.add(new THREE.Mesh(mergeGeoms(strapGeoms), kit.toon('vermillion', { vertexColors: true })));
  return { group };
}

// ───────────────────────────────────────────────────────── tatami ──

/** Four tatami mats — beveled, alternating weave, dark heri borders. */
export function makeTatami(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'tatami';
  const matGeoms: THREE.BufferGeometry[] = [];
  const layout: Array<[number, number]> = [
    [-0.92, -0.5],
    [-0.92, 0.42],
    [0.92, -0.5],
    [0.92, 0.42],
  ];
  const W = 1.76;
  const D = 0.86;
  const H = 0.05;
  for (let m = 0; m < layout.length; m += 1) {
    const spot = layout[m];
    if (!spot) continue;
    const weaveAlongX = m === 0 || m === 3; // alternating weave direction
    // beveled slab: box side skirt + dense top grid for the weave paint
    const skirt = fbox(W, H, D, 2, 1, 2);
    skirt.translate(0, H / 2, 0);
    const topGrid = faceted(new THREE.PlaneGeometry(W - 0.015, D - 0.015, 20, 10));
    topGrid.rotateX(-Math.PI / 2);
    topGrid.translate(0, H + 0.004, 0);
    const paintMat = (g: THREE.BufferGeometry): THREE.BufferGeometry =>
      paintVertexColors(g, (x, y, z, out) => {
        const across = weaveAlongX ? z : x;
        const rib = Math.floor((across + 10) / 0.046) % 2;
        let j = 0.74 + 0.1 * rib + 0.14 * noise2(x * 7 + m * 9, z * 7) + 0.08 * noise2(x * 19, z * 19 + m);
        if (y < H) j *= 0.78; // skirt sits in shadow
        out.setRGB(j, j, j * 0.94);
        // two-tone aging: alternate mats pull green vs straw-gold
        out.lerp(
          weaveAlongX ? tone('tatamiStraw', 'willowDeep') : tone('tatamiStraw', 'thatchStraw'),
          0.16,
        );
        // dark cloth heri borders along the long edges
        const edge = weaveAlongX ? Math.abs(z) > D / 2 - 0.075 : Math.abs(x) > W / 2 - 0.075;
        if (edge && y > H - 0.01) {
          out.copy(tone('tatamiStraw', 'inkCharcoal')).multiplyScalar(
            0.85 + 0.25 * noise2(x * 11, z * 11),
          );
        }
        // worn sheen down the room's walking line
        if (y > H && Math.abs(x + spot[0]) < 0.5 && noise2(x * 3, z * 3 + m) > 0.4) {
          out.multiplyScalar(1.06);
        }
      });
    paintMat(skirt);
    paintMat(topGrid);
    bake(skirt, spot[0], 0, spot[1]);
    bake(topGrid, spot[0], 0, spot[1]);
    matGeoms.push(skirt, topGrid);
  }
  group.add(new THREE.Mesh(mergeGeoms(matGeoms), kit.toon('tatamiStraw', { vertexColors: true })));
  return { group };
}

// ───────────────────────────────────────────────── sliding door ──

/** Genkan sliding door (knee-height panel — camera cutaway). */
export function makeSlidingDoor(kit: MaterialKit): { group: THREE.Group; panel: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'sliding-door';
  // grooved rail
  const rail = fbox(2.0, 0.07, 0.16, 8, 1, 2);
  paintVertexColors(rail, (x, y, z, out) => {
    const j = 0.66 + 0.3 * noise2(x * 5, z * 9) + 0.1 * noise2(x * 15, y);
    out.setRGB(j, j, j * 1.04);
    if (y > 0.02 && Math.abs(z) < 0.05) out.multiplyScalar(0.68); // worn groove
  });
  bake(rail, 0, 0.035, 0);
  group.add(new THREE.Mesh(rail, kit.toon('woodDark', { vertexColors: true })));

  // paper panel: aged shoji cells, one torn cell patched dark
  const panelGeo = fbox(0.95, 1.0, 0.05, 6, 6, 1);
  paintVertexColors(panelGeo, (x, y, _z, out) => {
    const j = 0.8 + 0.16 * noise2(x * 7, y * 7) + 0.08 * noise2(x * 17, y * 13);
    out.setRGB(j, j, j * 0.96);
    // shoji cell shadow lines
    const cx = Math.abs(((x + 10) % 0.31) - 0.155);
    const cy = Math.abs(((y + 10) % 0.33) - 0.165);
    if (cx > 0.135 || cy > 0.145) out.multiplyScalar(0.72);
    // the torn cell — wind got in here once
    if (x > 0.1 && x < 0.4 && y > -0.1 && y < 0.2) {
      out.lerp(tone('paperAged', 'earthDark'), 0.55 + 0.3 * noise2(x * 21, y * 21));
    }
  });
  const panel = new THREE.Mesh(panelGeo, kit.toon('paperAged', { vertexColors: true }));
  panel.position.set(-0.25, 0.55, 0);
  panel.name = 'door-panel';
  panel.userData['noMerge'] = true;
  group.add(panel);

  // lattice riding the panel (one merged child)
  const latticeGeoms: THREE.BufferGeometry[] = [];
  for (const lx of [-0.3, 0, 0.3]) {
    const strip = fbox(0.04, 0.96, 0.025);
    paintGrain(strip, lx * 13);
    bake(strip, lx, 0, 0);
    latticeGeoms.push(strip);
  }
  for (const ly of [-0.25, 0.25]) {
    const strip = fbox(0.92, 0.04, 0.025);
    paintGrain(strip, ly * 17);
    bake(strip, 0, ly, 0);
    latticeGeoms.push(strip);
  }
  const lattice = new THREE.Mesh(mergeGeoms(latticeGeoms), kit.toon('woodDark', { vertexColors: true }));
  lattice.position.set(0, 0, 0.038);
  lattice.userData['noMerge'] = true;
  panel.add(lattice);
  return { group, panel };
}

// ─────────────────────────────────────────────────── floor lantern ──

/** Warm floor lantern (andon) — the interior's hearth-light. */
export function makeFloorLantern(kit: MaterialKit): { group: THREE.Group; core: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'floor-lantern';
  const darkGeoms: THREE.BufferGeometry[] = [];
  // dished base + pole + top cap
  const base = faceted(jitterRadial(new THREE.CylinderGeometry(0.17, 0.21, 0.09, 8), 0.06, 3));
  paintGrain(base, 5);
  bake(base, 0, 0.045, 0);
  darkGeoms.push(base);
  const pole = fbox(0.05, 0.42, 0.05);
  paintGrain(pole, 7);
  bake(pole, 0, 0.3, 0);
  darkGeoms.push(pole);
  const cap = faceted(new THREE.CylinderGeometry(0.23, 0.26, 0.05, 8));
  paintGrain(cap, 9);
  bake(cap, 0, 0.86, 0);
  darkGeoms.push(cap);
  const finial = fbox(0.04, 0.07, 0.04);
  paintGrain(finial, 11);
  bake(finial, 0, 0.92, 0);
  darkGeoms.push(finial);
  group.add(new THREE.Mesh(mergeGeoms(darkGeoms), kit.toon('woodDark', { vertexColors: true })));

  // the warm core — flicker/glow target (kept contract: name + noMerge)
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), kit.emissive('lanternAmber', 1));
  core.position.y = 0.66;
  core.name = 'lantern-core';
  core.userData['noMerge'] = true;
  group.add(core);

  // washi shade: ribbed, glow-warmed paper (open cylinder)
  const shade = faceted(new THREE.CylinderGeometry(0.2, 0.24, 0.34, 10, 2, true));
  paintVertexColors(shade, (x, y, z, out) => {
    const a = Math.atan2(z, x);
    const rib = Math.abs(((a * 10) / Math.PI) % 1 - 0.5);
    let j = 0.86 + 0.14 * noise2(a * 3, y * 9);
    if (rib > 0.4) j *= 0.8; // bamboo rib shadows
    out.setRGB(j * 1.06, j, j * 0.88); // paper warmed by the flame
    if (noise2(a * 5 + 7, y * 13) > 0.84) out.multiplyScalar(0.85); // scorch freckles
  });
  bake(shade, 0, 0.66, 0);
  group.add(new THREE.Mesh(shade, kit.toon('paperAged', { vertexColors: true, doubleSided: true })));
  return { group, core };
}

// ─────────────────────────────────────────────── shrine nook (NEW) ──

/**
 * Small household shrine shelf — the once-loved soul of the room. A
 * bracket shelf with a tiny kamidana house, a memorial tablet, two dry
 * offering cups, a dead stem and an incense bowl. ADDITIVE M2 export.
 */
export function makeShrineNook(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'shrine-nook';

  const woodGeoms: THREE.BufferGeometry[] = [];
  const shelf = fbox(0.72, 0.045, 0.3, 4, 1, 2);
  paintVertexColors(shelf, (x, y, z, out) => {
    const j = 0.7 + 0.26 * noise2(z * 8, x * 2.1) + 0.12 * noise2(x * 13, z * 9);
    out.setRGB(j, j * 0.99, j * 1.04);
    if (y > 0.01 && noise2(x * 6, z * 6) > 0.7) out.multiplyScalar(0.88); // dust shadow
  });
  woodGeoms.push(shelf);
  for (const bx of [-0.28, 0.28]) {
    const bracket = fbox(0.05, 0.16, 0.2);
    paintGrain(bracket, bx * 9);
    bake(bracket, bx, -0.1, -0.04, 0, 0.5, 0);
    woodGeoms.push(bracket);
  }
  group.add(new THREE.Mesh(mergeGeoms(woodGeoms), kit.toon('woodWarm', { vertexColors: true })));

  // tiny kamidana house: pale aged body + roof slab
  const paleGeoms: THREE.BufferGeometry[] = [];
  const house = fbox(0.26, 0.18, 0.13, 3, 2, 1);
  paintVertexColors(house, (x, y, _z, out) => {
    const j = 0.82 + 0.16 * noise2(x * 11, y * 11);
    out.setRGB(j, j, j * 0.95);
    if (Math.abs(x) < 0.04 && y < 0.06) out.multiplyScalar(0.6); // dark doorway
  });
  bake(house, -0.12, 0.115, -0.02);
  paleGeoms.push(house);
  for (const side of [-1, 1]) {
    const roof = fbox(0.32, 0.025, 0.1);
    paintVertexColors(roof, (x, _y, _z, out) => {
      const j = 0.74 + 0.2 * noise2(x * 9, side * 3);
      out.setRGB(j, j, j * 0.96);
    });
    bake(roof, -0.12, 0.225, -0.02 + side * 0.045, 0, side * 0.55, 0);
    paleGeoms.push(roof);
  }
  // two offering cups, long dry
  for (const cx of [0.1, 0.22]) {
    const cup = faceted(new THREE.CylinderGeometry(0.025, 0.018, 0.035, 6));
    paintVertexColors(cup, (_x, y, _z, out) => {
      const j = 0.85 + 0.15 * noise2(cx * 31, y * 21);
      out.setRGB(j, j, j * 0.94);
      if (y > 0.012) out.multiplyScalar(0.75); // dried rim
    });
    bake(cup, cx, 0.04, 0.05);
    paleGeoms.push(cup);
  }
  group.add(new THREE.Mesh(mergeGeoms(paleGeoms), kit.toon('paperBone', { vertexColors: true })));

  // memorial tablet (ihai) — near-black, a faint warm name-stroke
  const tablet = fbox(0.09, 0.17, 0.025);
  paintVertexColors(tablet, (x, y, _z, out) => {
    out.copy(tone('woodDark', 'inkBlack')).multiplyScalar(1.05);
    if (Math.abs(x) < 0.012 && y > -0.05 && y < 0.06) {
      out.copy(tone('woodDark', 'lanternAmber')).multiplyScalar(0.32); // worn gilt name
    }
  });
  bake(tablet, 0.16, 0.13, -0.06, -0.12);
  group.add(new THREE.Mesh(tablet, kit.toon('woodDark', { vertexColors: true })));

  // dead stem drooping from a thin vase + incense bowl with spent stubs
  const greyGeoms: THREE.BufferGeometry[] = [];
  const vase = faceted(new THREE.CylinderGeometry(0.018, 0.026, 0.09, 6));
  paintVertexColors(vase, (_x, y, _z, out) => {
    const j = 0.8 + 0.2 * noise2(y * 17, 4);
    out.setRGB(j * 0.97, j, j * 1.08);
  });
  bake(vase, -0.3, 0.068, 0.07);
  greyGeoms.push(vase);
  const bowl = faceted(new THREE.CylinderGeometry(0.04, 0.028, 0.03, 7));
  paintVertexColors(bowl, (_x, y, _z, out) => {
    const j = 0.78 + 0.2 * noise2(y * 13, 9);
    out.setRGB(j * 0.97, j, j * 1.06);
    if (y > 0.01) out.multiplyScalar(0.7); // ash
  });
  bake(bowl, 0.3, 0.038, 0.03);
  greyGeoms.push(bowl);
  group.add(new THREE.Mesh(mergeGeoms(greyGeoms), kit.toon('inkCharcoal', { vertexColors: true })));

  const stemGeoms: THREE.BufferGeometry[] = [];
  const stem = fbox(0.012, 0.16, 0.012);
  paintVertexColors(stem, (_x, y, _z, out) => {
    out.copy(toneLerp('willowDeep', 'willowDeep', 'earthBrown', 0.6 + y * 2)).multiplyScalar(0.8);
  });
  bake(stem, -0.3, 0.18, 0.07, 0, 0, 0.5);
  stemGeoms.push(stem);
  const head = faceted(new THREE.TetrahedronGeometry(0.025));
  paintVertexColors(head, (_x, _y, _z, out) => {
    out.copy(tone('willowDeep', 'earthBrown')).multiplyScalar(0.75); // wilted bloom
  });
  bake(head, -0.37, 0.235, 0.07);
  stemGeoms.push(head);
  group.add(new THREE.Mesh(mergeGeoms(stemGeoms), kit.toon('willowDeep', { vertexColors: true })));

  return { group };
}
