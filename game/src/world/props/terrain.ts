/**
 * Exterior terrain — vertex-colored ground plane + readable path bands.
 *
 * GREYBOX (M1): flat ground at y=0 with subtle vertex-color jitter and
 * earth-colored ribbons tracing the quest route
 * (spawn → shrine/log/creek → farm gate → willow shore → promontory, plus
 * the cottage branch). Positions are FINAL layout data; M2 only upgrades
 * the visuals behind this same signature.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';

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
    const px = -dz * half;
    const pz = dx * half;
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

  // — ground: 80×64, vertex-color luminance jitter (multiplies grassNight) —
  const ground = new THREE.PlaneGeometry(80, 64, 40, 32);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    const jitter = 0.82 + 0.24 * (n - Math.floor(n));
    colors[i * 3 + 0] = jitter * 0.98;
    colors[i * 3 + 1] = jitter;
    colors[i * 3 + 2] = jitter * 0.94;
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const groundMesh = new THREE.Mesh(ground, kit.toon('grassNight', { vertexColors: true }));
  groundMesh.name = 'ground';
  groundMesh.userData['noMerge'] = true;
  group.add(groundMesh);

  // — promontory pad (the Cursed Willow spit): X 13..24, Z -15..-10 —
  const pad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.16, 5), kit.toon('earthDark'));
  pad.position.set(18.5, 0.08, -12.5);
  pad.name = 'promontory';
  group.add(pad);
  const padTop = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 4.4), kit.toon('grassNight'));
  padTop.rotateX(-Math.PI / 2);
  padTop.position.set(18.5, 0.165, -12.5);
  group.add(padTop);

  // — path bands (readable spawn→gate→willow→cottage route) —
  const pathMat = kit.toon('earthBrown');
  const spine = new THREE.Mesh(ribbonGeometry(PATH_SPINE, 1.7), pathMat);
  spine.position.y = 0.015;
  spine.name = 'path-spine';
  group.add(spine);
  const cottagePath = new THREE.Mesh(ribbonGeometry(PATH_COTTAGE, 1.5), pathMat);
  cottagePath.position.y = 0.015;
  cottagePath.name = 'path-cottage';
  group.add(cottagePath);
  // Promontory approach lifts onto the pad.
  const padPath = new THREE.Mesh(
    ribbonGeometry(
      [
        [14.2, -11.4],
        [17.5, -12],
        [20.3, -12.5],
      ],
      1.4,
    ),
    pathMat,
  );
  padPath.position.y = 0.18;
  group.add(padPath);

  return { group };
}
