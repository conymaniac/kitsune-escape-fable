/**
 * The cottage [D] — M2 real art. The map's only warm light.
 *
 * Recipe (TECH_SPEC §1/§3): gassho-style steep thatched roof from five
 * stacked, slightly-overhanging jittered trapezoid courses (dense slope
 * grids for straw-bundle vertex striations) + flared eave course + ridge
 * beam with crossed uma-nori straddles; dark weathered plank walls with a
 * visible post-and-beam frame; engawa plank porch on support posts; the
 * east shoji window — warm emissive inner plane behind a dark lattice —
 * is THE landmark and must read from the willow 50 m away; blocked board
 * sliding door w/ frame; stone step; crate stack under the open window
 * (the fox leap affordance).
 *
 * Geometry is pre-merged per material into a handful of meshes so
 * exterior.ts can route the whole group through mergeStatic. Named meshes
 * `cottage-door` / `cottage-window` keep their identity (noMerge).
 *
 * CONTRACT (FROZEN since M1): signature, doorLocal/windowLocal anchors and
 * collidersLocal are gameplay data — geometry internals only changed here.
 */
import * as THREE from 'three';
import type { ColliderShape, MaterialKit } from '@/core/types';
import { aabb } from '@/world/colliders';
import {
  bake,
  faceted,
  jitterRadial,
  mergeGeoms,
  noise2,
  paintVertexColors,
  tone,
} from '@/world/props/meshUtils';

export interface CottageBuild {
  group: THREE.Group;
  /** LOCAL door anchor — just outside the engawa, south face. */
  doorLocal: THREE.Vector3;
  /** LOCAL window-interaction anchor — beside the crates, east face. */
  windowLocal: THREE.Vector3;
  /** LOCAL colliders (footprint+engawa, crate stack). */
  collidersLocal: ColliderShape[];
}

// ─────────────────────────────────────────────── geometry helpers ──

/**
 * One thatch course slope: an x-segmented grid mapped onto the slanted
 * plane from the bottom edge (yFrom, zFrom) to the top edge (yTo, zTo).
 * `kick` curls the bottom rows upward (the flared eave). Faceted.
 */
function slopeGrid(
  xLen: number,
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
  kick = 0,
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(xLen, 1, 22, 3);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const u = pos.getX(i);
    const v = pos.getY(i) + 0.5; // 0 bottom edge … 1 top edge
    pos.setXYZ(
      i,
      u,
      yFrom + (yTo - yFrom) * v + kick * Math.pow(1 - v, 2),
      zFrom + (zTo - zFrom) * v,
    );
  }
  pos.needsUpdate = true;
  return faceted(g);
}

