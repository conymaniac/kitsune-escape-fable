/**
 * Vegetation & dressing factories — M2 real art: trees, boulders, reeds,
 * grass tufts, bushes, the hollow log, the mask shrine, fences, the
 * farm-gate panel, the rotted rowboat, treelines, the ink pine ridge and
 * the edge-mist gradient planes.
 *
 * All randomness is seeded (deterministic builds). Exterior merges nearly
 * everything via world/merge.ts — interactive meshes set userData.noMerge
 * (mergeStatic re-parents the ORIGINALS so references stay valid).
 * Sway-able foliage (grass blades, reeds) carries the `aSwayWeight`
 * attribute (0 root … 1 tip) for the A-style wind shader.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import {
  bake,
  faceted,
  jitterRadial,
  mergeGeoms,
  noise2,
  noisyLathe,
  paintSwayWeight,
  paintVertexColors,
  tone,
  toneLerp,
} from '@/world/props/meshUtils';

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

// ───────────────────────────────────────────────────────────── trees ──

/**
 * Night pine: noisy-lathe trunk + 2–3 stacked, jittered canopy cones in
 * the cold palette. Height 4–6 reads right at viewHeight 14.
 */
export function makeTree(kit: MaterialKit, height = 5): THREE.Group {
  const group = new THREE.Group();
  const seed = Math.round(height * 37) % 97;
  const trunkH = height * 0.34;
  const trunk = noisyLathe(trunkH, 6, 3, (t) => height * (0.055 - 0.03 * t) * (1 + 0.5 * (1 - t) ** 4), 0.1, seed);
  paintVertexColors(trunk, (x, y, z, out) => {
    const j = 0.72 + 0.4 * noise2(Math.atan2(z, x) * 1.8 + seed, y * 2);
    out.setRGB(j, j, j * 1.04);
  });
  group.add(new THREE.Mesh(trunk, kit.toon('woodDark', { vertexColors: true })));

  const canopyMat = kit.toon('willowDeep', { vertexColors: true });
  const tiers = height > 4.6 ? 3 : 2;
  const tierGeoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < tiers; i += 1) {
    const t = i / tiers;
    const radius = height * 0.26 * (1 - t * 0.42);
    const tierH = height * (0.42 - t * 0.1);
    const cone = faceted(jitterRadial(new THREE.ConeGeometry(radius, tierH, 7), 0.14, seed + i * 5));
    paintVertexColors(cone, (x, y, z, out) => {
      // moonlit crown: upper faces catch cold light, skirt falls to ink
      const lum = 0.55 + 0.5 * Math.min(Math.max(y / tierH + 0.5, 0), 1);
      const j = 0.85 + 0.3 * noise2(x * 3 + seed, z * 3 + i);
      out.setRGB(lum * j * 0.92, lum * j, lum * j * 1.08);
    });
    bake(cone, (noise2(i, seed) - 0.5) * 0.3, trunkH + tierH * 0.42 + i * tierH * 0.62, (noise2(seed, i) - 0.5) * 0.3, noise2(i * 3, seed) * Math.PI);
    tierGeoms.push(cone);
  }
  group.add(new THREE.Mesh(mergeGeoms(tierGeoms), canopyMat));
  return group;
}

/**
 * Broadleaf blob tree (field singles): noisy trunk + 2–3 squashed
 * irregular canopy blobs. The cold, soft counterpart to the pines.
 */
