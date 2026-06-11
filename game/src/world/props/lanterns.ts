/**
 * Stone lanterns — the route's touchable warm accents (≤15 m spacing rule).
 *
 * GREYBOX (M1): pillar + cap + emissive amber core. The core mesh is
 * returned so exterior.ts can flicker it (and M2/A-style can rewire it to
 * the lantern flicker handles in style/lighting.ts).
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';

export interface LanternBuild {
  group: THREE.Group;
  /** The emissive core — flicker target. Excluded from static merge. */
  core: THREE.Mesh;
}

export function makeStoneLantern(kit: MaterialKit): LanternBuild {
  const group = new THREE.Group();
  group.name = 'stone-lantern';
  const stone = kit.toon('inkCharcoal', { flatShading: true });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), stone);
  base.position.y = 0.08;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.56, 6), stone);
  pillar.position.y = 0.44;
  group.add(pillar);

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), kit.emissive('lanternAmber', 1));
  core.position.y = 0.86;
  core.name = 'lantern-core';
  core.userData['noMerge'] = true;
  group.add(core);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), stone);
  cap.position.y = 1.04;
  group.add(cap);
  const finial = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), stone);
  finial.position.y = 1.16;
  group.add(finial);

  return { group, core };
}
