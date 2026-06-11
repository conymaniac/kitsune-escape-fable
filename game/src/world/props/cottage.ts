/**
 * The cottage [D] — walls, thatch roof, engawa, blocked sliding door,
 * warm east shoji window (the map's pull-light) and the crate stack that
 * makes the fox window-leap arc readable.
 *
 * GREYBOX (M1): boxes. Everything returned is LOCAL space — exterior.ts
 * places the group at the FINAL world position (-25, 0, -21) and offsets
 * anchors/colliders. M2 swaps internals behind this signature.
 */
import * as THREE from 'three';
import type { ColliderShape, MaterialKit } from '@/core/types';
import { aabb } from '@/world/colliders';

export interface CottageBuild {
  group: THREE.Group;
  /** LOCAL door anchor — just outside the engawa, south face. */
  doorLocal: THREE.Vector3;
  /** LOCAL window-interaction anchor — beside the crates, east face. */
  windowLocal: THREE.Vector3;
  /** LOCAL colliders (footprint+engawa, crate stack). */
  collidersLocal: ColliderShape[];
}

export function buildCottage(kit: MaterialKit): CottageBuild {
  const group = new THREE.Group();
  group.name = 'cottage';

  // — walls: 7×5 footprint, 2.2 high —
  const walls = new THREE.Mesh(new THREE.BoxGeometry(7, 2.2, 5), kit.toon('woodWarm'));
  walls.position.y = 1.1;
  group.add(walls);

  // — thatch roof: two stacked oversized prisms —
  const roofLower = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 6), kit.toon('thatchStraw'));
  roofLower.position.y = 2.65;
  group.add(roofLower);
  const roofRidge = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.55, 2.4), kit.toon('thatchStraw'));
  roofRidge.position.y = 3.3;
  group.add(roofRidge);

  // — engawa platform along the south face —
  const engawa = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.28, 1.1), kit.toon('woodWarm'));
  engawa.position.set(0, 0.14, 2.95);
  group.add(engawa);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), kit.toon('woodDark'));
  step.position.set(0, 0.06, 3.6);
  group.add(step);

  // — blocked sliding door (south face, centre) —
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.1), kit.toon('woodDark'));
  door.position.set(0, 1.18, 2.52);
  door.name = 'cottage-door';
  group.add(door);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.16), kit.toon('woodDark'));
  doorFrame.position.set(0, 2.14, 2.52);
  group.add(doorFrame);

  // — the warm east window (only warm light on the map until the finale) —
  const window = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), kit.emissive('shojiGlow', 1));
  window.rotation.y = Math.PI / 2;
  window.position.set(3.52, 1.3, 0.5);
  window.name = 'cottage-window';
  window.userData['noMerge'] = true;
  group.add(window);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.5), kit.toon('woodDark'));
  sill.position.set(3.55, 0.76, 0.5);
  group.add(sill);

  // — crate stack under the window (fox leap arc) —
  const crateMat = kit.toon('woodWarm', { flatShading: true });
  const crates: Array<[number, number, number, number]> = [
    [4.2, 0.35, 0.1, 0.7], // [x, y, z, size]
    [4.2, 0.35, 0.9, 0.7],
    [4.2, 1.05, 0.5, 0.7],
  ];
  for (const [cx, cy, cz, s] of crates) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(cx, cy, cz);
    crate.rotation.y = cx * 1.7 + cz; // deterministic jitter
    group.add(crate);
  }

  return {
    group,
    doorLocal: new THREE.Vector3(0, 0, 3.6),
    windowLocal: new THREE.Vector3(5.4, 0, 0.5),
    collidersLocal: [
      aabb(-3.8, -2.7, 3.8, 3.2), // walls + engawa
      aabb(3.6, -0.4, 4.9, 1.3), // crate stack
    ],
  };
}
