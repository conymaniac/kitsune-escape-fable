/**
 * buildExterior(kit) — the One Night Map (DESIGN.md §4), ~80×64 units.
 *
 * World model: ground = XZ, +Y up, 1 u = 1 m. Map spans X -40..40,
 * Z -32..32. NORTH = -Z (south→north = beginning→truth), EAST = +X.
 * Prevailing wind blows NW→SE, i.e. direction ≈ (+0.7, +0.7) on XZ —
 * wind shadows sit on the SE (lee) side of their obstacles.
 *
 * GREYBOX (M1): primitive stand-ins, but every POSITION, COLLIDER, ANCHOR,
 * LASH ZONE and WIND SHADOW here is FINAL gameplay data — D-core builds on
 * these exact values. M2 replaces prop internals behind the same
 * signatures.
 *
 * Route (≈80 u of path spawn→ghost, ≈125 u spawn→cottage via the willow):
 *   [S] spawn glade (-8, 27) → [A] mask shrine (-8.8, 15) (12 u)
 *   → hollow log size-gate (-8, 9) → creek 2 m Bound gap [B1] (-8, 5)
 *   → farm gate [B2] (-16, 0) → willow shore row → promontory with the
 *   Cursed Willow [C] (21, -12.5) → boulder field → cottage [D] (-25, -21).
 *
 * Extras beyond ExteriorBuildResult (for the M1 integrator):
 * - `setGateOpen(b)`  — swings the farm-gate panel and removes/restores
 *   its collider IN PLACE in the returned (live) `colliders` array.
 * - `cuttableBranches` — the Cursed Willow's 3 named cluster meshes.
 * - `update(dt, wind?)` — drives wisps + lantern flicker.
 */
import * as THREE from 'three';
import type {
  ColliderShape,
  ExteriorAnchors,
  ExteriorBuildResult,
  LashZone,
  MaterialKit,
  WindShadow,
  WindState,
} from '@/core/types';
import { aabb, circle, offsetColliders } from '@/world/colliders';
import { mergeStatic } from '@/world/merge';
import { buildTerrain } from '@/world/props/terrain';
import { buildWater, makeDock } from '@/world/props/water';
import { buildWillow } from '@/world/props/willow';
import { buildCottage } from '@/world/props/cottage';
import {
  makeBoulder,
  makeBush,
  makeFenceRun,
  makeGatePanel,
  makeGrassTufts,
  makeHollowLog,
  makeReedBed,
  makeRidge,
  makeRowboat,
  makeShrine,
  makeTree,
  makeTreeline,
  seededRandom,
} from '@/world/props/vegetation';
import { makeStoneLantern } from '@/world/props/lanterns';
import { buildSky } from '@/world/props/sky';
import { createWisps, type WispsBuild } from '@/world/props/wisps';

export interface ExteriorBuild extends ExteriorBuildResult {
  /** Cursed Willow branch clusters (named `cuttable-0..2`). */
  cuttableBranches: THREE.Mesh[];
  /** Open/close the farm gate [B2]; mutates the live colliders array. */
  setGateOpen(open: boolean): void;
  /** Per-frame world animation (wisps drift, lantern flicker). */
  update(dt: number, wind?: WindState): void;
}

const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