export function makeBlobTree(kit: MaterialKit, height = 5.5, seed = 5): THREE.Group {
  const group = new THREE.Group();
  const trunkH = height * 0.42;
  const trunk = noisyLathe(trunkH, 7, 4, (t) => height * (0.05 - 0.024 * t) * (1 + 0.9 * (1 - t) ** 5), 0.12, seed, 0.03);
  paintVertexColors(trunk, (x, y, z, out) => {
    const j = 0.7 + 0.42 * noise2(Math.atan2(z, x) * 2 + seed, y * 2.4);
    out.setRGB(j, j, j * 1.05);
  });
  group.add(new THREE.Mesh(trunk, kit.toon('woodDark', { vertexColors: true })));

  const blobMat = kit.toon('willowDeep', { vertexColors: true });
  const blobGeoms: THREE.BufferGeometry[] = [];
  const blobs = 3;
  for (let i = 0; i < blobs; i += 1) {
    const a = (i / blobs) * Math.PI * 2 + seed;
    const r = height * (0.3 - i * 0.04);
    const blob = faceted(jitterRadial(new THREE.IcosahedronGeometry(r, 1), 0.16, seed + i * 7));
    paintVertexColors(blob, (x, y, z, out) => {
      const lum = 0.6 + 0.45 * Math.min(Math.max(y / r * 0.7 + 0.5, 0), 1);
      const j = 0.85 + 0.3 * noise2(x * 2.5 + i, z * 2.5 + seed);
      out.setRGB(lum * j * 0.94, lum * j, lum * j * 1.1);
    });
    blob.scale(1.15, 0.78, 1.15); // squash BEFORE placing
    bake(
      blob,
      Math.cos(a) * height * 0.13,
      trunkH + height * 0.3 - i * height * 0.05,
      Math.sin(a) * height * 0.13,
      0,
      0,
      0,
      1 - i * 0.08,
    );
    blobGeoms.push(blob);
  }
  group.add(new THREE.Mesh(mergeGeoms(blobGeoms), blobMat));
  return group;
}

/**
 * Mizumi's sleeping tree — her favorite tree at the spawn glade. A broad,
 * sheltering blob tree with a low bough, pale blossom flecks in the
 * canopy and a worn resting patch between the root flares.
 */
export function makeSleepingTree(kit: MaterialKit, height = 6.2): THREE.Group {
  const group = makeBlobTree(kit, height, 21);
  group.name = 'sleeping-tree';

  // low sheltering bough reaching over the resting spot
  const boughMat = kit.toon('woodDark', { vertexColors: true });
  const bough = noisyLathe(height * 0.42, 6, 4, (t) => 0.13 * (1 - 0.6 * t), 0.1, 23);
  paintVertexColors(bough, (x, y, z, out) => {
    const j = 0.72 + 0.36 * noise2(x * 4, y * 3 + z);
    out.setRGB(j, j, j * 1.04);
  });
  const boughMesh = new THREE.Mesh(bough, boughMat);
  boughMesh.position.set(0.2, height * 0.34, 0.1);
  boughMesh.rotation.z = -1.05; // reaches out +X, drooping
  boughMesh.rotation.y = -0.6;
  group.add(boughMesh);

  // pale blossom flecks — tiny moon-cream tetrahedra scattered in the crown
  const fleckGeoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i += 1) {
    const a = noise2(i, 3) * Math.PI * 2;
    const r = height * (0.2 + 0.16 * noise2(i, 9));
    const fleck = new THREE.TetrahedronGeometry(0.07 + 0.04 * noise2(i, 5));
    bake(fleck, Math.cos(a) * r, height * 0.62 + (noise2(i, 7) - 0.4) * height * 0.2, Math.sin(a) * r, a);
    fleckGeoms.push(fleck);
  }
  const flecks = new THREE.Mesh(mergeGeoms(fleckGeoms), kit.toon('foxCream'));
  group.add(flecks);

  // worn resting patch between the roots (she sleeps here)
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.85, 10), kit.toon('earthBrown', { vertexColors: true }));
  paintVertexColors(patch.geometry, (x, y, _z, out) => {
    const j = 0.8 + 0.3 * noise2(x * 4, y * 4);
    out.setRGB(j, j, j * 0.96);
  });
  patch.geometry.rotateX(-Math.PI / 2);
  patch.position.set(1.1, 0.065, -0.4);
  group.add(patch);

  return group;
}

// ───────────────────────────────────────────────────── rocks & shrubs ──

/** Mossy boulder: jittered icosahedron, moss-topped vertex colors. */
export function makeBoulder(kit: MaterialKit, radius: number, seed = 1): THREE.Mesh {
  const rand = seededRandom(seed);
  const geo = faceted(jitterRadial(new THREE.IcosahedronGeometry(radius, 1), 0.2, seed));
  geo.scale(1 + rand() * 0.25, 0.66 + rand() * 0.18, 1 + rand() * 0.25);
  paintVertexColors(geo, (x, y, z, out) => {
    const j = 0.78 + 0.4 * noise2(x * 3 + seed, z * 3 - y);
    out.setRGB(j * 0.98, j, j * 1.1); // cold stone
    const mossT = Math.min(Math.max(y / radius * 1.4 - 0.1 + 0.4 * noise2(x * 5, z * 5), 0), 1);
    out.lerp(tone('inkCharcoal', 'willowDeep'), mossT * 0.55); // mossy crown
  });
  const rock = new THREE.Mesh(geo, kit.toon('inkCharcoal', { vertexColors: true }));
  rock.rotation.y = rand() * Math.PI * 2;
  rock.position.y = radius * 0.52;
  return rock;
}

