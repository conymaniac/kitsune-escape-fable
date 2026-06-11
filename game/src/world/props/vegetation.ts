/**
 * Vegetation & dressing factories — trees, boulders, reeds, grass tufts,
 * bushes, the hollow log, the mask shrine, fences, the farm-gate panel,
 * the rotted rowboat, treelines and the ink pine ridge.
 *
 * GREYBOX (M1): primitive compositions sized to read at viewHeight 14.
 * All randomness is seeded (deterministic builds). Exterior merges most of
 * this via world/merge.ts, so individual meshes stay cheap and single-
 * material; anything that must stay interactive sets userData.noMerge.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';

/** Deterministic PRNG (mulberry32) — stable layouts across builds. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pine-ish tree: trunk + cone. Height 4–6 reads right at this zoom. */
export function makeTree(kit: MaterialKit, height = 5): THREE.Group {
  const group = new THREE.Group();
  const trunkH = height * 0.32;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(height * 0.035, height * 0.055, trunkH, 6),
    kit.toon('woodDark'),
  );
  trunk.position.y = trunkH / 2;
  group.add(trunk);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.24, height * 0.78, 7),
    kit.toon('willowDeep', { flatShading: true }),
  );
  cone.position.y = trunkH + height * 0.36;
  group.add(cone);
  return group;
}

/** Squashed flat-shaded boulder. r ≈ 0.4 dressing → 1.3 wind-shadow rock. */
export function makeBoulder(kit: MaterialKit, radius: number, seed = 1): THREE.Mesh {
  const rand = seededRandom(seed);
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(radius, 0),
    kit.toon('inkCharcoal', { flatShading: true }),
  );
  rock.scale.set(1 + rand() * 0.25, 0.62 + rand() * 0.2, 1 + rand() * 0.25);
  rock.rotation.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4);
  rock.position.y = radius * 0.45;
  return rock;
}

/** Low dark shrub blob (also plugs visual gaps beside the hollow log). */
export function makeBush(kit: MaterialKit, radius = 0.6): THREE.Mesh {
  const bush = new THREE.Mesh(new THREE.SphereGeometry(radius, 7, 5), kit.toon('willowDeep'));
  bush.scale.y = 0.62;
  bush.position.y = radius * 0.45;
  return bush;
}

/** Reed bed: thin tall boxes scattered in a w×d rectangle (local origin). */
export function makeReedBed(
  kit: MaterialKit,
  width: number,
  depth: number,
  count: number,
  seed = 7,
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  const mat = kit.toon('willowDeep');
  for (let i = 0; i < count; i += 1) {
    const h = 0.9 + rand() * 0.7;
    const reed = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), mat);
    reed.position.set((rand() - 0.5) * width, h / 2, (rand() - 0.5) * depth);
    reed.rotation.set((rand() - 0.5) * 0.22, rand() * Math.PI, (rand() - 0.5) * 0.22);
    group.add(reed);
  }
  return group;
}

/** Grass tufts: small crossed planes in a w×d rectangle (local origin). */
export function makeGrassTufts(
  kit: MaterialKit,
  width: number,
  depth: number,
  count: number,
  seed = 13,
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  const mat = kit.toon('willowGreen', { doubleSided: true });
  for (let i = 0; i < count; i += 1) {
    const x = (rand() - 0.5) * width;
    const z = (rand() - 0.5) * depth;
    const s = 0.22 + rand() * 0.18;
    for (let b = 0; b < 2; b += 1) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(s * 1.6, s), mat);
      blade.position.set(x, s / 2, z);
      blade.rotation.y = rand() * Math.PI + (b * Math.PI) / 2;
      group.add(blade);
    }
  }
  return group;
}

/**
 * The hollow log size-gate: two broken cylinder halves along ±X with a
 * 0.6 u crawl gap between them, bridged by a bark slab so the hole reads.
 * Exterior provides the fox-gap colliders (visual spans X -2.8..2.8 local).
 */
export function makeHollowLog(kit: MaterialKit): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hollow-log';
  const logMat = kit.toon('woodDark', { flatShading: true });
  for (const side of [-1, 1]) {
    const half = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 2.5, 9), logMat);
    half.rotation.z = Math.PI / 2;
    half.position.set(side * 1.55, 0.55, 0);
    group.add(half);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 9), kit.toon('inkCharcoal'));
    cap.rotation.z = Math.PI / 2;
    cap.position.set(side * 0.32, 0.55, 0);
    group.add(cap);
  }
  const arch = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.26, 1.1), logMat);
  arch.position.set(0, 1.05, 0);
  group.add(arch);
  return group;
}

