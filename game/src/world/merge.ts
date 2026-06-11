/**
 * mergeStatic(group) — bake a static prop tree into one mesh per material.
 *
 * Walks the group, clones each mesh geometry into world space, buckets by
 * (material instance × attribute layout) and merges every bucket with
 * BufferGeometryUtils. Meshes that opt out (`userData.noMerge`), use
 * material arrays, or fail to merge are carried over unchanged (with their
 * world transform baked onto a fresh mesh).
 *
 * The MaterialKit caches material instances per key, so bucketing by
 * material identity collapses e.g. every `toon('willowDeep')` mesh into a
 * single draw call.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

interface Bucket {
  material: THREE.Material;
  geometries: THREE.BufferGeometry[];
}

export function mergeStatic(group: THREE.Group): THREE.Group {
  group.updateMatrixWorld(true);

  const buckets = new Map<string, Bucket>();
  const passthrough: THREE.Mesh[] = [];

  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData['noMerge'] === true || Array.isArray(mesh.material)) {
      passthrough.push(mesh);
      return;
    }
    const material = mesh.material;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    // Attribute layouts (and indexed-ness) must match within one merge call.
    const layout = Object.keys(geometry.attributes).sort().join(',');
    const key = `${material.uuid}|${layout}|${geometry.index ? 'i' : 'n'}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material, geometries: [] };
      buckets.set(key, bucket);
    }
    bucket.geometries.push(geometry);
  });

  const out = new THREE.Group();
  out.name = group.name ? `${group.name}-merged` : 'merged';

  for (const bucket of buckets.values()) {
    const first = bucket.geometries[0];
    if (!first) continue;
    if (bucket.geometries.length === 1) {
      out.add(new THREE.Mesh(first, bucket.material));
      continue;
    }
    const merged = mergeGeometries(bucket.geometries, false);
    if (merged) {
      out.add(new THREE.Mesh(merged, bucket.material));
    } else {
      // Defensive: keep the pieces unmerged rather than dropping them.
      for (const g of bucket.geometries) out.add(new THREE.Mesh(g, bucket.material));
    }
  }

  // Re-parent opt-outs with their world transform preserved.
  for (const mesh of passthrough) {
    const clone = new THREE.Mesh(mesh.geometry, mesh.material);
    clone.name = mesh.name;
    clone.userData = mesh.userData;
    mesh.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
    out.add(clone);
  }

  return out;
}