/** Low dark shrub blob (also plugs visual gaps beside the hollow log). */
export function makeBush(kit: MaterialKit, radius = 0.6): THREE.Mesh {
  const seed = Math.round(radius * 53);
  const geo = faceted(jitterRadial(new THREE.IcosahedronGeometry(radius, 1), 0.22, seed));
  geo.scale(1, 0.62, 1);
  paintVertexColors(geo, (x, y, z, out) => {
    const lum = 0.5 + 0.55 * Math.min(Math.max(y / radius + 0.45, 0), 1);
    const j = 0.85 + 0.3 * noise2(x * 4 + seed, z * 4);
    out.setRGB(lum * j * 0.95, lum * j, lum * j * 1.06);
  });
  const bush = new THREE.Mesh(geo, kit.toon('willowDeep', { vertexColors: true }));
  bush.position.y = radius * 0.42;
  return bush;
}

// ─────────────────────────────────────────────────── grass & reeds ──

/** One tapered blade quad (origin at the root, pointing +Y). */
function bladeGeometry(width: number, height: number, lean: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, height, 1, 2);
  g.translate(0, height / 2, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const t = pos.getY(i) / height;
    pos.setX(i, pos.getX(i) * (1 - t * 0.8)); // taper to a tip
    pos.setZ(i, pos.getZ(i) + t * t * lean); // arc over
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  paintVertexColors(g, (_x, y, _z, out) => {
    const t = y / height;
    // shadowed root → cold moonlit tip
    out.copy(toneLerp('willowGreen', 'willowDeep', 'willowGreen', t));
    out.multiplyScalar(0.7 + 0.5 * t + 0.15 * noise2(seed, t * 3));
  });
  paintSwayWeight(g, (_x, y) => y / height);
  return g;
}

/** Grass tufts: crossed tapered blades in a w×d rectangle (local origin). */
export function makeGrassTufts(
  kit: MaterialKit,
  width: number,
  depth: number,
  count: number,
  seed = 13,
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  const geoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = (rand() - 0.5) * width;
    const z = (rand() - 0.5) * depth;
    const blades = 3;
    for (let b = 0; b < blades; b += 1) {
      const h = 0.26 + rand() * 0.3;
      const blade = bladeGeometry(0.1 + rand() * 0.08, h, 0.1 + rand() * 0.2, seed + i * 3 + b);
      bake(blade, x + (rand() - 0.5) * 0.16, 0, z + (rand() - 0.5) * 0.16, rand() * Math.PI * 2);
      geoms.push(blade);
    }
  }
  const mesh = new THREE.Mesh(
    mergeGeoms(geoms),
    kit.toon('willowGreen', { vertexColors: true, doubleSided: true }),
  );
  group.add(mesh);
  return group;
}

export interface ReedBedOptions {
  /** Lean every reed toward this local XZ point (the reed-tunnel arch). */
  leanTo?: [number, number];
}

/** Reed bed: tall tapered blades + seed heads in a w×d rectangle. */
export function makeReedBed(
  kit: MaterialKit,
  width: number,
  depth: number,
  count: number,
  seed = 7,
  options: ReedBedOptions = {},
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  const bladeGeoms: THREE.BufferGeometry[] = [];
  const headGeoms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = (rand() - 0.5) * width;
    const z = (rand() - 0.5) * depth;
    const h = 1.0 + rand() * 0.85;
    let leanA = rand() * Math.PI * 2;
    let lean = 0.12 + rand() * 0.22;
    if (options.leanTo) {
      const dx = options.leanTo[0] - x;
      const dz = options.leanTo[1] - z;
      leanA = Math.PI / 2 - Math.atan2(dz, dx); // arc toward the tunnel
      lean = 0.3 + rand() * 0.3;
    }
    const blade = bladeGeometry(0.08 + rand() * 0.05, h, lean * h, seed + i * 7);
    bake(blade, x, 0, z, leanA);
    bladeGeoms.push(blade);
    // seed head on roughly half of them
    if (rand() > 0.45) {
      const head = new THREE.CylinderGeometry(0.018, 0.035, 0.3, 4);
      paintVertexColors(head, (_hx, hy, _hz, out) => {
        const j = 0.85 + 0.3 * noise2(i, hy * 5);
        out.copy(tone('willowGreen', 'paperAged')).multiplyScalar(j * 0.7);
      });
      paintSwayWeight(head, () => 1);
      // ride the blade tip (approximate arc end)
      bake(head, x + Math.sin(leanA) * lean * h * 0.9, h * 0.96, z + Math.cos(leanA) * lean * h * 0.9, 0, 0, Math.sin(leanA) * 0.4);
      headGeoms.push(head);
    }
  }
  group.add(
    new THREE.Mesh(mergeGeoms(bladeGeoms), kit.toon('willowGreen', { vertexColors: true, doubleSided: true })),
  );
  if (headGeoms.length > 0) {
    group.add(new THREE.Mesh(mergeGeoms(headGeoms), kit.toon('willowGreen', { vertexColors: true })));
  }
  return group;
}

