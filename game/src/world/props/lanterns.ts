/**
 * Stone lanterns — the route's touchable warm accents (≤15 m spacing
 * rule). M2: noisy-lathe stone profile (plinth → shaft → firebox → cap →
 * finial), mossy-foot vertex colors, four firebox windows around a SUBTLE
 * warm emissive core — the cottage shoji window must stay the warmest
 * landmark on the map.
 *
 * Contract (unchanged): returns the emissive core mesh so exterior.ts can
 * flicker it (and A-style can rewire it to lighting.ts flicker handles).
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import { noise2, noisyLathe, paintVertexColors, tone } from '@/world/props/meshUtils';

export interface LanternBuild {
  group: THREE.Group;
  /** The emissive core — flicker target. Excluded from static merge. */
  core: THREE.Mesh;
}

let lanternSeed = 0;

export function makeStoneLantern(kit: MaterialKit): LanternBuild {
  lanternSeed += 1;
  const seed = lanternSeed;
  const group = new THREE.Group();
  group.name = 'stone-lantern';
  const stoneMat = kit.toon('inkCharcoal', { vertexColors: true });

  const paintStone = (g: THREE.BufferGeometry, s: number, mossTo = 0.25): THREE.BufferGeometry =>
    paintVertexColors(g, (x, y, z, out) => {
      const j = 0.76 + 0.4 * noise2(x * 6 + s + seed, y * 4 + z * 6);
      out.setRGB(j * 0.96, j, j * 1.08);
      // mossTo = 0 disables moss — guard the division (y/0 → NaN colors
      // that poisoned the bloom chain: the M2 white-out root cause).
      if (mossTo > 0 && y < mossTo) {
        out.lerp(tone('inkCharcoal', 'willowDeep'), 0.45 * (1 - Math.max(y, 0) / mossTo));
      }
    });

  // — one lathe profile: plinth → shaft (waisted) → firebox base —
  const pillar = noisyLathe(
    0.78,
    7,
    8,
    (t) => {
      if (t < 0.12) return 0.24 - t * 0.5; // plinth
      if (t < 0.78) return 0.1 - 0.025 * Math.sin((t - 0.12) * 4.6); // waisted shaft
      return 0.13; // firebox base plate
    },
    0.07,
    seed * 3,
  );
  paintStone(pillar, 1, 0.3);
  group.add(new THREE.Mesh(pillar, stoneMat));

  // — firebox: stone ring with four window cutouts (posts at corners) —
  const boxY = 0.86;
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const post = new THREE.BoxGeometry(0.05, 0.22, 0.05);
    paintStone(post, i * 7, 0);
    const mesh = new THREE.Mesh(post, stoneMat);
    mesh.position.set(Math.cos(a) * 0.13, boxY, Math.sin(a) * 0.13);
    group.add(mesh);
  }

  // — the warm core behind the windows (SUBTLE; flicker target) —
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.16, 0.15),
    kit.emissive('lanternAmber', 0.7),
  );
  core.position.y = boxY;
  core.name = 'lantern-core';
  core.userData['noMerge'] = true;
  group.add(core);

  // — cap (flared) + finial bud —
  const cap = noisyLathe(0.22, 7, 3, (t) => 0.26 * (1 - t * 0.82), 0.08, seed * 5);
  paintStone(cap, 3, 0);
  const capMesh = new THREE.Mesh(cap, stoneMat);
  capMesh.position.y = boxY + 0.11;
  group.add(capMesh);
  const finial = noisyLathe(0.12, 6, 3, (t) => 0.05 * Math.sin(Math.min(t * 2.6, Math.PI)), 0.1, seed * 7, 0, false);
  paintStone(finial, 5, 0);
  const finialMesh = new THREE.Mesh(finial, stoneMat);
  finialMesh.position.y = boxY + 0.3;
  group.add(finialMesh);

  return { group, core };
}
