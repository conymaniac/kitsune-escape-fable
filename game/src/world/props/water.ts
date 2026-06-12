/**
 * Water bodies — the spectral lake, both creeks, stepping stones, old dock.
 *
 * M2: geometry tuned for the A-style water shader (kit.water()) — the lake
 * is a dense polar-grid ellipse (interior vertices for the vertex bob,
 * UVs spanning the bounding box 0..1 with uv (0.5, 0.5) at the centre);
 * creeks are segmented planes. Layout is FINAL and matches the water
 * colliders in world/exterior.ts:
 * - lake: ellipse centred (27, -6), radii 15.5×14, y 0.05
 * - south creek: Z 3..7 from the west map edge to the lake, with the 2 m
 *   Bound-gap narrows at X -10..-6 (anchor creekGap)
 * - north creek: X 15..17.5 from the ridge into the lake's north lobe,
 *   stepping stones at Z ≈ -24.8
 * - old dock: walkable finger at Z -2..-0.5, X 12.5..18
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import { faceted, jitterRadial, mergeGeoms, noise2, paintVertexColors, tone } from '@/world/props/meshUtils';

export interface WaterBuild {
  group: THREE.Group;
}

/**
 * Polar-grid ellipse on XZ: `segments` around × `rings` out from the
 * centre — dense interior for vertex bob. UVs map the bounding box.
 */