/** The mask shrine [A]: post, vermillion roof, the fox mask on top. */
export function makeShrine(kit: MaterialKit): { group: THREE.Group; mask: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'shrine';
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.05, 0.26), kit.toon('woodDark'));
  post.position.y = 0.52;
  group.add(post);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.5), kit.toon('woodDark'));
  shelf.position.y = 1.02;
  group.add(shelf);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.8), kit.toon('vermillion'));
  roof.position.y = 1.55;
  group.add(roof);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), kit.toon('foxCream'));
  mask.scale.set(0.85, 1, 0.55);
  mask.position.y = 1.24;
  mask.name = 'shrine-mask';
  mask.userData['noMerge'] = true;
  group.add(mask);
  return { group, mask };
}

/** Fence run along local +X: posts every ~1.4 u + two rails. */
export function makeFenceRun(kit: MaterialKit, length: number): THREE.Group {
  const group = new THREE.Group();
  const mat = kit.toon('woodDark');
  const posts = Math.max(2, Math.round(length / 1.4) + 1);
  for (let i = 0; i < posts; i += 1) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), mat);
    post.position.set((i / (posts - 1)) * length, 0.48, 0);
    group.add(post);
  }
  for (const railY of [0.42, 0.74]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.07, 0.05), mat);
    rail.position.set(length / 2, railY, 0);
    group.add(rail);
  }
  return group;
}

/** Farm-gate panel hinged at the local origin (swings around +Y). */
export function makeGatePanel(
  kit: MaterialKit,
  width: number,
): { pivot: THREE.Group; panel: THREE.Mesh } {
  const pivot = new THREE.Group();
  pivot.name = 'farm-gate';
  const panel = new THREE.Mesh(new THREE.BoxGeometry(width, 1.0, 0.1), kit.toon('woodWarm'));
  panel.position.set(width / 2, 0.55, 0);
  panel.name = 'farm-gate-panel';
  panel.userData['noMerge'] = true;
  pivot.add(panel);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.08, 0.12), kit.toon('woodDark'));
  brace.position.set(width / 2, 0.55, 0);
  brace.rotation.z = 0.32;
  brace.userData['noMerge'] = true;
  pivot.add(brace);
  return { pivot, panel };
}

/** Rotted rowboat (north-shore flavor by the stepping stones). */
export function makeRowboat(kit: MaterialKit): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rowboat';
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.95), kit.toon('woodDark'));
  hull.position.y = 0.2;
  hull.rotation.z = 0.07;
  group.add(hull);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.6), kit.toon('inkCharcoal'));
  inner.position.y = 0.32;
  inner.rotation.z = 0.07;
  group.add(inner);
  return group;
}

/** Row of jittered trees from `[x,z]` to `[x,z]` (world coordinates). */
export function makeTreeline(
  kit: MaterialKit,
  from: [number, number],
  to: [number, number],
  step: number,
  seed = 23,
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const count = Math.max(2, Math.floor(len / step));
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const tree = makeTree(kit, 4 + rand() * 2.2);
    tree.position.set(
      from[0] + dx * t + (rand() - 0.5) * step * 0.8,
      0,
      from[1] + dz * t + (rand() - 0.5) * step * 0.8,
    );
    tree.rotation.y = rand() * Math.PI * 2;
    group.add(tree);
  }
  return group;
}

/** Ink-black pine-ridge wall: jagged dark prisms (impassable north edge). */
export function makeRidge(
  kit: MaterialKit,
  from: [number, number],
  to: [number, number],
  seed = 31,
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  group.name = 'ridge';
  const mat = kit.toon('inkBlack', { flatShading: true });
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const count = Math.max(2, Math.floor(len / 3.4));
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const h = 3.6 + rand() * 3.2;
    const prism = new THREE.Mesh(new THREE.ConeGeometry(2.1 + rand() * 1.1, h, 5), mat);
    prism.position.set(from[0] + dx * t, h / 2 - 0.4, from[1] + dz * t + (rand() - 0.5) * 1.6);
    prism.rotation.y = rand() * Math.PI;
    group.add(prism);
  }
  return group;
}