// ─────────────────────────────────────────────────── landmark props ──

/**
 * The hollow log size-gate: a fallen trunk lying along ±X, rotted through
 * at the centre — an actual hollow bore (upper half-shell arch) the fox
 * darts through along Z. Exterior provides the colliders (gap x ±0.3
 * around the local origin; visual spans X -2.8..2.8 local).
 */
export function makeHollowLog(kit: MaterialKit): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hollow-log';
  const barkMat = kit.toon('woodDark', { vertexColors: true });
  const R = 0.62;

  const paintBark = (g: THREE.BufferGeometry, seed: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.66 + 0.46 * noise2(x * 3.1 + seed, Math.atan2(y, z) * 1.9);
      out.setRGB(j, j, j * 1.05);
      if (Math.abs(x) < 0.75) out.multiplyScalar(0.72); // rot-darkened mouth
    });

  // two trunk halves (lathe profile with end swell), lying along X
  for (const side of [-1, 1]) {
    const len = 2.1;
    const half = noisyLathe(len, 9, 5, (t) => R * (1 - 0.12 * t) * (1 + 0.25 * (1 - t) ** 3), 0.12, side + 4, 0, true);
    half.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2); // axis → ±X
    half.translate(side * 0.62, R * 0.92, 0);
    paintBark(half, side * 3);
    group.add(new THREE.Mesh(half, barkMat));
  }

  // hollow bore: upper half-shell bridging the crawl gap (open along Z)
  const shell = new THREE.CylinderGeometry(R * 0.86, R * 0.86, 1.5, 10, 1, true, 0, Math.PI);
  shell.rotateX(Math.PI / 2); // axis → Z, opening downward
  shell.translate(0, R * 0.86, 0);
  const shellGeo = paintBark(shell, 9);
  const shellMesh = new THREE.Mesh(
    shellGeo,
    kit.toon('woodDark', { vertexColors: true, doubleSided: true }),
  );
  group.add(shellMesh);

  // dark bore interior — the hole reads as a hole from the iso camera
  const boreMat = kit.toon('inkBlack');
  for (const bz of [-0.72, 0.72]) {
    const ring = new THREE.Mesh(new THREE.CircleGeometry(R * 0.8, 10), boreMat);
    ring.position.set(0, R * 0.86, bz);
    if (bz < 0) ring.rotation.y = Math.PI;
    group.add(ring);
  }

  // snapped branch stub + bark moss
  const stub = noisyLathe(0.5, 5, 2, (t) => 0.09 * (1 - 0.5 * t), 0.15, 17);
  paintBark(stub, 11);
  const stubMesh = new THREE.Mesh(stub, barkMat);
  stubMesh.position.set(-1.4, R * 1.7, 0.1);
  stubMesh.rotation.z = 0.7;
  group.add(stubMesh);

  return group;
}

/**
 * The mask shrine [A]: small torii-ish stone shrine — twin stone posts,
 * double lintel, tiny emissive candle, the fox mask on the shelf.
 * Mask mesh keeps the name `shrine-mask` (questScript hides it).
 */
