/**
 * Night sky — gradient dome stub, code-built moon disc + halo, star Points.
 *
 * GREYBOX (M1): kit.sky() flat indigo dome; M2 swaps the sky material for
 * the real gradient shader behind the same MaterialKit signature. The moon
 * sits along the key-light direction so glints stay coherent. Everything
 * is procedural — no textures.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import { paletteHex } from '@/style/palette';
import { seededRandom } from '@/world/props/vegetation';

export interface SkyBuild {
  group: THREE.Group;
}

const DOME_RADIUS = 90;

export function buildSky(kit: MaterialKit): SkyBuild {
  const group = new THREE.Group();
  group.name = 'sky';

  // — dome —
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 12), kit.sky());
  dome.name = 'sky-dome';
  dome.renderOrder = -100;
  dome.userData['noMerge'] = true;
  group.add(dome);

  // — moon disc + halo on the dome, along the moonlight key direction —
  const moonDir = new THREE.Vector3(-0.45, 0.52, -0.55).normalize();

  const halo = new THREE.Mesh(new THREE.CircleGeometry(7.5, 24), kit.wisp());
  halo.position.copy(moonDir).multiplyScalar(DOME_RADIUS * 0.97);
  halo.lookAt(0, 0, 0);
  halo.renderOrder = -99;
  halo.userData['noMerge'] = true;
  group.add(halo);

  const moon = new THREE.Mesh(new THREE.CircleGeometry(4.4, 24), kit.emissive('smokeWhite', 1));
  moon.position.copy(moonDir).multiplyScalar(DOME_RADIUS * 0.95);
  moon.lookAt(0, 0, 0);
  moon.name = 'moon';
  moon.renderOrder = -98;
  moon.userData['noMerge'] = true;
  group.add(moon);

  // — stars: Points scattered on the upper dome —
  const rand = seededRandom(99);
  const starCount = 180;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const azimuth = rand() * Math.PI * 2;
    const elevation = 0.12 + rand() * 1.3; // keep off the horizon line
    const r = DOME_RADIUS * 0.93;
    positions[i * 3 + 0] = Math.cos(azimuth) * Math.cos(elevation) * r;
    positions[i * 3 + 1] = Math.sin(elevation) * r;
    positions[i * 3 + 2] = Math.sin(azimuth) * Math.cos(elevation) * r;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: paletteHex('paperBone'),
    size: 2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = 'stars';
  stars.renderOrder = -99;
  stars.userData['noMerge'] = true;
  group.add(stars);

  return { group };
}