/** Vertical gable trapezoid at x=0 facing +X (bake mirrors it for −X). */
function gableCap(zBot: number, zTop: number, h: number): THREE.BufferGeometry {
  const zb = zBot / 2;
  const zt = zTop / 2;
  const positions = [
    0, 0, zb, 0, 0, -zb, 0, h, -zt,
    0, 0, zb, 0, h, -zt, 0, h, zt,
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]; // merge-layout parity
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Position-keyed vertex jitter — crack-free (same point, same offset). */
function roughen(g: THREE.BufferGeometry, amp: number, seed: number): THREE.BufferGeometry {
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      x + (noise2(y * 2.7 + seed, z * 3.1 - seed) - 0.5) * amp,
      y + (noise2(x * 2.9 - seed, z * 2.3 + seed) - 0.5) * amp * 0.8,
      z + (noise2(x * 3.3 + seed, y * 2.1 + seed) - 0.5) * amp,
    );
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Faceted box — the bucket-merge workhorse (uniform attribute layout). */
function fbox(w: number, h: number, d: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  return faceted(new THREE.BoxGeometry(w, h, d, sx, sy, sz));
}

// ────────────────────────────────────────────────────── the build ──

export function buildCottage(kit: MaterialKit): CottageBuild {
  const group = new THREE.Group();
  group.name = 'cottage';

  // geometry buckets — one mesh per material at the end
  const wallGeoms: THREE.BufferGeometry[] = []; // woodDark vc (walls, frame, ridge)
  const warmGeoms: THREE.BufferGeometry[] = []; // woodWarm vc (engawa, crates, window frame)
  const thatchGeoms: THREE.BufferGeometry[] = []; // thatchStraw vc
  const stoneGeoms: THREE.BufferGeometry[] = []; // inkCharcoal vc (step, footing stones)

  // — paint functions (one hand with the rest of world/props) —
  /** Frame timber: reads a touch lighter than the wall planks behind it. */
  const paintFrame = (g: THREE.BufferGeometry, seed: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.78 + 0.4 * noise2(x * 3.2 + seed, y * 4.1 + z * 3.4);
      out.setRGB(j, j * 0.99, j * 1.05);
    });

  /** Engawa/crate wood: warm grain, per-plank tint. */
  const paintWarm = (g: THREE.BufferGeometry, seed: number, axis: 'x' | 'z'): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const along = axis === 'x' ? x : z;
      const across = axis === 'x' ? z : x;
      const grain =
        0.66 + 0.3 * noise2(across * 6 + seed, along * 1.7) + 0.16 * noise2(along * 9, y * 5 + seed);
      out.setRGB(grain, grain * 0.99, grain * 1.04);
    });

  /** Mossy-footed stone (same language as the lanterns/boulders). */
  const paintStone = (g: THREE.BufferGeometry, seed: number): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.78 + 0.38 * noise2(x * 5 + seed, y * 4 + z * 5);
      out.setRGB(j * 0.97, j, j * 1.08);
      if (y < 0.06) out.lerp(tone('inkCharcoal', 'willowDeep'), 0.4);
    });

  // ───────────────────────────────────── walls: core + post-and-beam ──
  // Core shell (7×5, 2.2 high) with plank striations per face.
  const core = fbox(7, 2.2, 5, 14, 5, 10);
  core.translate(0, 1.1, 0);
  paintVertexColors(core, (x, y, z, out) => {
    // faces: ±z walls striate along x, ±x walls along z
    const onXFace = Math.abs(Math.abs(x) - 3.5) < 0.02;
    const along = onXFace ? z : x;
    const plank = Math.floor(along / 0.26);
    const j =
      0.58 +
      0.34 * noise2(plank * 3.7 + (onXFace ? 9 : 2), y * 1.1) +
      0.16 * noise2(along * 8, y * 6);
    out.setRGB(j * 0.96, j, j * 1.07); // silvered night wood
    if (y < 0.55) out.multiplyScalar(0.78 + y * 0.35); // ground splash
    if (y > 1.85) out.multiplyScalar(0.72); // eave shadow band (fake AO)
  });
  wallGeoms.push(core);

  // corner + intermediate posts (proud of the wall plane)
  const postSpots: Array<[number, number]> = [
    [-3.46, -2.46], [3.46, -2.46], [-3.46, 2.46], [3.46, 2.46], // corners
    [-2.2, 2.52], [2.2, 2.52], // south face rhythm (door frame separate)
    [3.52, -1.6], // east face rhythm
    [-1.2, -2.5], [1.6, -2.5], [-3.52, 0.2], // north + west silhouette
  ];
  for (let i = 0; i < postSpots.length; i += 1) {
    const p = postSpots[i];
    if (!p) continue;
    const post = fbox(0.16, 2.24, 0.16);
    paintFrame(post, i * 3);
    bake(post, p[0], 1.12, p[1], 0, 0, (noise2(i, 7) - 0.5) * 0.02);
    wallGeoms.push(post);
  }
  // horizontal beams: foundation sill, top plate, south mid rail
  const beamRuns: Array<[number, number, number, number, number]> = [
    // [cx, cy, cz, lenX, lenZ] — lenX 0 means the beam runs along Z
    [0, 0.14, 2.52, 7.2, 0], [0, 0.14, -2.52, 7.2, 0],
    [3.52, 0.14, 0, 0, 5.1], [-3.52, 0.14, 0, 0, 5.1],
    [0, 2.16, 2.5, 7.3, 0], [0, 2.16, -2.5, 7.3, 0],
    [3.5, 2.16, 0, 0, 5.2], [-3.5, 2.16, 0, 0, 5.2],
    [0, 1.62, 2.51, 7.1, 0],
  ];
  for (let i = 0; i < beamRuns.length; i += 1) {
    const b = beamRuns[i];
    if (!b) continue;
    const alongX = b[3] > 0;
    const beam = fbox(alongX ? b[3] : 0.14, 0.14, alongX ? 0.14 : b[4]);
    paintFrame(beam, i * 5 + 1);
    bake(beam, b[0], b[1], b[2], 0, 0, (noise2(i, 13) - 0.5) * 0.015);
    wallGeoms.push(beam);
  }

  // ──────────────────────────── roof: 5 stacked jittered thatch courses ──
  // Ridge runs along X. Steep gassho pitch: half-width 3.45 → 0.28 over
  // ~2.2 u of rise; each course overhangs the one below by ~0.12.
  const COURSES = 5;
  const ROOF_Y0 = 2.02;
  const COURSE_H = 0.47;
  const halfW = (i: number): number => 3.45 - i * 0.68;
  const courseLen = (i: number): number => 8.35 - i * 0.16;
  const paintThatch = (g: THREE.BufferGeometry, layer: number, isCap: boolean): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      // straw bundles: vertical column striations down the slope
      const col = Math.floor(x / 0.18);
      let j =
        0.62 +
        0.34 * noise2(col * 1.31 + layer * 9, layer * 3.7) +
        0.14 * noise2(x * 7 + layer, z * 5 - y * 3);
      j *= 0.86 + layer * 0.05; // upper courses catch more moon
      out.setRGB(j, j * 0.985, j * 0.94); // dry sun-bleached straw
      // weather patches (rot toward dark earth)
      const patch = noise2(x * 0.9 + layer * 5, z * 1.3 - layer);
      if (patch > 0.72) out.lerp(tone('thatchStraw', 'earthDark'), (patch - 0.72) * 1.6);
      // mossy drip line near the bottom edge of each course
      const vLocal = (y - ROOF_Y0 - layer * (COURSE_H - 0.04)) / COURSE_H;
      if (vLocal < 0.18) out.lerp(tone('thatchStraw', 'willowDeep'), 0.3 * (0.18 - Math.max(vLocal, 0)));
      if (isCap) out.multiplyScalar(0.78); // cut-straw gable ends sit darker
    });

  for (let i = 0; i < COURSES; i += 1) {
    const zb = halfW(i);
    const zt = i === COURSES - 1 ? 0.28 : halfW(i + 1) + 0.12;
    const y0 = ROOF_Y0 + i * (COURSE_H - 0.04); // tuck under the course above
    const y1 = y0 + COURSE_H;
    const len = courseLen(i);
    const kick = i === 0 ? 0.16 : 0; // flared eave on the bottom course
    const yDrop = i === 0 ? 0.1 : 0; // eave course hangs a little lower
    // south slope (+z) + north slope (mirrored via bake rotY π)
    const south = slopeGrid(len, zb, zt, y0 - yDrop, y1, kick);
    roughen(south, 0.055, 3 + i * 7);
    paintThatch(south, i, false);
    thatchGeoms.push(south);
    const north = slopeGrid(len, zb, zt, y0 - yDrop, y1, kick);
    bake(north, 0, 0, 0, Math.PI);
    roughen(north, 0.055, 5 + i * 7);
    paintThatch(north, i, false);
    thatchGeoms.push(north);
    // gable caps (vertical trapezoid ends)
    for (const side of [-1, 1]) {
      const cap = gableCap(zb * 2, zt * 2, COURSE_H);
      if (side < 0) bake(cap, 0, 0, 0, Math.PI);
      bake(cap, side * (len / 2), y0, 0);
      roughen(cap, 0.05, 11 + i * 3 + side);
      paintThatch(cap, i, true);
      thatchGeoms.push(cap);
    }
  }
  // ridge beam + crossed uma-nori straddles
  const ridgeY = ROOF_Y0 + (COURSES - 1) * (COURSE_H - 0.04) + COURSE_H;
  const ridge = fbox(7.6, 0.2, 0.5);
  paintFrame(ridge, 21);
  roughen(ridge, 0.04, 23);
  bake(ridge, 0, ridgeY + 0.04, 0);
  wallGeoms.push(ridge);
  for (const rx of [-2.6, -0.9, 0.9, 2.6]) {
    for (const lean of [-0.5, 0.5]) {
      const stick = fbox(0.07, 1.0, 0.07);
      paintFrame(stick, rx * 5 + lean);
      bake(stick, rx, ridgeY + 0.18, lean * 0.1, 0, 0, lean);
      wallGeoms.push(stick);
    }
  }

  // ───────────────────────────────────── engawa porch (south face) ──
  const DECK_Y = 0.25;
  for (let i = 0; i < 12; i += 1) {
    const n = noise2(i * 3.1, 4.4);
    const plank = fbox(0.56 + 0.05 * (n - 0.5), 0.06, 1.08);
    paintWarm(plank, i * 7, 'z');
    bake(plank, -3.4 + i * 0.605, DECK_Y + 0.01 * Math.sin(i * 2.2), 2.95, (n - 0.5) * 0.04);
    warmGeoms.push(plank);
  }
  const faceBeam = fbox(7.4, 0.1, 0.1);
  paintFrame(faceBeam, 31);
  bake(faceBeam, 0, DECK_Y - 0.06, 3.46);
  wallGeoms.push(faceBeam);
  for (const px of [-3.2, -1.1, 1.1, 3.2]) {
    const post = fbox(0.1, 0.2, 0.1);
    paintFrame(post, px * 3);
    bake(post, px, 0.1, 3.4);
    wallGeoms.push(post);
    const footing = faceted(jitterRadial(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 6), 0.12, px + 9));
    paintStone(footing, px * 7);
    bake(footing, px, 0.03, 3.4);
    stoneGeoms.push(footing);
  }

  // ─────────────────────────── blocked sliding door (south, centre) ──
  for (const fx of [-0.78, 0.78]) {
    const post = fbox(0.14, 1.96, 0.18);
    paintFrame(post, fx * 11);
    bake(post, fx, 0.98 + DECK_Y, 2.54);
    wallGeoms.push(post);
  }
  const lintel = fbox(1.7, 0.14, 0.2);
  paintFrame(lintel, 37);
  bake(lintel, 0, 2.18, 2.54);
  wallGeoms.push(lintel);
  // the named door panel: vertical boards + two battens, ONE mesh
  const doorGeoms: THREE.BufferGeometry[] = [];
  for (let b = 0; b < 6; b += 1) {
    const board = fbox(0.2, 1.74, 0.05);
    paintVertexColors(board, (x, y, _z, out) => {
      const j = 0.52 + 0.3 * noise2(b * 4.7, y * 2.3) + 0.14 * noise2(x * 9 + b, y * 7);
      out.setRGB(j * 0.97, j, j * 1.05);
    });
    bake(board, -0.55 + b * 0.22, 0, 0, 0, 0, (noise2(b, 3) - 0.5) * 0.02);
    doorGeoms.push(board);
  }
  for (const by of [-0.55, 0.5]) {
    const batten = fbox(1.3, 0.12, 0.04);
    paintVertexColors(batten, (x, _y, _z, out) => {
      const j = 0.6 + 0.3 * noise2(x * 5, by * 7);
      out.setRGB(j, j, j * 1.04);
    });
    bake(batten, 0, by, 0.045);
    doorGeoms.push(batten);
  }
  const door = new THREE.Mesh(mergeGeoms(doorGeoms), kit.toon('woodDark', { vertexColors: true }));
  door.position.set(0, 1.17 + DECK_Y, 2.52);
  door.name = 'cottage-door';
  door.userData['noMerge'] = true; // shimmer/glow hook target — keep identity
  group.add(door);

  // ──────────────── the warm east shoji window (THE pull-light) ──
  // emissive inner plane (named, hook target) behind a dark lattice
  const window = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.06), kit.emissive('shojiGlow', 1));
  window.rotation.y = Math.PI / 2;
  window.position.set(3.52, 1.3, 0.5);
  window.name = 'cottage-window';
  window.userData['noMerge'] = true;
  group.add(window);
  // lattice silhouette floating just in front of the glow
  for (const lz of [0.06, 0.5, 0.94]) {
    const slat = fbox(0.03, 1.04, 0.045);
    paintFrame(slat, lz * 17);
    bake(slat, 3.56, 1.3, lz);
    wallGeoms.push(slat);
  }
  for (const ly of [0.98, 1.3, 1.62]) {
    const slat = fbox(0.03, 0.045, 1.32);
    paintFrame(slat, ly * 13);
    bake(slat, 3.56, ly, 0.5);
    wallGeoms.push(slat);
  }
  // window frame: posts, sill, lintel (warm wood — catches the glow)
  for (const fz of [-0.24, 1.24]) {
    const post = fbox(0.18, 1.46, 0.14);
    paintWarm(post, fz * 19, 'z');
    bake(post, 3.54, 1.3, fz);
    warmGeoms.push(post);
  }
  const sill = fbox(0.2, 0.1, 1.62);
  paintWarm(sill, 41, 'z');
  bake(sill, 3.56, 0.72, 0.5);
  warmGeoms.push(sill);
  const winLintel = fbox(0.2, 0.1, 1.62);
  paintWarm(winLintel, 43, 'z');
  bake(winLintel, 3.56, 1.88, 0.5);
  warmGeoms.push(winLintel);

  // ─────────────────────────────────── stone step at the door ──
  const step = faceted(jitterRadial(new THREE.BoxGeometry(1.5, 0.18, 0.55, 3, 1, 2), 0.07, 47));
  paintStone(step, 49);
  bake(step, 0, 0.07, 3.62);
  stoneGeoms.push(step);

  // ───────────── crate stack under the window (fox leap affordance) ──
  const crates: Array<[number, number, number, number, number]> = [
    [4.2, 0.35, 0.1, 0.7, 0.14], // [x, y, z, size, rotY]
    [4.2, 0.35, 0.9, 0.7, -0.1],
    [4.2, 1.05, 0.5, 0.7, 0.24],
  ];
  for (let c = 0; c < crates.length; c += 1) {
    const cr = crates[c];
    if (!cr) continue;
    const box = fbox(cr[3], cr[3], cr[3], 3, 3, 3);
    paintVertexColors(box, (x, y, z, out) => {
      // slatted crate sides: plank rows with shadow gaps
      const row = Math.floor((y + 10) / 0.16);
      const j = 0.62 + 0.3 * noise2(row * 2.9 + c * 7, x * 3 + z * 3) + 0.12 * noise2(x * 8, y * 8 + c);
      out.setRGB(j, j * 0.99, j * 1.03);
      if (Math.abs((y + 10) % 0.16) < 0.02) out.multiplyScalar(0.7); // gap shadow
    });
    bake(box, cr[0], cr[1], cr[2], cr[4]);
    warmGeoms.push(box);
    // corner battens
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>) {
      const batten = fbox(0.06, cr[3] + 0.03, 0.06);
      paintWarm(batten, c * 9 + ox + oz, 'x');
      const half = cr[3] / 2 - 0.02;
      bake(
        batten,
        cr[0] + Math.cos(cr[4]) * ox * half - Math.sin(cr[4]) * oz * half,
        cr[1],
        cr[2] + Math.sin(cr[4]) * ox * half + Math.cos(cr[4]) * oz * half,
        cr[4],
      );
      warmGeoms.push(batten);
    }
  }

  // ───────────────────────────── bucket meshes (one per material) ──
  group.add(new THREE.Mesh(mergeGeoms(wallGeoms), kit.toon('woodDark', { vertexColors: true })));
  group.add(new THREE.Mesh(mergeGeoms(warmGeoms), kit.toon('woodWarm', { vertexColors: true })));
  group.add(new THREE.Mesh(mergeGeoms(thatchGeoms), kit.toon('thatchStraw', { vertexColors: true })));
  group.add(new THREE.Mesh(mergeGeoms(stoneGeoms), kit.toon('inkCharcoal', { vertexColors: true })));

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
