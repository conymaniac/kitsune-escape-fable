/**
 * Kitsunebi wisps — drifting spirit lights (guides + ambience).
 *
 * M2: kit.wisp() is the real additive radial-falloff shader (A-style) —
 * its |N·V| facing term fades the sphere silhouette so each wisp reads as
 * a soft spirit flame. Per-wisp Lissajous drift around home points,
 * nudged by the wind when a WindState is given; M4 retargets homes toward
 * quest goals. `colorKey` tints a cluster (the Cursed Willow's canopy
 * motes are spectralViolet — canon; everything else stays teal).
 * Allocation-free update.
 */
import * as THREE from 'three';
import type { MaterialKit, WindState } from '@/core/types';
import type { PaletteKey } from '@/style/palette';
import type { KitsuneMaterialKit } from '@/style/materials';

export interface WispsBuild {
  group: THREE.Group;
  update(dt: number, wind?: WindState): void;
}

export interface WispsOptions {
  /** Sphere radius (default 0.15). */
  size?: number;
  /** Drift amplitude in units (default 0.7). */
  drift?: number;
  /** Palette tint — kit.wisp(colorKey); default spectralTeal. */
  colorKey?: PaletteKey;
}

export function createWisps(
  kit: MaterialKit,
  homes: THREE.Vector3[],
  options: WispsOptions = {},
): WispsBuild {
  const size = options.size ?? 0.15;
  const drift = options.drift ?? 0.7;
  const group = new THREE.Group();
  group.name = 'wisps';

  const meshes: THREE.Mesh[] = [];
  const params: number[] = []; // per wisp: fx, fz, fy, phase
  const geometry = new THREE.SphereGeometry(size, 8, 6);
  // The frozen MaterialKit type takes no args; the M2 kit accepts an
  // optional tint key (style/materials.ts KitsuneMaterialKit).
  const material = options.colorKey
    ? (kit as KitsuneMaterialKit).wisp(options.colorKey)
    : kit.wisp();

  for (let i = 0; i < homes.length; i += 1) {
    const home = homes[i];
    if (!home) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(home);
    mesh.name = `wisp-${i}`;
    mesh.userData['noMerge'] = true;
    group.add(mesh);
    meshes.push(mesh);
    params.push(
      0.35 + 0.3 * Math.abs(Math.sin(i * 3.1)), // fx
      0.27 + 0.3 * Math.abs(Math.sin(i * 5.7)), // fz
      0.8 + 0.4 * Math.abs(Math.sin(i * 7.3)), // fy
      i * 1.618, // phase
    );
  }

  let time = 0;

  function update(dt: number, wind?: WindState): void {
    time += dt;
    const windX = wind && !wind.stopped ? wind.direction.x * wind.strength * 0.9 : 0;
    const windZ = wind && !wind.stopped ? wind.direction.y * wind.strength * 0.9 : 0;
    for (let i = 0; i < meshes.length; i += 1) {
      const mesh = meshes[i];
      const home = homes[i];
      if (!mesh || !home) continue;
      const fx = params[i * 4 + 0] ?? 0.4;
      const fz = params[i * 4 + 1] ?? 0.3;
      const fy = params[i * 4 + 2] ?? 1;
      const phase = params[i * 4 + 3] ?? 0;
      mesh.position.x = home.x + Math.sin(time * fx + phase) * drift + windX;
      mesh.position.z = home.z + Math.sin(time * fz + phase * 2.3) * drift + windZ;
      mesh.position.y = home.y + Math.sin(time * fy + phase) * 0.28;
      const flicker = 1 + 0.18 * Math.sin(time * 7 + phase * 5);
      mesh.scale.setScalar(flicker);
    }
  }

  return { group, update };
}
