/**
 * Exterior terrain — M2 real art: one vertex-colored, gently undulating
 * ground mesh (moonlit cold grass → worn earth path bands → shore sand/mud
 * around the lake and creeks) + crisp path ribbons + the promontory pad.
 *
 * Height rules (gameplay-safe): the player moves on the XZ plane at y=0
 * and colliders are height-blind, so the ground NEVER rises above y≈0.05
 * anywhere walkable — undulation swells only at the impassable fringes
 * (behind the collider walls) and DIPS under water bodies so the lake and
 * creeks read as sunk in banks. Route positions are FINAL M1 data.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import { noise2, paintVertexColors, smoothNoise2, tone, toneLerp } from '@/world/props/meshUtils';

export interface TerrainBuild {
  group: THREE.Group;
}

/** [x, z] waypoints — main spine: spawn → gate → willow shore → promontory. */
const PATH_SPINE: Array<[number, number]> = [
  [-8, 29],
  [-8, 2.4],
  [-13, 1],
  [-16, 0.4],
  [-16, -1.5],
  [-10, -2.4],
  [-4, -2.6],
  [7, -2.4],
  [10, -4],
  [11.5, -7.5],
  [12.8, -10.5],
  [16, -11.8],
  [20.3, -12.5],
];

/** Cottage branch: forks west after the farm gate, ends at the door. */
const PATH_COTTAGE: Array<[number, number]> = [
  [-16, -1.5],
  [-20, -7],
  [-23.5, -11.5],
  [-25.6, -14.6],
  [-25, -17.4],
];

/** Squared distance from point to segment (XZ). */
function segDist2(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1;
  let t = ((px - ax) * abx + (pz - az) * abz) / len2;
  t = Math.min(Math.max(t, 0), 1);
  const dx = px - (ax + abx * t);
  const dz = pz - (az + abz * t);
  return dx * dx + dz * dz;
}

/** Distance from a point to the nearest path polyline (XZ). */
function pathDistance(x: number, z: number): number {
  let best = Infinity;
  for (const line of [PATH_SPINE, PATH_COTTAGE]) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const a = line[i];
      const b = line[i + 1];
      if (!a || !b) continue;
      best = Math.min(best, segDist2(x, z, a[0], a[1], b[0], b[1]));
    }
  }
  return Math.sqrt(best);
}

