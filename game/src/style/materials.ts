/**
 * MaterialKit factory — M0 STUB behind the FINAL public API.
 * Internals here are flat MeshLambert/MeshBasic colors from THE palette;
 * stream A (M2) replaces them with toon ramps + custom shaders without
 * touching a single signature. Instances are cached.
 *
 * Silhouette rules (style-guide header):
 * - every prop must read at 64 px height; exaggerate proportions 10–20 %;
 * - no face >~1.5 u without vertex-color variation;
 * - single light-direction assumption; ink outlines on characters only;
 * - wisps/ghost/water are the only transparent materials.
 */
import * as THREE from 'three';
import { palette, type PaletteKey } from './palette';
import type { MaterialKit, ToonOptions } from '@/core/types';

export function createMaterialKit(): MaterialKit {
  const cache = new Map<string, THREE.Material>();

  function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let mat = cache.get(key);
    if (!mat) {
      mat = make();
      cache.set(key, mat);
    }
    return mat as T;
  }

  return {
    toon(colorKey: PaletteKey, opts: ToonOptions = {}): THREE.Material {
      const key = `toon:${colorKey}:${JSON.stringify(opts)}`;
      return cached(key, () => {
        const mat = new THREE.MeshLambertMaterial({
          color: palette[colorKey],
          vertexColors: opts.vertexColors ?? false,
          transparent: opts.transparent ?? false,
          opacity: opts.opacity ?? 1,
          flatShading: opts.flatShading ?? false,
          side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        });
        if (opts.emissiveKey) {
          mat.emissive.setHex(palette[opts.emissiveKey]);
          mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
        }
        return mat;
      });
    },

    emissive(colorKey: PaletteKey, intensity = 1): THREE.Material {
      const key = `emissive:${colorKey}:${intensity}`;
      return cached(key, () => {
        const color = new THREE.Color(palette[colorKey]).multiplyScalar(intensity);
        return new THREE.MeshBasicMaterial({ color });
      });
    },

    water(): THREE.Material {
      return cached('water', () => {
        return new THREE.MeshLambertMaterial({
          color: palette.lakeDeep,
          transparent: true,
          opacity: 0.92,
        });
      });
    },

    ghost(): THREE.Material {
      return cached('ghost', () => {
        return new THREE.MeshLambertMaterial({
          color: palette.smokeWhite,
          emissive: new THREE.Color(palette.spectralViolet).multiplyScalar(0.25),
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
      });
    },

    wisp(): THREE.Material {
      return cached('wisp', () => {
        return new THREE.MeshBasicMaterial({
          color: palette.spectralTeal,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
      });
    },

    sky(): THREE.Material {
      return cached('sky', () => {
        return new THREE.MeshBasicMaterial({
          color: palette.nightIndigo,
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
        });
      });
    },

    ink(): THREE.Material {
      return cached('ink', () => {
        return new THREE.MeshBasicMaterial({
          color: palette.inkBlack,
          side: THREE.BackSide,
        });
      });
    },
  };
}
