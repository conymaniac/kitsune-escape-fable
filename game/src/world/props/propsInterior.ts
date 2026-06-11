/**
 * Interior props — low table + plates, futon, scattered papers, kitchen
 * counter with the dagger drawer, sandals, tatami, sliding door, floor
 * lantern.
 *
 * GREYBOX (M1): primitive compositions, FINAL signatures. The papers array
 * feeds M4's flutter sim; the drawer/dagger handles feed the quest script.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import { seededRandom } from '@/world/props/vegetation';

export function makeLowTable(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'low-table';
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), kit.toon('woodWarm'));
  top.position.y = 0.32;
  group.add(top);
  const legMat = kit.toon('woodDark');
  for (const [lx, lz] of [
    [-0.58, -0.48],
    [0.58, -0.48],
    [-0.58, 0.48],
    [0.58, 0.48],
  ] as Array<[number, number]>) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), legMat);
    leg.position.set(lx, 0.15, lz);
    group.add(leg);
  }
  // two moldy plates (optional Dialog 2 prop)
  const plateMat = kit.toon('paperBone');
  const moldMat = kit.toon('willowDeep');
  for (const [px, pz] of [
    [-0.3, 0.1],
    [0.35, -0.2],
  ] as Array<[number, number]>) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.045, 10), plateMat);
    plate.position.set(px, 0.39, pz);
    group.add(plate);
    const mold = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 8), moldMat);
    mold.position.set(px + 0.03, 0.42, pz - 0.02);
    group.add(mold);
  }
  return { group };
}

export function makeFuton(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'futon';
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 2.0), kit.toon('paperAged'));
  base.position.y = 0.06;
  group.add(base);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.7), kit.toon('earthBrown'));
  fold.position.set(0, 0.16, 0.45);
  fold.rotation.y = 0.05;
  group.add(fold);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.26), kit.toon('paperAged'));
  pillow.position.set(0.05, 0.16, -0.78);
  pillow.rotation.y = -0.2;
  group.add(pillow);
  return { group };
}

/** Scattered diary papers — individual thin planes for the M4 flutter sim. */
export function makePapers(
  kit: MaterialKit,
  count = 6,
  seed = 41,
): { group: THREE.Group; papers: THREE.Mesh[] } {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  group.name = 'papers';
  const mat = kit.toon('paperBone', { doubleSided: true });
  const papers: THREE.Mesh[] = [];
  for (let i = 0; i < count; i += 1) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), mat);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = rand() * Math.PI * 2;
    const a = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 0.95;
    sheet.position.set(Math.cos(a) * r, 0.015 + i * 0.004, Math.sin(a) * r * 0.8);
    sheet.name = `paper-${i}`;
    sheet.userData['noMerge'] = true;
    group.add(sheet);
    papers.push(sheet);
  }
  return { group, papers };
}

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

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 0.8), kit.toon('woodWarm'));
  body.position.y = 0.425;
  group.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.9), kit.toon('woodDark'));
  top.position.y = 0.88;
  group.add(top);
  // clutter: a jar and a bowl
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.26, 8), kit.toon('inkCharcoal'));
  jar.position.set(-0.7, 1.04, -0.1);
  group.add(jar);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.1, 9), kit.toon('paperAged'));
  bowl.position.set(0.75, 0.96, 0.12);
  group.add(bowl);

  // — drawer (slides +Z / south, out of the counter front) —
  const drawer = new THREE.Group();
  drawer.name = 'drawer';
  drawer.position.set(0, 0.62, 0.4);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.24, 0.06), kit.toon('woodDark'));
  front.userData['noMerge'] = true;
  drawer.add(front);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.42), kit.toon('woodWarm'));
  tray.position.set(0, -0.06, -0.24);
  tray.userData['noMerge'] = true;
  drawer.add(tray);

  // — the dagger (husband's keepsake) on the tray —
  const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.07), kit.toon('moonlight'));
  dagger.position.set(0.02, -0.005, -0.24);
  dagger.rotation.y = 0.5;
  dagger.name = 'dagger';
  dagger.userData['noMerge'] = true;
  drawer.add(dagger);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.045, 0.05), kit.toon('woodDark'));
  handle.position.set(-0.17, -0.005, -0.13);
  handle.rotation.y = 0.5;
  handle.userData['noMerge'] = true;
  drawer.add(handle);

  group.add(drawer);

  const closedZ = drawer.position.z;
  function setDrawerOpen(open: boolean): void {
    drawer.position.z = open ? closedZ + 0.42 : closedZ;
  }

  return { group, drawer, dagger, setDrawerOpen };
}