export function makeShrine(kit: MaterialKit): { group: THREE.Group; mask: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'shrine';
  const stoneMat = kit.toon('inkCharcoal', { vertexColors: true });
  const paintStone = (g: THREE.BufferGeometry, seed: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.78 + 0.36 * noise2(x * 5 + seed, y * 4 + z * 5);
      out.setRGB(j * 0.97, j, j * 1.08);
      if (y < 0.3) out.lerp(tone('inkCharcoal', 'willowDeep'), 0.4 * (0.3 - y)); // moss foot
    });

  // twin posts with a gentle inward taper
  for (const side of [-1, 1]) {
    const post = noisyLathe(1.3, 6, 3, (t) => 0.1 - t * 0.02, 0.08, side + 7);
    paintStone(post, side * 5);
    const mesh = new THREE.Mesh(post, stoneMat);
    mesh.position.set(side * 0.42, 0, 0);
    mesh.rotation.z = -side * 0.04;
    group.add(mesh);
  }
  // double lintel: vermillion top beam + stone tie beam
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.12, 0.3), kit.toon('vermillion', { vertexColors: true }));
  paintVertexColors(kasagi.geometry, (x, _y, _z, out) => {
    const j = 0.8 + 0.34 * noise2(x * 4, 1);
    out.setRGB(j, j, j);
  });
  kasagi.position.y = 1.42;
  kasagi.rotation.z = 0.015;
  group.add(kasagi);
  const tie = new THREE.Mesh(paintStone(new THREE.BoxGeometry(1.06, 0.09, 0.18), 13), stoneMat);
  tie.position.y = 1.16;
  group.add(tie);

  // offering shelf + plinth
  const shelf = new THREE.Mesh(paintStone(new THREE.BoxGeometry(0.66, 0.07, 0.46), 17), stoneMat);
  shelf.position.y = 0.78;
  group.add(shelf);
  const plinth = new THREE.Mesh(paintStone(faceted(jitterRadial(new THREE.BoxGeometry(0.8, 0.14, 0.6), 0.06, 19)), 19), stoneMat);
  plinth.position.y = 0.07;
  group.add(plinth);

  // tiny candle: wax nub + warm emissive flame (subtle — not the cottage)
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.09, 6), kit.toon('paperBone'));
  wax.position.set(0.2, 0.86, 0.1);
  group.add(wax);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), kit.emissive('lanternAmber', 0.85));
  flame.position.set(0.2, 0.95, 0.1);
  flame.name = 'shrine-candle';
  group.add(flame);

  // — the fox mask: cream oval, ears, vermillion markings via vc —
  const maskGeo = new THREE.SphereGeometry(0.21, 10, 8);
  maskGeo.scale(0.82, 1, 0.5);
  // ears: two pinched cones merged into the mask (single mesh contract)
  const earL = new THREE.ConeGeometry(0.07, 0.16, 4);
  bake(earL, -0.12, 0.2, 0, 0, 0, -0.3);
  const earR = new THREE.ConeGeometry(0.07, 0.16, 4);
  bake(earR, 0.12, 0.2, 0, 0, 0, 0.3);
  const maskMerged = mergeGeoms([
    maskGeo.toNonIndexed(),
    earL.toNonIndexed(),
    earR.toNonIndexed(),
  ]);
  maskMerged.computeVertexNormals();
  paintVertexColors(maskMerged, (x, y, z, out) => {
    out.setRGB(1, 1, 1);
    // vermillion brow + cheek strokes (canon kitsune mask)
    const cheek = Math.abs(x) > 0.09 && y > -0.06 && y < 0.06 && z > 0;
    const brow = Math.abs(x) < 0.05 && y > 0.1 && z > 0;
    if (cheek || brow) out.copy(tone('foxCream', 'vermillion'));
    if (y > 0.14 && Math.abs(x) > 0.06) out.copy(tone('foxCream', 'vermillion')); // ear tips
    // ink eyes
    if (Math.abs(Math.abs(x) - 0.07) < 0.025 && Math.abs(y - 0.03) < 0.02 && z > 0.05) {
      out.copy(tone('foxCream', 'inkBlack'));
    }
  });
  const mask = new THREE.Mesh(maskMerged, kit.toon('foxCream', { vertexColors: true }));
  mask.position.y = 1.0;
  mask.rotation.x = 0.12; // tilted up at her, waiting
  mask.name = 'shrine-mask';
  mask.userData['noMerge'] = true;
  group.add(mask);
  return { group, mask };
}

// ─────────────────────────────────────────────── fences, gate, boat ──

