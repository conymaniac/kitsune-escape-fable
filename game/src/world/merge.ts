/**
 * mergeStatic(group) — bake a static prop tree into one mesh per material.
 *
 * Walks the group, clones each mesh geometry into world space, buckets by
 * (material instance × attribute layout) and merges every bucket with
 * BufferGeometryUtils. Meshes that opt out (`userData.noMerge`) or use
 * material arrays are carried over with IDENTITY PRESERVED — the ORIGINAL
 * mesh object is re-parented into the output with its world transform
 * baked on, so external references (cuttableBranches, shrine-mask, lantern
 * cores…) stay valid. Do NOT route runtime-animated PIVOT GROUPS (farm
 * gate, kitchen drawer) through here — baking flattens their hierarchy.
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

  // Manual walk (not traverse): a noMerge mesh keeps its WHOLE subtree —
  // descendants must not also land in merge buckets (double rendering) and
  // relative child transforms (e.g. lattice riding a door panel) survive.
  function walk(obj: THREE.Object3D): void {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      if (mesh.userData['noMerge'] === true || Array.isArray(mesh.material)) {
        passthrough.push(mesh);
        return; // subtree travels with the original
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
    }
    for (const child of [...obj.children]) walk(child);
  }
  walk(group);

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

  // Re-parent opt-outs (ORIGINAL objects) with world transforms baked on.
  for (const mesh of passthrough) {
    mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
    out.add(mesh); // add() detaches from the old parent automatically
  }

  return out;
}