function ellipseGrid(rx: number, rz: number, segments: number, rings: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  positions.push(0, 0, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);
  for (let r = 1; r <= rings; r += 1) {
    const t = r / rings;
    for (let s = 0; s < segments; s += 1) {
      const a = (s / segments) * Math.PI * 2;
      const x = Math.cos(a) * rx * t;
      const z = Math.sin(a) * rz * t;
      positions.push(x, 0, z);
      normals.push(0, 1, 0);
      uvs.push(x / (rx * 2) + 0.5, z / (rz * 2) + 0.5);
    }
  }
  const ringStart = (r: number): number => 1 + (r - 1) * segments;
  for (let s = 0; s < segments; s += 1) {
    indices.push(0, ringStart(1) + ((s + 1) % segments), ringStart(1) + s);
  }
  for (let r = 1; r < rings; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = ringStart(r) + s;
      const b = ringStart(r) + ((s + 1) % segments);
      const c = ringStart(r + 1) + s;
      const d = ringStart(r + 1) + ((s + 1) % segments);
      indices.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

export function buildWater(kit: MaterialKit): WaterBuild {
  const group = new THREE.Group();
  group.name = 'water';
  const waterMat = kit.water();

  // — shallows ring under the rim (reads through the water edge) —
  const shore = new THREE.Mesh(ellipseGrid(16.4, 14.9, 48, 4), kit.toon('lakeShallow'));
  shore.position.set(27, 0.028, -6);
  shore.name = 'lake-shore-ring';
  shore.userData['noMerge'] = true;
  group.add(shore);

  // — the lake: dense grid for the shader's vertex bob + moon glint —
  const lake = new THREE.Mesh(ellipseGrid(15.5, 14, 64, 22), waterMat);
  lake.position.set(27, 0.05, -6);
  lake.name = 'lake';
  lake.userData['noMerge'] = true;
  group.add(lake);

  // — creeks, ONE merged mesh (draw-call budget §7): south creek west
  //   piece · 2 m Bound-gap narrows at B1 · east piece · north creek.
  //   Transforms baked; the shader is world-space so merging is free. —
  const creekPieces: Array<[number, number, number, number, number, number, 'x' | 'z']> = [
    [30, 4, 40, 6, -25, 5, 'x'], // [w, d, segW, segD, x, z, longAxis]
    [4, 2, 8, 4, -8, 5, 'x'], // the B1 narrows
    [21, 4, 28, 6, 4.5, 5, 'x'],
    [2.5, 8.5, 4, 12, 16.25, -25, 'z'], // north creek (ridge → lake)
  ];
  const creekGeoms = creekPieces.map(([w, d, sw, sd, x, z, longAxis]) => {
    const g = new THREE.PlaneGeometry(w, d, sw, sd);
    // The shader's shore term is radial uv distance (built for the lake
    // disc). Pin the LONG-axis uv at 0.5 so a creek strip lightens at its
    // BANKS only — otherwise the ring stamps a bright ellipse mid-stream
    // (read badly on the short north creek).
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) {
      if (longAxis === 'x') uv.setX(i, 0.5);
      else uv.setY(i, 0.5); // plane v runs along d → world Z after rotateX
    }
    uv.needsUpdate = true;
    g.rotateX(-Math.PI / 2);
    g.translate(x, 0.04, z);
    return g;
  });
  const creeks = new THREE.Mesh(mergeGeoms(creekGeoms), waterMat);
  creeks.name = 'creeks';
  creeks.userData['noMerge'] = true;
  group.add(creeks);

  // — mossy stepping stones over the north creek —

  const stoneMat = kit.toon('inkCharcoal', { vertexColors: true });
  const stonePositions: Array<[number, number]> = [
    [15.6, -24.8],
    [16.4, -24.7],
    [17.1, -24.9],
  ];
  for (let i = 0; i < stonePositions.length; i += 1) {
    const sp = stonePositions[i];
    if (!sp) continue;
    const geo = faceted(jitterRadial(new THREE.CylinderGeometry(0.42, 0.52, 0.2, 7), 0.18, i + 3));
    paintVertexColors(geo, (x, y, z, out) => {
      const j = 0.8 + 0.4 * noise2(x * 5 + i, z * 5);
      out.setRGB(j, j, j * 1.05);
      if (y > 0.04) out.lerp(tone('inkCharcoal', 'willowDeep'), 0.45); // wet moss top
    });
    const stone = new THREE.Mesh(geo, stoneMat);
    stone.position.set(sp[0], 0.08, sp[1]);
    stone.rotation.y = i * 2.1;
    group.add(stone);
  }

  return { group };
}

/**
 * The old dock — weathered plank finger on leaning posts; exterior.ts
 * positions it over the collider slot at Z -2..-0.5, X 12.5..18
 * (centre ≈ 15.2, -1.25). Deck sits low (top ≈ 0.12) so feet read on it.
 */
export function makeDock(kit: MaterialKit): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dock';

  const plankMat = kit.toon('woodWarm', { vertexColors: true });
  const PLANKS = 9;
  for (let i = 0; i < PLANKS; i += 1) {
    if (i === 6) continue; // missing plank near the tip — rot reads instantly
    const n = noise2(i * 3.3, 7.7);
    const w = 0.5 + 0.06 * n;
    const geo = new THREE.BoxGeometry(w, 0.07, 1.22 + 0.1 * (n - 0.5));
    paintVertexColors(geo, (x, _y, z, out) => {
      // silvered, weathered grain — each plank its own tint
      const grain = 0.62 + 0.3 * noise2(z * 6 + i * 13, x * 2) + 0.18 * n;
      out.setRGB(grain * 0.96, grain, grain * 1.08);
    });
    const plank = new THREE.Mesh(geo, plankMat);
    plank.position.set(-2.4 + i * 0.6, 0.085 + 0.012 * Math.sin(i * 2.4), (n - 0.5) * 0.06);
    plank.rotation.y = (n - 0.5) * 0.07;
    plank.rotation.z = (noise2(i, 1.2) - 0.5) * 0.05;
    group.add(plank);
  }
  const stringerMat = kit.toon('woodDark', { vertexColors: true });
  for (const sz of [-0.45, 0.45]) {
    const geo = new THREE.BoxGeometry(5.5, 0.09, 0.12);
    paintVertexColors(geo, (x, _y, _z, out) => {
      const j = 0.7 + 0.4 * noise2(x * 3, sz);
      out.setRGB(j, j, j);
    });
    const stringer = new THREE.Mesh(geo, stringerMat);
    stringer.position.set(0, 0.045, sz);
    group.add(stringer);
  }

  const corners: Array<[number, number]> = [
    [-2.45, -0.5],
    [-2.45, 0.5],
    [-0.1, -0.55],
    [2.45, -0.5],
    [2.45, 0.5],
  ];
  for (let i = 0; i < corners.length; i += 1) {
    const c = corners[i];
    if (!c) continue;
    const geo = faceted(jitterRadial(new THREE.CylinderGeometry(0.07, 0.1, 0.66, 6), 0.12, i + 11));
    paintVertexColors(geo, (x, y, z, out) => {
      const j = 0.62 + 0.4 * noise2(x * 7 + i, y * 3 + z * 7);
      out.setRGB(j * 0.95, j, j * 1.06);
      if (y < -0.18) out.multiplyScalar(0.7); // waterline stain
    });
    const post = new THREE.Mesh(geo, stringerMat);
    post.position.set(c[0], 0.26, c[1]);
    post.rotation.z = (noise2(i * 5, 3) - 0.5) * 0.12;
    post.rotation.x = (noise2(i * 9, 8) - 0.5) * 0.12;
    group.add(post);
  }

  return group;
}