/** Weathered fence run along local +X: leaning posts + sagging rails. */
export function makeFenceRun(kit: MaterialKit, length: number): THREE.Group {
  const group = new THREE.Group();
  const mat = kit.toon('woodDark', { vertexColors: true });
  const seed = Math.round(length * 7) % 51;
  const rand = seededRandom(seed + 3);
  const geoms: THREE.BufferGeometry[] = [];
  const posts = Math.max(2, Math.round(length / 1.4) + 1);
  const weather = (g: THREE.BufferGeometry, s: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.62 + 0.46 * noise2(x * 5 + s, y * 4 + z * 5);
      out.setRGB(j * 0.96, j, j * 1.07); // silvered wood
    });
  for (let i = 0; i < posts; i += 1) {
    const h = 0.88 + rand() * 0.16;
    const post = new THREE.BoxGeometry(0.11, h, 0.11);
    weather(post, i);
    bake(post, (i / (posts - 1)) * length, h / 2 - 0.04, 0, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.12);
    geoms.push(post);
  }
  for (const railY of [0.4, 0.72]) {
    const segs = Math.max(1, Math.round(length / 2.8));
    for (let s = 0; s < segs; s += 1) {
      const segLen = length / segs + 0.15;
      const rail = new THREE.BoxGeometry(segLen, 0.07, 0.05);
      weather(rail, s + railY * 10);
      bake(
        rail,
        (s + 0.5) * (length / segs),
        railY + (rand() - 0.5) * 0.06,
        (rand() - 0.5) * 0.04,
        0,
        0,
        (rand() - 0.5) * 0.06,
      );
      geoms.push(rail);
    }
  }
  group.add(new THREE.Mesh(mergeGeoms(geoms), mat));
  return group;
}

/** Farm-gate panel hinged at the local origin (swings around +Y). */
export function makeGatePanel(
  kit: MaterialKit,
  width: number,
): { pivot: THREE.Group; panel: THREE.Mesh } {
  const pivot = new THREE.Group();
  pivot.name = 'farm-gate';
  // panel: frame + vertical slats merged into the ONE named mesh the
  // integrator knows; rides the pivot, so everything here is noMerge.
  const geoms: THREE.BufferGeometry[] = [];
  const weather = (g: THREE.BufferGeometry, s: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.68 + 0.42 * noise2(x * 4 + s, y * 5 + z);
      out.setRGB(j, j * 0.99, j * 1.04);
    });
  for (const railY of [0.28, 0.95]) {
    const rail = new THREE.BoxGeometry(width, 0.09, 0.06);
    weather(rail, railY);
    bake(rail, width / 2, railY, 0);
    geoms.push(rail);
  }
  const slats = 4;
  for (let i = 0; i < slats; i += 1) {
    const x = (i + 0.5) * (width / slats);
    const slat = new THREE.BoxGeometry(0.09, 0.86, 0.05);
    weather(slat, i * 3);
    bake(slat, x, 0.6, 0.015, 0, 0, (noise2(i, 5) - 0.5) * 0.05);
    geoms.push(slat);
  }
  const panel = new THREE.Mesh(mergeGeoms(geoms), kit.toon('woodWarm', { vertexColors: true }));
  panel.name = 'farm-gate-panel';
  panel.userData['noMerge'] = true;
  pivot.add(panel);

  const braceGeo = new THREE.BoxGeometry(width * 0.95, 0.08, 0.1);
  weather(braceGeo, 8);
  const brace = new THREE.Mesh(braceGeo, kit.toon('woodDark', { vertexColors: true }));
  brace.position.set(width / 2, 0.6, -0.02);
  brace.rotation.z = 0.3;
  brace.userData['noMerge'] = true;
  pivot.add(brace);
  return { pivot, panel };
}