/** Signed "insideness" of the lake ellipse (<1 inside, 1 on the rim). */
function lakeField(x: number, z: number): number {
  const dx = (x - 27) / 15.5;
  const dz = (z + 6) / 14;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Distance into any creek body (0 = outside, >0 = inside, in metres). */
function creekDepth(x: number, z: number): number {
  let d = 0;
  // south creek: z 3..7 from the west edge to the lake (x ≤ 15)
  if (x <= 15.5 && z >= 2.8 && z <= 7.2) {
    d = Math.max(d, Math.min(z - 2.8, 7.2 - z, 1.4));
  }
  // north creek: x 15..17.5, z -29..-21
  if (x >= 14.8 && x <= 17.7 && z >= -29 && z <= -20.8) {
    d = Math.max(d, Math.min(x - 14.8, 17.7 - x, 1.0));
  }
  return d;
}

/** Ground height (visual only — see header). */
function groundHeight(x: number, z: number): number {
  let y = 0;
  // water dips: lake bowl + creek beds
  const lake = lakeField(x, z);
  if (lake < 1.12) {
    const t = Math.min(Math.max((1.12 - lake) / 0.3, 0), 1);
    y -= 0.55 * t * t;
  }
  const creek = creekDepth(x, z);
  if (creek > 0) y = Math.min(y, -0.18 - 0.22 * Math.min(creek, 1));
  // fringe swell behind the impassable edges (never on walkable ground)
  const edge = Math.max(
    Math.min(Math.max(-37.2 - x, 0), 6) / 6, // west
    Math.min(Math.max(x - 37.2, 0), 6) / 6, // east
    Math.min(Math.max(z - 29.2, 0), 6) / 6, // south
    Math.min(Math.max(-29.2 - z, 0), 6) / 6, // north (under the ridge)
  );
  if (edge > 0 && lake > 1.05) {
    y += edge * edge * (0.5 + 0.45 * smoothNoise2(x * 0.22, z * 0.22));
  }
  // sub-5 cm meadow breathing everywhere else (reads as turf, not slope);
  // suppressed near the path ribbons (they sit at a fixed y 0.02)
  const pathFade = Math.min(Math.max((pathDistance(x, z) - 2) / 2, 0), 1);
  y +=
    0.05 *
    smoothNoise2(x * 0.35 + 9, z * 0.35 - 4) *
    (edge > 0 ? 0 : 1) *
    (lake < 1.15 ? 0 : 1) *
    pathFade;
  return y;
}

/** Build a flat ribbon strip along an XZ polyline (y = 0, normals up). */
function ribbonGeometry(points: Array<[number, number]>, width: number): THREE.BufferGeometry {
  const half = width / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    if (!p || !prev || !next) continue;
    let dx = next[0] - prev[0];
    let dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    // ragged organic edges — worn dirt, not a paved lane
    const wobble = 1 + 0.3 * (noise2(p[0] * 0.8, p[1] * 0.8) - 0.5);
    const px = -dz * half * wobble;
    const pz = dx * half * wobble;
    positions.push(p[0] - px, 0, p[1] - pz, p[0] + px, 0, p[1] + pz);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, i, 1, i);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function buildTerrain(kit: MaterialKit): TerrainBuild {
  const group = new THREE.Group();
  group.name = 'terrain';

  // — ground: 80×64, undulating, fully painted (base = grassNight) —
  const ground = new THREE.PlaneGeometry(80, 64, 96, 76);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  ground.computeVertexNormals();
  paintVertexColors(ground, (x, y, z, out) => {
    // moonlit cold meadow: patchy luminance + a blue-shifted sheen
    const patch = smoothNoise2(x * 0.18 + 3, z * 0.18 - 7);
    const fine = noise2(x * 1.7, z * 1.7);
    let l = 0.74 + 0.34 * patch + 0.12 * fine;
    out.setRGB(l * 0.94, l, l * (1.02 + 0.1 * patch)); // cold green-blue
    // worn path band: blend to earth near the route polylines
    const pd = pathDistance(x, z);
    if (pd < 2.6) {
      const t = Math.min(Math.max((2.2 - pd) / 1.6 + 0.35 * (fine - 0.5), 0), 1);
      out.lerp(toneLerp('grassNight', 'earthBrown', 'earthDark', 0.25 + 0.4 * fine), t * 0.85);
    }
    // shore transition: grass → mud → wet sand around the lake rim
    const lake = lakeField(x, z);
    if (lake > 0.86 && lake < 1.22) {
      const t = Math.min(Math.max((1.22 - lake) / 0.36, 0), 1);
      out.lerp(toneLerp('grassNight', 'paperAged', 'earthDark', 0.55 - 0.35 * t + 0.2 * fine), t * 0.9);
    } else if (lake <= 0.86) {
      out.copy(tone('grassNight', 'earthDark')).multiplyScalar(0.55 + 0.2 * fine); // lake bed
    }
    // creek banks: mud lips along both creeks
    const creek = creekDepth(x + 0.0, z);
    if (creek > 0) {
      out.copy(toneLerp('grassNight', 'earthDark', 'earthBrown', fine * 0.5)).multiplyScalar(0.8);
    }
    // depth shading: sunken ground darkens (banks read as carved)
    if (y < -0.02) out.multiplyScalar(Math.max(1 + y * 0.9, 0.45));
  });
  const groundMesh = new THREE.Mesh(ground, kit.toon('grassNight', { vertexColors: true }));
  groundMesh.name = 'ground';
  groundMesh.userData['noMerge'] = true;
  group.add(groundMesh);

  // — promontory pad (the Cursed Willow spit): X 13..24, Z -15..-10 —
  const padGeo = new THREE.BoxGeometry(11, 0.16, 5, 8, 1, 4);
  paintVertexColors(padGeo, (x, y, z, out) => {
    const fine = noise2(x * 2.1, z * 2.1);
    if (y > 0.05) {
      // grassy top, worn toward the willow end
      out.copy(toneLerp('earthDark', 'grassNight', 'earthBrown', 0.3 + 0.5 * fine));
      out.multiplyScalar(0.85 + 0.3 * fine);
    } else {
      out.setRGB(0.7 + 0.3 * fine, 0.7 + 0.3 * fine, 0.74 + 0.3 * fine); // mud rim
    }
  });
  const pad = new THREE.Mesh(padGeo, kit.toon('earthDark', { vertexColors: true }));
  pad.position.set(18.5, 0.08, -12.5);
  pad.name = 'promontory';
  group.add(pad);

  // — path ribbons (crisp centre line of the worn band) —
  const pathMat = kit.toon('earthBrown', { vertexColors: true });
  const paintPath = (g: THREE.BufferGeometry): THREE.BufferGeometry =>
    paintVertexColors(g, (x, _y, z, out) => {
      const n = noise2(x * 1.3, z * 1.3);
      out.copy(toneLerp('earthBrown', 'earthBrown', 'earthDark', n * 0.8));
      out.multiplyScalar(0.85 + 0.3 * noise2(x * 4.1, z * 4.1));
    });
  const spine = new THREE.Mesh(paintPath(ribbonGeometry(PATH_SPINE, 1.7)), pathMat);
  spine.position.y = 0.02;
  spine.name = 'path-spine';
  group.add(spine);
  const cottagePath = new THREE.Mesh(paintPath(ribbonGeometry(PATH_COTTAGE, 1.5)), pathMat);
  cottagePath.position.y = 0.02;
  cottagePath.name = 'path-cottage';
  group.add(cottagePath);
  // Promontory approach lifts onto the pad.
  const padPath = new THREE.Mesh(
    paintPath(
      ribbonGeometry(
        [
          [14.2, -11.4],
          [17.5, -12],
          [20.3, -12.5],
        ],
        1.4,
      ),
    ),
    pathMat,
  );
  padPath.position.y = 0.18;
  group.add(padPath);

  return { group };
}
