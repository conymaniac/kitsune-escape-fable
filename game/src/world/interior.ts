/**
 * buildInterior(kit) — the cottage interior, a separate 10×8 scene at the
 * origin (DESIGN.md §4). Room interior spans X -5..5, Z -4..4; NORTH = -Z
 * (matching the exterior's compass: the genkan/entry is the SOUTH wall).
 *
 * Layout (FINAL): genkan band along the south wall with the blocked
 * sliding door + sandals against its rail; main 4-tatami room with the
 * low table (+2 moldy plates), the filthy futon and scattered diary
 * papers; kitchen alcove NW behind a pushed-aside panel, counter with the
 * dagger drawer; open window on the EAST wall with the windowLanding.
 * M2 adds: aged-plaster wall paint with a visible post-and-beam rhythm,
 * plank floor grain, a small household shrine shelf on the north wall —
 * abandoned-but-once-loved.
 *
 * Camera note: the iso camera looks from the world SE, so the south and
 * east walls are built as knee-height cutaway walls (their COLLIDERS are
 * full walls). M4 may swap in fading occluders; data stays put.
 *
 * Extras beyond InteriorBuildResult (for the integrator, unchanged):
 * - `papers`         — individual sheet meshes for the M4 flutter sim
 * - `dagger`         — the pickup mesh (hide on ItemPickedUp)
 * - `setDrawerOpen`  — slides the kitchen drawer out/in
 * - `setDoorOpen`    — slides the genkan door panel (exit via sandals path)
 *
 * Lighting: NONE in this group since M2 — style/lighting.ts owns the
 * interior rig (M1 placeholder lights removed).
 *
 * Draw calls: static dressing is routed through mergeStatic; the animated
 * counter (drawer), sliding door (panel) and the relocatable sandals
 * group stay direct children so gameplay references and local-space
 * mechanisms (setDrawerOpen/setDoorOpen, sandals shift) keep working.
 */
import * as THREE from 'three';
import type {
  ColliderShape,
  InteriorAnchors,
  InteriorBuildResult,
  MaterialKit,
} from '@/core/types';
import { aabb } from '@/world/colliders';
import { mergeStatic } from '@/world/merge';
import { noise2, paintVertexColors, smoothNoise2, tone } from '@/world/props/meshUtils';
import {
  makeFloorLantern,
  makeFuton,
  makeKitchenCounter,
  makeLowTable,
  makePapers,
  makeSandals,
  makeShrineNook,
  makeSlidingDoor,
  makeTatami,
} from '@/world/props/propsInterior';

export interface InteriorBuild extends InteriorBuildResult {
  papers: THREE.Mesh[];
  dagger: THREE.Mesh;
  setDrawerOpen(open: boolean): void;
  setDoorOpen(open: boolean): void;
}

const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