/** Rotted rowboat (north-shore flavor by the stepping stones). */
export function makeRowboat(kit: MaterialKit): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rowboat';
  const mat = kit.toon('woodDark', { vertexColors: true });
  const geoms: THREE.BufferGeometry[] = [];
  const rot = (g: THREE.BufferGeometry, s: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.6 + 0.42 * noise2(x * 4 + s, z * 6 - y);
      out.setRGB(j, j * 1.02, j * 1.05);
      if (noise2(x * 7 + s, z * 9) > 0.78) out.multiplyScalar(0.5); // rot patches
    });

  // hull: two curved side walls + keel strip + cracked floor
  for (const side of [-1, 1]) {
    const wall = new THREE.BoxGeometry(2.2, 0.34, 0.08, 5, 1, 1);
    const pos = wall.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      pos.setZ(i, pos.getZ(i) + (1 - Math.pow(Math.abs(x) / 1.1, 1.8)) * side * 0.32);
      pos.setY(i, pos.getY(i) + Math.pow(Math.abs(x) / 1.1, 2) * 0.18); // swept ends
    }
    pos.needsUpdate = true;
    wall.computeVertexNormals();
    rot(wall, side * 7);
    bake(wall, 0, 0.26, side * 0.14);
    geoms.push(wall);
  }
  const floor = new THREE.BoxGeometry(1.9, 0.06, 0.6, 4, 1, 1);
  rot(floor, 3);
  bake(floor, 0, 0.12, 0);
  geoms.push(floor);
  // broken thwart (bench) — one end collapsed
  const thwart = new THREE.BoxGeometry(0.12, 0.05, 0.74);
  rot(thwart, 5);
  bake(thwart, -0.4, 0.32, 0, 0, 0.18, -0.12);
  geoms.push(thwart);
  const stump = new THREE.BoxGeometry(0.12, 0.05, 0.3);
  rot(stump, 6);
  bake(stump, 0.55, 0.34, -0.2, 0, 0, 0.05);
  geoms.push(stump);

  const boat = new THREE.Mesh(mergeGeoms(geoms), mat);
  boat.rotation.z = 0.06;
  group.add(boat);
  return group;
}

// ───────────────────────────────────────────── edges: trees, ridge, mist ──

/** Row of jittered pines from `[x,z]` to `[x,z]` (world coordinates). */
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

/**
 * Ink-black pine-ridge wall: TWO depth rows of jagged dark prisms — the
 * impassable north edge reads as layered ink silhouettes.
 */
export function makeRidge(
  kit: MaterialKit,
  from: [number, number],
  to: [number, number],
  seed = 31,
): THREE.Group {
  const rand = seededRandom(seed);
  const group = new THREE.Group();
  group.name = 'ridge';
  const mat = kit.toon('inkBlack', { vertexColors: true });
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const nx = -dz / len; // row-offset normal
  const nz = dx / len;
  const geoms: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 2; row += 1) {
    const count = Math.max(2, Math.floor(len / (3.4 - row * 0.8)));
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      const h = (3.6 + rand() * 3.2) * (1 + row * 0.35); // back row taller
      const prism = faceted(
        jitterRadial(new THREE.ConeGeometry(1.9 + rand() * 1.1, h, 5), 0.12, seed + row * 31 + i),
      );
      paintVertexColors(prism, (_x, y, _z, out) => {
        // faint cold gradient up the silhouette so it isn't a void
        const l = 0.85 + (y / h + 0.5) * 0.5 + row * 0.25;
        out.setRGB(l * 0.95, l, l * 1.25);
      });
      bake(
        prism,
        from[0] + dx * t + nx * (-1.2 - row * 2.4),
        h / 2 - 0.4 + row * 0.3,
        from[1] + dz * t + nz * (-1.2 - row * 2.4) + (rand() - 0.5) * 1.6,
        rand() * Math.PI,
      );
      geoms.push(prism);
    }
  }
  group.add(new THREE.Mesh(mergeGeoms(geoms), mat));
  return group;
}

/**
 * Edge-mist hint: an opaque vertical plane fading ink → night-horizon
 * upward (no transparency — wisps/ghost/water stay the only transparent
 * mats). Placed behind treelines/ridges, it reads as misty distance.
 */
export function makeMistPlane(
  kit: MaterialKit,
  width: number,
  height = 7,
): THREE.Mesh {
  const g = new THREE.PlaneGeometry(width, height, Math.max(4, Math.round(width / 6)), 6);
  paintVertexColors(g, (x, y, _z, out) => {
    const t = Math.min(Math.max(y / height + 0.5 + 0.18 * noise2(x * 0.4, y), 0), 1);
    out.copy(toneLerp('inkBlack', 'inkBlack', 'nightHorizon', Math.pow(t, 1.6)));
  });
  const mist = new THREE.Mesh(g, kit.toon('inkBlack', { vertexColors: true, doubleSided: true }));
  mist.position.y = height * 0.42;
  return mist;
}
