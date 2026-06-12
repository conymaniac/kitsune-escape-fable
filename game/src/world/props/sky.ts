/**
 * Night sky — M2 polish over the A-style graded dome (kit.sky() is the
 * real gradient shader now).
 *
 * - Moon: big, slightly warm-white disc (paperBone emissive — warmer than
 *   the old smokeWhite) low-ish on the key-light axis, with faint maria
 *   patches so it reads as THE moon, not a searchlight. The additive
 *   kit.wisp() halo breathes behind it.
 * - Stars: two Points layers — a dim field + a few bright sparks — so the
 *   sky glitters without reading as a disco.
 * - Two thin cloud bands: flat dark lens planes low over the horizon
 *   (opaque — wisps/ghost/water stay the only transparent materials).
 *
 * The moon sits along the key-light/sky-shader direction (-0.45, 0.52,
 * -0.55) so glints and the dome's moon-glow stay coherent. Everything is
 * procedural — no textures.
 */
import * as THREE from 'three';
import type { MaterialKit } from '@/core/types';
import { paletteHex } from '@/style/palette';
import { mergeGeoms, noise2 } from '@/world/props/meshUtils';
import { seededRandom } from '@/world/props/vegetation';

export interface SkyBuild {
  group: THREE.Group;
}

const DOME_RADIUS = 90;

/** Star Points layer scattered on the upper dome. */
function makeStars(
  count: number,
  seed: number,
  color: number,
  size: number,
  opacity: number,
  minElevation: number,
): THREE.Points {
  const rand = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const azimuth = rand() * Math.PI * 2;
    const elevation = minElevation + rand() * (1.42 - minElevation);
    const r = DOME_RADIUS * 0.93;
    positions[i * 3 + 0] = Math.cos(azimuth) * Math.cos(elevation) * r;
    positions[i * 3 + 1] = Math.sin(elevation) * r;
    positions[i * 3 + 2] = Math.sin(azimuth) * Math.cos(elevation) * r;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = -99;
  stars.userData['noMerge'] = true;
  return stars;
}

export function buildSky(kit: MaterialKit): SkyBuild {
  const group = new THREE.Group();
  group.name = 'sky';

  // — dome (the A-style indigo gradient shader) —
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 12), kit.sky());
  dome.name = 'sky-dome';
  dome.renderOrder = -100;
  dome.userData['noMerge'] = true;
  group.add(dome);

  // — moon disc + halo on the dome, along the moonlight key direction —
  const moonDir = new THREE.Vector3(-0.45, 0.52, -0.55).normalize();

  const halo = new THREE.Mesh(new THREE.CircleGeometry(8.6, 24), kit.wisp());
  halo.position.copy(moonDir).multiplyScalar(DOME_RADIUS * 0.97);
  halo.lookAt(0, 0, 0);
  halo.renderOrder = -99;
  halo.userData['noMerge'] = true;
  group.add(halo);

  const moon = new THREE.Mesh(new THREE.CircleGeometry(5.0, 26), kit.emissive('paperBone', 1));
  moon.position.copy(moonDir).multiplyScalar(DOME_RADIUS * 0.95);
  moon.lookAt(0, 0, 0);
  moon.name = 'moon';
  moon.renderOrder = -98;
  moon.userData['noMerge'] = true;
  group.add(moon);

  // faint maria — small dim patches riding the disc (children of the moon)
  const mariaMat = kit.emissive('paperAged', 0.62);
  const mariaSpots: Array<[number, number, number]> = [
    [-1.3, 0.9, 1.5], // [x, y, radius] in moon-local units
    [1.1, -0.4, 1.1],
    [-0.2, -1.4, 0.8],
  ];
  for (let i = 0; i < mariaSpots.length; i += 1) {
    const spot = mariaSpots[i];
    if (!spot) continue;
    const geo = new THREE.CircleGeometry(spot[2], 14);
    // ragged rims so they read as seas, not buttons
    const pos = geo.getAttribute('position');
    for (let v = 1; v < pos.count; v += 1) {
      const k = 1 + (noise2(v * 3.7 + i * 11, i * 5) - 0.5) * 0.5;
      pos.setXY(v, pos.getX(v) * k, pos.getY(v) * k);
    }
    pos.needsUpdate = true;
    const patch = new THREE.Mesh(geo, mariaMat);
    patch.position.set(spot[0], spot[1], 0.15); // toward the camera side
    patch.renderOrder = -97;
    patch.userData['noMerge'] = true;
    moon.add(patch);
  }

  // — stars: dim field + a few bright sparks (subtle, no disco) —
  group.add(makeStars(150, 99, paletteHex('paperBone'), 1.4, 0.5, 0.12));
  group.add(makeStars(26, 173, paletteHex('moonlight'), 2.3, 0.85, 0.2));

  // — two thin cloud bands low over the horizon (flat dark lens planes,
  //   baked into ONE mesh — draw-call budget §7) —
  const cloudSpots: Array<[number, number, number, number]> = [
    [-0.62, 0.2, -0.55, 0.07], // [dirX, elevation, dirZ, roll]
    [-0.2, 0.13, -0.85, -0.05],
  ];
  const cloudGeoms: THREE.BufferGeometry[] = [];
  const placer = new THREE.Object3D();
  for (let i = 0; i < cloudSpots.length; i += 1) {
    const c = cloudSpots[i];
    if (!c) continue;
    const geo = new THREE.CircleGeometry(1, 26);
    const pos = geo.getAttribute('position');
    for (let v = 1; v < pos.count; v += 1) {
      // stretch to a band, fray the rim
      const k = 1 + (noise2(v * 2.9 + i * 7, i * 13) - 0.5) * 0.7;
      pos.setXY(v, pos.getX(v) * 13 * k, pos.getY(v) * (1.1 + 0.5 * noise2(v, i)) * k);
    }
    pos.needsUpdate = true;
    const dir = new THREE.Vector3(c[0], c[1], c[2]).normalize();
    placer.position.copy(dir).multiplyScalar(DOME_RADIUS * 0.9);
    placer.lookAt(0, 0, 0);
    placer.rotateZ(c[3]);
    placer.updateMatrix();
    geo.applyMatrix4(placer.matrix);
    cloudGeoms.push(geo);
    placer.rotation.set(0, 0, 0);
  }
  const clouds = new THREE.Mesh(mergeGeoms(cloudGeoms), kit.emissive('nightHorizon', 0.12));
  clouds.name = 'cloud-bands';
  clouds.renderOrder = -96;
  clouds.userData['noMerge'] = true;
  group.add(clouds);

  return { group };
}