export function buildInterior(kit: MaterialKit): InteriorBuild {
  const group = new THREE.Group();
  group.name = 'interior';

  // static dressing — merged into one mesh per material at the end
  const dressing = new THREE.Group();
  dressing.name = 'interior-dressing';

  // ──────────────────────────────────────────────────────── floor ──
  const floorGeo = new THREE.PlaneGeometry(10.8, 8.8, 36, 12);
  floorGeo.rotateX(-Math.PI / 2);
  paintVertexColors(floorGeo, (x, _y, z, out) => {
    // worn plank run along X, board rows across Z
    const row = Math.floor((z + 10) / 0.62);
    const grain = 0.62 + 0.26 * noise2(row * 3.3, x * 1.3) + 0.14 * noise2(x * 6, z * 9);
    out.setRGB(grain, grain * 0.99, grain * 1.04);
    if (Math.abs(((z + 10) % 0.62) - 0.31) > 0.27) out.multiplyScalar(0.8); // board seams
    // foot-polished path: genkan → table → kitchen
    const path = Math.min(Math.abs(x - 0.6) / 1.6 + Math.max(z - 2, 0), Math.hypot((x - 1.25) / 2, (z - 0.25) / 1.5));
    if (path < 1) out.multiplyScalar(1.05 + 0.06 * (1 - path));
  });
  const floor = new THREE.Mesh(floorGeo, kit.toon('woodWarm', { vertexColors: true }));
  floor.name = 'floor';
  dressing.add(floor);

  // genkan band (packed-earth entry, south side)
  const genkanGeo = new THREE.PlaneGeometry(10.4, 1.15, 24, 4);
  genkanGeo.rotateX(-Math.PI / 2);
  paintVertexColors(genkanGeo, (x, _y, z, out) => {
    const j = 0.7 + 0.3 * smoothNoise2(x * 1.7, z * 3) + 0.14 * noise2(x * 9, z * 9);
    out.setRGB(j, j, j * 1.03); // packed earth, cold sheen
    if (noise2(x * 2.7 + 5, z * 4) > 0.78) out.multiplyScalar(1.16); // trodden-in flat stones
  });
  const genkan = new THREE.Mesh(genkanGeo, kit.toon('earthDark', { vertexColors: true }));
  genkan.position.set(0, 0.008, 3.45);
  dressing.add(genkan);
  const genkanStepGeo = new THREE.BoxGeometry(10.4, 0.1, 0.1, 16, 1, 1);
  paintVertexColors(genkanStepGeo, (x, y, _z, out) => {
    const j = 0.64 + 0.3 * noise2(x * 4, y * 7) + 0.1 * noise2(x * 13, 3);
    out.setRGB(j, j, j * 1.04);
    if (y > 0.03) out.multiplyScalar(1.12); // edge worn pale by feet
  });
  const genkanStep = new THREE.Mesh(genkanStepGeo, kit.toon('woodDark', { vertexColors: true }));
  genkanStep.position.set(0, 0.05, 2.9);
  dressing.add(genkanStep);

  // ─────────────────────────────────────────────────────── walls ──
  const wallMat = kit.toon('paperAged', { vertexColors: true });
  const beamMat = kit.toon('woodDark', { vertexColors: true });
  const FULL_H = 2.4;
  const KNEE_H = 0.55; // camera-side cutaway walls (colliders stay full)

  /** Aged plaster: patchy wash, dark wood wainscot, smoke-dimmed top. */
  const paintPlaster = (g: THREE.BufferGeometry, seed: number, axis: 'x' | 'z'): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const along = axis === 'x' ? x : z;
      const j = 0.74 + 0.22 * smoothNoise2(along * 0.9 + seed, y * 1.4) + 0.1 * noise2(along * 7, y * 6 + seed);
      out.setRGB(j, j * 0.985, j * 0.95);
      if (y < 0.82) {
        // plank wainscot below the rail
        const plank = Math.floor(along / 0.3);
        const w = 0.66 + 0.3 * noise2(plank * 4.3 + seed, y * 2);
        out.copy(tone('paperAged', 'woodDark')).multiplyScalar(w);
      }
      if (y > 1.9) out.multiplyScalar(0.82); // years of lamp smoke
      if (noise2(along * 1.9 + seed * 3, y * 2.3) > 0.83) out.multiplyScalar(0.88); // damp blooms
    });
  const paintBeam = (g: THREE.BufferGeometry, seed: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.68 + 0.34 * noise2(x * 3.4 + seed, y * 4.2 + z * 3.1);
      out.setRGB(j, j * 0.99, j * 1.05);
    });

  const wallNorthGeo = new THREE.BoxGeometry(10.8, FULL_H, 0.4, 20, 6, 1);
  wallNorthGeo.translate(0, FULL_H / 2, -4.15);
  paintPlaster(wallNorthGeo, 2, 'x');
  dressing.add(new THREE.Mesh(wallNorthGeo, wallMat));

  const wallWestGeo = new THREE.BoxGeometry(0.4, FULL_H, 8.8, 1, 6, 16);
  wallWestGeo.translate(-5.15, FULL_H / 2, 0);
  paintPlaster(wallWestGeo, 7, 'z');
  dressing.add(new THREE.Mesh(wallWestGeo, wallMat));

  // south wall: knee-height, split around the door opening (x -0.3..1.5)
  const southWestGeo = new THREE.BoxGeometry(5.1, KNEE_H, 0.4, 10, 2, 1);
  southWestGeo.translate(-2.85, KNEE_H / 2, 4.15);
  paintPlaster(southWestGeo, 11, 'x');
  dressing.add(new THREE.Mesh(southWestGeo, wallMat));
  const southEastGeo = new THREE.BoxGeometry(3.9, KNEE_H, 0.4, 8, 2, 1);
  southEastGeo.translate(3.45, KNEE_H / 2, 4.15);
  paintPlaster(southEastGeo, 13, 'x');
  dressing.add(new THREE.Mesh(southEastGeo, wallMat));

  // east wall: knee-height, split around the window opening (z -1.35..0.15)
  const eastNorthGeo = new THREE.BoxGeometry(0.4, KNEE_H, 3.05, 1, 2, 6);
  eastNorthGeo.translate(5.15, KNEE_H / 2, -2.875);
  paintPlaster(eastNorthGeo, 17, 'z');
  dressing.add(new THREE.Mesh(eastNorthGeo, wallMat));
  const eastSouthGeo = new THREE.BoxGeometry(0.4, KNEE_H, 4.25, 1, 2, 8);
  eastSouthGeo.translate(5.15, KNEE_H / 2, 2.275);
  paintPlaster(eastSouthGeo, 19, 'z');
  dressing.add(new THREE.Mesh(eastSouthGeo, wallMat));

  // knee-wall cap rails (reads as a deliberate cutaway, not a broken wall)
  for (const [cx, cz, len, alongX] of [
    [-2.85, 4.15, 5.1, true],
    [3.45, 4.15, 3.9, true],
    [5.15, -2.875, 3.05, false],
    [5.15, 2.275, 4.25, false],
  ] as Array<[number, number, number, boolean]>) {
    const capGeo = new THREE.BoxGeometry(alongX ? len : 0.44, 0.06, alongX ? 0.44 : len);
    paintBeam(capGeo, cx + cz);
    const cap = new THREE.Mesh(capGeo, beamMat);
    cap.position.set(cx, KNEE_H + 0.03, cz);
    dressing.add(cap);
  }

  // window sill + frame posts on the east knee wall
  const sillGeo = new THREE.BoxGeometry(0.44, 0.1, 1.7);
  paintBeam(sillGeo, 23);
  const sill = new THREE.Mesh(sillGeo, beamMat);
  sill.position.set(5.15, KNEE_H + 0.05, -0.6);
  dressing.add(sill);
  for (const fz of [-1.35, 0.15]) {
    const postGeo = new THREE.BoxGeometry(0.14, 1.5, 0.14);
    paintBeam(postGeo, fz * 7);
    const post = new THREE.Mesh(postGeo, beamMat);
    post.position.set(5.15, 0.75, fz);
    dressing.add(post);
  }
  // night outside the open window (dim blue plane past the wall)
  const night = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), kit.emissive('nightHorizon', 0.5));
  night.rotation.y = -Math.PI / 2;
  night.position.set(5.6, 0.95, -0.6);
  night.userData['noMerge'] = true;
  dressing.add(night);

  // post-and-beam rhythm: corner posts + intermediate posts + kamoi rail
  const postSpots: Array<[number, number, number]> = [
    [-5.05, -4.05, FULL_H], [5.05, -4.05, FULL_H], [-5.05, 4.05, FULL_H], [5.05, 4.05, FULL_H],
    [-2.6, -4.02, FULL_H], [0, -4.02, FULL_H], [2.6, -4.02, FULL_H], // north rhythm
    [-5.02, -2, FULL_H], [-5.02, 0.4, FULL_H], [-5.02, 2.4, FULL_H], // west rhythm
    [-0.32, 4.05, KNEE_H + 0.12], [1.52, 4.05, KNEE_H + 0.12], // door jambs
  ];
  for (let i = 0; i < postSpots.length; i += 1) {
    const p = postSpots[i];
    if (!p) continue;
    const postGeo = new THREE.BoxGeometry(0.18, p[2], 0.18);
    paintBeam(postGeo, i * 5);
    const post = new THREE.Mesh(postGeo, beamMat);
    post.position.set(p[0], p[2] / 2, p[1]);
    dressing.add(post);
  }
  for (const [cx, cz, len, alongX] of [
    [0, -4.02, 10.2, true], // north kamoi
    [-5.02, 0, 8.2, false], // west kamoi
  ] as Array<[number, number, number, boolean]>) {
    const railGeo = new THREE.BoxGeometry(alongX ? len : 0.14, 0.16, alongX ? 0.14 : len);
    paintBeam(railGeo, cx * 3 + cz);
    const rail = new THREE.Mesh(railGeo, beamMat);
    rail.position.set(cx, 1.78, cz);
    dressing.add(rail);
  }

  // kitchen divider (shoji panel pushed aside — alcove opening stays south).
  // Painted as a slid-open paper panel (cell shadow lines + wood rails), NOT
  // bare plaster — as the brightest surface near the andon it must read as
  // a deliberate door, not a white monolith.
  const dividerGeo = new THREE.BoxGeometry(0.12, 1.9, 1.3, 1, 8, 6);
  dividerGeo.translate(-2.35, 0.95, -3.25);
  paintVertexColors(dividerGeo, (x, y, z, out) => {
    const j = 0.7 + 0.14 * noise2(z * 7, y * 7) + 0.07 * noise2(z * 17, y * 13);
    out.setRGB(j, j, j * 0.96);
    // shoji cell shadow lines (cells in the ZY face plane)
    const cz = Math.abs(((z + 10) % 0.33) - 0.165);
    const cy = Math.abs(((y + 10) % 0.36) - 0.18);
    if (cz > 0.14 || cy > 0.155) out.multiplyScalar(0.66);
    // wood rails top/bottom + handled edge
    if (y < 0.18 || y > 1.74 || Math.abs(x + 2.35) > 0.055) out.multiplyScalar(0.8);
    if (noise2(z * 3 + 9, y * 2.3) > 0.85) out.multiplyScalar(0.88); // aged blotches
  });
  dressing.add(new THREE.Mesh(dividerGeo, wallMat));

  // — kitchen wall rack: hanging utensils over the counter (mood board) —
  const railGeo2 = new THREE.BoxGeometry(1.7, 0.06, 0.06);
  paintBeam(railGeo2, 31);
  const rack = new THREE.Mesh(railGeo2, beamMat);
  rack.position.set(-3.75, 1.62, -3.92);
  dressing.add(rack);
  const utensilMat = kit.toon('inkCharcoal', { vertexColors: true });
  const paintIron = (g: THREE.BufferGeometry, seed: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.7 + 0.3 * noise2(x * 9 + seed, y * 7 + z * 5);
      out.setRGB(j * 0.97, j, j * 1.08); // cold iron/clay sheen
    });
  // ladle: thin handle + small cup
  const ladleHandle = new THREE.BoxGeometry(0.035, 0.42, 0.035);
  paintIron(ladleHandle, 3);
  const ladle = new THREE.Mesh(ladleHandle, utensilMat);
  ladle.position.set(-4.35, 1.38, -3.9);
  ladle.rotation.z = 0.06;
  dressing.add(ladle);
  const ladleCup = new THREE.CylinderGeometry(0.07, 0.05, 0.08, 7);
  paintIron(ladleCup, 5);
  const cup = new THREE.Mesh(ladleCup, utensilMat);
  cup.position.set(-4.33, 1.15, -3.9);
  dressing.add(cup);
  // hanging pot — squat clay belly under the rail
  const potGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.18, 8);
  paintVertexColors(potGeo, (x, y, z, out) => {
    const j = 0.74 + 0.26 * noise2(Math.atan2(z, x) * 2.1, y * 6);
    out.setRGB(j * 0.98, j, j * 1.06);
    if (y > 0.06) out.multiplyScalar(1.14); // glaze shoulder catch-light
  });
  const pot = new THREE.Mesh(potGeo, utensilMat);
  pot.position.set(-3.85, 1.4, -3.88);
  dressing.add(pot);
  // cleaver: flat blade + stub handle, hung point-down
  const bladeGeo = new THREE.BoxGeometry(0.16, 0.24, 0.02);
  paintVertexColors(bladeGeo, (x, y, _z, out) => {
    const j = 0.9 + 0.3 * noise2(x * 11, y * 9);
    out.copy(tone('inkCharcoal', 'moonlight')).multiplyScalar(0.4 + 0.2 * j); // dull steel
  });
  const blade = new THREE.Mesh(bladeGeo, utensilMat);
  blade.position.set(-3.3, 1.42, -3.9);
  blade.rotation.z = -0.08;
  dressing.add(blade);
  const handleGeo = new THREE.BoxGeometry(0.045, 0.16, 0.045);
  paintBeam(handleGeo, 37);
  const cleaverHandle = new THREE.Mesh(handleGeo, beamMat);
  cleaverHandle.position.set(-3.28, 1.6, -3.9);
  dressing.add(cleaverHandle);

  // ──────────────────────────────────────────────────────── props ──
  const tatami = makeTatami(kit);
  tatami.group.position.set(0.4, 0, 0);
  dressing.add(tatami.group);

  const table = makeLowTable(kit);
  table.group.position.set(1.25, 0, 0.25);
  dressing.add(table.group);

  const futon = makeFuton(kit);
  futon.group.position.set(-2.6, 0, 1.4);
  futon.group.rotation.y = 0.16;
  dressing.add(futon.group);

  const papersBuild = makePapers(kit, 7, 47);
  papersBuild.group.position.set(-2.2, 0, 1.8);
  dressing.add(papersBuild.group); // sheets are noMerge — identities survive

  const shrineNook = makeShrineNook(kit);
  shrineNook.group.position.set(1.7, 1.42, -3.78);
  dressing.add(shrineNook.group);

  const lantern = makeFloorLantern(kit);
  lantern.group.position.set(-0.6, 0, -1.0);
  dressing.add(lantern.group); // core is noMerge — identity survives

  // — animated / relocatable props stay OUT of the merge —
  const counter = makeKitchenCounter(kit);
  counter.group.position.set(-3.7, 0, -3.45);
  group.add(counter.group);

  const sandals = makeSandals(kit);
  sandals.group.position.set(1.8, 0, 3.6);
  sandals.group.rotation.y = -0.25; // facing INTO the house — the wrong way
  group.add(sandals.group); // questScript shifts this group by name

  const door = makeSlidingDoor(kit);
  door.group.position.set(0.6, 0, 4.0);
  group.add(door.group);

  // merge the static dressing into one mesh per material
  group.add(mergeStatic(dressing));

  // ──────────────────────────────────────────────────── colliders ──
  const colliders: ColliderShape[] = [
    aabb(-5.4, -4.4, 5.4, -3.9), // north wall
    aabb(-5.4, 3.9, 5.4, 4.4), // south wall (door exit is scripted)
    aabb(-5.4, -4.4, -4.9, 4.4), // west wall
    aabb(4.9, -4.4, 5.4, 4.4), // east wall (window leap is scripted)
    aabb(-4.9, -3.9, -2.6, -3.05), // kitchen counter
    aabb(-2.5, -3.9, -2.2, -2.6), // kitchen divider
    aabb(0.5, -0.4, 2.0, 0.9), // low table
  ];

  // ──────────────────────────────────────────────────────── anchors ──
  const anchors: InteriorAnchors = {
    windowLanding: v3(4.1, 0, -0.6),
    doorSpawn: v3(0.6, 0, 3.1),
    table: v3(1.25, 0, 0.25),
    futon: v3(-2.6, 0, 1.4),
    papers: v3(-1.7, 0, 2.2),
    drawer: v3(-3.7, 0, -2.6),
    sandals: v3(1.8, 0, 3.6),
    door: v3(0.6, 0, 3.9),
  };

  function setDoorOpen(open: boolean): void {
    door.panel.position.x = open ? 0.7 : -0.25;
  }

  return {
    group,
    colliders,
    anchors,
    papers: papersBuild.papers,
    dagger: counter.dagger,
    setDrawerOpen: counter.setDrawerOpen,
    setDoorOpen,
  };
}
