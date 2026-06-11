/**
 * Willow trees — the shore row and the hero Cursed Willow.
 *
 * GREYBOX (M1): cylinder trunk + squashed-sphere canopy + hanging box
 * curtains. The FINAL contract: `cuttableBranches` are the three named
 * branch-cluster meshes the finale cuts (cursed willow only — empty for
 * row willows), `canopyCenter` is the LOCAL-space canopy centre (add the
 * placed group's position to get world). M2 replaces the internals (lathe
 * trunk, CatmullRom branch tubes, ribbon leaf curtains w/ aSwayWeight)
 * behind this same signature.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';

export interface WillowOptions {
  /** The Cursed Willow: tallest, gets the 3 cuttable branch clusters. */
  cursed?: boolean;
  /** Total height in units (row ≈ 5.5, cursed ≈ 7). */
  height?: number;
}

export interface WillowBuild {
  group: THREE.Group;
  /** Named `cuttable-0..2` cluster meshes (cursed willow only). */
  cuttableBranches: THREE.Mesh[];
  /** LOCAL-space canopy centre (for lash-zone / VFX placement). */
  canopyCenter: THREE.Vector3;
}

export function buildWillow(kit: MaterialKit, options: WillowOptions = {}): WillowBuild {
  const cursed = options.cursed ?? false;
  const height = options.height ?? (cursed ? 7 : 5.5);
  const group = new THREE.Group();
  group.name = cursed ? 'willow-cursed' : 'willow';

  // — trunk —
  const trunkH = height * 0.55;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, cursed ? 0.5 : 0.38, trunkH, 7),
    kit.toon('woodDark'),
  );
  trunk.position.y = trunkH / 2;
  if (cursed) trunk.rotation.z = 0.06; // slight tortured lean
  group.add(trunk);

  // — canopy: two offset squashed spheres —
  const canopyY = height * 0.7;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(height * 0.32, 10, 7), kit.toon('willowGreen'));
  crown.scale.y = 0.72;
  crown.position.y = canopyY;
  group.add(crown);
  const under = new THREE.Mesh(new THREE.SphereGeometry(height * 0.26, 9, 6), kit.toon('willowDeep'));
  under.scale.y = 0.66;
  under.position.set(height * 0.07, canopyY - height * 0.1, -height * 0.05);
  group.add(under);

  // — hanging leaf curtains (thin boxes around the crown rim) —
  const curtainMat = kit.toon('willowDeep');
  const curtainCount = cursed ? 8 : 6;
  const rim = height * 0.3;
  for (let i = 0; i < curtainCount; i += 1) {
    const a = (i / curtainCount) * Math.PI * 2;
    const hang = height * (0.42 + 0.08 * Math.sin(i * 2.7));
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.26, hang, 0.26), curtainMat);
    curtain.position.set(Math.cos(a) * rim, canopyY - height * 0.06 - hang / 2, Math.sin(a) * rim);
    group.add(curtain);
  }

  // — cuttable branch clusters (the finale's three E-cuts) —
  const cuttableBranches: THREE.Mesh[] = [];
  if (cursed) {
    const clusterMat = kit.toon('willowDeep', { flatShading: true });
    // Arc around the ghost spot (local ≈ +1.3, -0.7 relative to the trunk).
    const clusters: Array<[number, number, number]> = [
      [1.0, 0.5, -1.5],
      [2.1, 0.55, -0.7],
      [1.3, 0.5, 0.4],
    ];
    for (let i = 0; i < clusters.length; i += 1) {
      const c = clusters[i];
      if (!c) continue;
      const cluster = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), clusterMat);
      cluster.position.set(c[0], c[1], c[2]);
      cluster.rotation.set(0.2 * i, 0.7 * i, 0.15);
      cluster.name = `cuttable-${i}`;
      cluster.userData['cuttable'] = true;
      cluster.userData['noMerge'] = true;
      group.add(cluster);
      cuttableBranches.push(cluster);
    }
  }

  return { group, cuttableBranches, canopyCenter: new THREE.Vector3(0, canopyY, 0) };
}