/** The sandals against the genkan rail — readable as "wrong" immediately. */
export function makeSandals(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'sandals';
  const soleMat = kit.toon('woodWarm');
  const strapMat = kit.toon('vermillion');
  for (const [sx, rot] of [
    [-0.1, 0.12],
    [0.1, -0.08],
  ] as Array<[number, number]>) {
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.34), soleMat);
    sole.position.set(sx, 0.025, 0);
    sole.rotation.y = rot;
    group.add(sole);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), strapMat);
    strap.position.set(sx, 0.06, -0.07);
    strap.rotation.y = rot;
    group.add(strap);
  }
  return { group };
}

/** Four tatami mats (greybox: flat planes with a dark seam cross). */
export function makeTatami(kit: MaterialKit): { group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'tatami';
  const matMaterial = kit.toon('tatamiStraw');
  const layout: Array<[number, number, number]> = [
    [-0.92, -0.5, 0], // [x, z, rotY] — 1.8×0.9 mats
    [-0.92, 0.42, 0],
    [0.92, -0.5, 0],
    [0.92, 0.42, 0],
  ];
  for (const [mx, mz, rot] of layout) {
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.86), matMaterial);
    mat.rotation.x = -Math.PI / 2;
    mat.rotation.z = rot;
    mat.position.set(mx, 0.012, mz);
    group.add(mat);
  }
  const seamMat = kit.toon('inkCharcoal');
  const seamH = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.05), seamMat);
  seamH.rotation.x = -Math.PI / 2;
  seamH.position.set(0, 0.013, -0.04);
  group.add(seamH);
  const seamV = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.85), seamMat);
  seamV.rotation.x = -Math.PI / 2;
  seamV.position.set(0, 0.013, -0.04);
  group.add(seamV);
  return { group };
}

/** Genkan sliding door (knee-height greybox panel — camera cutaway). */
export function makeSlidingDoor(kit: MaterialKit): { group: THREE.Group; panel: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'sliding-door';
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.14), kit.toon('woodDark'));
  rail.position.y = 0.04;
  group.add(rail);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.07), kit.toon('paperAged'));
  panel.position.set(-0.25, 0.55, 0);
  panel.name = 'door-panel';
  panel.userData['noMerge'] = true;
  group.add(panel);
  const lattice = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.05), kit.toon('woodDark'));
  lattice.position.set(0, 0, 0.05); // rides on the panel
  lattice.userData['noMerge'] = true;
  panel.add(lattice);
  return { group, panel };
}

/** Warm floor lantern (the interior's placeholder light source). */
export function makeFloorLantern(kit: MaterialKit): { group: THREE.Group; core: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'floor-lantern';
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 8), kit.toon('woodDark'));
  stand.position.y = 0.05;
  group.add(stand);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), kit.toon('woodDark'));
  pole.position.y = 0.35;
  group.add(pole);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), kit.emissive('lanternAmber', 1));
  core.position.y = 0.66;
  core.name = 'lantern-core';
  core.userData['noMerge'] = true;
  group.add(core);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.24, 0.3, 8, 1, true),
    kit.toon('paperAged', { doubleSided: true }),
  );
  shade.position.y = 0.66;
  group.add(shade);
  return { group, core };
}
