/**
 * OccluderFade — DESIGN §4: "occluders between camera and player fade to
 * ~15 % ink outline" (M4 P1; required for the finale readability — the
 * Cursed Willow canopy fully hides Yanagi + the player on the S/SE
 * approach at the fixed iso angle; BUILD_STATE M2 C-chars open issue #2).
 *
 * Cheap per-frame test, NOT a raycast: meshes tagged `userData.occluder`
 * (willow canopies, tall tree crowns on the S/SE approach paths) are
 * collected once with a world-space bounding sphere. Each frame, for each
 * occluder, the focus point (player chest height) is tested against the
 * fixed camera ray: t = (center − focus)·CAM_DIR must be in front of the
 * focus, and the perpendicular distance from the ray must fall inside the
 * sphere. The view direction never changes (iso ortho), so this is a
 * handful of dot products per occluder.
 *
 * Fading: material opacity eases toward FADE_OPACITY while occluding and
 * back to 1 when clear. Kit materials are SHARED (cached per key+opts),
 * so the first fade clones the material per mesh (the per-instance-clone
 * pattern from characters/yanagi) — and re-injects the wind sway patch,
 * because Material.clone() drops onBeforeCompile (the willow curtains
 * must keep swaying while faded). When fully restored the clone flips
 * back to opaque so it leaves the transparent render list.
 */
import * as THREE from 'three';
import { CAM_DIR } from '@/engine/camera';
import { injectSway } from '@/style/shaders/sway';

/** Target opacity while occluding (DESIGN §4 "~15 % ink outline"). */
const FADE_OPACITY = 0.15;
/** Ease rates (1/s): fast fade-out so the player never hunts, calm restore. */
const FADE_IN_RATE = 9;
const FADE_OUT_RATE = 3.5;
/** Focus height — chest-ish; covers both forms (fox 0.5 / human 1.4). */
const FOCUS_Y = 1.0;
/** Soft margin added to the bounding sphere (catches grazing angles). */
const RADIUS_MARGIN = 0.4;
/** Ignore occluders whose sphere centre is further than this along the ray. */
const MAX_RAY_T = 60;

interface OccluderEntry {
  mesh: THREE.Mesh;
  center: THREE.Vector3;
  radius: number;
  /** 0 = fully opaque … 1 = fully faded. */
  fade: number;
  cloned: boolean;
}

export class OccluderFade {
  private readonly entries: OccluderEntry[] = [];
  private readonly tmp = new THREE.Vector3();
  private readonly focus = new THREE.Vector3();

  /**
   * Collect every mesh tagged `userData.occluder` under `root` and cache
   * its world bounding sphere. Call after the world is built (transforms
   * are static — the merge already baked them).
   */
  collect(root: THREE.Object3D): void {
    root.updateWorldMatrix(true, true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData['occluder'] !== true) return;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const sphere = mesh.geometry.boundingSphere;
      if (!sphere) return;
      const center = sphere.center.clone().applyMatrix4(mesh.matrixWorld);
      const scale = this.tmp.setFromMatrixScale(mesh.matrixWorld);
      const radius = sphere.radius * Math.max(scale.x, scale.y, scale.z);
      this.entries.push({ mesh, center, radius, fade: 0, cloned: false });
    });
  }

  /** Per-frame: fade occluders sitting between the camera and `playerPos`. */
  update(dt: number, playerPos: THREE.Vector3): void {
    this.focus.set(playerPos.x, FOCUS_Y, playerPos.z);

    for (let i = 0; i < this.entries.length; i += 1) {
      const entry = this.entries[i];
      if (!entry) continue;

      // Sector test against the fixed player→camera ray.
      const v = this.tmp.copy(entry.center).sub(this.focus);
      const t = v.dot(CAM_DIR);
      let occluding = false;
      if (t > -entry.radius * 0.25 && t < MAX_RAY_T) {
        // perpendicular distance² from the ray
        const perpSq = v.lengthSq() - t * t;
        const reach = entry.radius + RADIUS_MARGIN;
        occluding = perpSq < reach * reach;
      }

      const target = occluding ? 1 : 0;
      if (entry.fade === target && !occluding) continue; // settled opaque
      const rate = occluding ? FADE_IN_RATE : FADE_OUT_RATE;
      entry.fade += (target - entry.fade) * (1 - Math.exp(-dt * rate));
      if (!occluding && entry.fade < 0.01) entry.fade = 0;

      this.applyFade(entry);
    }
  }

  // ── internals ──

  private applyFade(entry: OccluderEntry): void {
    if (!entry.cloned) {
      if (entry.fade <= 0) return; // never faded yet — leave the kit mat alone
      // Clone-on-first-fade: shared kit materials must not be mutated.
      const source = entry.mesh.material as THREE.Material;
      const clone = source.clone();
      // Material.clone() drops onBeforeCompile — re-patch wind sway so the
      // faded canopy keeps moving (sway materials share one program key).
      if (source.customProgramCacheKey() === 'kitsune-sway') injectSway(clone);
      entry.mesh.material = clone;
      entry.cloned = true;
    }
    const mat = entry.mesh.material as THREE.Material;
    const opacity = 1 + (FADE_OPACITY - 1) * entry.fade;
    if (entry.fade <= 0) {
      mat.opacity = 1;
      mat.transparent = false; // back to the opaque pass
    } else {
      mat.opacity = opacity;
      mat.transparent = true;
    }
  }
}
