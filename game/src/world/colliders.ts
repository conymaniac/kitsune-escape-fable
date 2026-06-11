/**
 * Static collider store + circle-vs-statics resolution on the XZ plane.
 *
 * The player is a circle (human r 0.35 / fox r 0.25). gameplay/player.ts
 * (D-core) moves axis-separated and calls `circleVsStatics()` after the
 * move — each shape pushes the circle out along the contact normal, so
 * move-and-slide falls out of the per-axis pushes naturally.
 *
 * Pure data + pure functions; `ColliderStore` is a thin convenience class.
 * No three runtime dependency (Vector3 enters via `import type`).
 */
import type * as THREE from 'three';
import type { ColliderShape } from '@/core/types';

/** AABB collider factory (XZ plane). */
export function aabb(minX: number, minZ: number, maxX: number, maxZ: number): ColliderShape {
  return { kind: 'aabb', minX, minZ, maxX, maxZ };
}

/** Circle collider factory (XZ plane). */
export function circle(x: number, z: number, radius: number): ColliderShape {
  return { kind: 'circle', x, z, radius };
}

/** Translate collider shapes (e.g. prop-local colliders → world). */
export function offsetColliders(
  shapes: readonly ColliderShape[],
  dx: number,
  dz: number,
): ColliderShape[] {
  return shapes.map((s) =>
    s.kind === 'aabb'
      ? aabb(s.minX + dx, s.minZ + dz, s.maxX + dx, s.maxZ + dz)
      : circle(s.x + dx, s.z + dz, s.radius),
  );
}

/** Push `pos` out of one static shape (mutates pos.x / pos.z). */
function resolveOne(pos: THREE.Vector3, radius: number, shape: ColliderShape): void {
  if (shape.kind === 'aabb') {
    const cx = Math.min(Math.max(pos.x, shape.minX), shape.maxX);
    const cz = Math.min(Math.max(pos.z, shape.minZ), shape.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) return;
    if (d2 > 1e-9) {
      // Circle centre outside the box: push along the closest-point normal.
      const d = Math.sqrt(d2);
      const push = (radius - d) / d;
      pos.x += dx * push;
      pos.z += dz * push;
      return;
    }
    // Centre inside the box: exit through the nearest face.
    const left = pos.x - shape.minX;
    const right = shape.maxX - pos.x;
    const near = pos.z - shape.minZ;
    const far = shape.maxZ - pos.z;
    const m = Math.min(left, right, near, far);
    if (m === left) pos.x = shape.minX - radius;
    else if (m === right) pos.x = shape.maxX + radius;
    else if (m === near) pos.z = shape.minZ - radius;
    else pos.z = shape.maxZ + radius;
    return;
  }
  // circle vs circle
  const dx = pos.x - shape.x;
  const dz = pos.z - shape.z;
  const minDist = radius + shape.radius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minDist * minDist) return;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const push = (minDist - d) / d;
    pos.x += dx * push;
    pos.z += dz * push;
  } else {
    pos.x = shape.x + minDist; // degenerate: dead centre — pick +X
  }
}

/**
 * Resolve a circle at `pos` (radius `radius`) against every static shape.
 * Mutates and returns `pos`. Runs up to 3 relaxation passes so corner
 * cases (two overlapping shapes) settle; exits early when stable.
 * Allocation-free.
 */
export function circleVsStatics(
  pos: THREE.Vector3,
  radius: number,
  colliders: readonly ColliderShape[],
): THREE.Vector3 {
  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false;
    for (let i = 0; i < colliders.length; i += 1) {
      const shape = colliders[i];
      if (!shape) continue;
      const px = pos.x;
      const pz = pos.z;
      resolveOne(pos, radius, shape);
      if (pos.x !== px || pos.z !== pz) moved = true;
    }
    if (!moved) break;
  }
  return pos;
}

/** Small mutable store, handy for scene swaps (exterior ↔ interior). */
export class ColliderStore {
  private readonly shapes: ColliderShape[] = [];

  /** Live readonly view — safe to hand to the player controller. */
  get all(): readonly ColliderShape[] {
    return this.shapes;
  }

  add(...shapes: ColliderShape[]): void {
    this.shapes.push(...shapes);
  }

  /** Remove by identity (e.g. the farm-gate collider). True if found. */
  remove(shape: ColliderShape): boolean {
    const i = this.shapes.indexOf(shape);
    if (i === -1) return false;
    this.shapes.splice(i, 1);
    return true;
  }

  /** Replace the whole set (scene swap). Keeps the array identity. */
  setAll(shapes: readonly ColliderShape[]): void {
    this.shapes.length = 0;
    this.shapes.push(...shapes);
  }

  clear(): void {
    this.shapes.length = 0;
  }

  resolve(pos: THREE.Vector3, radius: number): THREE.Vector3 {
    return circleVsStatics(pos, radius, this.shapes);
  }
}
