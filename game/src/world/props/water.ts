/**
 * Water bodies — the spectral lake, both creeks, stepping stones, old dock.
 *
 * GREYBOX (M1): flat kit.water() planes; M2 swaps the lake material for the
 * real shader behind the same MaterialKit signature. Layout is FINAL and
 * matches the water colliders assembled in world/exterior.ts:
 * - lake: rounded plane centred (27, -6), ~31×28
 * - south creek: Z 3..7 from the west map edge to the lake, with the 2 m
 *   Bound-gap narrows at X -10..-6 (anchor creekGap)
 * - north creek: X 15..17.5 from the ridge into the lake's north lobe,
 *   stepping stones at Z ≈ -24.8
 * - old dock: walkable finger at Z -2..-0.5, X 12.5..18
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';

export interface WaterBuild {
  group: THREE.Group;
}

export function buildWater(kit: MaterialKit): WaterBuild {
  const group = new THREE.Group();
  group.name = 'water';
  const waterMat = kit.water();

  // — lake + shore ring —
  const shore = new THREE.Mesh(new THREE.CircleGeometry(1, 48), kit.toon('lakeShallow'));
  shore.geometry.rotateX(-Math.PI / 2);
  shore.scale.set(16.4, 1, 14.9);
  shore.position.set(27, 0.03, -6);
  shore.name = 'lake-shore-ring';
  shore.userData['noMerge'] = true;
  group.add(shore);

  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 48), waterMat);
  lake.geometry.rotateX(-Math.PI / 2);
  lake.scale.set(15.5, 1, 14);
  lake.position.set(27, 0.05, -6);
  lake.name = 'lake';
  lake.userData['noMerge'] = true;
  group.add(lake);

  // — south creek (west piece · 2 m narrows at B1 · east piece) —
  const creekWest = new THREE.Mesh(new THREE.PlaneGeometry(30, 4), waterMat);
  creekWest.rotateX(-Math.PI / 2);
  creekWest.position.set(-25, 0.04, 5);
  creekWest.userData['noMerge'] = true;
  group.add(creekWest);

  const creekNarrows = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), waterMat);
  creekNarrows.rotateX(-Math.PI / 2);
  creekNarrows.position.set(-8, 0.04, 5);
  creekNarrows.name = 'creek-bound-gap';
  creekNarrows.userData['noMerge'] = true;
  group.add(creekNarrows);

  const creekEast = new THREE.Mesh(new THREE.PlaneGeometry(21, 4), waterMat);
  creekEast.rotateX(-Math.PI / 2);
  creekEast.position.set(4.5, 0.04, 5);
  creekEast.userData['noMerge'] = true;
  group.add(creekEast);

  // creek bank hints
  const bankMat = kit.toon('earthDark');
  const bankNorth = new THREE.Mesh(new THREE.PlaneGeometry(55, 0.6), bankMat);
  bankNorth.rotateX(-Math.PI / 2);
  bankNorth.position.set(-12.5, 0.012, 2.8);
  group.add(bankNorth);
  const bankSouth = new THREE.Mesh(new THREE.PlaneGeometry(55, 0.6), bankMat);
  bankSouth.rotateX(-Math.PI / 2);
  bankSouth.position.set(-12.5, 0.012, 7.2);
  group.add(bankSouth);

  // — north creek (ridge → lake) + stepping stones —
  const creekNorth = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 8.5), waterMat);
  creekNorth.rotateX(-Math.PI / 2);
  creekNorth.position.set(16.25, 0.04, -25);
  creekNorth.userData['noMerge'] = true;
  group.add(creekNorth);

  const stoneMat = kit.toon('inkCharcoal', { flatShading: true });
  const stonePositions: Array<[number, number]> = [
    [15.6, -24.8],
    [16.4, -24.7],
    [17.1, -24.9],
  ];
  for (const [sx, sz] of stonePositions) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.16, 7), stoneMat);
    stone.position.set(sx, 0.08, sz);
    group.add(stone);
  }

  return { group };
}

/**
 * The old dock — walkable plank finger; exterior.ts positions it over the
 * collider slot at Z -2..-0.5, X 12.5..18 (centre ≈ 15.2, -1.25).
 */
export function makeDock(kit: MaterialKit): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dock';

  const planks = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.14, 1.3), kit.toon('woodWarm'));
  planks.position.y = 0.3;
  group.add(planks);

  const postMat = kit.toon('woodDark');
  const corners: Array<[number, number]> = [
    [-2.55, -0.5],
    [-2.55, 0.5],
    [2.55, -0.5],
    [2.55, 0.5],
  ];
  for (const [px, pz] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.62, 6), postMat);
    post.position.set(px, 0.31, pz);
    group.add(post);
  }

  return group;
}