export function buildExterior(kit: MaterialKit): ExteriorBuild {
  const group = new THREE.Group();
  group.name = 'exterior';

  // dressing collects everything static+single-material → merged at the end
  const dressing = new THREE.Group();
  dressing.name = 'exterior-dressing';

  // ───────────────────────────────────────── terrain · water · sky ──
  group.add(buildTerrain(kit).group);
  group.add(buildWater(kit).group);
  group.add(buildSky(kit).group);

  const dock = makeDock(kit);
  dock.position.set(15.2, 0, -1.25);
  group.add(dock);

  // ─────────────────────────────────────────────── [S] spawn glade ──
  const sleepingTree = makeTree(kit, 6.2);
  sleepingTree.position.set(-10.5, 0, 27.5);
  sleepingTree.scale.x = 1.25; // broad, sheltering silhouette
  group.add(sleepingTree);
  const gladeRock = makeBoulder(kit, 0.4, 3); // the WASD-glyph stone
  gladeRock.position.set(-7, 0, 25.5);
  dressing.add(gladeRock);

  // ─────────────────────────────────────────────── [A] mask shrine ──
  const shrine = makeShrine(kit);
  shrine.group.position.set(-9.4, 0, 15);
  shrine.group.rotation.y = Math.PI / 2.3; // faces the path
  group.add(shrine.group);

  // ─────────────────────────────── hollow log size-gate (fox-only) ──
  const log = makeHollowLog(kit);
  log.position.set(-8, 0, 9);
  group.add(log);
  // brush plugging the corridor flanks so the blockage reads
  const bushRand = seededRandom(57);
  for (const bx of [-13.2, -11.7, -10.6, -5.1, -3.9, -2.7]) {
    const bush = makeBush(kit, 0.55 + bushRand() * 0.35);
    bush.position.set(bx, 0, 9 + (bushRand() - 0.5) * 0.8);
    dressing.add(bush);
  }

  // ─────────────────────────────────────── [B2] farm gate + fences ──
  const fenceWest = makeFenceRun(kit, 19.9);
  fenceWest.position.set(-37, 0, 0);
  dressing.add(fenceWest);
  const fenceEast = makeFenceRun(kit, 17.9);
  fenceEast.position.set(-14.9, 0, 0);
  dressing.add(fenceEast);
  const gate = makeGatePanel(kit, 2.2);
  gate.pivot.position.set(-17.1, 0, 0);
  group.add(gate.pivot);

  // ──────────────────────────── reed tunnel (fox-only, near shore) ──
  const reedsWest = makeReedBed(kit, 3.2, 3.5, 26, 61);
  reedsWest.position.set(4.6, 0, 0.75);
  dressing.add(reedsWest);
  const reedsEast = makeReedBed(kit, 8.2, 3.5, 64, 62);
  reedsEast.position.set(10.9, 0, 0.75);
  dressing.add(reedsEast);
  // extra shore/creek-mouth reeds (flavor)
  const reedsMouth = makeReedBed(kit, 3, 3, 22, 63);
  reedsMouth.position.set(13.5, 0, 4.8);
  dressing.add(reedsMouth);
  const reedsNorthShore = makeReedBed(kit, 3, 1.6, 16, 64);
  reedsNorthShore.position.set(12.6, 0, -15.6);
  dressing.add(reedsNorthShore);
  const reedsBoat = makeReedBed(kit, 3, 1.6, 16, 65);
  reedsBoat.position.set(19, 0, -21.3);
  dressing.add(reedsBoat);

  // ───────────────── willow row along the west lake shore (+ lash) ──
  const rowSpots: Array<[number, number, number]> = [
    [10.8, -3.2, 5.0], // [x, z, height]
    [12.4, -7.4, 5.6],
    [14.6, -10.8, 5.2],
  ];
  for (const [wx, wz, wh] of rowSpots) {
    const willow = buildWillow(kit, { height: wh });
    willow.group.position.set(wx, 0, wz);
    willow.group.rotation.y = wx + wz; // deterministic variety
    group.add(willow.group);
  }

  // ─────────────── [C] the Cursed Willow on the promontory + ghost ──
  const cursed = buildWillow(kit, { cursed: true, height: 7 });
  cursed.group.position.set(21, 0.16, -12.5); // on the promontory pad
  group.add(cursed.group);
  // body mound at the roots
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.8, 9, 6), kit.toon('earthBrown'));
  mound.scale.set(1.15, 0.35, 1);
  mound.position.set(20.2, 0.16, -11.8);
  mound.name = 'body-mound';
  group.add(mound);
  // promontory wind-shadow rock (the finale's staging cover)
  const promRock = makeBoulder(kit, 0.85, 11);
  promRock.position.set(17.2, 0.16, -10.8);
  group.add(promRock);

  // ───────────────────────── open field: 3 boulders (wind shadows) ──
  const boulderSpots: Array<[number, number, number, number]> = [
    [8, -15, 1.25, 21], // [x, z, r, seed]
    [-2, -17, 1.15, 22],
    [-12, -18.5, 1.35, 23],
  ];
  for (const [bx, bz, br, seed] of boulderSpots) {
    const boulder = makeBoulder(kit, br, seed);
    boulder.position.set(bx, 0, bz);
    group.add(boulder);
  }

  // ──────────────────────────────── [D] cottage + yard (NW corner) ──
  const COTTAGE_X = -25;
  const COTTAGE_Z = -21;
  const cottage = buildCottage(kit);
  cottage.group.position.set(COTTAGE_X, 0, COTTAGE_Z);
  group.add(cottage.group);

  // yard fences (south run with path opening · east run with fox gap)
  const yardSouthWest = makeFenceRun(kit, 9.9);
  yardSouthWest.position.set(-37, 0, -15);
  dressing.add(yardSouthWest);
  const yardSouthEast = makeFenceRun(kit, 6.9);
  yardSouthEast.position.set(-24.9, 0, -15);
  dressing.add(yardSouthEast);
  const yardEastNorth = makeFenceRun(kit, 8.1);
  yardEastNorth.rotation.y = -Math.PI / 2; // runs along +Z
  yardEastNorth.position.set(-18, 0, -29);
  dressing.add(yardEastNorth);
  const yardEastSouth = makeFenceRun(kit, 5.1);
  yardEastSouth.rotation.y = -Math.PI / 2;
  yardEastSouth.position.set(-18, 0, -20.3);
  dressing.add(yardEastSouth);

  // ───────────────────────────── north-shore flavor: rotted rowboat ──
  const rowboat = makeRowboat(kit);
  rowboat.position.set(19.5, 0, -22.5);
  rowboat.rotation.y = 0.6;
  dressing.add(rowboat);

  // ───────────────────────────────────────── map edges + forests ──
  dressing.add(makeRidge(kit, [-38, -30.5], [38, -30.5], 31));
  dressing.add(makeTreeline(kit, [-36, 30.2], [36, 30.2], 3.5, 41));
  dressing.add(makeTreeline(kit, [-38.3, -28], [-38.3, 28], 3.6, 42));
  dressing.add(makeTreeline(kit, [38.5, 8], [38.5, 30], 3.5, 43));
  // forest masses (SW + SE blocks flanking the spawn corridor, NE mist bank)
  const forestRand = seededRandom(71);
  const forestBlocks: Array<[number, number, number, number, number]> = [
    [-38, -16, 9, 27, 9], // [minX, maxX, minZ, maxZ, count]
    [0, 36, 10, 27, 13],
    [23, 38, -28, -22, 7],
  ];
  for (const [minX, maxX, minZ, maxZ, count] of forestBlocks) {
    for (let i = 0; i < count; i += 1) {
      const tree = makeTree(kit, 4.2 + forestRand() * 2);
      tree.position.set(
        minX + forestRand() * (maxX - minX),
        0,
        minZ + forestRand() * (maxZ - minZ),
      );
      tree.rotation.y = forestRand() * Math.PI * 2;
      dressing.add(tree);
    }
  }
  // scattered field/yard trees (collidable singles)
  const fieldTreeSpots: Array<[number, number, number]> = [
    [-10, -8, 5.4], // [x, z, height]
    [0, -24, 5.8],
    [4, -26, 5.0],
    [-30, -8, 6.0],
    [-33, -24, 5.6],
    [-5, -27, 5.2],
  ];
  for (const [tx, tz, th] of fieldTreeSpots) {
    const tree = makeTree(kit, th);
    tree.position.set(tx, 0, tz);
    dressing.add(tree);
  }

  // ─────────────────────────────────────────────── grass dressing ──
  const grassPatches: Array<[number, number, number, number, number, number]> = [
    [-8, 19, 10, 16, 30, 81], // [cx, cz, w, d, count, seed]
    [-3, -10.5, 26, 17, 46, 82],
    [-27.5, -22, 17, 12, 16, 83],
    [18.3, -12.5, 9, 3.6, 8, 84],
  ];
  for (const [cx, cz, w, d, count, seed] of grassPatches) {
    const tufts = makeGrassTufts(kit, w, d, count, seed);
    tufts.position.set(cx, cz === -12.5 ? 0.16 : 0, cz);
    dressing.add(tufts);
  }

  // ─────────────────────────────────────────── stone lanterns (≤15 m) ──
  const lanternSpots: Array<[number, number]> = [
    [-6.4, 25.2], // spawn glade
    [-6.4, 12], // past the log
    [-14.4, -1.4], // farm gate, north side
    [9.6, -5.2], // willow shore path
    [11.9, -2.4], // dock base
    [-4.8, -12.6], // open field
    [-22.4, -9.6], // cottage path
    [15, -13.8], // promontory south edge
  ];
  const lanternCores: THREE.Mesh[] = [];
  for (const [lx, lz] of lanternSpots) {
    const lantern = makeStoneLantern(kit);
    lantern.group.position.set(lx, 0, lz);
    group.add(lantern.group);
    lanternCores.push(lantern.core);
  }

  // ───────────────────────────────────────────────────────── wisps ──
  const cursedWisps = createWisps(
    kit,
    [v3(20, 2.6, -13.6), v3(21.8, 3.4, -11.6), v3(22.6, 2.2, -13), v3(19.6, 3.8, -11.9), v3(21.2, 4.4, -12.8)],
    { drift: 0.5 },
  );
  group.add(cursedWisps.group);
  const lakeWisps = createWisps(
    kit,
    [v3(25, 1.2, -5), v3(28, 1.7, -8.5), v3(23, 1, -1.5), v3(30.5, 1.4, -3)],
    { drift: 1.1 },
  );
  group.add(lakeWisps.group);
  const gladeWisps = createWisps(kit, [v3(-7, 1.3, 22), v3(-9, 1.1, 18)], { drift: 0.8 });
  group.add(gladeWisps.group);
  const wispBuilds: WispsBuild[] = [cursedWisps, lakeWisps, gladeWisps];

  // merge the static dressing into one mesh per material
  group.add(mergeStatic(dressing));

  // ─────────────────────────────────────────────────── colliders ──
  // The gate collider keeps its identity — setGateOpen splices it in/out.
  const gateCollider = aabb(-17.1, -0.2, -14.9, 0.2);

  const colliders: ColliderShape[] = [
    // — map edges —
    aabb(-40, -32, 40, -29), // north pine ridge
    aabb(-40, 29, 40, 32), // south treeline
    aabb(-40, -32, -37, 32), // west treeline
    aabb(37, -32, 40, 32), // east treeline / mist
    // — forest masses (funnel the south corridor, seal dead space) —
    aabb(-40, 7, -14, 29), // SW forest
    aabb(-2, 7, 40, 29), // SE forest
    aabb(22, -29, 40, -21), // NE mist bank
    // — hollow log size-gate: 0.6 u gap at x -8.3..-7.7 (fox r .25 ✓ human r .35 ✗) —
    aabb(-14, 8.4, -8.3, 9.6),
    aabb(-7.7, 8.4, -2, 9.6),
    // — south creek (water walls walking; Bound crosses the 2 m narrows) —
    aabb(-40, 3, -10, 7), // west reach
    aabb(-10, 4, -6, 6), // [B1] 2 m Bound-gap narrows
    aabb(-6, 3, 15, 7), // east reach to the lake
    // — farm fence line (gate is the only human passage; reeds for fox) —
    aabb(-37, -0.2, -17.1, 0.2), // fence west of gate
    gateCollider, // [B2] farm gate (removable)
    aabb(-14.9, -0.2, 3, 0.2), // fence east of gate
    // — reed bed with the fox tunnel: 0.6 u gap at x 6.2..6.8 —
    aabb(3, -1, 6.2, 2.5),
    aabb(6.8, -1, 15, 2.5),
    // — lake (tiles leave the promontory + dock slot walkable) —
    aabb(13, -21, 40, -15), // north lobe
    aabb(24, -15, 40, -10), // east of promontory
    aabb(13, -10, 40, -2), // west lobe (shore at x 13)
    aabb(18, -2, 40, -0.5), // east of dock tip
    aabb(13, -0.5, 40, 2.5), // south of dock
    aabb(15, 2.5, 40, 7), // south lobe to the creek mouth
    // — north creek + stepping-stone gap at z -25.4..-24.2 —
    aabb(15, -29, 17.5, -25.4),
    aabb(15, -24.2, 17.5, -21),
    // — cottage yard fences (path opening x -27.1..-24.9 · fox gap z -20.9..-20.3) —
    aabb(-37, -15.2, -27.1, -14.8),
    aabb(-24.9, -15.2, -18, -14.8),
    aabb(-18.2, -29, -17.8, -20.9),
    aabb(-18.2, -20.3, -17.8, -15.2),
    // — cottage + crates (prop-local shapes, offset to world) —
    ...offsetColliders(cottage.collidersLocal, COTTAGE_X, COTTAGE_Z),
    // — boulders + promontory rock —
    circle(8, -15, 1.25),
    circle(-2, -17, 1.15),
    circle(-12, -18.5, 1.35),
    circle(17.2, -10.8, 0.85),
    // — willow trunks —
    circle(10.8, -3.2, 0.4),
    circle(12.4, -7.4, 0.4),
    circle(14.6, -10.8, 0.45),
    circle(21, -12.5, 0.55), // the Cursed Willow
    // — landmark trees & props —
    circle(-10.5, 27.5, 0.7), // sleeping tree
    circle(-9.4, 15, 0.45), // shrine
    circle(19.5, -22.5, 0.9), // rowboat
    circle(-10, -8, 0.5),
    circle(0, -24, 0.55),
    circle(4, -26, 0.5),
    circle(-30, -8, 0.6),
    circle(-33, -24, 0.6),
    circle(-5, -27, 0.5),
    // — stone lanterns —
    ...lanternSpots.map(([lx, lz]) => circle(lx, lz, 0.22)),
  ];

  // ──────────────────────────────────────────────────────── anchors ──
  const anchors: ExteriorAnchors = {
    spawn: v3(-8, 0, 27),
    shrine: v3(-8.8, 0, 15),
    log: v3(-8, 0, 9),
    creekGap: v3(-8, 0, 5),
    gate: v3(-16, 0, 0),
    willow: v3(21, 0, -12.5),
    ghostSpot: v3(22.3, 0, -13.2),
    dock: v3(13, 0, -1.2),
    boulders: [v3(8, 0, -15), v3(-2, 0, -17), v3(-12, 0, -18.5)],
    window: v3(-19.6, 0, -20.5), // beside the crates, east of the cottage
    door: v3(COTTAGE_X + cottage.doorLocal.x, 0, COTTAGE_Z + cottage.doorLocal.z),
    bodyMound: v3(20.2, 0, -11.8),
    reedTunnel: v3(6.5, 0, 0.5),
    fenceGap: v3(-18, 0, -20.6),
  };

  // ───────────────────────────────── lash zones & wind shadows ──
  const lashZones: LashZone[] = [
    { id: 'lash-row-1', center: v3(10.8, 0, -3.2), radius: 2.8 },
    { id: 'lash-row-2', center: v3(12.4, 0, -7.4), radius: 2.8 },
    { id: 'lash-row-3', center: v3(14.6, 0, -10.8), radius: 2.8 },
    { id: 'lash-cursed', center: v3(21, 0, -12.5), radius: 4.2 },
  ];

  const windShadows: WindShadow[] = [
    { center: v3(9.9, 0, -13.1), radius: 1.7 }, // boulder 1 lee
    { center: v3(-0.1, 0, -15.1), radius: 1.7 }, // boulder 2 lee
    { center: v3(-10.1, 0, -16.6), radius: 1.7 }, // boulder 3 lee
    { center: v3(18.4, 0, -11.4), radius: 1.6 }, // promontory rock (finale cover)
    { center: v3(12.9, 0, 0.3), radius: 1.2 }, // dock posts
    { center: v3(-20.2, 0, -17.2), radius: 2.2 }, // cottage lee (window staging)
  ];

  // ─────────────────────────────────────────── gate handle + update ──
  function setGateOpen(open: boolean): void {
    const index = colliders.indexOf(gateCollider);
    if (open && index !== -1) colliders.splice(index, 1);
    if (!open && index === -1) colliders.push(gateCollider);
    gate.pivot.rotation.y = open ? -1.9 : 0;
  }

  let time = 0;
  function update(dt: number, wind?: WindState): void {
    time += dt;
    for (const wisp of wispBuilds) wisp.update(dt, wind);
    for (let i = 0; i < lanternCores.length; i += 1) {
      const core = lanternCores[i];
      if (!core) continue;
      core.scale.setScalar(1 + 0.08 * Math.sin(time * 9 + i * 2.1) * Math.sin(time * 2.3 + i));
    }
  }

  return {
    group,
    colliders,
    anchors,
    lashZones,
    windShadows,
    cuttableBranches: cursed.cuttableBranches,
    setGateOpen,
    update,
  };
}
