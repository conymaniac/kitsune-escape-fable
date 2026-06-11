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
 *
 * Camera note: the iso camera looks from the world SE, so the south and
 * east walls are built as knee-height cutaway walls (their COLLIDERS are
 * full walls). M2/M4 may swap in fading occluders; data stays put.
 *
 * Extras beyond InteriorBuildResult (for the M1 integrator):
 * - `papers`         — individual sheet meshes for the M4 flutter sim
 * - `dagger`         — the pickup mesh (hide on ItemPickedUp)
 * - `setDrawerOpen`  — slides the kitchen drawer out/in
 * - `setDoorOpen`    — slides the genkan door panel (exit via sandals path)
 *
 * Lighting: one warm PointLight + a dim HemisphereLight live INSIDE the
 * returned group as placeholders until stream A ships the interior rig.
 */
import * as THREE from 'three';
import type {
  ColliderShape,
  InteriorAnchors,
  InteriorBuildResult,
  MaterialKit,
} from '@/core/types';
import { aabb } from '@/world/colliders';
import { paletteHex } from '@/style/palette';
import {
  makeFloorLantern,
  makeFuton,
  makeKitchenCounter,
  makeLowTable,
  makePapers,
  makeSandals,
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

  // ──────────────────────────────────────────────────────── floor ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 8.8), kit.toon('woodWarm'));
  floor.rotateX(-Math.PI / 2);
  floor.name = 'floor';
  group.add(floor);

  // genkan band (packed-earth entry, south side)
  const genkan = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 1.15), kit.toon('earthDark'));
  genkan.rotateX(-Math.PI / 2);
  genkan.position.set(0, 0.008, 3.45);
  group.add(genkan);
  const genkanStep = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.1, 0.1), kit.toon('woodDark'));
  genkanStep.position.set(0, 0.05, 2.9);
  group.add(genkanStep);

  // ─────────────────────────────────────────────────────── walls ──
  const wallMat = kit.toon('paperAged');
  const beamMat = kit.toon('woodDark');
  const FULL_H = 2.4;
  const KNEE_H = 0.55; // camera-side cutaway walls (colliders stay full)

  const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(10.8, FULL_H, 0.4), wallMat);
  wallNorth.position.set(0, FULL_H / 2, -4.15);
  group.add(wallNorth);

  const wallWest = new THREE.Mesh(new THREE.BoxGeometry(0.4, FULL_H, 8.8), wallMat);
  wallWest.position.set(-5.15, FULL_H / 2, 0);
  group.add(wallWest);

  // south wall: knee-height, split around the door opening (x -0.3..1.5)
  const southWestLen = 5.1; // x -5.4..-0.3
  const southWest = new THREE.Mesh(new THREE.BoxGeometry(southWestLen, KNEE_H, 0.4), wallMat);
  southWest.position.set(-2.85, KNEE_H / 2, 4.15);
  group.add(southWest);
  const southEastLen = 3.9; // x 1.5..5.4
  const southEast = new THREE.Mesh(new THREE.BoxGeometry(southEastLen, KNEE_H, 0.4), wallMat);
  southEast.position.set(3.45, KNEE_H / 2, 4.15);
  group.add(southEast);

  // east wall: knee-height, split around the window opening (z -1.35..0.15)
  const eastNorth = new THREE.Mesh(new THREE.BoxGeometry(0.4, KNEE_H, 3.05), wallMat);
  eastNorth.position.set(5.15, KNEE_H / 2, -2.875);
  group.add(eastNorth);
  const eastSouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, KNEE_H, 4.25), wallMat);
  eastSouth.position.set(5.15, KNEE_H / 2, 2.275);
  group.add(eastSouth);
  // window sill + frame posts on the knee wall
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 1.7), beamMat);
  sill.position.set(5.15, KNEE_H + 0.05, -0.6);
  group.add(sill);
  for (const fz of [-1.35, 0.15]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), beamMat);
    post.position.set(5.15, 0.75, fz);
    group.add(post);
  }
  // night outside the open window (dim blue plane past the wall)
  const night = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), kit.emissive('nightHorizon', 0.5));
  night.rotation.y = -Math.PI / 2;
  night.position.set(5.6, 0.95, -0.6);
  group.add(night);

  // corner posts
  for (const [px, pz] of [
    [-5.05, -4.05],
    [5.05, -4.05],
    [-5.05, 4.05],
    [5.05, 4.05],
  ] as Array<[number, number]>) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, FULL_H, 0.22), beamMat);
    post.position.set(px, FULL_H / 2, pz);
    group.add(post);
  }

  // kitchen divider (panel pushed aside — alcove opening stays south)
  const divider = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.9, 1.3), wallMat);
  divider.position.set(-2.35, 0.95, -3.25);
  group.add(divider);

  // ──────────────────────────────────────────────────────── props ──
  const tatami = makeTatami(kit);
  tatami.group.position.set(0.4, 0, 0);
  group.add(tatami.group);

  const table = makeLowTable(kit);
  table.group.position.set(1.25, 0, 0.25);
  group.add(table.group);

  const futon = makeFuton(kit);
  futon.group.position.set(-2.6, 0, 1.4);
  futon.group.rotation.y = 0.16;
  group.add(futon.group);

  const papersBuild = makePapers(kit, 7, 47);
  papersBuild.group.position.set(-2.2, 0, 1.8);
  group.add(papersBuild.group);

  const counter = makeKitchenCounter(kit);
  counter.group.position.set(-3.7, 0, -3.45);
  group.add(counter.group);

  const sandals = makeSandals(kit);
  sandals.group.position.set(1.8, 0, 3.6);
  sandals.group.rotation.y = -0.25; // facing INTO the house — the wrong way
  group.add(sandals.group);

  const door = makeSlidingDoor(kit);
  door.group.position.set(0.6, 0, 4.0);
  group.add(door.group);

  const lantern = makeFloorLantern(kit);
  lantern.group.position.set(-0.6, 0, -1.0);
  group.add(lantern.group);

  // ──────────────────────── placeholder warm lighting (stream A later) ──
  const warm = new THREE.PointLight(paletteHex('lanternAmber'), 6, 12, 1.6);
  warm.position.set(-0.6, 1.7, -1.0);
  group.add(warm);
  const fill = new THREE.HemisphereLight(paletteHex('nightHorizon'), paletteHex('inkBlack'), 0.5);
  group.add(fill);

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
